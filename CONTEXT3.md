# MediMate — Complete Project Context
> **Paste this at the start of any new chat to continue the project.**
> Last updated: Phase 4 — FindDoctor, BMI tab nav, icon fixes, complete context.

---

## Overview
MediMate is a production-grade AI healthcare web app built as a semester project.
Full-stack: React + FastAPI + MongoDB Atlas. Features: AI symptom analysis, vitals tracking,
heart risk prediction, AI chat, health insights with charts, emergency guidance, and user profiles.

---

## Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + React Router v6 |
| Styling | Inline styles throughout (no Tailwind classes used — config installed but all styles are inline for reliability) |
| Backend | FastAPI (Python 3.14) |
| Database | MongoDB Atlas M0 free (AWS Mumbai) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| HTTP client | Axios |
| Icons | Lucide React |
| Fonts | DM Sans (Google Fonts via index.css) |

---

## Folder Structure
```
MediMate/
├── PROJECT_CONTEXT.md            ← THIS FILE
├── setup_frontend.sh             ← Already run — do not re-run
├── .venv/                        ← Python venv at ROOT (not backend/)
│
├── datasets/
│   ├── DiseaseAndSymptoms.csv    ← wide format: Disease, Symptom_1…17
│   ├── medquad.csv               ← medical Q&A pairs (RAG source)
│   ├── disease_medicine.csv      ← disease → OTC medicines
│   ├── disease_precaution.csv    ← disease → precautions
│   ├── disease_riskFactors.csv   ← disease → risk factors
│   ├── disease_symptoms.csv      ← long format: disease, symptom
│   └── Disease precaution.csv    ← duplicate precaution v2
│
├── backend/
│   ├── .env                      ← SECRETS — never commit
│   ├── main.py                   ← FastAPI entry point, all routers mounted
│   ├── config.py                 ← reads .env, exports constants
│   ├── database.py               ← Motor async MongoDB client + collection helpers
│   ├── auth.py                   ← JWT create/decode + bcrypt + get_current_user dependency
│   ├── dataset_loader.py         ← loads all 7 CSVs, token-based symptom matching
│   └── routers/
│       ├── __init__.py
│       ├── diseases.py           ← /api/diseases/*
│       ├── symptoms.py           ← /api/symptoms/*  (POST /match)
│       ├── bmi.py                ← /api/bmi/calculate
│       ├── vitals.py             ← /api/vitals/analyze
│       ├── chat.py               ← /api/chat/message (MedQuad RAG, structured)
│       ├── auth_router.py        ← /api/auth/signup|login|me|change-password
│       ├── health_logs.py        ← /api/logs/vitals|bmi|sleep|activity|history
│       ├── heart_risk.py         ← /api/heart-risk/predict (LR model)
│       ├── heart_risk_logs.py    ← /api/heart-risk-logs/save|list
│       └── profile_router.py     ← /api/profile GET/PUT
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js        ← installed but not used for classes
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx               ← BrowserRouter + auth Guard + all routes
        ├── index.css             ← CSS vars light/dark + DM Sans font import
        ├── context/
        │   └── ThemeContext.jsx  ← theme (light/dark) + user auth state (localStorage)
        ├── api/
        │   └── index.js          ← ALL API calls in one place with authHeader()
        ├── layouts/
        │   └── AppLayout.jsx     ← sidebar + topbar, theme toggle, profile link
        └── pages/
            ├── Auth.jsx          ← 2-step signup (basic → medical onboarding) + login
            ├── Dashboard.jsx     ← hero, quick actions (7 cards), real history, vitals
            ├── MediScan.jsx      ← AI symptom checker — tags + text + severity → ranked conditions
            ├── Tracking.jsx      ← 4 tabs: Vitals|BMI|Sleep|Activity — all save to MongoDB
            ├── HeartRisk.jsx     ← LR model, Self/Other switch, Save, Export, History panel
            ├── Assistant.jsx     ← AI chat with structured response cards
            ├── Insights.jsx      ← real data, bar charts, health score ring, risk engine, confidence
            ├── Emergency.jsx     ← type selector, life-saving steps, 911, nearest hospital
            ├── FindDoctor.jsx    ← 6 specialist cards, symptom→specialist AI suggestion, urgency
            └── Profile.jsx       ← tabbed: Personal|Medical|Emergency|Security (change password)
```

