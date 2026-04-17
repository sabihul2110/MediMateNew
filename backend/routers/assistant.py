# MediMate/backend/routes/assistant.py
#
# Decision tree:
#   smart_query() returns type + confident flag
#   confident=True  → shape CSV data and return
#   confident=False → call Gemini, merge with any partial CSV data
#   Gemini fails    → graceful fallback message
#
# Setup:
#   pip install google-generativeai
#   .env → GEMINI_API_KEY=your_key_here

import os, json, re
import google.generativeai as genai
from flask import Blueprint, request, jsonify
from dataset_loader import smart_query, get_disease_profile, nlp_match_disease

assistant_bp = Blueprint("assistant", __name__)

# ── Gemini ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    _gemini = genai.GenerativeModel("gemini-2.0-flash")
else:
    _gemini = None
    print("[WARN] GEMINI_API_KEY not set — Gemini fallback disabled")

GEMINI_PROMPT = """You are MediMate AI, a helpful and empathetic medical assistant.
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
Only include fields you have real data for. Never diagnose definitively."""


def _gemini_call(user_message: str, history: list) -> dict | None:
    if not _gemini:
        return None
    try:
        turns = []
        for m in history[-6:]:
            role = "user" if m["role"] == "user" else "model"
            turns.append({"role": role, "parts": [m["content"]]})
        prompt = f"{GEMINI_PROMPT}\n\nUser: {user_message}"
        resp   = _gemini.generate_content(turns + [{"role": "user", "parts": [prompt]}])
        raw    = re.sub(r"^```(?:json)?|```$", "", resp.text.strip(), flags=re.MULTILINE).strip()
        return json.loads(raw)
    except Exception as e:
        print(f"[Gemini error] {e}")
        return None


# ── Shape CSV results into frontend response format ───────────────────────────
def _shape(query_result: dict) -> dict:
    t, data = query_result["type"], query_result["data"]

    if t == "disease_profile":
        d = data
        return {
            "reply": f"Here's what I found about {d['disease']}.",
            "sections": {
                "overview":     d.get("description") or f"{d['disease']} information from our clinical database.",
                "symptoms":     d.get("symptoms", []),
                "medicines":    d.get("medicines", []),
                "precautions":  d.get("precautions", []),
                "risk_factors": d.get("risk_factors", []),
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
        top      = data[:5]
        conds    = [r["disease"] for r in top]
        profile  = get_disease_profile(top[0]["disease"]) if top else {}
        conf_txt = f"{top[0]['confidence']}% confidence" if top else ""
        return {
            "reply": f"Your symptoms most closely match {top[0]['disease']} ({conf_txt}).",
            "sections": {
                "overview":     (profile.get("description")
                                 or f"Top match: {top[0]['disease']}. {len(top)} possible conditions found."),
                "symptoms":     profile.get("symptoms", []),
                "medicines":    profile.get("medicines", []),
                "precautions":  profile.get("precautions", []),
                "risk_factors": profile.get("risk_factors", []),
            },
            "preliminary_assessment": {"possible_conditions": conds},
            "suggested_questions": [
                f"Tell me more about {conds[0]}.",
                f"What medicines help with {conds[0]}?",
                "When should I see a doctor?",
            ],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    if t == "medquad":
        best = data[0]
        ans  = best.get("answer", "")
        return {
            "reply": (ans[:200] + "…") if len(ans) > 200 else ans,
            "sections": {"overview": ans},
            "suggested_questions": [d["question"] for d in data[1:3]],
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    return {}  # "none"


# ── /api/chat ─────────────────────────────────────────────────────────────────
@assistant_bp.route("/chat", methods=["POST"])
def chat():
    body    = request.get_json(force=True)
    message = body.get("message", "").strip()
    history = body.get("history", [])

    if not message:
        return jsonify({"error": "Empty message"}), 400

    # Try datasets first
    csv_result = smart_query(message)
    shaped     = _shape(csv_result)

    # Decide if Gemini is needed:
    #   - explicit not-confident from router, OR
    #   - medquad answer that is short/off-topic
    use_gemini = (
        not csv_result["confident"]
        or csv_result["type"] == "none"
        or (csv_result["type"] == "medquad"
            and len(shaped.get("sections", {}).get("overview", "")) < 150)
    )

    if use_gemini:
        g = _gemini_call(message, history)
        if g:
            g.setdefault("disclaimer",
                         "For informational purposes only. Consult a doctor for diagnosis.")
            # If we had partial CSV data (e.g. symptom match with low confidence),
            # merge it into Gemini's result so we don't waste it
            if shaped.get("sections"):
                csv_sections = shaped["sections"]
                g_sections   = g.setdefault("sections", {})
                for field in ("symptoms", "medicines", "precautions", "risk_factors"):
                    if csv_sections.get(field) and not g_sections.get(field):
                        g_sections[field] = csv_sections[field]
            return jsonify(g)

    # Return CSV result (or graceful fallback if everything failed)
    if not shaped:
        shaped = {
            "reply": "I couldn't find specific info on that. Please describe your symptoms in more detail, or ask about a specific disease.",
            "sections": {},
            "disclaimer": "For informational purposes only. Consult a doctor for diagnosis.",
        }

    return jsonify(shaped)