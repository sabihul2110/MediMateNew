# MediMate — Complete Project Context
> Paste this file at the start of any new chat to continue the project seamlessly.
> **Always update this file when files are added/changed.**

---

## Project Overview
**MediMate** is a production-grade AI healthcare web app.
- AI-powered symptom analysis (MediScan)
- Health tracking (vitals, BMI, sleep, activity)
- AI chat assistant with MedQuad RAG
- Health insights with trends and risk scores
- Emergency guidance
- Auth (login/signup) + light/dark theme

---

## Tech Stack
| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 18 + Vite + Tailwind v3             |
| Backend  | FastAPI (Python 3.14)                     |
| Database | MongoDB (not yet connected — future)      |
| AI       | Hybrid: CSV/RAG (Phase 1), LLM (Phase 2) |
| State    | React Context (ThemeContext)              |
| Routing  | React Router v6                           |
| HTTP     | Axios                                     |
| Icons    | Lucide React                              |

---

## Folder Structure
```
MediMate/
├── PROJECT_CONTEXT.md          ← THIS FILE — always update
├── setup_frontend.sh           ← one-shot scaffold script (already run)
├── .venv/                      ← Python venv (ROOT level, NOT backend/)
│
├── datasets/
│   ├── DiseaseAndSymptoms.csv  ← wide: Disease, Symptom_1…17
│   ├── medquad.csv             ← medical Q&A pairs
│   ├── disease_medicine.csv    ← disease → medicines
│   ├── disease_precaution.csv  ← disease → precautions
│   ├── disease_riskFactors.csv ← disease → risk factors
│   ├── disease_symptoms.csv    ← long format
│   └── Disease precaution.csv  ← duplicate precaution v2
│
├── backend/
│   ├── main.py                 ← FastAPI app, mounts all routers
│   ├── config.py               ← paths, CORS origins, Mongo URI
│   ├── dataset_loader.py       ← loads 7 CSVs, exposes helper fns
│   └── routers/
│       ├── __init__.py
│       ├── diseases.py         ← /api/diseases/*
│       ├── symptoms.py         ← /api/symptoms/*
│       ├── bmi.py              ← /api/bmi/calculate
│       ├── vitals.py           ← /api/vitals/analyze
│       └── chat.py             ← /api/chat/message (MedQuad RAG)
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js      ← custom tokens (primary, accent, etc.)
    ├── package.json
    └── src/
        ├── main.jsx            ← React entry point
        ├── App.jsx             ← Router + auth guard + all routes
        ├── index.css           ← CSS variables for light/dark theme
        ├── context/
        │   └── ThemeContext.jsx← theme (light/dark) + user auth state
        ├── api/
        │   └── index.js        ← all axios API calls in one place
        ├── layouts/
        │   └── AppLayout.jsx   ← sidebar + topbar shell (theme-aware)
        └── pages/
            ├── Auth.jsx        ← login + signup (mock auth, localStorage)
            ├── Dashboard.jsx   ← hero, quick actions, history, vitals
            ├── MediScan.jsx    ← symptom checker (tags + text + AI)
            ├── Tracking.jsx    ← tabbed: Vitals | BMI | Sleep | Activity
            ├── Assistant.jsx   ← AI chat with structured response cards
            ├── Insights.jsx    ← trends, sparklines, risk scores, history
            └── Emergency.jsx   ← type selector, steps, call 911, hospital
```

---

## Commands

### Backend
```bash
# From MediMate/ root
source .venv/bin/activate

# Run backend (from backend/)
cd backend
uvicorn main:app --reload --port 8000

# Test
open http://localhost:8000/docs
```

### Frontend
```bash
# From MediMate/frontend/
npm run dev
# Runs on http://localhost:5173 (or 5174 if port taken)
```

---

## API Routes (all working)

### /api/diseases
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/diseases/` | All disease names |
| GET | `/api/diseases/search?q=` | Search by name |
| GET | `/api/diseases/{name}` | Full profile |
| GET | `/api/diseases/{name}/medicines` | Medicines |
| GET | `/api/diseases/{name}/precautions` | Precautions |
| GET | `/api/diseases/{name}/risk-factors` | Risk factors |

### /api/symptoms
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/symptoms/` | All unique symptoms |
| GET | `/api/symptoms/search?q=` | Filter |
| POST | `/api/symptoms/match` | `{symptoms:[],top_n:10}` → ranked diseases |

