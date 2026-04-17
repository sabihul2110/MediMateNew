# MediMate/backend/routers/chat.py
#
# Production-grade chat endpoint:
#   smart_query() → { type, confident, data }
#   confident=True   → shape CSV data, enrich with contextual advice
#   confident=False  → call Gemini, merge with partial CSV data
#   Gemini fails     → graceful fallback with retry-friendly message
#
# Setup:  .env → GEMINI_API_KEY=your_key_here

import sys, os, re, json

def _strip_md(text: str) -> str:
    """Remove markdown bold/italic so the frontend renders clean text."""
    return re.sub(r"\*{1,2}(.+?)\*{1,2}", r"\1", text) if text else text

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

GEMINI_SYSTEM = """You are MediMate AI, a knowledgeable, empathetic, and precise medical health assistant.

RESPONSE FORMAT:
Return a valid JSON object (no markdown fences, no backticks, no extra text) with this structure:
{
  "reply": "A warm, empathetic 1-3 sentence summary addressing the user directly",
  "sections": {
    "overview": "Detailed 3-5 sentence medical explanation in plain English. Cover what the condition is, how it develops, and its typical course.",
    "symptoms": ["specific symptom 1", "specific symptom 2", "...up to 8"],
    "medicines": ["specific OTC or common medicine 1", "...up to 6"],
    "precautions": ["specific actionable precaution 1", "...up to 5"],
    "risk_factors": ["specific risk factor 1", "...up to 4"],
    "dos": ["specific, actionable do's relevant to THIS condition"],
    "donts": ["specific don'ts relevant to THIS condition"]
  },
  "preliminary_assessment": {
    "possible_conditions": ["Most likely condition", "Second possibility", "Third if applicable"]
  },
  "suggested_questions": ["Relevant follow-up question?", "Another relevant question?"],
  "disclaimer": "This is for informational purposes only. Please consult a healthcare professional for proper diagnosis and treatment."
}

CRITICAL INSTRUCTIONS:
1. For SYMPTOM queries: Reason step-by-step. Consider which body system is affected, list common conditions first, then serious ones. Be specific to the symptoms described.
2. For DISEASE queries: Give accurate, comprehensive information. Include specific medicines (both generic and brand names where helpful).
3. Do's and Don'ts MUST be specific to the condition — never use generic filler like "stay hydrated" unless it's genuinely relevant.
4. Always match response specificity to the query. Vague query → broader guidance. Specific symptoms → focused differential diagnosis.
5. If symptoms suggest something potentially serious (chest pain, difficulty breathing, sudden severe headache), mention emergency care in your reply.
6. Never diagnose definitively. Use language like "most likely", "consistent with", "could indicate".
7. Only include JSON fields you have real data for — omit empty arrays."""


