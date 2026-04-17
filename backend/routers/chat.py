# MediMate/backend/routers/chat.py
#
# Decision tree (mirrors assistant.py logic, FastAPI version):
#   smart_query() returns  { type, confident, data }
#   confident=True   → shape CSV data and return
#   confident=False  → call Gemini, merge with any partial CSV data
#   Gemini fails     → graceful fallback message
#
# Setup:  .env → GEMINI_API_KEY=your_key_here

import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter
from pydantic import BaseModel
from dataset_loader import (
    smart_query, get_disease_profile, nlp_match_disease,
    search_medquad, get_diseases_by_symptoms, get_all_diseases,
)

router = APIRouter()

# ── Gemini config ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-2.0-flash:generateContent"
)

GEMINI_SYSTEM = """You are MediMate AI, a helpful and empathetic medical assistant.
Respond ONLY with a valid JSON object (no markdown, no backticks) in this exact structure:
{
  "reply": "Short warm 1-2 sentence summary",
  "sections": {
    "overview":     "2-3 sentence plain-English explanation",
    "symptoms":     ["symptom 1", "symptom 2"],
    "medicines":    ["OTC remedy or medicine"],
    "precautions":  ["precaution 1"],
    "risk_factors": ["risk factor 1"],
    "dos":          ["do this"],
    "donts":        ["avoid this"]
  },
  "preliminary_assessment": {
    "possible_conditions": ["Most likely", "Second possibility"]
  },
  "suggested_questions": ["Follow-up question?"],
  "disclaimer": "For informational purposes only. Consult a doctor for diagnosis."
}
Only include fields you have real data for. Never diagnose definitively.
For symptom queries, identify the most likely condition first. Always be accurate.
For tooth pain, respond about dental conditions (cavity, toothache, abscess) NOT cancer."""


