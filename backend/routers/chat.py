# MediMate/backend/routers/chat.py
#
# Fallback priority:
#   1. CSV datasets (smart_query — 12 files, now + semantic layer)
#   2. Gemini (if confident=False or type=none)
#   3. HF Inference API (if Gemini key missing OR Gemini fails)
#   4. Graceful static fallback
#
# .env keys needed:
#   GEMINI_API_KEY=...   (optional — for Gemini)
#   HF_API_TOKEN=...     (optional — for HF fallback)

import sys, os, re, json
from datetime import datetime
from bson import ObjectId

def _strip_md(text: str) -> str:
    return re.sub(r"\*{1,2}(.+?)\*{1,2}", r"\1", text) if text else text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dataset_loader import (
    smart_query, get_disease_profile, nlp_match_disease,
    search_medquad, get_diseases_by_symptoms, get_all_diseases,
)
from database import get_db
from auth import get_current_user

router = APIRouter()

# ── API keys ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
HF_API_TOKEN   = os.environ.get("HF_API_TOKEN", "")

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-2.0-flash:generateContent"
)
HF_MODEL_URL = "https://api-inference.huggingface.co/models/google/flan-t5-base"

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


# ── Contextual dos/donts ──────────────────────────────────────────────────────
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
            "Don't ignore sudden, severe headaches — may need emergency evaluation",
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
    cat = _DISEASE_CATEGORIES.get(disease_name.strip().lower(), "default")
    return _CONDITION_ADVICE.get(cat, _CONDITION_ADVICE["default"])


# ── Gemini call ───────────────────────────────────────────────────────────────
async def _call_gemini(message: str, history: list) -> dict | None:
    if not GEMINI_API_KEY:
        return None
    try:
        import httpx

        contents = []
        for h in history[-8:]:
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
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            text = re.sub(r"```json\s*", "", text)
            text = re.sub(r"\s*```", "", text).strip()

            try:
                return json.loads(text)
            except json.JSONDecodeError:
                match = re.search(r'\{[\s\S]*\}', text)
                if match:
                    try:
                        return json.loads(match.group())
                    except json.JSONDecodeError:
                        pass
                clean = _strip_md(text[:500])
                return {
                    "reply": clean[:200],
                    "sections": {"overview": clean},
                    "disclaimer": "For informational purposes only. Consult a doctor.",
                }
    except Exception as e:
        print(f"[Gemini] Exception: {e}")
        return None


# ── HF Inference API call ─────────────────────────────────────────────────────
async def _call_hf(message: str) -> dict | None:
    """
    Calls google/flan-t5-base via HF Inference API.
    Returns a response dict in the same shape as _call_gemini output.
    Falls back to None if token missing or request fails.
    """
    if not HF_API_TOKEN:
        return None
    try:
        import httpx

        prompt = (
            "You are a helpful medical assistant. "
            "Answer clearly and concisely in 2-4 sentences. "
            f"Question: {message}\nAnswer:"
        )

        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                HF_MODEL_URL,
                headers={"Authorization": f"Bearer {HF_API_TOKEN}"},
                json={
                    "inputs": prompt,
                    "parameters": {
                        "max_new_tokens": 200,
                        "temperature": 0.3,
                        "do_sample": False,
                    },
                },
            )
            if r.status_code == 503:
                # Model loading — common on free tier cold start
                print("[HF] Model loading (503). Will use static fallback.")
                return None
            if r.status_code != 200:
                print(f"[HF] Error {r.status_code}: {r.text[:200]}")
                return None

            data = r.json()

            # flan-t5 returns list of {"generated_text": "..."}
            if isinstance(data, list) and data:
                raw = data[0].get("generated_text", "")
            elif isinstance(data, dict):
                raw = data.get("generated_text", str(data))
            else:
                return None

            # flan-t5 echoes the prompt — strip it
            if "Answer:" in raw:
                raw = raw.split("Answer:")[-1].strip()

            raw = _strip_md(raw.strip())
            if not raw:
                return None

            return {
                "type":    "hf_answer",
                "reply":   raw[:400],
                "sections": {"overview": raw},
                "disclaimer": (
                    "AI-generated response. For informational purposes only. "
                    "Consult a healthcare professional for diagnosis."
                ),
                "suggested_questions": [
                    "When should I see a doctor?",
                    "What medicines can help?",
                    "Tell me more about this condition.",
                ],
            }
    except Exception as e:
        print(f"[HF] Exception: {e}")
        return None


