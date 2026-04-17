# MediMate/backend/routers/symptoms.py
# ─────────────────────────────────────────────────────────────────
# CONTEXT BLOCK
# Project: MediMate  |  Stack: React + FastAPI + MongoDB
# .venv location: MediMate/.venv  (root, NOT backend/)
# Completed: config.py, dataset_loader.py, main.py,
#            routers/diseases.py, routers/symptoms.py
# Next Goal: routers/bmi.py, routers/vitals.py, routers/chat.py
# ─────────────────────────────────────────────────────────────────
#
# Endpoints:
#   GET  /api/symptoms/              → all unique symptoms (for autocomplete)
#   POST /api/symptoms/match         → given symptoms → ranked possible diseases
#   GET  /api/symptoms/search?q=     → filter symptom list by keyword
# ─────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Query
from pydantic import BaseModel

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dataset_loader import get_all_symptoms, get_diseases_by_symptoms

router = APIRouter()


# ── Request body for symptom matching ─────────────────────────
class SymptomMatchRequest(BaseModel):
    symptoms: list[str]          # e.g. ["fatigue", "vomiting", "headache"]
    top_n:    int = 10           # how many results to return


# ── All symptoms (autocomplete) ────────────────────────────────
@router.get("/")
def list_symptoms():
    symptoms = get_all_symptoms()
    return {"count": len(symptoms), "symptoms": symptoms}


# ── Search symptoms by keyword ─────────────────────────────────
@router.get("/search")
def search_symptoms(q: str = Query(..., min_length=1)):
    all_s = get_all_symptoms()
    q_lower = q.lower()
    matched = [s for s in all_s if q_lower in s.lower()]
    return {"query": q, "count": len(matched), "results": matched}


# ── Match symptoms → diseases ──────────────────────────────────
@router.post("/match")
def match_symptoms(body: SymptomMatchRequest):
    """
    Send a list of symptoms, get back ranked possible diseases.
    Used by the MediScan screen.

    Example request body:
        { "symptoms": ["headache", "fatigue"], "top_n": 5 }
    """
    if not body.symptoms:
        return {"matched": []}

    results = get_diseases_by_symptoms(body.symptoms, top_n=body.top_n)

    # Confidence is already calculated by dataset_loader (severity-weighted).
    # No need to override it here.

    return {
        "symptoms_provided": body.symptoms,
        "total_matches":     len(results),
        "results":           results,
    }