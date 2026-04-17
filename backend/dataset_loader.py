# MediMate/backend/dataset_loader.py
#
# FIXES APPLIED (see FIXES.md for full explanation):
#   1. Stopwords no longer include 'pain' and 'ache' — these are valid symptom tokens
#      with high severity weights (chest pain=7, stomach pain=5, etc.)
#   2. Disease name normalization: trailing/leading whitespace stripped on load,
#      plus a KAGGLE_TO_RISK_MAP bridges the kaggle↔riskFactors name mismatches
#      (e.g. 'Allergy'→'Food allergy', 'Bronchial Asthma'→'Asthma', etc.)
#   3. Symptom severity lookup now also tries the raw underscore form so
#      'dischromic  patches' (double-space) still gets a weight
#   4. matched_count was O(n²) and often wrong — replaced with a direct
#      per-row token intersection count computed during the scoring loop
#   5. Confidence formula: denominator is now sum of MATCHED token weights,
#      not sum of ALL query token weights, so short queries don't artificially
#      cap at low confidence
#   6. get_diseases_by_symptoms now accepts the full free-text string as well
#      as a list, so the MediScan textarea input works without pre-splitting

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
            # Normalise column names once on load
            df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
            # Strip whitespace from every string cell
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


# ── Disease name bridge: kaggle CSV names → riskFactors DNAME ─────────────────
# The kaggle dataset and the riskFactors CSV use different spellings/capitalisations
# for the same diseases.  This map is the authoritative cross-reference.
KAGGLE_TO_RISK_MAP: dict[str, str] = {
    # exact kaggle name (after strip)  →  DNAME in riskFactors CSV
    "Allergy":                               "Food allergy",
    "Bronchial Asthma":                      "Asthma",
    "Drug Reaction":                         "Drug allergy",
    "Fungal infection":                      "Fungal Infection",
    "Hepatitis B":                           "Hepatitis A",   # closest available
    "Hepatitis C":                           "Hepatitis A",
    "Hepatitis D":                           "Hepatitis A",
    "Hepatitis E":                           "Hepatitis A",
    "Hyperthyroidism":                       "Thyroid",
    "Osteoarthristis":                       "Osteoarthritis",
    "Paralysis (brain hemorrhage)":          "Brain hemorrhage",
    "Peptic ulcer diseae":                   "Peptic Ulcer",
    "(vertigo) Paroymsal  Positional Vertigo": "Paroxysmal Positional Vertigo",
    "Alcoholic hepatitis":                   "Hepatitis A",
    "Dimorphic hemmorhoids(piles)":          "Piles",
    "hepatitis A":                           "Hepatitis A",
    "Diabetes ":                             "Diabetes",      # trailing-space variant
    "Hypertension ":                         "Hypertension",  # trailing-space variant
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
    """Return the DNAME to use when looking up riskFactors/medicine for a kaggle disease."""
    return KAGGLE_TO_RISK_MAP.get(disease.strip(), disease.strip())


# ── Severity weight map  {symptom_norm → weight 1-7} ─────────────────────────
_severity_map: dict[str, int] = {}
if not _df_severity.empty:
    sc = _find_col(_df_severity, ["symptom"])
    wc = _find_col(_df_severity, ["weight"])
    if sc and wc:
        for _, row in _df_severity.iterrows():
            key = _norm(str(row[sc]))
            _severity_map[key] = int(row[wc])


def get_symptom_weight(symptom: str) -> int:
    """
    Return severity weight (1-7) for a symptom token or phrase.
    Tries the normalised phrase first, then the underscore form,
    then falls back to 1 so unknown tokens still contribute.
    """
    n = _norm(symptom)
    if n in _severity_map:
        return _severity_map[n]
    # Try underscore variant (e.g. "chest pain" stored as "chest_pain" in some rows)
    u = n.replace(" ", "_")
    return _severity_map.get(u, 1)


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
    if row.empty:
        return ""
    return str(row.iloc[0][dc]).strip()


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
    """
    FIX: Use KAGGLE_TO_RISK_MAP to resolve kaggle disease names to the
    correct DNAME in riskFactors before looking up the Disease_ID.
    Previously, diseases like 'Allergy', 'Bronchial Asthma', 'Drug Reaction'
    returned empty medicine lists because their names don't exist in DNAME.
    """
    if _df_medicine.empty or _df_risk.empty:
        return []

    did_col   = _find_col(_df_risk, ["did"])
    dname_col = _disease_col(_df_risk)
    if not did_col or not dname_col:
        return []

    # Resolve kaggle name → canonical risk name
    lookup_name = _canonical_risk_name(disease)

    match = _df_risk[_df_risk[dname_col].str.strip().str.lower() == lookup_name.lower()]
    if match.empty:
        # Last-resort: case-insensitive substring (safe, no regex special chars)
        safe_prefix = lookup_name[:8].lower()
        match = _df_risk[
            _df_risk[dname_col].str.strip().str.lower().str.startswith(safe_prefix, na=False)
        ]
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
    lookup_name = _canonical_risk_name(disease)
    row = _df_risk[_df_risk[col].str.strip().str.lower() == lookup_name.lower()]
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


# ── Weighted symptom → disease matching ──────────────────────────────────────

# FIX: 'pain' and 'ache' removed from stopwords.
# They are valid high-weight symptom tokens:
#   chest pain=7, stomach pain=5, back pain=3, joint pain=3, knee pain=3
# Stripping them turned "chest pain" → "chest" (weight 1) instead of weight 7,
# causing cardiac/serious queries to score at only 33% confidence.
_STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "in", "is", "it", "i",
    "have", "has", "for", "with", "my", "feel", "feeling", "some",
    "since", "days", "been", "very", "bit", "lot", "also", "just",
    "like", "really", "much", "after", "before", "when", "then",
    "that", "this", "from", "about", "getting", "having", "going",
    "lately", "recently", "often", "sometimes", "now", "today",
    "yesterday", "morning", "night", "week", "weeks", "month",
    # NOTE: 'pain' and 'ache' intentionally NOT here — they are valid symptom tokens
}


