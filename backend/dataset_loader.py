# MediMate/backend/dataset_loader.py
#
# FIXES APPLIED:
#   1. 'pain' and 'ache' removed from stopwords — valid high-weight symptom tokens
#   2. Disease name normalization + KAGGLE_TO_RISK_MAP for name mismatches
#   3. Symptom severity lookup tries underscore form as fallback
#   4. matched_count replaced with direct per-row token intersection
#   5. Confidence denominator = matched token weights (not all query tokens)
#   6. get_diseases_by_symptoms accepts free-text string as well as list
#   7. [NEW] semantic_symptom_match via sentence-transformers (lazy-loaded)

import pandas as pd
from pathlib import Path
from config import DATASETS

# ── Optional: sentence-transformers (graceful fallback if not installed) ──────
try:
    from sentence_transformers import SentenceTransformer, util as _st_util
    import torch as _torch
    _SEM_AVAILABLE = True
except ImportError:
    _SEM_AVAILABLE = False
    print("[INFO] sentence-transformers not installed — semantic matching disabled")


# ── Loader ────────────────────────────────────────────────────────────────────
def _load(key: str) -> pd.DataFrame:
    path: Path = DATASETS[key]
    if not path.exists():
        print(f"[WARN] Dataset not found: {path}")
        return pd.DataFrame()
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            df = pd.read_csv(path, encoding=enc)
            df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
            df = df.apply(lambda col: col.str.strip() if col.dtype == object else col)
            return df
        except UnicodeDecodeError:
            continue
    return pd.DataFrame()


# ── Load all 12 files once at startup ────────────────────────────────────────
_df_kaggle       = _load("dataset_kaggle").drop_duplicates()
_df_desc         = _load("symptom_description").drop_duplicates()
_df_prec_new     = _load("symptom_precaution").drop_duplicates()
_df_severity     = _load("symptom_severity").drop_duplicates()
_df_sym2dis      = _load("symptom2disease").drop_duplicates()
_df_dis_sym_wide = _load("disease_and_symptoms").drop_duplicates()
_df_dis_sym_long = _load("disease_symptoms").drop_duplicates()
_df_medicine     = _load("disease_medicine").drop_duplicates()
_df_prec_v1      = _load("disease_precaution").drop_duplicates()
_df_prec_v2      = _load("disease_precaution_v2").drop_duplicates()
_df_risk         = _load("disease_risk_factors").drop_duplicates()
_df_medquad      = _load("medquad").drop_duplicates()