---

## Running the App

### Backend
```bash
# From MediMate/ root (always activate venv from root)
source .venv/bin/activate
cd backend
uvicorn main:app --reload --port 8000

# Startup prints: ✅ Connected to MongoDB Atlas — db: medimate
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
# From MediMate/frontend/
npm run dev
# → http://localhost:5173 (or 5174 if port taken)
```

### Install deps (once, venv must be active)
```bash
pip install pandas fastapi uvicorn python-multipart motor pymongo \
            python-jose[cryptography] passlib[bcrypt]
```

---

## backend/.env (never commit)
```
MONGO_URI=mongodb+srv://medimate_user:PASSWORD@medimate.xxxxx.mongodb.net/medimate?retryWrites=true&w=majority
MONGO_DB=medimate
JWT_SECRET=your_long_random_string_here_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
```

---

## All API Routes

### Auth — /api/auth
| Method | Route | Auth | Body / Notes |
|--------|-------|------|------|
| POST | `/signup` | No | `{name, email, password, age?, sex?, height_cm?, weight_kg?, blood_group?}` |
| POST | `/login` | No | `{email, password}` → `{token, user}` |
| GET | `/me` | Bearer | Returns current user object |
| POST | `/change-password` | Bearer | `{current_password, new_password}` |

### Profile — /api/profile
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/` | Bearer | Fetch user's medical profile |
| PUT | `/` | Bearer | Save/update profile fields |

### Diseases — /api/diseases
| Method | Route | Notes |
|--------|-------|-------|
| GET | `/` | All disease names |
| GET | `/search?q=` | Search by name |
| GET | `/{name}` | Full disease profile |
| GET | `/{name}/medicines` | Medicines only |
| GET | `/{name}/precautions` | Precautions only |
| GET | `/{name}/risk-factors` | Risk factors only |

### Symptoms — /api/symptoms
| Method | Route | Body |
|--------|-------|------|
| GET | `/` | All unique symptoms |
| GET | `/search?q=` | Filter |
| POST | `/match` | `{symptoms:[], top_n:10}` → ranked diseases + confidence % |

### BMI — /api/bmi
| Method | Route | Body |
|--------|-------|------|
| POST | `/calculate` | `{height_cm, weight_kg}` → BMI, category, risks, advice |

### Vitals — /api/vitals
| Method | Route | Body |
|--------|-------|------|
| POST | `/analyze` | `{heart_rate, systolic_bp, diastolic_bp, spo2, blood_sugar, temperature_f, sugar_type}` → per-vital flags |

### Chat — /api/chat
| Method | Route | Body |
|--------|-------|------|
| POST | `/message` | `{message, history:[]}` → structured `{type, reply, sections{symptoms,medicines,precautions,dos,donts}, suggested_questions}` |

### Heart Risk — /api/heart-risk
| Method | Route | Body |
|--------|-------|------|
| POST | `/predict` | Full input object → `{risk_level, probability_pct, risk_color, contributing_factors[], recommendations[]}` |

### Heart Risk Logs — /api/heart-risk-logs
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| POST | `/save` | Bearer | Save prediction result + input_snapshot |
| GET | `/` | Bearer | Get history (limit param) |

### Health Logs — /api/logs
| Method | Route | Auth | Body |
|--------|-------|------|------|
| POST | `/vitals` | Bearer | Full vitals object |
| POST | `/bmi` | Bearer | `{height_cm, weight_kg, bmi, category}` |
| POST | `/sleep` | Bearer | `{hours, quality}` |
| POST | `/activity` | Bearer | `{steps, exercise_mins}` |
| GET | `/history` | Bearer | `?limit=30` → merged + sorted logs |

---

## Frontend Routes
| Path | Page | Notes |
|------|------|-------|
| `/auth` | Auth | 2-step signup + login |
| `/` | Dashboard | Hero, quick actions, real history |
| `/mediscan` | MediScan | AI symptom analyzer |
| `/tracking` | Tracking | Vitals\|BMI\|Sleep\|Activity tabs. Accepts `state.tab` for direct BMI tab |
| `/heart-risk` | HeartRisk | LR model + Self/Other + Save + Export |
| `/assistant` | Assistant | AI chat. Accepts `?q=` pre-fill param |
| `/insights` | Insights | Real charts, health score, risk engine |
| `/emergency` | Emergency | 911, steps, hospital |
| `/find-doctor` | FindDoctor | 6 specialist cards, symptom→specialist AI |
| `/profile` | Profile | Personal\|Medical\|Emergency\|Security tabs |

---

## UX Flow
```
/auth (Login | 2-step Signup)
  │
  └── /  Dashboard
        ├── Hero: greeting uses real profile name, vitals from /api/vitals/analyze
        ├── Quick Actions (7 cards — all navigate correctly):
        │     Check Symptoms → /mediscan
        │     Check Vitals   → /tracking (vitals tab)
        │     BMI Calculator → /tracking (bmi tab via state.tab)
        │     Heart Risk     → /heart-risk
        │     Ask AI         → /assistant
        │     Find Doctor    → /find-doctor   ← functional page
        │     Emergency      → /emergency
        ├── Recent History  → real data from /api/logs/history
        └── AI Suggestion + Quick Vitals sidebar
        