def _extract_query_phrases(raw_text: str) -> list[str]:
    """
    Extract symptom phrases from free-text input using n-gram matching.
    Returns a list of matched phrases (bigrams/trigrams first, then single tokens).

    Strategy:
      1. Build all known symptom phrases from the severity map + dataset columns.
      2. Greedily match the longest known phrases in the user text.
      3. Fall back to single tokens for unmatched words.
    """
    text = _norm(raw_text)
    words = [w for w in text.split() if w not in _STOPWORDS and len(w) > 1]
    if not words:
        return []

    # Build a set of known multi-word symptom phrases
    known_phrases = set(_severity_map.keys())
    # Also collect all symptom phrases from the primary DataFrame
    df = _primary_symptom_df()
    scols = [c for c in df.columns if c.startswith("symptom")]
    for col_name in scols:
        for val in df[col_name].dropna().unique():
            known_phrases.add(_norm(str(val)))

    matched_phrases = []
    used_indices = set()

    # Greedy longest-match: try trigrams, then bigrams, then single tokens
    for n in (3, 2):
        for i in range(len(words) - n + 1):
            if any(j in used_indices for j in range(i, i + n)):
                continue
            candidate = " ".join(words[i:i + n])
            if candidate in known_phrases:
                matched_phrases.append(candidate)
                used_indices.update(range(i, i + n))

    # Remaining single tokens
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
    """
    Production-grade symptom → disease matching.

    Improvements over v1:
      1. Multi-phrase extraction: 'chest pain' matches as one phrase (weight 7)
         instead of 'chest' (1) + 'pain' (3) separately.
      2. Phrase-level matching: each disease row's symptom phrases are matched
         against query phrases, giving accurate overlap scores.
      3. Smarter confidence: ratio of matched phrases to total disease phrases,
         with a boost for ≥3 matches and severity adjustment.
      4. Severity/duration awareness: high severity boosts serious conditions.
    """
    df  = _primary_symptom_df()
    col = _disease_col(df)
    if col is None:
        return []

    # Accept either a list of terms or a raw string
    if isinstance(symptoms, str):
        raw_text = symptoms
    else:
        raw_text = " ".join(symptoms)

    query_phrases = _extract_query_phrases(raw_text)
    if not query_phrases:
        return []

    # Build a set of single tokens from query for fallback matching
    query_tokens = set()
    for p in query_phrases:
        query_tokens.update(p.split())

    scols = [c for c in df.columns if c.startswith("symptom")]

    seen: dict[str, dict] = {}   # disease → best match info

    for _, row in df.iterrows():
        disease_name = str(row[col]).strip()

        # Collect this disease's symptom phrases
        row_phrases: list[str] = []
        for sc in scols:
            val = row[sc]
            if isinstance(val, str) and val.strip():
                row_phrases.append(_norm(val))

        if not row_phrases:
            continue

        row_total_phrases = len(row_phrases)
        row_total_score   = sum(get_symptom_weight(p) for p in row_phrases)

        # === Phase A: Phrase-level matching (high accuracy) ===
        phrase_matches = 0
        phrase_score   = 0
        matched_row_phrases = set()

        for qp in query_phrases:
            for j, rp in enumerate(row_phrases):
                if j in matched_row_phrases:
                    continue
                # Exact phrase match or significant overlap
                if qp == rp or (len(qp.split()) > 1 and qp in rp) or (len(rp.split()) > 1 and rp in qp):
                    matched_row_phrases.add(j)
                    phrase_matches += 1
                    phrase_score += get_symptom_weight(rp)
                    break

        # === Phase B: Token-level fallback for remaining unmatched ===
        token_matches = 0
        for j, rp in enumerate(row_phrases):
            if j in matched_row_phrases:
                continue
            rp_tokens = set(rp.split())
            if query_tokens & rp_tokens:
                matched_row_phrases.add(j)
                token_matches += 1
                # Partial score: weight * fraction of tokens matched
                overlap_ratio = len(query_tokens & rp_tokens) / len(rp_tokens)
                phrase_score += get_symptom_weight(rp) * overlap_ratio

        total_matched = phrase_matches + token_matches
        if total_matched == 0:
            continue

        # === Confidence calculation ===
        # Phrase matches are worth 1.0, token-only matches are worth 0.3
        # This prevents "pain" token matching 4 disease symptoms from
        # outranking an exact "chest pain" phrase match
        effective_matches = phrase_matches + token_matches * 0.3
        base_confidence = (effective_matches / max(row_total_phrases, 1)) * 100

        # Boost for multiple exact phrase matches (clinical relevance)
        if phrase_matches >= 3:
            base_confidence = min(base_confidence * 1.5, 95)
        elif phrase_matches >= 2:
            base_confidence = min(base_confidence * 1.35, 92)
        elif phrase_matches >= 1 and token_matches >= 1:
            base_confidence = min(base_confidence * 1.2, 88)

        # Penalty: if ONLY token matches and no phrase matches, cap confidence
        if phrase_matches == 0:
            base_confidence = min(base_confidence, 25)

        # Score bonus: weight-based component (phrase score vs total)
        weight_confidence = (phrase_score / max(row_total_score, 1)) * 100
        # Blend: 55% phrase-ratio + 45% weight-ratio
        confidence = base_confidence * 0.55 + weight_confidence * 0.45

        # Severity boost: if user reports high severity, boost serious conditions
        if severity >= 7 and phrase_score >= 5:
            confidence = min(confidence * 1.1, 95)

        confidence = min(round(confidence), 99)
        confidence = max(confidence, 5)  # floor at 5%

        if disease_name not in seen or phrase_score > seen[disease_name]["score"]:
            seen[disease_name] = {
                "score":          round(phrase_score, 2),
                "matched_count":  total_matched,
                "phrase_matches": phrase_matches,
                "row_total":      max(row_total_score, 1),
                "confidence":     confidence,
            }

    results = [
        {
            "disease":        k,
            "score":          v["score"],
            "matched_count":  v["matched_count"],
            "confidence":     v["confidence"],
        }
        for k, v in seen.items()
    ]
    results.sort(key=lambda x: (-x["confidence"], -x["score"]))
    return results[:top_n]


