# MediMate/backend/routers/diseases.py
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
#   GET  /api/diseases/             → list all diseases
#   GET  /api/diseases/search?q=    → search diseases by name
#   GET  /api/diseases/{name}       → full profile for one disease
#   GET  /api/diseases/{name}/medicines
#   GET  /api/diseases/{name}/precautions
#   GET  /api/diseases/{name}/risk-factors
# ─────────────────────────────────────────────────────────────────

from fastapi import APIRouter, HTTPException, Query

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # add backend/ to path

from dataset_loader import (
    get_all_diseases,
    get_disease_profile,
    get_medicines_for_disease,
    get_precautions_for_disease,
    get_risk_factors_for_disease,
)

router = APIRouter()


# ── List all diseases ──────────────────────────────────────────
@router.get("/")
def list_diseases():
    diseases = get_all_diseases()
    return {"count": len(diseases), "diseases": diseases}


# ── Search diseases by name substring ─────────────────────────
@router.get("/search")
def search_diseases(q: str = Query(..., min_length=1, description="Search term")):
    all_d = get_all_diseases()
    q_lower = q.lower()
    matched = [d for d in all_d if q_lower in d.lower()]
    return {"query": q, "count": len(matched), "results": matched}


# ── Full profile for one disease ───────────────────────────────
@router.get("/{name}")
def disease_profile(name: str):
    profile = get_disease_profile(name)
    if not profile["symptoms"] and not profile["medicines"]:
        raise HTTPException(status_code=404, detail=f"Disease '{name}' not found in datasets.")
    return profile


# ── Medicines only ─────────────────────────────────────────────
@router.get("/{name}/medicines")
def disease_medicines(name: str):
    meds = get_medicines_for_disease(name)
    if not meds:
        raise HTTPException(status_code=404, detail=f"No medicine data for '{name}'.")
    return {"disease": name, "medicines": meds}


# ── Precautions only ──────────────────────────────────────────
@router.get("/{name}/precautions")
def disease_precautions(name: str):
    prec = get_precautions_for_disease(name)
    if not prec:
        raise HTTPException(status_code=404, detail=f"No precaution data for '{name}'.")
    return {"disease": name, "precautions": prec}


# ── Risk factors only ─────────────────────────────────────────
@router.get("/{name}/risk-factors")
def disease_risk_factors(name: str):
    risks = get_risk_factors_for_disease(name)
    if not risks:
        raise HTTPException(status_code=404, detail=f"No risk factor data for '{name}'.")
    return {"disease": name, "risk_factors": risks}