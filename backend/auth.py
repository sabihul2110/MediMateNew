# MediMate/backend/auth.py
# JWT creation + verification + password hashing.
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

pwd_ctx   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2    = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire  = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    payload.update({"exp": expire})
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token: str = Depends(oauth2)):
    """FastAPI dependency — use in any protected route."""
    from database import users_col
    payload = decode_token(token)
    email   = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await users_col().find_one({"email": email}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user["_id"] = str(user["_id"])
    return user