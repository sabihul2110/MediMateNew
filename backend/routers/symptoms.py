# MediMate/backend/routers/symptoms.py
# ─────────────────────────────────────────────────────────────────
# Endpoints:
#   GET  /api/symptoms/              → all unique symptoms (for autocomplete)
#   POST /api/symptoms/match         → given symptoms → ranked possible diseases
#   GET  /api/symptoms/search?q=     → filter symptom list by keyword
#   POST /api/symptoms/analyze       → enriched MediScan analysis with AI summary
# ─────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Query
from pydantic import BaseModel
import sys, os, re, json

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dataset_loader import (
    get_all_symptoms, get_diseases_by_symptoms, get_disease_profile,
)

router = APIRouter()


# ── Request bodies ────────────────────────────────────────────────
class SymptomMatchRequest(BaseModel):
    symptoms: list[str]          # e.g. ["fatigue", "vomiting", "headache"]
    top_n:    int = 10


class SymptomAnalyzeRequest(BaseModel):
    text:     str = ""           # Free-text symptom description
    tags:     list[str] = []     # Quick-selected symptom tags
    severity: int = 5            # 1-10
    duration: str = "1–3 Days"
    top_n:    int = 8


# ── Gemini config for enriched analysis ──────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-2.0-flash:generateContent"
)

ANALYSIS_PROMPT = """You are a medical AI assistant generating a clinical analysis summary.

Given the patient's symptoms, severity, duration, and the matching conditions from our database, generate a JSON response:

{{
  "summary": "A professional 3-5 sentence clinical analysis summary in plain English. Address the patient directly. Explain what the symptoms suggest, which conditions are most consistent, and what actions they should take. If severity is high (7+), mention the importance of prompt medical attention.",
  "severity_note": "If severity >= 7 OR duration >= 2 weeks, provide a 1-2 sentence urgency note. Otherwise null.",
  "condition_notes": {{
    "ConditionName": "A 1-2 sentence specific note about why this condition matches their symptoms"
  }},
  "lifestyle_advice": ["1-3 specific lifestyle recommendations based on the symptoms"],
  "when_to_seek_help": ["2-3 specific warning signs that should trigger immediate medical attention"]
}}

Return ONLY valid JSON. No markdown fences."""


