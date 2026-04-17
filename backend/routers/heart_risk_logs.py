# MediMate/backend/routers/heart_risk_logs.py
# POST /api/heart-risk-logs/save   — save a risk prediction result
# GET  /api/heart-risk-logs/       — get history for current user
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import get_db
from auth import get_current_user

router = APIRouter()

class RiskFactor(BaseModel):
    factor: str
    impact: str
    value: str
    description: str

class HeartRiskSaveRequest(BaseModel):
    risk_level:           str
    probability:          float
    probability_pct:      float
    score:                float
    risk_color:           str
    contributing_factors: List[RiskFactor]
    recommendations:      List[str]
    mode:                 str = "self"   # "self" | "other"
    # Input snapshot (what was entered)
    input_snapshot: Optional[dict] = None

@router.post("/save", status_code=201)
async def save_risk_result(body: HeartRiskSaveRequest, user=Depends(get_current_user)):
    col = get_db()["heart_risk_logs"]
    doc = {
        **body.model_dump(),
        "user_email": user["email"],
        "logged_at":  datetime.now(timezone.utc).isoformat(),
    }
    result = await col.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Heart risk result saved."}

@router.get("/")
async def get_risk_history(limit: int = 20, user=Depends(get_current_user)):
    col  = get_db()["heart_risk_logs"]
    docs = await col.find({"user_email": user["email"]}).sort("logged_at", -1).limit(limit).to_list(limit)
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"count": len(docs), "history": docs}