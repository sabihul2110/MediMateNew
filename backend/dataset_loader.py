# MediMate/backend/dataset_loader.py
#
# Uses all 12 CSV datasets. Priority order for each data type:
#
#   Symptoms    → dataset_kaggle  (4 920 rows)  > disease_and_symptoms > disease_symptoms
#   Description → symptom_description (Kaggle, has actual text)
#   Precautions → symptom_precaution (Kaggle) > disease_precaution > disease_precaution_v2
#   Medicines   → disease_medicine  (joined via Disease_ID ↔ DNAME from risk_factors)
#   Risk factors→ disease_risk_factors (DNAME / RISKFAC columns)
#   Severity    → symptom_severity  (weights 1-7 per symptom)
#   NLP match   → symptom2disease   (natural language descriptions, 1200 rows)
#   QA fallback → medquad           (16 412 rows)

import pandas as pd
from pathlib import Path
from config import DATASETS


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
            return df
        except UnicodeDecodeError:
            continue
    return pd.DataFrame()


# ── Load all 12 files once at startup ────────────────────────────────────────
_df_kaggle       = _load("dataset_kaggle").drop_duplicates()      # 4 920 rows  ← PRIMARY
_df_desc         = _load("symptom_description").drop_duplicates() # disease → description
_df_prec_new     = _load("symptom_precaution").drop_duplicates()  # disease → precautions (best)
_df_severity     = _load("symptom_severity").drop_duplicates()    # symptom → weight 1-7
_df_sym2dis      = _load("symptom2disease").drop_duplicates()     # NLP text → label
_df_dis_sym_wide = _load("disease_and_symptoms").drop_duplicates()
_df_dis_sym_long = _load("disease_symptoms").drop_duplicates()
_df_medicine     = _load("disease_medicine").drop_duplicates()
_df_prec_v1      = _load("disease_precaution").drop_duplicates()
_df_prec_v2      = _load("disease_precaution_v2").drop_duplicates()
_df_risk         = _load("disease_risk_factors").drop_duplicates()
_df_medquad      = _load("medquad").drop_duplicates()


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


# ── Severity weight map  {symptom_norm → weight 1-7} ─────────────────────────
_severity_map: dict = {}
if not _df_severity.empty:
    sc = _find_col(_df_severity, ["symptom"])
    wc = _find_col(_df_severity, ["weight"])
    if sc and wc:
        for _, row in _df_severity.iterrows():
            _severity_map[_norm(str(row[sc]))] = int(row[wc])


def get_symptom_weight(symptom: str) -> int:
    return _severity_map.get(_norm(symptom), 1)


# ── Best available wide-format symptom dataframe ─────────────────────────────
def _primary_symptom_df() -> pd.DataFrame:
    for df in [_df_kaggle, _df_dis_sym_wide, _df_dis_sym_long]:
        if not df.empty and _disease_col(df):
            return df
    return pd.DataFrame()


# ══════════════════════════════════════════════════════════════════════════════
# Public API
# ══════════════════════════════════════════════════════════════════════════════

def get_all_diseases() -> list:
    df  = _primary_symptom_df()
    col = _disease_col(df)
    if col is None:
        return []
    return sorted(df[col].dropna().unique().tolist())


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
    rows  = df[df[col].str.lower() == disease.lower()]
    scols = [c for c in rows.columns if c.startswith("symptom")]
    seen, out = set(), []
    for val in rows[scols].values.flatten():
        n = _norm(val) if isinstance(val, str) and val.strip() else None
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def get_description_for_disease(disease: str) -> str:
    """Human-readable description from symptom_Description.csv (Kaggle)."""
    if _df_desc.empty:
        return ""
    col = _disease_col(_df_desc)
    dc  = _find_col(_df_desc, ["description"])
    if not col or not dc:
        return ""
    row = _df_desc[_df_desc[col].str.lower() == disease.lower()]
    if row.empty:
        return ""
    return str(row.iloc[0][dc]).strip()


def get_precautions_for_disease(disease: str) -> list:
    """Priority: Kaggle precaution → old v1 → old v2."""
    for df in [_df_prec_new, _df_prec_v1, _df_prec_v2]:
        if df.empty:
            continue
        col = _disease_col(df)
        if not col:
            continue
        row = df[df[col].str.lower() == disease.lower()]
        if row.empty:
            continue
        pcols  = [c for c in row.columns if "precaution" in c]
        result = [p.strip() for p in row[pcols].values.flatten()
                  if isinstance(p, str) and p.strip()]
        if result:
            return result
    return []