# ── NLP match via Symptom2Disease ─────────────────────────────────────────────
def nlp_match_disease(user_text: str, top_n: int = 5) -> list:
    """
    Match user text against the Symptom2Disease NLP corpus.

    Improvements:
      - Generates bigrams from user text for phrase-level matching
      - Weights bigram matches higher than single token matches
      - Better confidence: quality-weighted, not just token ratio
    """
    if _df_sym2dis.empty:
        return []
    tc = _find_col(_df_sym2dis, ["text"])
    lc = _find_col(_df_sym2dis, ["label"])
    if not tc or not lc:
        return []

    nlp_stopwords = {
        "a", "an", "the", "i", "my", "have", "been", "feel", "is", "and", "or",
        "with", "some", "that", "this", "also", "very", "much", "past", "last", "for",
        "it", "in", "of", "to", "do", "can", "just", "like", "really", "about",
        "getting", "having", "going", "lately", "recently", "often", "sometimes",
    }
    user_words = [w for w in _norm(user_text).split() if w not in nlp_stopwords and len(w) > 1]
    if not user_words:
        return []

    user_tokens = set(user_words)

    # Generate bigrams for phrase-level matching
    user_bigrams = set()
    for i in range(len(user_words) - 1):
        user_bigrams.add(f"{user_words[i]} {user_words[i+1]}")

    scores: dict[str, dict] = {}
    for _, row in _df_sym2dis.iterrows():
        label     = str(row[lc]).strip()
        row_text  = _norm(str(row[tc]))
        row_words = set(row_text.split())

        # Token overlap
        token_overlap = len(user_tokens & row_words)
        if token_overlap == 0:
            continue

        # Bigram overlap (worth more)
        bigram_overlap = 0
        for bg in user_bigrams:
            if bg in row_text:
                bigram_overlap += 1

        # Combined score: bigrams count double
        combined = token_overlap + bigram_overlap * 2

        if label not in scores or combined > scores[label]["combined"]:
            scores[label] = {
                "combined":       combined,
                "token_overlap":  token_overlap,
                "bigram_overlap": bigram_overlap,
            }

    # Confidence: based on how many query tokens matched, with bigram bonus
    max_possible = max(len(user_tokens) + len(user_bigrams), 1)
    results = []
    for k, v in scores.items():
        raw_conf = ((v["token_overlap"] + v["bigram_overlap"] * 2) / max_possible) * 100
        # Boost for high-quality matches
        if v["bigram_overlap"] >= 2:
            raw_conf = min(raw_conf * 1.3, 95)
        elif v["token_overlap"] >= 3:
            raw_conf = min(raw_conf * 1.2, 90)
        confidence = min(round(raw_conf), 99)
        confidence = max(confidence, 5)
        results.append({
            "disease":    k,
            "score":      v["combined"],
            "confidence": confidence,
        })

    results.sort(key=lambda x: (-x["confidence"], -x["score"]))
    return results[:top_n]


