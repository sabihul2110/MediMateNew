# MediMate/backend/routers/profile_router.py
# GET  /api/profile        — fetch profile
# PUT  /api/profile        — create/update profile
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from database import get_db
from auth import get_current_user

router = APIRouter()

class ProfileUpdate(BaseModel):
    name:           Optional[str]   = None
    age:            Optional[int]   = None
    sex:            Optional[str]   = None   # male | female | other
    height_cm:      Optional[float] = None
    weight_kg:      Optional[float] = None
    blood_group:    Optional[str]   = None
    allergies:      Optional[str]   = None   # comma-separated
    chronic:        Optional[str]   = None   # chronic conditions
    medications:    Optional[str]   = None   # current meds
    emergency_contact: Optional[str] = None
    phone:          Optional[str]   = None

@router.get("/")
async def get_profile(user=Depends(get_current_user)):
    col = get_db()["profiles"]
    doc = await col.find_one({"email": user["email"]}, {"_id": 0})
    return doc or {"email": user["email"]}

@router.put("/")
async def update_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    col = get_db()["profiles"]
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    data["email"] = user["email"]
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await col.update_one({"email": user["email"]}, {"$set": data}, upsert=True)
    return {"message": "Profile saved.", **data}