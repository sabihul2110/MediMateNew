# MediMate/backend/routers/auth_router.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from database import users_col, get_db
from auth import hash_password, verify_password, create_token, create_refresh_token, get_current_user
from jose import JWTError, jwt
from config import JWT_SECRET, JWT_ALGORITHM

router = APIRouter()

class SignupRequest(BaseModel):
    name:       str   = Field(..., min_length=1, max_length=80)
    email:      str   = Field(..., min_length=5)
    password:   str   = Field(..., min_length=6)
    # Optional onboarding fields collected at signup
    age:        int   = None
    sex:        str   = None
    height_cm:  float = None
    weight_kg:  float = None
    blood_group:str   = None

class LoginRequest(BaseModel):
    email:    str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str = Field(..., min_length=6)

@router.post("/signup", status_code=201)
async def signup(body: SignupRequest):
    col = users_col()
    if await col.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered.")
    doc = {
        "name":          body.name.strip(),
        "email":         body.email.lower().strip(),
        "password_hash": hash_password(body.password),
        "avatar":        body.name[0].upper(),
        "created_at":    datetime.now(timezone.utc).isoformat(),
    }
    result = await col.insert_one(doc)

    # Save onboarding data to profile immediately if provided
    profile_data = {k: v for k, v in {
        "age": body.age, "sex": body.sex,
        "height_cm": body.height_cm, "weight_kg": body.weight_kg,
        "blood_group": body.blood_group,
    }.items() if v is not None}

    if profile_data:
        profile_data["email"]      = body.email.lower().strip()
        profile_data["name"]       = body.name.strip()
        profile_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await get_db()["profiles"].update_one({"email": body.email.lower()}, {"$set": profile_data}, upsert=True)

    token         = create_token({"sub": doc["email"]})
    refresh_token = create_refresh_token({"sub": doc["email"]})
    return {"token": token, "refresh_token": refresh_token, "user": {"id": str(result.inserted_id), "name": doc["name"], "email": doc["email"], "avatar": doc["avatar"]}}

@router.post("/login")
async def login(body: LoginRequest):
    col  = users_col()
    user = await col.find_one({"email": body.email.lower().strip()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token         = create_token({"sub": user["email"]})
    refresh_token = create_refresh_token({"sub": user["email"]})
    return {"token": token, "refresh_token": refresh_token, "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "avatar": user.get("avatar", user["name"][0].upper())}}

@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return current_user

@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, user=Depends(get_current_user)):
    col  = users_col()
    doc  = await col.find_one({"email": user["email"]})
    if not verify_password(body.current_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    await col.update_one({"email": user["email"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"message": "Password changed successfully."}


class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh")
async def refresh(body: RefreshRequest):
    try:
        payload = jwt.decode(body.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Expired or invalid refresh token")
    token = create_token({"sub": email})
    return {"token": token}