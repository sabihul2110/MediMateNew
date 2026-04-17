# MediMate/backend/routers/health_logs.py
# Saves + retrieves vitals, BMI, sleep, activity for the logged-in user.
# POST /api/logs/vitals       — save a vitals entry
# POST /api/logs/bmi          — save a BMI entry
# POST /api/logs/sleep        — save a sleep entry
# POST /api/logs/activity     — save an activity entry
# GET  /api/logs/history      — get all logs for current user (paginated)
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from database import vitals_col, bmi_col, sleep_col, activity_col
from auth import get_current_user

router = APIRouter()

def _now(): return datetime.now(timezone.utc).isoformat()

# ── Vitals ─────────────────────────────────────────────────────
class VitalsLog(BaseModel):
    heart_rate:    float
    systolic_bp:   float
    diastolic_bp:  float
    spo2:          float
    blood_sugar:   float
    temperature_f: float
    sugar_type:    str = "fasting"
    overall:       Optional[str] = None

@router.post("/vitals")
async def save_vitals(body: VitalsLog, user=Depends(get_current_user)):
    doc = {**body.model_dump(), "user_email": user["email"], "logged_at": _now()}
    result = await vitals_col().insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Vitals saved."}

# ── BMI ────────────────────────────────────────────────────────
class BMILog(BaseModel):
    height_cm: float
    weight_kg: float
    bmi:       float
    category:  str

@router.post("/bmi")
async def save_bmi(body: BMILog, user=Depends(get_current_user)):
    doc = {**body.model_dump(), "user_email": user["email"], "logged_at": _now()}
    result = await bmi_col().insert_one(doc)
    return {"id": str(result.inserted_id), "message": "BMI saved."}

# ── Sleep ──────────────────────────────────────────────────────
class SleepLog(BaseModel):
    hours:   float
    quality: str

@router.post("/sleep")
async def save_sleep(body: SleepLog, user=Depends(get_current_user)):
    doc = {**body.model_dump(), "user_email": user["email"], "logged_at": _now()}
    result = await sleep_col().insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Sleep logged."}

# ── Activity ───────────────────────────────────────────────────
class ActivityLog(BaseModel):
    steps:         int
    exercise_mins: int

@router.post("/activity")
async def save_activity(body: ActivityLog, user=Depends(get_current_user)):
    doc = {**body.model_dump(), "user_email": user["email"], "logged_at": _now()}
    result = await activity_col().insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Activity logged."}

# ── History (all types, last 30 entries) ───────────────────────
@router.get("/history")
async def get_history(limit: int = 30, user=Depends(get_current_user)):
    email = user["email"]
    async def _fetch(col, kind, fields):
        docs = await col.find({"user_email": email}).sort("logged_at", -1).limit(limit).to_list(limit)
        return [{"type": kind, "logged_at": d["logged_at"], **{k: d.get(k) for k in fields}} for d in docs]

    vitals   = await _fetch(vitals_col(),   "vitals",   ["heart_rate","systolic_bp","diastolic_bp","spo2","overall"])
    bmis     = await _fetch(bmi_col(),      "bmi",      ["bmi","category"])
    sleeps   = await _fetch(sleep_col(),    "sleep",    ["hours","quality"])
    acts     = await _fetch(activity_col(), "activity", ["steps","exercise_mins"])

    all_logs = sorted(vitals + bmis + sleeps + acts, key=lambda x: x["logged_at"], reverse=True)
    return {"count": len(all_logs), "logs": all_logs[:limit]}