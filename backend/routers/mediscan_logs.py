# MediMate/backend/routers/mediscan_logs.py
# Replace your existing mediscan_logs.py with this.
# Adds: DELETE /api/mediscan-logs/{log_id}
# Keeps: POST /save  and  GET /  (unchanged)

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from database import get_db
from auth import get_current_user

router = APIRouter()

# ── models ────────────────────────────────────────────────────────────────────
class TopCondition(BaseModel):
    disease: str
    matched_count: int
    confidence: float

class MediScanLog(BaseModel):
    symptoms_text:  str           = ""
    symptom_tags:   List[str]     = []
    severity:       int           = 5
    duration:       str           = ""
    top_conditions: List[TopCondition] = []
    top_match:      Optional[str] = None

# ── helper ────────────────────────────────────────────────────────────────────
def _str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ── POST /api/mediscan-logs/save ──────────────────────────────────────────────
@router.post("/save")
async def save_mediscan(log: MediScanLog, current_user: dict = Depends(get_current_user)):
    doc = log.dict()
    doc["user_id"]    = str(current_user["_id"])
    doc["created_at"] = datetime.utcnow()
    result = await get_db()["mediscan_logs"].insert_one(doc)
    return {"success": True, "id": str(result.inserted_id)}


# ── GET /api/mediscan-logs/ ───────────────────────────────────────────────────
@router.get("/")
async def get_mediscan_history(limit: int = 20, current_user: dict = Depends(get_current_user)):
    cursor = get_db()["mediscan_logs"].find(
        {"user_id": str(current_user["_id"])},
        sort=[("created_at", -1)],
        limit=limit,
    )
    docs = [_str_id(doc) async for doc in cursor]
    return {"history": docs, "total": len(docs)}


# ── DELETE /api/mediscan-logs/all ─────────────────────────────────────────────
@router.delete("/all")
async def clear_mediscan_history(current_user: dict = Depends(get_current_user)):
    result = await get_db()["mediscan_logs"].delete_many(
        {"user_id": str(current_user["_id"])}
    )
    return {"deleted": result.deleted_count, "message": "MediScan history cleared."}


# ── DELETE /api/mediscan-logs/{log_id} ───────────────────────────────────────
@router.delete("/{log_id}")
async def delete_mediscan(log_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(log_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid log ID")

    result = await get_db()["mediscan_logs"].delete_one({
        "_id":     oid,
        "user_id": str(current_user["_id"]),   # owner-scoped — can't delete others' logs
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"success": True, "deleted_id": log_id}