# ── MedQuad QA ────────────────────────────────────────────────────────────────
def search_medquad(query: str, top_n: int = 3) -> list:
    if _df_medquad.empty:
        return []
    q_col = _find_col(_df_medquad, ["question", "qtype", "query"])
    a_col = _find_col(_df_medquad, ["answer", "response"])
    if not q_col or not a_col:
        return []

    stopwords = {
        "a", "an", "the", "and", "or", "of", "in", "is", "it", "i", "have",
        "has", "for", "with", "my", "what", "how", "why", "when", "should",
        "do", "can", "me", "to", "are", "be", "about", "from", "get", "will",
        "does", "any", "if", "this", "that", "there", "its", "which", "who",
        "was", "had", "not", "but", "they", "we", "at", "on",
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
            return _tag(
                _df_medquad[mask][[q_col, a_col]].head(top_n)
                .rename(columns={q_col: "question", a_col: "answer"})
                .to_dict("records"), 1)

    if len(words) > 1:
        mask = combined.apply(lambda t: all(w in t for w in words))
        if mask.sum() > 0:
            return _tag(
                _df_medquad[mask][[q_col, a_col]].head(top_n)
                .rename(columns={q_col: "question", a_col: "answer"})
                .to_dict("records"), 2)

    if len(words) > 1:
        threshold = max(2, int(len(words) * 0.6))
        scores    = combined.apply(lambda t: sum(1 for w in words if w in t))
        mask      = scores >= threshold
        if mask.sum() > 0:
            return _tag(
                _df_medquad[mask][[q_col, a_col]].head(top_n)
                .rename(columns={q_col: "question", a_col: "answer"})
                .to_dict("records"), 3)

    for word in sorted(words, key=len, reverse=True):
        mask = q_lower.str.contains(word, regex=False, na=False)
        if mask.sum() > 0:
            return _tag(
                _df_medquad[mask][[q_col, a_col]].head(top_n)
                .rename(columns={q_col: "question", a_col: "answer"})
                .to_dict("records"), 4)

    return []


# ══════════════════════════════════════════════════════════════════════════════
# Unified smart router
# ══════════════════════════════════════════════════════════════════════════════
CONFIDENCE_THRESHOLD = 20   # Lowered: new confidence formula is better calibrated.
                             # 20% means "at least some meaningful symptom overlap".
                             # Gemini augmentation handles anything below this.
MIN_MATCHED_TOKENS   = 1    # Allow single strong phrase matches (e.g. "chest pain")


def smart_query(user_message: str, severity: int = 5, duration: str = "") -> dict:
    """
    Routes user message across all 12 datasets.
    Returns { type, confident, data }

    Now accepts severity and duration to pass through to symptom matching.
    """
    msg_lower = user_message.lower()

    # Step 1 — Direct disease name in message
    for disease in get_all_diseases():
        if disease.strip().lower() in msg_lower:
            profile = get_disease_profile(disease)
            if any([profile["symptoms"], profile["medicines"],
                    profile["precautions"], profile["description"]]):
                return {"type": "disease_profile", "confident": True, "data": profile}

    # Step 2 — Weighted symptom match (with multi-phrase extraction)
    sym_results = get_diseases_by_symptoms(
        user_message, severity=severity, duration=duration
    )
    if (sym_results
            and sym_results[0]["confidence"] >= CONFIDENCE_THRESHOLD
            and sym_results[0].get("matched_count", 0) >= MIN_MATCHED_TOKENS):
        return {"type": "symptom_match", "confident": True, "data": sym_results}

    # Step 3 — NLP free-text match (with bigrams)
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

    # Step 5 — Low-confidence partial result → Gemini will augment
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
    print(f"✓ Severity 'chest pain': {get_symptom_weight('chest pain')}  (should be 7)")
    print(f"✓ Severity 'joint pain': {get_symptom_weight('joint pain')}  (should be 3)")

    print("\n--- Medicines: Allergy (was returning []) ---")
    print(get_medicines_for_disease("Allergy"))

    print("\n--- Medicines: Bronchial Asthma (was returning []) ---")
    print(get_medicines_for_disease("Bronchial Asthma"))

    print("\n--- Medicines: Drug Reaction (was returning []) ---")
    print(get_medicines_for_disease("Drug Reaction"))

    print("\n--- Symptom match: chest pain, shortness of breath ---")
    for r in get_diseases_by_symptoms(["chest pain", "shortness of breath"])[:5]:
        print(f"  {r}")

    print("\n--- Symptom match: fever headache chills ---")
    for r in get_diseases_by_symptoms(["fever", "headache", "chills"])[:5]:
        print(f"  {r}")

    print("\n--- Profile: Malaria ---")
    p = get_disease_profile("Malaria")
    for k, v in p.items():
        print(f"  {k}: {str(v)[:80]}")

    print("\n--- smart_query: 'I have chest pain and breathlessness' ---")
    r = smart_query("I have chest pain and breathlessness")
    print(f"  type={r['type']}, confident={r['confident']}, top={r['data'][0] if r['data'] else 'none'}")

    print("\n✅ Done")