async def _call_gemini(message: str, history: list) -> dict | None:
    """Call Gemini 1.5 Flash API. Returns parsed dict or None on failure."""
    if not GEMINI_API_KEY:
        return None
    try:
        import httpx

        contents = []
        for h in history[-6:]:
            role = "user" if h["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h["content"]}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = {
            "system_instruction": {"parts": [{"text": GEMINI_SYSTEM}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1200},
        }

        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if r.status_code != 200:
                print(f"[Gemini] Error {r.status_code}: {r.text[:200]}")
                return None

            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            text = re.sub(r"```json\s*|\s*```", "", text).strip()
            return json.loads(text)
    except Exception as e:
        print(f"[Gemini] Exception: {e}")
        return None


# ── Shape CSV results into frontend response format ───────────────────────────
def _shape(query_result: dict) -> dict:
    """Convert smart_query() output → frontend response shape."""
    t, data = query_result["type"], query_result["data"]

    if t == "disease_profile":
        d = data
        return {
            "type": "disease_profile",
            "reply": f"Here's what I found about **{d['disease']}**.",
            "disease": d["disease"],
            "sections": {
                "overview": (
                    d.get("description")
                    or f"{d['disease']} is a medical condition identified in our clinical database."
                ),
                "symptoms": d.get("symptoms", [])[:8],
                "medicines": d.get("medicines", [])[:6],
                "precautions": d.get("precautions", [])[:5],
                "risk_factors": d.get("risk_factors", [])[:4],
                "dos": [
                    "Consult a licensed physician for proper diagnosis",
                    "Complete the full course of any prescribed medication",
                    "Stay hydrated and maintain adequate rest",
                    "Monitor symptoms and report worsening to your doctor",
                ],
                "donts": [
                    "Do not self-medicate without professional advice",
                    "Do not ignore worsening symptoms",
                    "Do not share prescription medications",
                    "Do not skip follow-up appointments",
                ],
            },
            "preliminary_assessment": {"possible_conditions": [d["disease"]]},
            "suggested_questions": [
                f"What are the risk factors for {d['disease']}?",
                f"How can I prevent {d['disease']}?",
                f"When should I see a doctor for {d['disease']}?",
            ],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    if t in ("symptom_match", "nlp_match"):
        top = data[:5]
        conds = [r["disease"] for r in top]
        profile = get_disease_profile(top[0]["disease"]) if top else {}
        conf_txt = f"{top[0]['confidence']}% confidence" if top else ""
        return {
            "type": "symptom_analysis",
            "reply": f"Based on your symptoms, the most likely condition is **{top[0]['disease']}** ({conf_txt}).",
            "preliminary_assessment": {
                "possible_conditions": conds,
                "top_match": top[0]["disease"] if top else None,
            },
            "sections": {
                "overview": (
                    profile.get("description")
                    or f"Top match: {top[0]['disease']}. {len(top)} possible conditions found."
                ),
                "symptoms": profile.get("symptoms", [])[:8],
                "medicines": profile.get("medicines", [])[:6],
                "precautions": profile.get("precautions", [])[:5],
                "risk_factors": profile.get("risk_factors", [])[:4],
                "dos": [
                    "Rest and stay hydrated",
                    "Monitor your temperature regularly",
                    "Seek medical attention if symptoms worsen after 48 hours",
                    "Eat light, easily digestible foods",
                ],
                "donts": [
                    "Do not ignore high fever above 103°F",
                    "Do not self-diagnose — this is AI guidance only",
                    "Avoid strenuous activity until symptoms subside",
                    "Do not stop prescribed medication midway",
                ],
            },
            "suggested_questions": [
                f"Tell me more about {conds[0]}.",
                f"What medicines help with {conds[0]}?",
                "When should I see a doctor?",
            ],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    if t == "medquad":
        best = data[0] if data else {}
        ans = best.get("answer", "")
        reply = (ans[:200] + "…") if len(ans) > 200 else ans
        return {
            "type": "medical_qa",
            "reply": reply,
            "sections": {"overview": ans},
            "suggested_questions": [d["question"] for d in data[1:3]],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    return {}  # "none" → triggers Gemini fallback


def _fallback() -> dict:
    return {
        "type": "fallback",
        "reply": (
            "I can help you with medical questions. "
            "Try describing your symptoms (e.g. 'I have fever and headache') "
            "or ask about a specific disease or medication."
        ),
        "sections": None,
        "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        "suggested_questions": [
            "I have a headache and fever for 2 days.",
            "What are symptoms of diabetes?",
            "Tell me about malaria treatment.",
        ],
    }


# ── Main chat endpoint ────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/message")
async def chat_message(body: ChatRequest):
    msg = body.message.strip()
    if not msg:
        return _fallback()

    # Step 1: Try all 12 CSV datasets via smart_query
    csv_result = smart_query(msg)
    shaped = _shape(csv_result)

    # Step 2: Decide if Gemini is needed
    #   - explicit not-confident from router
    #   - "none" type (no CSV match at all)
    #   - medquad answer that's too short
    use_gemini = (
        not csv_result["confident"]
        or csv_result["type"] == "none"
        or (
            csv_result["type"] == "medquad"
            and len(shaped.get("sections", {}).get("overview", "")) < 150
        )
    )

    if use_gemini:
        gemini_result = await _call_gemini(msg, body.history)
        if gemini_result:
            gemini_result.setdefault(
                "disclaimer",
                "For informational purposes only. Consult a doctor for diagnosis.",
            )
            gemini_result.setdefault(
                "suggested_questions",
                ["Tell me more.", "When should I see a doctor?", "What medicines can help?"],
            )
            # Merge partial CSV data into Gemini result (don't waste it)
            if shaped.get("sections"):
                csv_sections = shaped["sections"]
                g_sections = gemini_result.setdefault("sections", {})
                for field in ("symptoms", "medicines", "precautions", "risk_factors"):
                    if csv_sections.get(field) and not g_sections.get(field):
                        g_sections[field] = csv_sections[field]
            return gemini_result

    # Step 3: Return CSV result (or graceful fallback if both failed)
    if not shaped:
        return _fallback()

    return shaped