async def _gemini_analysis(symptoms_text: str, severity: int, duration: str,
                            top_conditions: list) -> dict | None:
    """Call Gemini to generate an enriched analysis summary."""
    if not GEMINI_API_KEY:
        return None
    try:
        import httpx

        conditions_str = "\n".join(
            f"- {c['disease']} ({c['confidence']}% confidence, {c['matched_count']} symptoms matched)"
            for c in top_conditions[:5]
        )

        user_prompt = f"""Patient reports: "{symptoms_text}"
Severity: {severity}/10
Duration: {duration}

Database matches:
{conditions_str}

Generate a clinical analysis summary."""

        payload = {
            "system_instruction": {"parts": [{"text": ANALYSIS_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1200},
        }

        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if r.status_code != 200:
                print(f"[Gemini Analysis] Error {r.status_code}: {r.text[:200]}")
                return None

            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            text = re.sub(r"```json\s*|\s*```", "", text).strip()

            try:
                return json.loads(text)
            except json.JSONDecodeError:
                json_match = re.search(r'\{[\s\S]*\}', text)
                if json_match:
                    try:
                        return json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass
                return {"summary": text[:300]}

    except Exception as e:
        print(f"[Gemini Analysis] Exception: {e}")
        return None


def _generate_fallback_summary(text: str, severity: int, duration: str,
                                results: list) -> dict:
    """Generate a basic summary without Gemini (fallback)."""
    if not results:
        return {
            "summary": "Unable to identify specific conditions from the provided symptoms. Please describe your symptoms in more detail or consult a healthcare professional.",
            "severity_note": None,
        }

    top = results[0]
    summary = f"Based on the symptoms you described, the analysis found {len(results)} potential condition{'s' if len(results) > 1 else ''}. "
    summary += f"The most consistent match is {top['disease']} with {top['confidence']}% confidence based on {top['matched_count']} symptom overlap{'s' if top['matched_count'] > 1 else ''}."

    if len(results) > 1:
        others = [r['disease'] for r in results[1:3]]
        summary += f" Other possibilities include {' and '.join(others)}."

    summary += " These results are based on symptom pattern matching and should be confirmed by a healthcare professional."

    severity_note = None
    if severity >= 7:
        severity_note = f"You've reported a severity of {severity}/10. Given the intensity of your symptoms, we recommend seeking medical attention promptly."
    elif duration in ("2+ Weeks", "1–2 Weeks") and severity >= 5:
        severity_note = f"Your symptoms have persisted for {duration} at moderate-to-high severity. Consider scheduling a medical consultation soon."

    return {
        "summary": summary,
        "severity_note": severity_note,
        "when_to_seek_help": [
            "Symptoms suddenly worsen or new symptoms appear",
            "High fever (above 103°F/39.4°C) persists for more than 2 days",
            "You experience difficulty breathing, chest pain, or confusion",
        ],
    }


# ── All symptoms (autocomplete) ────────────────────────────────────
@router.get("/")
def list_symptoms():
    symptoms = get_all_symptoms()
    return {"count": len(symptoms), "symptoms": symptoms}


# ── Search symptoms by keyword ─────────────────────────────────────
@router.get("/search")
def search_symptoms(q: str = Query(..., min_length=1)):
    all_s = get_all_symptoms()
    q_lower = q.lower()
    matched = [s for s in all_s if q_lower in s.lower()]
    return {"query": q, "count": len(matched), "results": matched}


# ── Match symptoms → diseases (basic) ──────────────────────────────
@router.post("/match")
def match_symptoms(body: SymptomMatchRequest):
    """
    Send a list of symptoms, get back ranked possible diseases.
    Used by the MediScan screen (legacy endpoint).
    """
    if not body.symptoms:
        return {"matched": []}

    results = get_diseases_by_symptoms(body.symptoms, top_n=body.top_n)

    return {
        "symptoms_provided": body.symptoms,
        "total_matches":     len(results),
        "results":           results,
    }


# ── Enriched analysis endpoint (production MediScan) ──────────────
@router.post("/analyze")
async def analyze_symptoms(body: SymptomAnalyzeRequest):
    """
    Production-grade MediScan analysis:
      1. Combines free text + tags for comprehensive symptom extraction
      2. Runs multi-phrase symptom matching with severity awareness
      3. Auto-fetches disease profiles for top 3 matches
      4. Calls Gemini for an intelligent clinical summary
      5. Returns enriched results with profiles + AI summary

    This is the primary endpoint for the MediScan feature.
    """
    # Combine text and tags into a comprehensive symptom string
    combined = body.text.strip()
    if body.tags:
        tag_str = " ".join(t.lower() for t in body.tags)
        combined = f"{combined} {tag_str}".strip()

    if not combined:
        return {
            "symptoms_provided": [],
            "total_matches": 0,
            "results": [],
            "profiles": {},
            "ai_summary": None,
        }

    # Run the enhanced symptom matching
    results = get_diseases_by_symptoms(
        combined,
        top_n=body.top_n,
        severity=body.severity,
        duration=body.duration,
    )

    # Auto-fetch profiles for top 3 conditions
    profiles = {}
    for r in results[:3]:
        try:
            p = get_disease_profile(r["disease"])
            profiles[r["disease"]] = p
        except Exception:
            pass

    # Generate AI summary (Gemini or fallback)
    ai_summary = await _gemini_analysis(
        combined, body.severity, body.duration, results
    )

    if not ai_summary:
        ai_summary = _generate_fallback_summary(
            combined, body.severity, body.duration, results
        )

    return {
        "symptoms_provided": combined.split(),
        "total_matches":     len(results),
        "results":           results,
        "profiles":          profiles,
        "ai_summary":        ai_summary,
        "severity":          body.severity,
        "duration":          body.duration,
    }