# ── Disease name bridge ───────────────────────────────────────────────────────
KAGGLE_TO_RISK_MAP: dict[str, str] = {
    "Allergy":                                 "Food allergy",
    "Bronchial Asthma":                        "Asthma",
    "Drug Reaction":                           "Drug allergy",
    "Fungal infection":                        "Fungal Infection",
    "Hepatitis B":                             "Hepatitis A",
    "Hepatitis C":                             "Hepatitis A",
    "Hepatitis D":                             "Hepatitis A",
    "Hepatitis E":                             "Hepatitis A",
    "Hyperthyroidism":                         "Thyroid",
    "Osteoarthristis":                         "Osteoarthritis",
    "Paralysis (brain hemorrhage)":            "Brain hemorrhage",
    "Peptic ulcer diseae":                     "Peptic Ulcer",
    "(vertigo) Paroymsal  Positional Vertigo": "Paroxysmal Positional Vertigo",
    "Alcoholic hepatitis":                     "Hepatitis A",
    "Dimorphic hemmorhoids(piles)":            "Piles",
    "hepatitis A":                             "Hepatitis A",
    "Diabetes ":                               "Diabetes",
    "Hypertension ":                           "Hypertension",
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def _norm(s: str) -> str:
    return str(s).strip().lower().replace("_", " ").replace("-", " ")

def _find_col(df: pd.DataFrame, candidates: list) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    return None

def _disease_col(df: pd.DataFrame) -> str | None:
    return _find_col(df, ["disease", "disease_name", "condition", "prognosis", "dname", "label"])

def _canonical_risk_name(disease: str) -> str:
    return KAGGLE_TO_RISK_MAP.get(disease.strip(), disease.strip())


# ── Severity weight map ───────────────────────────────────────────────────────
_severity_map: dict[str, int] = {}
if not _df_severity.empty:
    sc = _find_col(_df_severity, ["symptom"])
    wc = _find_col(_df_severity, ["weight"])
    if sc and wc:
        for _, row in _df_severity.iterrows():
            _severity_map[_norm(str(row[sc]))] = int(row[wc])


def get_symptom_weight(symptom: str) -> int:
    n = _norm(symptom)
    if n in _severity_map:
        return _severity_map[n]
    return _severity_map.get(n.replace(" ", "_"), 1)


# ── Primary symptom dataframe ─────────────────────────────────────────────────
def _primary_symptom_df() -> pd.DataFrame:
    for df in [_df_kaggle, _df_dis_sym_wide, _df_dis_sym_long]:
        if not df.empty and _disease_col(df):
            return df
    return pd.DataFrame()


# ══════════════════════════════════════════════════════════════════════════════
# Semantic engine (lazy-init, CPU-friendly)
# ══════════════════════════════════════════════════════════════════════════════
_sem_model = None
_sem_names: list[str] = []
_sem_embeddings = None   # built on first call


def _get_sem_model():
    global _sem_model
    if _sem_model is None and _SEM_AVAILABLE:
        print("[INFO] Loading sentence-transformer model (one-time, ~30s)...")
        _sem_model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[INFO] Model loaded.")
    return _sem_model


def _build_semantic_corpus() -> tuple[list[str], list[str]]:
    """Build disease-symptom corpus for embedding. Called once on first semantic query."""
    df  = _primary_symptom_df()
    col = _disease_col(df)
    if col is None:
        return [], []
    scols = [c for c in df.columns if c.startswith("symptom")]
    names, texts = [], []
    for disease, group in df.groupby(col):
        syms = []
        seen_s = set()
        for sc in scols:
            for v in group[sc].dropna():
                n = _norm(str(v))
                if n and n not in seen_s:
                    seen_s.add(n)
                    syms.append(n)
        if syms:
            names.append(disease.strip())
            texts.append(", ".join(syms))

    # Add at the bottom of _build_semantic_corpus(), before return:
    # Inject alias entries for semantically distant but clinically common phrases
    _ALIASES = [
        # Cardiac
        ("Heart attack",     "racing heart palpitations chest pain left arm pain sweating short of breath"),
        ("Hypertension",     "high blood pressure headache dizziness chest tightness blurry vision"),
        ("Heart attack",     "heart racing fast heartbeat chest tightness difficulty breathing dizzy"),
        # Respiratory  
        ("Bronchial Asthma", "short of breath wheezing difficulty breathing tight chest"),
        ("Pneumonia",        "difficulty breathing chest pain cough fever shortness of breath"),
        # Neurological
        ("Migraine",         "severe headache throbbing head pain light sensitivity nausea vomiting"),
        ("(vertigo) Paroymsal  Positional Vertigo", "dizzy spinning vertigo loss of balance nausea"),
        # Metabolic
        ("Diabetes",         "excessive thirst frequent urination blurry vision fatigue weight loss"),
        ("Hypoglycemia",     "low blood sugar shaking sweating dizzy confusion weakness hunger"),
        # Liver
        ("Jaundice",         "yellow skin yellowish eyes dark urine fatigue weakness"),
        ("Hepatitis B",      "yellow skin fatigue nausea loss of appetite abdominal pain"),
        # Infectious
        ("Malaria",          "fever chills night sweats shivering mosquito bite muscle pain"),
        ("Dengue",           "high fever severe headache pain behind eyes joint muscle pain rash"),
        ("Typhoid",          "sustained fever weakness stomach pain headache loss of appetite"),
        # Thyroid
        ("Hyperthyroidism",  "racing heart weight loss anxiety tremor heat intolerance sweating"),
        # GI
        ("GERD",             "heartburn acid reflux burning chest after eating sour taste"),
        ("Peptic ulcer diseae", "stomach pain burning hunger pain nausea vomiting"),
    ]
    for disease, alias_text in _ALIASES:
        names.append(disease)
        texts.append(alias_text)

    return names, texts


def semantic_symptom_match(user_text: str, top_n: int = 8) -> list:
    """
    Semantic similarity match using sentence-transformers.
    Understands 'racing heart' → Arrhythmia without exact token match.
    Returns same format as get_diseases_by_symptoms().
    Gracefully returns [] if sentence-transformers not installed.
    """
    global _sem_names, _sem_embeddings

    if not _SEM_AVAILABLE:
        return []

    model = _get_sem_model()
    if model is None:
        return []

    # Lazy-build corpus embeddings on first call
    if _sem_embeddings is None:
        _sem_names, corpus = _build_semantic_corpus()
        if not corpus:
            return []
        _sem_embeddings = model.encode(corpus, convert_to_tensor=True)

    query_emb = model.encode(user_text, convert_to_tensor=True)
    scores    = _st_util.cos_sim(query_emb, _sem_embeddings)[0]
    top       = _torch.topk(scores, k=min(top_n, len(_sem_names)))

    return [
        {
            "disease":       _sem_names[int(i)],
            "score":         round(float(scores[i]), 4),
            "confidence":    round(min(float(scores[i]) * 180, 95), 1),  # scale up cosine
            "matched_count": 1,
            "source":        "semantic",
        }
        for i in top.indices
        if float(scores[i]) > 0.25  # noise floor
    ]


# ══════════════════════════════════════════════════════════════════════════════
# Public API
# ══════════════════════════════════════════════════════════════════════════════

def get_all_diseases() -> list:
    df  = _primary_symptom_df()
    col = _disease_col(df)
    if col is None:
        return []
    return sorted(df[col].dropna().str.strip().unique().tolist())


def get_all_symptoms() -> list:
    df    = _primary_symptom_df()
    scols = [c for c in df.columns if c.startswith("symptom")]
    flat  = df[scols].values.flatten()
    return sorted({_norm(s) for s in flat if isinstance(s, str) and s.strip()})


def get_symptoms_for_disease(disease: str) -> list:
    df  = _primary_symptom_df()
    col = _disease_col(df)
    if col is None:
        return []
    rows  = df[df[col].str.strip().str.lower() == disease.strip().lower()]
    scols = [c for c in rows.columns if c.startswith("symptom")]
    seen, out = set(), []
    for val in rows[scols].values.flatten():
        n = _norm(val) if isinstance(val, str) and val.strip() else None
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def get_description_for_disease(disease: str) -> str:
    if _df_desc.empty:
        return ""
    col = _disease_col(_df_desc)
    dc  = _find_col(_df_desc, ["description"])
    if not col or not dc:
        return ""
    row = _df_desc[_df_desc[col].str.strip().str.lower() == disease.strip().lower()]
    return str(row.iloc[0][dc]).strip() if not row.empty else ""


def get_precautions_for_disease(disease: str) -> list:
    for df in [_df_prec_new, _df_prec_v1, _df_prec_v2]:
        if df.empty:
            continue
        col = _disease_col(df)
        if not col:
            continue
        row = df[df[col].str.strip().str.lower() == disease.strip().lower()]
        if row.empty:
            continue
        pcols  = [c for c in row.columns if "precaution" in c]
        result = [p.strip() for p in row[pcols].values.flatten()
                  if isinstance(p, str) and p.strip()]
        if result:
            return result
    return []


def get_medicines_for_disease(disease: str) -> list:
    if _df_medicine.empty or _df_risk.empty:
        return []
    did_col   = _find_col(_df_risk, ["did"])
    dname_col = _disease_col(_df_risk)
    if not did_col or not dname_col:
        return []
    lookup_name = _canonical_risk_name(disease)
    match = _df_risk[_df_risk[dname_col].str.strip().str.lower() == lookup_name.lower()]
    if match.empty:
        safe_prefix = lookup_name[:8].lower()
        match = _df_risk[
            _df_risk[dname_col].str.strip().str.lower().str.startswith(safe_prefix, na=False)
        ]
    if match.empty:
        return []
    disease_id = match.iloc[0][did_col]
    mid_col   = _find_col(_df_medicine, ["disease_id"])
    mname_col = _find_col(_df_medicine, ["medicine_name"])
    if not mid_col or not mname_col:
        return []
    meds = _df_medicine[_df_medicine[mid_col] == disease_id][mname_col]
    return [str(m).strip() for m in meds if isinstance(m, str) and m.strip()]


def get_risk_factors_for_disease(disease: str) -> list:
    if _df_risk.empty:
        return []
    col = _disease_col(_df_risk)
    rc  = _find_col(_df_risk, ["riskfac"])
    if not col or not rc:
        return []
    lookup_name = _canonical_risk_name(disease)
    row = _df_risk[_df_risk[col].str.strip().str.lower() == lookup_name.lower()]
    if row.empty:
        return []
    return [r.strip() for r in str(row.iloc[0][rc]).strip().split(",") if r.strip()]


def get_occurrence_for_disease(disease: str) -> str:
    if _df_risk.empty:
        return ""
    col = _disease_col(_df_risk)
    oc  = _find_col(_df_risk, ["occur"])
    if not col or not oc:
        return ""
    lookup_name = _canonical_risk_name(disease)
    row = _df_risk[_df_risk[col].str.strip().str.lower() == lookup_name.lower()]
    if row.empty:
        return ""
    return str(row.iloc[0][oc]).strip().replace("\\n", "").strip()


def get_disease_profile(disease: str) -> dict:
    return {
        "disease":      disease,
        "description":  get_description_for_disease(disease),
        "symptoms":     get_symptoms_for_disease(disease),
        "medicines":    get_medicines_for_disease(disease),
        "precautions":  get_precautions_for_disease(disease),
        "risk_factors": get_risk_factors_for_disease(disease),
        "occurrence":   get_occurrence_for_disease(disease),
    }


# ── Stopwords ─────────────────────────────────────────────────────────────────
# NOTE: 'pain' and 'ache' intentionally NOT here — valid high-weight tokens
_STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "in", "is", "it", "i",
    "have", "has", "for", "with", "my", "feel", "feeling", "some",
    "since", "days", "been", "very", "bit", "lot", "also", "just",
    "like", "really", "much", "after", "before", "when", "then",
    "that", "this", "from", "about", "getting", "having", "going",
    "lately", "recently", "often", "sometimes", "now", "today",
    "yesterday", "morning", "night", "week", "weeks", "month",
}


