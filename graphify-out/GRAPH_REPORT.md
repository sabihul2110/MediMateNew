# Graph Report - .  (2026-04-14)

## Corpus Check
- 36 files · ~23,269 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 171 nodes · 195 edges · 34 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]

## God Nodes (most connected - your core abstractions)
1. `get_db()` - 8 edges
2. `_find_disease_col()` - 8 edges
3. `VitalFlag` - 7 edges
4. `authHeader()` - 6 edges
5. `_norm()` - 6 edges
6. `get_disease_profile()` - 6 edges
7. `analyze_vitals()` - 6 edges
8. `get_symptoms_for_disease()` - 5 edges
9. `get_medicines_for_disease()` - 5 edges
10. `get_precautions_for_disease()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `SymptomMatchRequest` --inherits--> `BaseModel`  [EXTRACTED]
  backend/routers/symptoms.py →   _Bridges community 1 → community 8_
- `BMIRequest` --inherits--> `BaseModel`  [EXTRACTED]
  backend/routers/bmi.py →   _Bridges community 1 → community 9_
- `VitalFlag` --inherits--> `BaseModel`  [EXTRACTED]
  backend/routers/vitals.py →   _Bridges community 1 → community 4_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (23): _find_col(), _find_disease_col(), get_all_diseases(), get_all_symptoms(), get_disease_profile(), get_diseases_by_symptoms(), get_medicines_for_disease(), get_precautions_for_disease() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (18): LoginRequest, SignupRequest, BaseModel, _build_response(), chat_message(), ChatRequest, _extract_symptoms(), ActivityLog (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (6): authHeader(), getHistory(), saveActivity(), saveBMI(), saveSleep(), saveVitals()

### Community 3 - "Community 3"
Cohesion: 0.33
Nodes (10): activity_col(), bmi_col(), chat_col(), get_client(), get_db(), ping(), Test Atlas connection — called at startup., sleep_col() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.61
Nodes (7): analyze_vitals(), _flag_bp(), _flag_hr(), _flag_spo2(), _flag_sugar(), _flag_temp(), VitalFlag

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (3): decode_token(), get_current_user(), FastAPI dependency — use in any protected route.

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (3): match_symptoms(), Send a list of symptoms, get back ranked possible diseases.     Used by the Symp, SymptomMatchRequest

### Community 9 - "Community 9"
Cohesion: 0.6
Nodes (4): BMIRequest, BMIResponse, _calculate(), calculate_bmi()

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **14 isolated node(s):** `FastAPI dependency — use in any protected route.`, `Test Atlas connection — called at startup.`, `Return sorted list of all unique disease names.`, `Return list of symptoms for a given disease.     Searches the wide-format Diseas`, `Given a list of symptom strings, return diseases that match     ANY of them, ded` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (2 nodes): `AppLayout()`, `AppLayout.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `Referrals.jsx`, `Referrals()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `History.jsx`, `History()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `Diseases()`, `Diseases.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `Chat()`, `Chat.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Symptoms.jsx`, `Symptoms()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `Dashboard()`, `Dashboard.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `Vitals.jsx`, `Vitals()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `Auth()`, `Auth.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `Daily()`, `Daily.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `Emergency()`, `Emergency.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `config.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VitalFlag` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `SymptomMatchRequest` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `FastAPI dependency — use in any protected route.`, `Test Atlas connection — called at startup.`, `Return sorted list of all unique disease names.` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._