### /api/bmi
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/bmi/calculate` | `{height_cm, weight_kg}` → BMI + category + risks |

### /api/vitals
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/vitals/analyze` | `{heart_rate, systolic_bp, diastolic_bp, spo2, blood_sugar, temperature_f, sugar_type}` → flags |

### /api/chat
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/chat/message` | `{message, history:[]}` → AI reply + structured data |

---

## UX Flow
```
/auth  (Login / Signup)
  └── /  Dashboard
        ├── /mediscan   MediScan (AI Symptom Checker)
        │     ├── Free text + quick tags + severity/duration
        │     ├── POST /api/symptoms/match → ranked conditions
        │     ├── Expand card → GET /api/diseases/{name} → medicines, precautions, risks
        │     └── "Ask AI" → /assistant?q=<disease question>
        │
        ├── /tracking   Health Tracking (tabbed)
        │     ├── Vitals tab → POST /api/vitals/analyze
        │     ├── BMI tab   → POST /api/bmi/calculate
        │     ├── Sleep tab → manual log (localStorage, no backend yet)
        │     └── Activity  → manual log (localStorage, no backend yet)
        │
        ├── /assistant  AI Assistant (chat)
        │     ├── POST /api/chat/message with history[]
        │     ├── Accepts ?q= param from MediScan
        │     └── Structured cards: assessment, medicines, precautions
        │
        ├── /insights   Health Insights
        │     ├── Metric cards with sparklines (mock data)
        │     ├── Risk scores: cardio, diabetes, sleep, respiratory
        │     ├── Alerts & recommendations
        │     └── Activity history timeline
        │
        └── /emergency  Emergency
              ├── Type selector (chest pain, low O2, high BP, etc.)
              ├── Step-by-step instructions (change per type)
              ├── Call 911 / Call Dr.
              └── Nearest hospital panel
```

---

## Design System
| Token | Value |
|-------|-------|
| Primary | `#1B3A6B` (dark blue) |
| Primary light | `#2952A3` |
| Accent | `#22C55E` (green) |
| Danger | `#DC2626` (red) |
| Warning | `#F59E0B` (amber) |
| Background light | `#F4F6FA` |
| Background dark | `#0F172A` |
| Surface light | `#FFFFFF` |
| Surface dark | `#1E293B` |
| Font | DM Sans (Google Fonts) |
| Border radius card | 16px |

Theme implemented via CSS variables on `[data-theme]` attribute.
`ThemeContext` toggles and persists to `localStorage`.

---

## Auth System
- **Current:** Mock auth — stores user in `localStorage` as JSON
- `ThemeContext.jsx` exports `login(userData)`, `logout()`, `user`
- `App.jsx` has `<Guard>` component wrapping all protected routes
- Redirects to `/auth` if not logged in
- **Future:** Replace with real FastAPI JWT auth + MongoDB users

---

## Completed Files

### Backend ✅
| File | Status |
|------|--------|
| `backend/config.py` | ✅ |
| `backend/dataset_loader.py` | ✅ encoding fix + dedup |
| `backend/main.py` | ✅ |
| `backend/routers/__init__.py` | ✅ |
| `backend/routers/diseases.py` | ✅ |
| `backend/routers/symptoms.py` | ✅ |
| `backend/routers/bmi.py` | ✅ |
| `backend/routers/vitals.py` | ✅ |
| `backend/routers/chat.py` | ✅ MedQuad RAG |

### Frontend ✅
| File | Status |
|------|--------|
| `src/context/ThemeContext.jsx` | ✅ |
| `src/index.css` | ✅ CSS vars light/dark |
| `src/App.jsx` | ✅ auth guard + routes |
| `src/main.jsx` | ✅ |
| `src/api/index.js` | ✅ all API calls |
| `src/layouts/AppLayout.jsx` | ✅ sidebar + topbar + theme |
| `src/pages/Auth.jsx` | ✅ login + signup |
| `src/pages/Dashboard.jsx` | ✅ |
| `src/pages/MediScan.jsx` | ✅ full AI checker |
| `src/pages/Tracking.jsx` | ✅ 4 tabs |
| `src/pages/Assistant.jsx` | ✅ full chat |
| `src/pages/Insights.jsx` | ✅ trends + risks |
| `src/pages/Emergency.jsx` | ✅ |

