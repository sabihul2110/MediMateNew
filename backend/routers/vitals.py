# MediMate/backend/routers/vitals.py
# ─────────────────────────────────────────────────────────────────
# Endpoints:
#   POST /api/vitals/analyze   → vitals entry + status flags + alerts
# ─────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


class VitalsRequest(BaseModel):
    heart_rate:    float = Field(..., example=72,    description="BPM")
    systolic_bp:   float = Field(..., example=120,   description="mmHg")
    diastolic_bp:  float = Field(..., example=80,    description="mmHg")
    spo2:          float = Field(..., example=98,    description="SpO2 %")
    blood_sugar:   float = Field(..., example=95,    description="mg/dL")
    temperature_f: float = Field(..., example=98.6,  description="°F")
    sugar_type:    str   = Field("fasting", example="fasting",  description="fasting | random")


class VitalFlag(BaseModel):
    value:  float
    status: str   # normal | elevated | low | critical
    label:  str
    note:   str


class VitalsResponse(BaseModel):
    heart_rate:   VitalFlag
    blood_pressure: VitalFlag
    spo2:         VitalFlag
    blood_sugar:  VitalFlag
    temperature:  VitalFlag
    overall:      str          # optimal | stable | elevated | critical
    alerts:       list[str]    # urgent messages if any
    see_doctor_if: list[str]   # when to seek care


def _flag_hr(val: float) -> VitalFlag:
    if val < 60:
        return VitalFlag(value=val, status="low",      label="Low",    note="Bradycardia — resting HR below 60 bpm.")
    if val <= 100:
        return VitalFlag(value=val, status="normal",   label="Normal", note="Heart rate is within healthy range.")
    if val <= 120:
        return VitalFlag(value=val, status="elevated", label="High",   note="Tachycardia — consider rest and hydration.")
    return VitalFlag(value=val, status="critical",     label="Critical", note="Severely elevated heart rate. Seek care.")


def _flag_bp(sys: float, dia: float) -> VitalFlag:
    val = sys   # display systolic
    if sys < 90 or dia < 60:
        return VitalFlag(value=val, status="low",      label="Low BP",      note="Hypotension — stay hydrated, avoid standing quickly.")
    if sys < 120 and dia < 80:
        return VitalFlag(value=val, status="normal",   label="Normal",      note="Blood pressure is optimal.")
    if sys < 130 and dia < 80:
        return VitalFlag(value=val, status="elevated", label="Elevated",    note="Slightly above normal — monitor closely.")
    if sys < 140 or dia < 90:
        return VitalFlag(value=val, status="elevated", label="High Stage 1", note="Hypertension Stage 1 — lifestyle changes advised.")
    if sys < 180 or dia < 120:
        return VitalFlag(value=val, status="elevated", label="High Stage 2", note="Hypertension Stage 2 — consult a doctor.")
    return VitalFlag(value=val, status="critical",     label="Crisis",      note="Hypertensive crisis — seek emergency care immediately.")


def _flag_spo2(val: float) -> VitalFlag:
    if val >= 95:
        return VitalFlag(value=val, status="normal",   label="Normal",  note="Oxygen saturation is healthy.")
    if val >= 90:
        return VitalFlag(value=val, status="low",      label="Low",     note="Mild hypoxia — monitor breathing closely.")
    return VitalFlag(value=val, status="critical",     label="Critical", note="Severe hypoxia — seek emergency care.")


def _flag_sugar(val: float, sugar_type: str) -> VitalFlag:
    if sugar_type == "fasting":
        if val < 70:
            return VitalFlag(value=val, status="low",      label="Low",     note="Hypoglycemia — consume fast-acting carbs.")
        if val <= 99:
            return VitalFlag(value=val, status="normal",   label="Stable",  note="Fasting blood sugar is normal.")
        if val <= 125:
            return VitalFlag(value=val, status="elevated", label="Pre-diabetic", note="Borderline — consider dietary changes.")
        return VitalFlag(value=val, status="elevated",     label="High",    note="Diabetic range — consult a physician.")
    else:  # random
        if val < 70:
            return VitalFlag(value=val, status="low",      label="Low",     note="Hypoglycemia — eat or drink something sweet.")
        if val <= 139:
            return VitalFlag(value=val, status="normal",   label="Normal",  note="Blood sugar is within normal post-meal range.")
        if val <= 199:
            return VitalFlag(value=val, status="elevated", label="Elevated", note="Mildly high after meal — monitor trend.")
        return VitalFlag(value=val, status="elevated",     label="High",    note="Consistently high sugar — seek medical advice.")


def _flag_temp(val: float) -> VitalFlag:
    if val < 96.8:
        return VitalFlag(value=val, status="low",      label="Low",     note="Hypothermia risk — warm up and monitor.")
    if val <= 99.5:
        return VitalFlag(value=val, status="normal",   label="Normal",  note="Body temperature is normal.")
    if val <= 102:
        return VitalFlag(value=val, status="elevated", label="Fever",   note="Mild fever — rest, fluids, and acetaminophen.")
    return VitalFlag(value=val, status="critical",     label="High Fever", note="High fever — seek medical attention.")


@router.post("/analyze")
def analyze_vitals(body: VitalsRequest):
    hr   = _flag_hr(body.heart_rate)
    bp   = _flag_bp(body.systolic_bp, body.diastolic_bp)
    spo2 = _flag_spo2(body.spo2)
    bs   = _flag_sugar(body.blood_sugar, body.sugar_type)
    temp = _flag_temp(body.temperature_f)

    flags = [hr, bp, spo2, bs, temp]
    statuses = [f.status for f in flags]

    if "critical" in statuses:
        overall = "critical"
    elif statuses.count("elevated") >= 2:
        overall = "elevated"
    elif "elevated" in statuses or "low" in statuses:
        overall = "stable"
    else:
        overall = "optimal"

    alerts = [f.note for f in flags if f.status == "critical"]

    return {
        "heart_rate":     hr,
        "blood_pressure": bp,
        "spo2":           spo2,
        "blood_sugar":    bs,
        "temperature":    temp,
        "overall":        overall,
        "alerts":         alerts,
        "see_doctor_if": [
            "Resting heart rate consistently above 100 bpm or below 60 bpm.",
            "SpO2 levels drop below 94% persistently.",
            "Sudden spike in blood pressure (180/120 mmHg or higher).",
            "Temperature exceeding 103°F or lasting more than 3 days.",
            "Blood sugar above 200 mg/dL on multiple readings.",
        ],
    }