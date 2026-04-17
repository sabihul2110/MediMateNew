# MediMate/backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import APP_TITLE, APP_VERSION, CORS_ORIGINS
from database import ping
from routers import diseases, symptoms, bmi, vitals, chat
from routers.auth_router      import router as auth_router
from routers.health_logs      import router as logs_router
from routers.heart_risk       import router as heart_risk_router
from routers.profile_router   import router as profile_router
from routers.heart_risk_logs  import router as heart_risk_logs_router
from routers.mediscan_logs    import router as mediscan_logs_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await ping(); yield

app = FastAPI(title=APP_TITLE, version=APP_VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(diseases.router,            prefix="/api/diseases",       tags=["Diseases"])
app.include_router(symptoms.router,            prefix="/api/symptoms",       tags=["Symptoms"])
app.include_router(bmi.router,                 prefix="/api/bmi",            tags=["BMI"])
app.include_router(vitals.router,              prefix="/api/vitals",         tags=["Vitals"])
app.include_router(chat.router,                prefix="/api/chat",           tags=["AI Chat"])
app.include_router(auth_router,                prefix="/api/auth",           tags=["Auth"])
app.include_router(logs_router,                prefix="/api/logs",           tags=["Health Logs"])
app.include_router(heart_risk_router)
app.include_router(profile_router,             prefix="/api/profile",        tags=["Profile"])
app.include_router(heart_risk_logs_router,     prefix="/api/heart-risk-logs",tags=["Heart Risk Logs"])
app.include_router(mediscan_logs_router,       prefix="/api/mediscan-logs",  tags=["MediScan Logs"])

@app.get("/")
def root(): return {"status": "ok", "app": APP_TITLE}
@app.get("/health")
def health(): return {"status": "healthy"}