├── /mediscan  MediScan
│     Text + quick tags + severity + duration
│     → POST /api/symptoms/match → ranked conditions
│     → Expand card → GET /api/diseases/{name} → medicines, precautions, risks
│     → "Ask AI" → /assistant?q=<disease>
│     → "Emergency" CTA
│
├── /tracking  Health Tracking (4 tabs)
│     Vitals tab   → POST /api/vitals/analyze + POST /api/logs/vitals → MongoDB
│     BMI tab      → POST /api/bmi/calculate  + POST /api/logs/bmi   → MongoDB
│     Sleep tab    → manual slider             + POST /api/logs/sleep → MongoDB
│     Activity tab → step ring + slider        + POST /api/logs/activity → MongoDB
│     All tabs show green ✅ "Saved to history" confirmation
│
├── /heart-risk  Heart Risk Predictor
│     Self mode: auto-fills age/sex/BMI from /api/profile
│     Other mode: blank form
│     → POST /api/heart-risk/predict → risk circle + contributing factors + recommendations
│     → Save Result → POST /api/heart-risk-logs/save → MongoDB
│     → Export → downloads .txt report
│     → History panel → GET /api/heart-risk-logs/
│
├── /assistant  AI Assistant
│     Accepts ?q= pre-fill (from MediScan "Ask AI" and HeartRisk CTA)
│     → POST /api/chat/message → structured cards:
│         Possible Conditions (if symptom query)
│         Symptoms | Medicines | Precautions | Risk Factors | ✅ Do's | ❌ Don'ts
│         Suggested follow-up questions
│
├── /insights  Health Insights
│     Real data from GET /api/logs/history
│     Bar charts (7-day, SVG) per metric
│     Health Score ring (0–100, composite)
│     Confidence badge (based on data volume)
│     Risk Score Engine → POST /api/heart-risk/predict → inline result
│     Activity History timeline → grouped by date
│
├── /find-doctor  Find Doctor
│     6 specialist cards (Cardiologist, Neurologist, Ophthalmologist, etc.)
│     Symptom search → auto-suggests specialist
│     Urgency selector (Routine/Soon/Urgent)
│     "Ask AI" per specialist → /assistant?q=pre-filled
│     Nearest hospital info + directions → /emergency
│
├── /profile  Profile (4 tabs)
│     Personal: name, age, sex, phone
│     Medical: height, weight, blood group, allergies, chronic, medications
│     Emergency: emergency contact
│     Security: change password (POST /api/auth/change-password)
│     Stats strip: BMI derived, blood group, age, sex, height, weight
│
└── /emergency  Emergency
      Type selector (Chest Pain, Low O2, High BP, Fainting, Injury, Fever)
      Steps change per type selected
      Call 911 / Call Dr. Smith
      Nearest hospital + ER wait time
```

---

## Design Tokens
| Token | Value |
|-------|-------|
| Primary | `#1B3A6B` |
| Primary Light | `#2952A3` |
| Accent (green) | `#22C55E` |
| Danger (red) | `#DC2626` |
| Warning (amber) | `#F59E0B` |
| BG Light | `#F4F6FA` |
| BG Dark | `#0F172A` |
| Surface Light | `#FFFFFF` |
| Surface Dark | `#1E293B` |
| Surface2 Light | `#F4F6FA` |
| Surface2 Dark | `#0F172A` |
| Border Light | `#E5E9F2` |
| Border Dark | `#2D3F5A` |
| Font | DM Sans (Google Fonts) |

