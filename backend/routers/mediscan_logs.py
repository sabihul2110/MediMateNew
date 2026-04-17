# MediMate/backend/routers/mediscan_logs.py
# POST /api/mediscan-logs/save   — save a symptom check result
# GET  /api/mediscan-logs/       — history for current user
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import get_db
from auth import get_current_user

router = APIRouter()

class ConditionResult(BaseModel):
    disease: str
    matched_count: int
    confidence: int

class MediScanSaveRequest(BaseModel):
    symptoms_text:     Optional[str]  = None
    symptom_tags:      List[str]      = []
    severity:          int            = 5
    duration:          str            = ""
    top_conditions:    List[ConditionResult] = []
    top_match:         Optional[str]  = None

@router.post("/save", status_code=201)
async def save_scan(body: MediScanSaveRequest, user=Depends(get_current_user)):
    col = get_db()["mediscan_logs"]
    doc = { **body.model_dump(), "user_email": user["email"],
            "logged_at": datetime.now(timezone.utc).isoformat() }
    result = await col.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Scan saved."}

@router.get("/")
async def get_scan_history(limit: int = 20, user=Depends(get_current_user)):
    col  = get_db()["mediscan_logs"]
    docs = await col.find({"user_email": user["email"]}).sort("logged_at", -1).limit(limit).to_list(limit)
    for d in docs: d["_id"] = str(d["_id"])
    return {"count": len(docs), "history": docs}