def _extract_query_phrases(raw_text: str) -> list[str]:
    text  = _norm(raw_text)
    words = [w for w in text.split() if w not in _STOPWORDS and len(w) > 1]
    if not words:
        return []

    known_phrases = set(_severity_map.keys())
    df = _primary_symptom_df()
    scols = [c for c in df.columns if c.startswith("symptom")]
    for col_name in scols:
        for val in df[col_name].dropna().unique():
            known_phrases.add(_norm(str(val)))

    matched_phrases = []
    used_indices    = set()

    for n in (3, 2):
        for i in range(len(words) - n + 1):
            if any(j in used_indices for j in range(i, i + n)):
                continue
            candidate = " ".join(words[i:i + n])
            if candidate in known_phrases:
                matched_phrases.append(candidate)
                used_indices.update(range(i, i + n))

    for i, w in enumerate(words):
        if i not in used_indices:
            matched_phrases.append(w)

    return matched_phrases


def get_diseases_by_symptoms(
    symptoms: list | str,
    top_n: int = 8,
    severity: int = 5,
    duration: str = "",
) -> list:
    df  = _primary_symptom_df()
    col = _disease_col(df)
    if col is None:
        return []

    raw_text      = symptoms if isinstance(symptoms, str) else " ".join(symptoms)
    query_phrases = _extract_query_phrases(raw_text)
    if not query_phrases:
        return []

    query_tokens = set()
    for p in query_phrases:
        query_tokens.update(p.split())

    scols = [c for c in df.columns if c.startswith("symptom")]
    seen: dict[str, dict] = {}

    for _, row in df.iterrows():
        disease_name = str(row[col]).strip()
        row_phrases: list[str] = [
            _norm(row[sc]) for sc in scols
            if isinstance(row[sc], str) and row[sc].strip()
        ]
        if not row_phrases:
            continue

        row_total_phrases = len(row_phrases)
        row_total_score   = sum(get_symptom_weight(p) for p in row_phrases)

        phrase_matches      = 0
        phrase_score        = 0.0
        matched_row_phrases = set()

        for qp in query_phrases:
            for j, rp in enumerate(row_phrases):
                if j in matched_row_phrases:
                    continue
                if qp == rp or (len(qp.split()) > 1 and qp in rp) or (len(rp.split()) > 1 and rp in qp):
                    matched_row_phrases.add(j)
                    phrase_matches += 1
                    phrase_score   += get_symptom_weight(rp)
                    break

        token_matches = 0
        for j, rp in enumerate(row_phrases):
            if j in matched_row_phrases:
                continue
            rp_tokens = set(rp.split())
            if query_tokens & rp_tokens:
                matched_row_phrases.add(j)
                token_matches += 1
                overlap_ratio  = len(query_tokens & rp_tokens) / len(rp_tokens)
                phrase_score  += get_symptom_weight(rp) * overlap_ratio

        total_matched = phrase_matches + token_matches
        if total_matched == 0:
            continue

        effective_matches = phrase_matches + token_matches * 0.3
        base_confidence   = (effective_matches / max(row_total_phrases, 1)) * 100

        if phrase_matches >= 3:
            base_confidence = min(base_confidence * 1.5, 95)
        elif phrase_matches >= 2:
            base_confidence = min(base_confidence * 1.35, 92)
        elif phrase_matches >= 1 and token_matches >= 1:
            base_confidence = min(base_confidence * 1.2, 88)

        if phrase_matches == 0:
            base_confidence = min(base_confidence, 25)

        weight_confidence = (phrase_score / max(row_total_score, 1)) * 100
        confidence        = base_confidence * 0.55 + weight_confidence * 0.45

        if severity >= 7 and phrase_score >= 5:
            confidence = min(confidence * 1.1, 95)

        confidence = max(min(round(confidence), 99), 5)

        if disease_name not in seen or phrase_score > seen[disease_name]["score"]:
            seen[disease_name] = {
                "score":          round(phrase_score, 2),
                "matched_count":  total_matched,
                "phrase_matches": phrase_matches,
                "row_total":      max(row_total_score, 1),
                "confidence":     confidence,
            }

    results = [
        {"disease": k, "score": v["score"],
         "matched_count": v["matched_count"], "confidence": v["confidence"]}
        for k, v in seen.items()
    ]
    results.sort(key=lambda x: (-x["confidence"], -x["score"]))
    return results[:top_n]