---

## Sidebar Navigation Icons
| Nav Item | Icon (Lucide) |
|----------|--------------|
| Dashboard | LayoutDashboard |
| MediScan | Scan |
| Health Tracking | **Activity** (not Heart — distinct from Heart Risk) |
| Heart Risk | **Heart** |
| AI Assistant | MessageSquare |
| Health Insights | TrendingUp |
| Profile | User |
| Emergency | AlertTriangle |

---

## Key Implementation Details

### Symptom Matching (dataset_loader.py)
- Token-based: splits both query and CSV values by `_` and spaces
- "fever headache chills weakness" → tokens → matched against row tokens
- Deduplication via dict keyed by disease name

### Chat Structured Response (routers/chat.py)
- Detects disease name in message first → `get_disease_profile()` → structured card
- Falls back to symptom keyword extraction → `get_diseases_by_symptoms()`
- Falls back to MedQuad keyword search
- Returns `{type, reply, sections{symptoms,medicines,precautions,risk_factors,dos,donts}, disclaimer}`

### Heart Risk Model (routers/heart_risk.py)
- Logistic regression with 11 features
- Weights from UCI Cleveland dataset + Framingham/SCORE-2 evidence
- Calibrated via Nelder-Mead on 13 ACC/AHA Pooled Cohort anchors
- Returns probability 0–1, risk_level (Low/Moderate/High), contributing_factors[], recommendations[]

### Auth Flow
- Signup: POST /api/auth/signup → JWT + user object
- Token stored: localStorage as part of mm_user JSON `{...user, token}`
- All protected API calls: `Authorization: Bearer <token>` via `authHeader()` in api/index.js
- ThemeContext: `login(userData)`, `logout()`, `user` state

### MongoDB Collections
| Collection | Contents |
|------------|----------|
| users | name, email, password_hash, avatar, created_at |
| profiles | email (key), age, sex, height_cm, weight_kg, blood_group, allergies, chronic, medications, emergency_contact |
| vitals | heart_rate, bp, spo2, blood_sugar, temp, overall, user_email, logged_at |
| bmi_logs | bmi, category, height_cm, weight_kg, user_email, logged_at |
| sleep_logs | hours, quality, user_email, logged_at |
| activity_logs | steps, exercise_mins, user_email, logged_at |
| heart_risk_logs | full prediction result + input_snapshot + mode, user_email, logged_at |

---

## Known Issues / Fixes Applied
- `.venv` at root: VSCode Python detection requirement
- CSV encoding: latin-1 fallback chain in `_load()`
- Duplicate CSV rows: `.drop_duplicates()` on all dataframes
- Symptom matching was exact-string → fixed to token-based
- Chat was ignoring disease context → fixed with disease name detection first
- Dashboard quick action cards: inline onClick navigation
- BP input "80 bleeding out": fixed with `flex:1` + `width:100%` wrapper divs
- Tracking save buttons: all wired to MongoDB save APIs with ✅ confirmation
- Health Insights was hardcoded: now reads from `/api/logs/history`
- BMI Calculator widget: navigates with `state.tab="bmi"` → Tracking reads it
- Find Doctor: was routing to /assistant → now has own functional `/find-doctor` page
- Heart Risk / Health Tracking icon clash: Activity icon for Tracking, Heart for Heart Risk

---

## What's Left / Phase 5 Ideas
1. **Recharts** for proper line/area charts in Insights (replace SVG bar charts)
2. **MediScan save to history** — save symptom check results to MongoDB
3. **Dashboard real vitals** — pull latest vitals from MongoDB instead of static API call
4. **Notification system** — daily reminders, medication alerts
5. **Deploy** — Railway (backend) + Vercel (frontend)
6. **PDF export** of health report (jsPDF or server-side)
7. **Real map** — integrate Google Maps for "Find Hospital" in Emergency
8. **Onboarding flow** — guided tour after first login
9. **Dark mode persistence** — already works via localStorage
10. **PWA / offline** — service worker for mobile use