def get_medicines_for_disease(disease: str) -> list:
    """
    disease_medicine.csv uses Disease_ID.
    We resolve name→ID via disease_risk_factors (DID / DNAME).
    """
    if _df_medicine.empty or _df_risk.empty:
        return []

    did_col   = _find_col(_df_risk, ["did"])
    dname_col = _disease_col(_df_risk)
    if not did_col or not dname_col:
        return []

    # Exact match first, then prefix fuzzy
    match = _df_risk[_df_risk[dname_col].str.lower() == disease.lower()]
    if match.empty:
        match = _df_risk[_df_risk[dname_col].str.lower().str.contains(
            disease.lower()[:8], na=False)]
    if match.empty:
        return []

    disease_id = match.iloc[0][did_col]
    mid_col    = _find_col(_df_medicine, ["disease_id"])
    mname_col  = _find_col(_df_medicine, ["medicine_name"])
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
    row = _df_risk[_df_risk[col].str.lower() == disease.lower()]
    if row.empty:
        return []
    raw = str(row.iloc[0][rc]).strip()
    return [r.strip() for r in raw.split(",") if r.strip()]


def get_occurrence_for_disease(disease: str) -> str:
    if _df_risk.empty:
        return ""
    col = _disease_col(_df_risk)
    oc  = _find_col(_df_risk, ["occur"])
    if not col or not oc:
        return ""
    row = _df_risk[_df_risk[col].str.lower() == disease.lower()]
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


# ── Weighted symptom → disease matching ──────────────────────────────────────
def get_diseases_by_symptoms(symptoms: list, top_n: int = 8) -> list:
    """
    Each matched symptom contributes its severity weight (1-7) to the score.
    Returns top matches sorted by weighted score with confidence %.
    """
    df  = _primary_symptom_df()
    col = _disease_col(df)
    if col is None:
        return []

    stopwords = {
        "a","an","the","and","or","of","in","is","it","i","have","has","for",
        "with","my","feel","feeling","some","since","days","been","very","bit",
        "pain","ache"  # too generic — match via severity map instead
    }
    query_tokens = set()
    for s in symptoms:
        query_tokens.update(_norm(s).split())
    query_tokens -= stopwords
    if not query_tokens:
        return []

    # Max possible score = sum of all query-token weights
    max_score = max(sum(get_symptom_weight(t) for t in query_tokens), 1)

    scols = [c for c in df.columns if c.startswith("symptom")]
    seen: dict = {}

    for _, row in df.iterrows():
        disease_name = str(row[col]).strip()
        row_tokens   = set()
        for sc in scols:
            val = row[sc]
            if isinstance(val, str) and val.strip():
                row_tokens.update(_norm(val).split())

        matched = query_tokens & row_tokens
        score   = sum(get_symptom_weight(t) for t in matched)

        if score > 0 and (disease_name not in seen or score > seen[disease_name]):
            seen[disease_name] = score

    results = [
        {
            "disease":       k,
            "score":         round(v, 2),
            "matched_count": len([t for t in query_tokens
                                  if any(t in _norm(str(df.loc[df[col]==k].iloc[0][sc]))
                                         for sc in scols
                                         if k in df[col].values)]),
            "confidence":    min(round((v / max_score) * 100), 99),
        }
        for k, v in seen.items()
    ]
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


# ── NLP match via Symptom2Disease (free-text descriptions) ───────────────────
def nlp_match_disease(user_text: str, top_n: int = 5) -> list:
    """
    Token-overlap match against 1200 natural-language symptom descriptions.
    Catches queries like 'red itchy patches on skin' that keyword match misses.
    """
    if _df_sym2dis.empty:
        return []
    tc = _find_col(_df_sym2dis, ["text"])
    lc = _find_col(_df_sym2dis, ["label"])
    if not tc or not lc:
        return []

    stopwords = {
        "a","an","the","i","my","have","been","feel","is","and","or","with",
        "some","that","this","also","very","much","been","past","last","for"
    }
    user_tokens = set(_norm(user_text).split()) - stopwords
    if not user_tokens:
        return []

    scores: dict = {}
    for _, row in _df_sym2dis.iterrows():
        label   = str(row[lc]).strip()
        overlap = len(user_tokens & set(_norm(str(row[tc])).split()))
        if overlap > 0 and (label not in scores or overlap > scores[label]):
            scores[label] = overlap

    total   = max(len(user_tokens), 1)
    results = [
        {"disease": k, "score": v, "confidence": min(round((v / total) * 100), 99)}
        for k, v in scores.items()
    ]
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