---

## Known Issues / Fixes Applied
- `.venv` at `MediMate/` root (not `backend/`) — VSCode requirement
- CSV encoding: latin-1 fallback chain in `dataset_loader._load()`
- Duplicate CSV rows: `.drop_duplicates()` on all dataframes
- `get_diseases_by_symptoms()` deduped with dict keyed by name
- AppLayout uses inline styles (not Tailwind classes) to avoid resolution issues
- Auth is mock only — replace with FastAPI JWT for production

---

## What's Left / Next Steps (in priority order)

### Phase 2 — Backend & Data
1. **MongoDB integration** — store vitals, BMI, sleep logs per user
2. **Real JWT auth** — FastAPI `/api/auth/login`, `/api/auth/signup`
3. **History API** — GET `/api/history` with pagination
4. **Sleep/Activity API** — persist logs to MongoDB
5. **Gemini/OpenAI integration** — replace keyword RAG in chat.py

### Phase 3 — Frontend Polish
6. **Real chart library** — replace sparklines with Recharts
7. **Insights real data** — connect to MongoDB history
8. **Dashboard live data** — pull from real vitals history
9. **Profile page** — edit user info, avatar
10. **Notifications** — health reminders, alerts

### Phase 4 — Production
11. Docker + deployment (Render / Railway)
12. Real MongoDB Atlas connection
13. PWA / mobile responsive polish
14. Export health report as PDF

---

## Important Patterns (always follow)
- All pages use **inline styles** (not Tailwind classes) — avoids config issues
- Dark mode via `useApp().theme` → inline style conditionals
- API calls always through `src/api/index.js` — never raw fetch in pages
- `dataset_loader.py` is the single source of truth for CSV data
- Backend `.venv` activation: `source .venv/bin/activate` from `MediMate/` root
- Port: backend on 8000, frontend on 5173/5174

---
## Phase 2 — Completed (MongoDB + Real Auth)

### New Backend Files
| File | Purpose |
|------|---------|
| `backend/.env` | Secrets — MONGO_URI, JWT_SECRET (never commit to git) |
| `backend/database.py` | Motor async MongoDB client, collection accessors, ping() |
| `backend/auth.py` | bcrypt password hashing, JWT create/decode, get_current_user dependency |
| `backend/routers/auth_router.py` | POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me |
| `backend/routers/health_logs.py` | POST /api/logs/vitals|bmi|sleep|activity, GET /api/logs/history |

### Updated Files
| File | Change |
|------|--------|
| `backend/config.py` | Reads .env file manually, exposes JWT_* constants |
| `backend/main.py` | Atlas ping on startup, mounts auth + logs routers |
| `frontend/src/api/index.js` | Added signup, loginApi, getMe, saveVitals, saveBMI, saveSleep, saveActivity, getHistory |
| `frontend/src/pages/Auth.jsx` | Now calls real API instead of mock localStorage |

### Install new backend deps
```bash
source .venv/bin/activate
pip install "python-jose[cryptography]" "passlib[bcrypt]"
```

### .env setup (CRITICAL — do before running)
Edit `backend/.env`:
1. Replace MONGO_URI with your Atlas connection string
2. Replace YOUR_PASSWORD with your Atlas user password
3. Replace JWT_SECRET with any long random string

### New API Routes
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT token |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/logs/vitals` | Bearer | Save vitals |
| POST | `/api/logs/bmi` | Bearer | Save BMI |
| POST | `/api/logs/sleep` | Bearer | Save sleep |
| POST | `/api/logs/activity` | Bearer | Save activity |
| GET | `/api/logs/history` | Bearer | All logs, sorted desc |

### Token flow
- Backend returns `{token, user}` on signup/login
- Frontend stores `{...user, token}` in localStorage via ThemeContext.login()
- All protected API calls send `Authorization: Bearer <token>` header
- Backend `get_current_user` dependency validates token + fetches user from MongoDB