# ── Contextual dos/donts by disease category ─────────────────────────────────
_CONDITION_ADVICE = {
    "respiratory": {
        "dos": [
            "Use steam inhalation to relieve congestion",
            "Keep room humidity at 40-60%",
            "Practice deep breathing exercises when able",
            "Elevate your head while sleeping for better breathing",
        ],
        "donts": [
            "Avoid exposure to smoke, dust, and pollutants",
            "Don't suppress a productive cough without medical advice",
            "Avoid cold beverages if throat is inflamed",
            "Don't exercise strenuously until breathing normalizes",
        ],
    },
    "gastrointestinal": {
        "dos": [
            "Eat small, frequent meals instead of large ones",
            "Stay well-hydrated with ORS or clear fluids",
            "Follow the BRAT diet (bananas, rice, applesauce, toast) during recovery",
            "Keep a food diary to identify triggers",
        ],
        "donts": [
            "Avoid spicy, oily, and acidic foods during symptoms",
            "Don't lie down immediately after eating",
            "Avoid alcohol and caffeine until symptoms resolve",
            "Don't take NSAIDs (ibuprofen/aspirin) on an empty stomach",
        ],
    },
    "cardiovascular": {
        "dos": [
            "Monitor blood pressure regularly",
            "Take prescribed medications at the same time daily",
            "Maintain a low-sodium, heart-healthy diet",
            "Get at least 150 minutes of moderate exercise per week",
        ],
        "donts": [
            "Don't ignore chest pain, arm pain, or jaw pain — seek emergency care",
            "Avoid excessive salt and saturated fat intake",
            "Don't skip cardiac medications without consulting your doctor",
            "Avoid smoking and secondhand smoke exposure",
        ],
    },
    "musculoskeletal": {
        "dos": [
            "Apply ice for 20 minutes every few hours to reduce inflammation",
            "Maintain good posture and ergonomic workspace setup",
            "Perform gentle stretching exercises as tolerated",
            "Use proper body mechanics when lifting",
        ],
        "donts": [
            "Don't push through severe pain — rest the affected area",
            "Avoid prolonged immobility; gentle movement aids recovery",
            "Don't self-adjust or crack joints without guidance",
            "Avoid high-impact activities until pain subsides",
        ],
    },
    "neurological": {
        "dos": [
            "Maintain a regular sleep schedule",
            "Stay in a quiet, dimly lit room during acute episodes",
            "Keep a symptom diary noting triggers and patterns",
            "Practice stress reduction techniques",
        ],
        "donts": [
            "Don't ignore sudden, severe headaches — they may need emergency evaluation",
            "Avoid prolonged screen time during acute symptoms",
            "Don't skip meals — blood sugar drops can worsen symptoms",
            "Avoid known triggers (specific foods, bright lights, etc.)",
        ],
    },
    "dermatological": {
        "dos": [
            "Keep the affected area clean and dry",
            "Use prescribed topical treatments consistently",
            "Wear loose, breathable fabrics",
            "Apply moisturizer to prevent skin cracking",
        ],
        "donts": [
            "Don't scratch or pick at affected skin",
            "Avoid sharing towels, clothing, or personal items",
            "Don't use harsh soaps or hot water on irritated skin",
            "Avoid tight-fitting clothes over rash areas",
        ],
    },
    "infectious": {
        "dos": [
            "Complete the full course of prescribed antibiotics/antivirals",
            "Isolate yourself to prevent transmission",
            "Stay well-hydrated and get adequate rest",
            "Monitor your temperature regularly",
        ],
        "donts": [
            "Don't stop antibiotics early even if you feel better",
            "Don't share food, utensils, or personal items",
            "Avoid crowded places until you're no longer contagious",
            "Don't ignore fever above 103°F (39.4°C) — seek medical help",
        ],
    },
    "default": {
        "dos": [
            "Consult a licensed physician for proper diagnosis",
            "Complete the full course of any prescribed medication",
            "Monitor symptoms and document any changes",
            "Maintain a balanced diet and adequate hydration",
        ],
        "donts": [
            "Do not self-medicate without professional advice",
            "Do not ignore worsening or new symptoms",
            "Do not share prescription medications",
            "Do not delay seeking care if symptoms are severe or persistent",
        ],
    },
}

# Disease → category mapping for contextual advice
_DISEASE_CATEGORIES = {
    "common cold": "respiratory", "pneumonia": "respiratory", "bronchial asthma": "respiratory",
    "tuberculosis": "respiratory", "copd": "respiratory",
    "gerd": "gastrointestinal", "peptic ulcer diseae": "gastrointestinal",
    "gastroenteritis": "gastrointestinal", "hepatitis": "gastrointestinal",
    "jaundice": "gastrointestinal", "alcoholic hepatitis": "gastrointestinal",
    "heart attack": "cardiovascular", "hypertension": "cardiovascular",
    "varicose veins": "cardiovascular", "hypoglycemia": "cardiovascular",
    "osteoarthristis": "musculoskeletal", "arthritis": "musculoskeletal",
    "cervical spondylosis": "musculoskeletal",
    "migraine": "neurological", "paralysis (brain hemorrhage)": "neurological",
    "(vertigo) paroymsal  positional vertigo": "neurological",
    "fungal infection": "dermatological", "acne": "dermatological",
    "psoriasis": "dermatological", "impetigo": "dermatological",
    "malaria": "infectious", "dengue": "infectious", "typhoid": "infectious",
    "chicken pox": "infectious", "hepatitis a": "infectious",
    "hepatitis b": "infectious", "hepatitis c": "infectious",
    "hepatitis d": "infectious", "hepatitis e": "infectious",
    "urinary tract infection": "infectious",
}

def _get_contextual_advice(disease_name: str) -> dict:
    """Return dos/donts appropriate for the disease category."""
    cat = _DISEASE_CATEGORIES.get(disease_name.strip().lower(), "default")
    return _CONDITION_ADVICE.get(cat, _CONDITION_ADVICE["default"])


