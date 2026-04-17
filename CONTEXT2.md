# MediMate — Complete Project Context
> Paste this file at the start of any new chat to continue the project.
> Last updated: Phase 3 complete.

---

## Tech Stack
| Layer    | Tech |
|----------|------|
| Frontend | React 18 + Vite + Tailwind v3 (inline styles used) |
| Backend  | FastAPI (Python 3.14) |
| Database | MongoDB Atlas (M0 free, AWS Mumbai) |
| AI       | Hybrid: CSV/RAG Phase 1, Logistic Regression (Heart Risk) |
| State    | React Context (ThemeContext) |
| Routing  | React Router v6 |
| HTTP     | Axios |
| Icons    | Lucide React |
| Auth     | JWT (python-jose) + bcrypt (passlib) |

---

## Folder Structure
```
MediMate/
├── PROJECT_CONTEXT.md
├── setup_frontend.sh
├── .venv/                        ← Python venv at ROOT
├── datasets/
│   ├── DiseaseAndSymptoms.csv
│   ├── medquad.csv
│   ├── disease_medicine.csv
│   ├── disease_precaution.csv
│   ├── disease_riskFactors.csv
│   ├── disease_symptoms.csv
│   └── Disease precaution.csv
├── backend/
│   ├── .env                      ← MONGO_URI, JWT_SECRET (never commit)
│   ├── main.py
│   ├── config.py
│   ├── database.py               ← Motor async MongoDB
│   ├── auth.py                   ← JWT + bcrypt
│   ├── dataset_loader.py         ← token-based symptom matching
│   └── routers/
│       ├── __init__.py
│       ├── diseases.py           ← /api/diseases/*
│       ├── symptoms.py           ← /api/symptoms/*
│       ├── bmi.py                ← /api/bmi/calculate
│       ├── vitals.py             ← /api/vitals/analyze
│       ├── chat.py               ← /api/chat/message (structured RAG)
│       ├── auth_router.py        ← /api/auth/signup|login|me
│       ├── health_logs.py        ← /api/logs/* (save/retrieve all logs)
│       ├── heart_risk.py         ← /api/heart-risk/predict (LR model)
│       └── profile_router.py     ← /api/profile GET/PUT
└── frontend/
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx               ← auth guard + all routes
        ├── index.css             ← CSS vars light/dark
        ├── context/
        │   └── ThemeContext.jsx  ← theme + user auth state
        ├── api/
        │   └── index.js          ← ALL API calls centralised
        ├── layouts/
        │   └── AppLayout.jsx     ← sidebar + topbar + theme toggle
        └── pages/
            ├── Auth.jsx          ← real JWT login/signup
            ├── Dashboard.jsx     ← hero, quick actions, history
            ├── MediScan.jsx      ← AI symptom checker
            ├── Tracking.jsx      ← Vitals|BMI|Sleep|Activity tabs
            ├── Assistant.jsx     ← AI chat, structured cards
            ├── Insights.jsx      ← real data trends + Risk Engine
            ├── Emergency.jsx     ← type selector, steps, 911
            ├── HeartRisk.jsx     ← LR model + Self/Other switch
            └── Profile.jsx       ← medical profile form
```

---

## Commands
```bash
# Backend (from MediMate/ root)
source .venv/bin/activate
cd backend && uvicorn main:app --reload --port 8000

# Frontend (from MediMate/frontend/)
npm run dev
# → http://localhost:5173 or 5174

# Install backend deps (once)
pip install pandas fastapi uvicorn python-multipart motor pymongo \
            python-jose[cryptography] passlib[bcrypt]
```

---

## All API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT token |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/profile/` | Bearer | Get medical profile |
| PUT | `/api/profile/` | Bearer | Save/update profile |
| GET | `/api/diseases/` | No | All diseases |
| GET | `/api/diseases/search?q=` | No | Search |
| GET | `/api/diseases/{name}` | No | Full profile |
| POST | `/api/symptoms/match` | No | `{symptoms:[],top_n}` |
| POST | `/api/bmi/calculate` | No | `{height_cm, weight_kg}` |
| POST | `/api/vitals/analyze` | No | Full vitals → flags |
| POST | `/api/chat/message` | No | Structured AI response |
| POST | `/api/heart-risk/predict` | No | LR risk model |
| POST | `/api/logs/vitals` | Bearer | Save vitals |
| POST | `/api/logs/bmi` | Bearer | Save BMI |
| POST | `/api/logs/sleep` | Bearer | Save sleep |
| POST | `/api/logs/activity` | Bearer | Save activity |
| GET | `/api/logs/history` | Bearer | All logs sorted desc |

---

## UX Flow
```
/auth → Login/Signup (real JWT)
  └── /  Dashboard
        ├── /mediscan    MediScan AI (token-based symptom matching)
        ├── /tracking    Vitals|BMI|Sleep|Activity tabs (saves to MongoDB)
        ├── /heart-risk  Heart Risk Predictor (Self/Other, profile auto-fill)
        ├── /assistant   AI Chat (structured: symptoms→medicines→dos/donts)
        ├── /insights    Real data trends + Risk Score Engine
        ├── /emergency   Type selector + steps + 911
        └── /profile     Medical profile (name,age,sex,height,weight,etc)
```

---

## Design Tokens
| Token | Value |
|-------|-------|
| Primary | `#1B3A6B` |
| Primary light | `#2952A3` |
| Accent | `#22C55E` |
| Danger | `#DC2626` |
| Warning | `#F59E0B` |
| BG light | `#F4F6FA` |
| BG dark | `#0F172A` |
| Surface dark | `#1E293B` |
| Font | DM Sans |

---

## Completed Files (all ✅)

### Backend
config.py, database.py, auth.py, main.py, dataset_loader.py (token matching),
routers: diseases, symptoms, bmi, vitals, chat (structured), auth_router,
health_logs, heart_risk (LR model), profile_router

### Frontend
ThemeContext, index.css (CSS vars), App.jsx, main.jsx, api/index.js,
AppLayout (sidebar+theme+profile), Auth (real JWT), Dashboard (working nav),
MediScan (full AI), Tracking (4 tabs, saves to MongoDB), Assistant (structured cards),
Insights (real data + Risk Engine), Emergency, HeartRisk (Self/Other), Profile

---

## Key Fixes Applied
- Symptom matching: token-based (splits "high_fever" → matches "fever")
- Chat: disease name detected first, then symptoms, then MedQuad fallback
- Chat responses: structured cards — symptoms, medicines, dos, donts, precautions
- Dashboard quick action cards: proper onClick navigation
- Auth: real JWT API calls (no more mock localStorage)
- Insights: real data from /api/logs/history (not hardcoded)
- HeartRisk: Self mode auto-fills age/sex/BMI from /api/profile
- Profile: saves to MongoDB, updates sidebar name/avatar

---

## .env (backend/.env) — NEVER commit
```
MONGO_URI=mongodb+srv://medimate_user:PASSWORD@medimate.xxxxx.mongodb.net/medimate?retryWrites=true&w=majority
MONGO_DB=medimate
JWT_SECRET=your_long_random_secret_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
```

---

## Next Steps (Phase 4)
1. Save Heart Risk results to MongoDB (new collection)
2. Recharts for real graphs in Insights
3. Tracking page "Save" buttons wire up to /api/logs/* endpoints
4. MediScan results save to history
5. Dashboard greeting use real user name from profile
6. Deploy: Railway (backend) + Vercel (frontend)
7. PDF export of health report