def nlp_match_disease(user_text: str, top_n: int = 5) -> list:
    if _df_sym2dis.empty:
        return []
    tc = _find_col(_df_sym2dis, ["text"])
    lc = _find_col(_df_sym2dis, ["label"])
    if not tc or not lc:
        return []

    nlp_stopwords = {
        "a","an","the","i","my","have","been","feel","is","and","or",
        "with","some","that","this","also","very","much","past","last","for",
        "it","in","of","to","do","can","just","like","really","about",
        "getting","having","going","lately","recently","often","sometimes",
    }
    user_words = [w for w in _norm(user_text).split() if w not in nlp_stopwords and len(w) > 1]
    if not user_words:
        return []

    user_tokens  = set(user_words)
    user_bigrams = {f"{user_words[i]} {user_words[i+1]}" for i in range(len(user_words) - 1)}

    scores: dict[str, dict] = {}
    for _, row in _df_sym2dis.iterrows():
        label    = str(row[lc]).strip()
        row_text = _norm(str(row[tc]))
        row_words = set(row_text.split())

        token_overlap = len(user_tokens & row_words)
        if token_overlap == 0:
            continue

        bigram_overlap = sum(1 for bg in user_bigrams if bg in row_text)
        combined       = token_overlap + bigram_overlap * 2

        if label not in scores or combined > scores[label]["combined"]:
            scores[label] = {"combined": combined, "token_overlap": token_overlap,
                             "bigram_overlap": bigram_overlap}

    max_possible = max(len(user_tokens) + len(user_bigrams), 1)
    results = []
    for k, v in scores.items():
        raw_conf = ((v["token_overlap"] + v["bigram_overlap"] * 2) / max_possible) * 100
        if v["bigram_overlap"] >= 2:
            raw_conf = min(raw_conf * 1.3, 95)
        elif v["token_overlap"] >= 3:
            raw_conf = min(raw_conf * 1.2, 90)
        confidence = max(min(round(raw_conf), 99), 5)
        results.append({"disease": k, "score": v["combined"], "confidence": confidence})

    results.sort(key=lambda x: (-x["confidence"], -x["score"]))
    return results[:top_n]