# ── MedQuad QA (strict multi-word matching, 16 412 rows) ─────────────────────
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

    q_lower = _df_medquad[q_col].fillna("").str.lower()
    combined = (q_lower + " " + _df_medquad[a_col].fillna("").str.lower())

    # Tier 1: all words match in QUESTION column (highest relevance)
    if len(words) > 1:
        mask = q_lower.apply(lambda t: all(w in t for w in words))
        if mask.sum() > 0:
            res = (_df_medquad[mask][[q_col, a_col]].head(top_n)
                   .rename(columns={q_col: "question", a_col: "answer"})
                   .to_dict("records"))
            return _tag(res, 1)

    # Tier 2: all words match in combined Q+A
    if len(words) > 1:
        mask = combined.apply(lambda t: all(w in t for w in words))
        if mask.sum() > 0:
            res = (_df_medquad[mask][[q_col, a_col]].head(top_n)
                   .rename(columns={q_col: "question", a_col: "answer"})
                   .to_dict("records"))
            return _tag(res, 2)

    # Tier 3: majority (≥60%) in combined
    if len(words) > 1:
        threshold = max(2, int(len(words) * 0.6))
        scores    = combined.apply(lambda t: sum(1 for w in words if w in t))
        mask      = scores >= threshold
        if mask.sum() > 0:
            res = (_df_medquad[mask][[q_col, a_col]].head(top_n)
                   .rename(columns={q_col: "question", a_col: "answer"})
                   .to_dict("records"))
            return _tag(res, 3)

    # Tier 4: longest keyword in question only (avoids false positives from long answers)
    for word in sorted(words, key=len, reverse=True):
        mask = q_lower.str.contains(word, regex=False, na=False)
        if mask.sum() > 0:
            res = (_df_medquad[mask][[q_col, a_col]].head(top_n)
                   .rename(columns={q_col: "question", a_col: "answer"})
                   .to_dict("records"))
            return _tag(res, 4)

    return []


# ══════════════════════════════════════════════════════════════════════════════
# Unified smart router
# ══════════════════════════════════════════════════════════════════════════════
CONFIDENCE_THRESHOLD = 55   # below this % → route will call Gemini
MIN_MATCHED_TOKENS   = 2    # require at least 2 real symptom tokens to match


def smart_query(user_message: str) -> dict:
    """
    Routes user message across all 12 datasets.

    Returns:
        {
          "type":      "disease_profile" | "symptom_match" | "nlp_match" | "medquad" | "none"
          "confident": bool   ← False means the route should call Gemini as fallback
          "data":      list | dict
        }
    """
    msg_lower = user_message.lower()

    # Step 1 ── Direct disease name in message (high precision)
    for disease in get_all_diseases():
        if disease.lower() in msg_lower:
            profile = get_disease_profile(disease)
            if any([profile["symptoms"], profile["medicines"],
                    profile["precautions"], profile["description"]]):
                return {"type": "disease_profile", "confident": True, "data": profile}

    # Step 2 ── Weighted symptom match (structured keywords)
    sym_results = get_diseases_by_symptoms(user_message.split())
    if (sym_results
            and sym_results[0]["confidence"] >= CONFIDENCE_THRESHOLD
            and sym_results[0].get("matched_count", 0) >= MIN_MATCHED_TOKENS):
        return {"type": "symptom_match", "confident": True, "data": sym_results}

    # Step 3 ── NLP free-text match (catches "red itchy patches", "tight chest", etc.)
    nlp_results = nlp_match_disease(user_message)
    if (nlp_results
            and nlp_results[0]["confidence"] >= CONFIDENCE_THRESHOLD
            and nlp_results[0].get("score", 0) >= MIN_MATCHED_TOKENS):
        return {"type": "nlp_match", "confident": True, "data": nlp_results}

    # Step 4 ── MedQuad QA (general health questions)
    mq_results = search_medquad(user_message)
    if mq_results:
        tier = mq_results[0].get("match_tier", 99)
        # Only confident if it matched in question column (tier 1) or all-words (tier 2)
        confident = tier <= 2
        return {"type": "medquad", "confident": confident, "data": mq_results}

    # Step 5 ── Low-confidence CSV or no match → pass to Gemini
    # Still include partial data so the chat route can merge it
    if sym_results:
        return {"type": "symptom_match", "confident": False, "data": sym_results}
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
    print(f"✓ Severity 'skin rash': {get_symptom_weight('skin rash')}")

    print("\n--- Profile: Malaria ---")
    p = get_disease_profile("Malaria")
    for k, v in p.items():
        print(f"  {k}: {str(v)[:100]}")

    print("\n--- Symptom match: fever headache chills ---")
    for r in get_diseases_by_symptoms(["fever", "headache", "chills"])[:4]:
        print(f"  {r}")

    print("\n--- NLP: 'red itchy scaly patches on skin' ---")
    for r in nlp_match_disease("red itchy scaly patches on skin")[:4]:
        print(f"  {r}")

    print("\n--- smart_query: 'I have tooth pain' ---")
    r = smart_query("I have tooth pain")
    print(f"  type={r['type']}, confident={r['confident']}")

    print("\n✅ Done")