async def _call_gemini(message: str, history: list) -> dict | None:
    """Call Gemini API. Returns parsed dict or None on failure."""
    if not GEMINI_API_KEY:
        return None
    try:
        import httpx

        contents = []
        for h in history[-8:]:  # Increased from 6 to 8 for better context
            role = "user" if h["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h["content"]}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = {
            "system_instruction": {"parts": [{"text": GEMINI_SYSTEM}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2000},
        }

        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if r.status_code != 200:
                print(f"[Gemini] Error {r.status_code}: {r.text[:300]}")
                return None

            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]

            # Robust JSON extraction: handle markdown fences, partial JSON, etc.
            text = text.strip()
            # Remove markdown code fences
            text = re.sub(r"```json\s*", "", text)
            text = re.sub(r"\s*```", "", text)
            text = text.strip()

            try:
                return json.loads(text)
            except json.JSONDecodeError:
                # Try to extract JSON from within the text
                json_match = re.search(r'\{[\s\S]*\}', text)
                if json_match:
                    try:
                        return json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass

                # Last resort: return a minimal response using the raw text
                print(f"[Gemini] JSON parse failed, using raw text fallback")
                clean_text = _strip_md(text[:500])
                return {
                    "reply": clean_text[:200],
                    "sections": {"overview": clean_text},
                    "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
                }

    except Exception as e:
        print(f"[Gemini] Exception: {e}")
        return None


# ── Shape CSV results into frontend response format ───────────────────────────
def _shape(query_result: dict) -> dict:
    """Convert smart_query() output → frontend response shape."""
    t, data = query_result["type"], query_result["data"]

    if t == "disease_profile":
        d = data
        advice = _get_contextual_advice(d["disease"])
        return {
            "type": "disease_profile",
            "reply": f"Here's what I found about {d['disease']}.",
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
                "dos": advice["dos"],
                "donts": advice["donts"],
            },
            "preliminary_assessment": {"possible_conditions": [d["disease"]]},
            "suggested_questions": [
                f"What are the risk factors for {d['disease']}?",
                f"What medicines are commonly used for {d['disease']}?",
                f"When should I see a doctor for {d['disease']}?",
            ],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    if t in ("symptom_match", "nlp_match"):
        top = data[:5]
        conds = [r["disease"] for r in top]
        profile = get_disease_profile(top[0]["disease"]) if top else {}
        conf_txt = f"{top[0]['confidence']}% confidence" if top else ""
        advice = _get_contextual_advice(top[0]["disease"]) if top else _CONDITION_ADVICE["default"]

        # Build a richer overview
        overview = profile.get("description") or ""
        if not overview:
            overview = f"Top match: {top[0]['disease']}. {len(top)} possible conditions found."
        if len(top) > 1:
            overview += f"\n\nOther possibilities include: {', '.join(conds[1:3])}."

        return {
            "type": "symptom_analysis",
            "reply": f"Based on your symptoms, the most likely condition is {top[0]['disease']} ({conf_txt}).",
            "preliminary_assessment": {
                "possible_conditions": conds,
                "top_match": top[0]["disease"] if top else None,
            },
            "sections": {
                "overview": overview,
                "symptoms": profile.get("symptoms", [])[:8],
                "medicines": profile.get("medicines", [])[:6],
                "precautions": profile.get("precautions", [])[:5],
                "risk_factors": profile.get("risk_factors", [])[:4],
                "dos": advice["dos"],
                "donts": advice["donts"],
            },
            "suggested_questions": [
                f"Tell me more about {conds[0]}.",
                f"What medicines help with {conds[0]}?",
                f"What are the key differences between {conds[0]} and {conds[1]}?" if len(conds) > 1 else "When should I see a doctor?",
            ],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    if t == "medquad":
        best = data[0] if data else {}
        ans = best.get("answer", "")

        # Format long MedQuad answers: truncate intelligently at sentence boundaries
        if len(ans) > 400:
            # Try to break at a sentence boundary
            sentences = re.split(r'(?<=[.!?])\s+', ans)
            truncated = ""
            for s in sentences:
                if len(truncated) + len(s) > 350:
                    break
                truncated += s + " "
            reply = truncated.strip()
            if len(reply) < len(ans):
                reply += "…"
        else:
            reply = ans

        return {
            "type": "medical_qa",
            "reply": reply[:200] + ("…" if len(reply) > 200 else ""),
            "sections": {"overview": reply},
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
        if gemini_result and "reply" in gemini_result:
            gemini_result["reply"] = _strip_md(gemini_result["reply"])
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