def search_medquad(query: str, top_n: int = 3) -> list:
    if _df_medquad.empty:
        return []
    q_col = _find_col(_df_medquad, ["question", "qtype", "query"])
    a_col = _find_col(_df_medquad, ["answer", "response"])
    if not q_col or not a_col:
        return []

    stopwords = {
        "a","an","the","and","or","of","in","is","it","i","have","has","for",
        "with","my","what","how","why","when","should","do","can","me","to",
        "are","be","about","from","get","will","does","any","if","this","that",
        "there","its","which","who","was","had","not","but","they","we","at","on",
    }
    words = [w for w in query.lower().split() if len(w) > 3 and w not in stopwords]
    if not words:
        return []

    def _tag(results, tier):
        for r in results:
            r["match_tier"] = tier
        return results

    q_lower  = _df_medquad[q_col].fillna("").str.lower()
    combined = q_lower + " " + _df_medquad[a_col].fillna("").str.lower()

    if len(words) > 1:
        mask = q_lower.apply(lambda t: all(w in t for w in words))
        if mask.sum() > 0:
            return _tag(_df_medquad[mask][[q_col, a_col]].head(top_n)
                        .rename(columns={q_col: "question", a_col: "answer"})
                        .to_dict("records"), 1)

    if len(words) > 1:
        mask = combined.apply(lambda t: all(w in t for w in words))
        if mask.sum() > 0:
            return _tag(_df_medquad[mask][[q_col, a_col]].head(top_n)
                        .rename(columns={q_col: "question", a_col: "answer"})
                        .to_dict("records"), 2)

    if len(words) > 1:
        threshold = max(2, int(len(words) * 0.6))
        sc        = combined.apply(lambda t: sum(1 for w in words if w in t))
        mask      = sc >= threshold
        if mask.sum() > 0:
            return _tag(_df_medquad[mask][[q_col, a_col]].head(top_n)
                        .rename(columns={q_col: "question", a_col: "answer"})
                        .to_dict("records"), 3)

    for word in sorted(words, key=len, reverse=True):
        mask = q_lower.str.contains(word, regex=False, na=False)
        if mask.sum() > 0:
            return _tag(_df_medquad[mask][[q_col, a_col]].head(top_n)
                        .rename(columns={q_col: "question", a_col: "answer"})
                        .to_dict("records"), 4)

    return []