# ── Shape CSV result ──────────────────────────────────────────────────────────
def _shape(query_result: dict) -> dict:
    t, data = query_result["type"], query_result["data"]

    if t == "disease_profile":
        d = data
        advice = _get_contextual_advice(d["disease"])
        return {
            "type": "disease_profile",
            "reply": f"Here's what I found about {d['disease']}.",
            "disease": d["disease"],
            "sections": {
                "overview":     d.get("description") or f"{d['disease']} is a medical condition identified in our clinical database.",
                "symptoms":     d.get("symptoms", [])[:8],
                "medicines":    d.get("medicines", [])[:6],
                "precautions":  d.get("precautions", [])[:5],
                "risk_factors": d.get("risk_factors", [])[:4],
                "dos":          advice["dos"],
                "donts":        advice["donts"],
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
        top    = data[:5]
        conds  = [r["disease"] for r in top]
        profile = get_disease_profile(top[0]["disease"]) if top else {}
        conf_txt = f"{top[0]['confidence']}% confidence" if top else ""
        advice   = _get_contextual_advice(top[0]["disease"]) if top else _CONDITION_ADVICE["default"]

        overview = profile.get("description") or ""
        if not overview:
            overview = f"Top match: {top[0]['disease']}. {len(top)} possible conditions found."
        if len(top) > 1:
            overview += f"\n\nOther possibilities include: {', '.join(conds[1:3])}."

        return {
            "type":  "symptom_analysis",
            "reply": f"Based on your symptoms, the most likely condition is {top[0]['disease']} ({conf_txt}).",
            "preliminary_assessment": {
                "possible_conditions": conds,
                "top_match": top[0]["disease"] if top else None,
            },
            "sections": {
                "overview":     overview,
                "symptoms":     profile.get("symptoms", [])[:8],
                "medicines":    profile.get("medicines", [])[:6],
                "precautions":  profile.get("precautions", [])[:5],
                "risk_factors": profile.get("risk_factors", [])[:4],
                "dos":          advice["dos"],
                "donts":        advice["donts"],
            },
            "suggested_questions": [
                f"Tell me more about {conds[0]}.",
                f"What medicines help with {conds[0]}?",
                (f"What are the key differences between {conds[0]} and {conds[1]}?"
                 if len(conds) > 1 else "When should I see a doctor?"),
            ],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    if t == "medquad":
        best = data[0] if data else {}
        ans  = best.get("answer", "")
        if len(ans) > 400:
            sentences = re.split(r'(?<=[.!?])\s+', ans)
            truncated = ""
            for s in sentences:
                if len(truncated) + len(s) > 350:
                    break
                truncated += s + " "
            reply = truncated.strip() + ("…" if truncated.strip() else "")
        else:
            reply = ans

        return {
            "type":  "medical_qa",
            "reply": reply[:200] + ("…" if len(reply) > 200 else ""),
            "sections": {"overview": reply},
            "suggested_questions": [d["question"] for d in data[1:3]],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    return {}


def _fallback() -> dict:
    return {
        "type":  "fallback",
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


def _str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ── Models ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []

_GENERAL_Q_TRIGGERS = {
    "difference", "between", "compare", "explain", "what is", "what are",
    "how does", "how do", "why is", "why do", "define", "meaning of",
    "types of", "causes of", "how to treat", "how to prevent",
}

def _is_general_question(msg: str) -> bool:
    """Returns True if message looks like a knowledge question, not symptom report."""
    m = msg.lower()
    # Has question word but no first-person symptom language
    has_q_trigger = any(t in m for t in _GENERAL_Q_TRIGGERS)
    has_symptoms  = any(w in m for w in ["i have", "i feel", "i am", "my ", "been having"])
    return has_q_trigger and not has_symptoms


# ── POST /api/chat/message ────────────────────────────────────────────────────
@router.post("/message")
async def chat_message(body: ChatRequest, current_user: dict = Depends(get_current_user)):
    msg = body.message.strip()
    if not msg:
        return _fallback()

    # Step 1: CSV datasets (now includes semantic blending in smart_query)
    csv_result = smart_query(msg)
    shaped     = _shape(csv_result)

    # Decide whether external LLM needed
    use_llm = (
        not csv_result["confident"]
        or csv_result["type"] == "none"
        or (
            csv_result["type"] == "medquad"
            and len(shaped.get("sections", {}).get("overview", "")) < 150
        )
        or _is_general_question(msg)   # ← add this
    )


    final = None

    if use_llm:
        # Step 2: Try Gemini first
        llm_result = await _call_gemini(msg, body.history)

        # Step 3: Gemini failed or missing key → try HF
        if not llm_result:
            llm_result = await _call_hf(msg)

        if llm_result:
            if "reply" in llm_result:
                llm_result["reply"] = _strip_md(llm_result["reply"])
            llm_result.setdefault(
                "disclaimer",
                "For informational purposes only. Consult a doctor for diagnosis.",
            )
            llm_result.setdefault(
                "suggested_questions",
                ["Tell me more.", "When should I see a doctor?", "What medicines can help?"],
            )
            # Enrich LLM result with any CSV data it missed
            if shaped.get("sections"):
                csv_sec = shaped["sections"]
                g_sec   = llm_result.setdefault("sections", {})
                for field in ("symptoms", "medicines", "precautions", "risk_factors"):
                    if csv_sec.get(field) and not g_sec.get(field):
                        g_sec[field] = csv_sec[field]
            final = llm_result
        else:
            # All LLMs unavailable — use CSV shaped or static fallback
            final = shaped if shaped else _fallback()
    else:
        final = shaped if shaped else _fallback()

    # Persist to DB (non-fatal)
    try:
        await get_db()["chat_logs"].insert_one({
            "user_id":    str(current_user["_id"]),
            "query":      msg,
            "reply":      final.get("reply", ""),
            "type":       final.get("type", "unknown"),
            "created_at": datetime.utcnow(),
        })
    except Exception as e:
        print(f"[ChatLog] DB save failed (non-fatal): {e}")

    return final


# ── GET /api/chat/history ─────────────────────────────────────────────────────
@router.get("/history")
async def get_chat_history(limit: int = 100, current_user: dict = Depends(get_current_user)):
    cursor = get_db()["chat_logs"].find(
        {"user_id": str(current_user["_id"])},
        sort=[("created_at", -1)],
        limit=limit,
    )
    docs = [_str_id(doc) async for doc in cursor]
    return {"history": docs, "total": len(docs)}


# ── DELETE /api/chat/history/{log_id} ────────────────────────────────────────
@router.delete("/history/{log_id}")
async def delete_chat_entry(log_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(log_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid log ID")
    result = await get_db()["chat_logs"].delete_one({
        "_id":     oid,
        "user_id": str(current_user["_id"]),
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"success": True, "deleted_id": log_id}


# ── DELETE /api/chat/history/all ──────────────────────────────────────────────
@router.delete("/history/all")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    result = await get_db()["chat_logs"].delete_many(
        {"user_id": str(current_user["_id"])}
    )
    return {"deleted": result.deleted_count, "message": "Chat history cleared."}