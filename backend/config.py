# MediMate/backend/config.py
from pathlib import Path
import os

# Load .env manually (no python-dotenv needed)
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "datasets"
 
DATASETS = {
    # ── NEW (Kaggle 2024) ────────────────────────────────────────────────────
    "dataset_kaggle":        DATASET_DIR / "dataset.csv",              # 4920 rows  ← PRIMARY
    "symptom_description":   DATASET_DIR / "symptom_Description.csv", # 41 diseases → plain text description
    "symptom_precaution":    DATASET_DIR / "symptom_precaution.csv",  # 41 diseases → 4 precautions each
    "symptom_severity":      DATASET_DIR / "Symptom-severity.csv",    # 133 symptoms → weight 1-7
    "symptom2disease":       DATASET_DIR / "Symptom2Disease.csv",     # 1200 NLP descriptions → label
 
    # ── EXISTING ─────────────────────────────────────────────────────────────
    "disease_and_symptoms":  DATASET_DIR / "DiseaseAndSymptoms.csv",  # wide symptom matrix (fallback)
    "disease_symptoms":      DATASET_DIR / "disease_symptoms.csv",    # long format (fallback)
    "disease_medicine":      DATASET_DIR / "disease_medicine.csv",    # Medicine_ID / Disease_ID
    "disease_precaution":    DATASET_DIR / "Disease precaution.csv",  # precautions v1
    "disease_precaution_v2": DATASET_DIR / "disease_precaution.csv", # precautions v2
    "disease_risk_factors":  DATASET_DIR / "disease_riskFactors.csv",# DID / DNAME / RISKFAC / OCCUR
    "medquad":               DATASET_DIR / "medquad.csv",             # 16 412 NIH QA pairs
}

# ── MongoDB Atlas ───────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.environ.get("MONGO_DB",  "medimate")

# ── JWT ─────────────────────────────────────────────────────────
JWT_SECRET          = os.environ.get("JWT_SECRET", "dev_secret_change_in_prod")
JWT_ALGORITHM       = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES  = int(os.environ.get("JWT_EXPIRE_MINUTES", 10080))  # 7 days

# ── App ─────────────────────────────────────────────────────────
APP_TITLE   = "MediMate API"
APP_VERSION = "1.0.0"
DEBUG       = True

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
]