# ══════════════════════════════════════════════════════════════════════════════
# Unified smart router
# ══════════════════════════════════════════════════════════════════════════════
CONFIDENCE_THRESHOLD = 20
MIN_MATCHED_TOKENS   = 1


def smart_query(user_message: str, severity: int = 5, duration: str = "") -> dict:
    """
    Routes user message across all 12 datasets + semantic layer.
    Returns { type, confident, data }
    """
    msg_lower = user_message.lower()

    # Step 1 — Direct disease name in message
    for disease in get_all_diseases():
        if disease.strip().lower() in msg_lower:
            profile = get_disease_profile(disease)
            if any([profile["symptoms"], profile["medicines"],
                    profile["precautions"], profile["description"]]):
                return {"type": "disease_profile", "confident": True, "data": profile}

   # Step 2 — Keyword match + semantic match, blended
    sym_results = get_diseases_by_symptoms(user_message, severity=severity, duration=duration)
    sem_results = semantic_symptom_match(user_message, top_n=8)

    merged: dict[str, dict] = {}

    for r in sym_results:
        merged[r["disease"]] = r.copy()

    for r in sem_results:
        d        = r["disease"]
        sem_conf = r["confidence"]
        if d in merged:
            kw_conf = merged[d]["confidence"]
            if kw_conf < 20:
                merged[d]["confidence"] = min(round(sem_conf * 1.4), 90)
            else:
                merged[d]["confidence"] = min(round((kw_conf + sem_conf) / 2 * 1.5), 97)
            merged[d]["source"] = "both"
        else:
            boosted = r.copy()
            boosted["confidence"] = min(round(sem_conf * 1.6), 88)
            merged[d] = boosted

    blended = sorted(merged.values(), key=lambda x: -x["confidence"])

    if blended and blended[0]["confidence"] >= CONFIDENCE_THRESHOLD:
        return {"type": "symptom_match", "confident": True, "data": blended[:8]}

    # Step 3 — NLP free-text match
    nlp_results = nlp_match_disease(user_message)
    if (nlp_results
            and nlp_results[0]["confidence"] >= CONFIDENCE_THRESHOLD
            and nlp_results[0].get("score", 0) >= MIN_MATCHED_TOKENS):
        return {"type": "nlp_match", "confident": True, "data": nlp_results}

    # Step 4 — MedQuad QA
    mq_results = search_medquad(user_message)
    if mq_results:
        tier      = mq_results[0].get("match_tier", 99)
        confident = tier <= 2
        return {"type": "medquad", "confident": confident, "data": mq_results}

    # Step 5 — Low-confidence partial → HF/Gemini will augment in chat.py
    if blended:
        return {"type": "symptom_match", "confident": False, "data": blended[:8]}
    if nlp_results:
        return {"type": "nlp_match", "confident": False, "data": nlp_results}

    return {"type": "none", "confident": False, "data": []}


# ── Smoke test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== Smoke Test ===\n")
    diseases = get_all_diseases()
    print(f"✓ Diseases: {len(diseases)}  e.g. {diseases[:4]}")
    syms = get_all_symptoms()
    print(f"✓ Symptoms: {len(syms)}  e.g. {syms[:4]}")
    print(f"✓ Severity 'chest pain': {get_symptom_weight('chest pain')}  (expect 7)")
    print(f"✓ Severity 'joint pain': {get_symptom_weight('joint pain')}  (expect 3)")
    print(f"✓ sentence-transformers available: {_SEM_AVAILABLE}")

    print("\n--- Semantic match: 'racing heart and dizziness' ---")
    for r in semantic_symptom_match("racing heart and dizziness")[:3]:
        print(f"  {r}")

    print("\n--- Blended smart_query: 'I have chest pain and breathlessness' ---")
    r = smart_query("I have chest pain and breathlessness")
    print(f"  type={r['type']}, confident={r['confident']}, top={r['data'][0] if r['data'] else 'none'}")

    print("\n--- Medicines: Allergy ---")
    print(get_medicines_for_disease("Allergy"))

    print("\n✅ Done")