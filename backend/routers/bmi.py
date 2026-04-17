# MediMate/backend/routers/bmi.py
# ─────────────────────────────────────────────────────────────────
# Endpoints:
#   POST /api/bmi/calculate   → BMI score + category + advice
# ─────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class BMIRequest(BaseModel):
    height_cm: float = Field(..., gt=0, le=300, example=175)
    weight_kg: float = Field(..., gt=0, le=700, example=72)


class BMIResponse(BaseModel):
    bmi:           float
    category:      str
    range:         str
    color:         str   # for frontend badge
    advice:        str
    cardio_risk:   str
    diabetes_risk: str
    pro_tip:       str


def _calculate(height_cm: float, weight_kg: float) -> BMIResponse:
    h_m = height_cm / 100
    bmi = round(weight_kg / (h_m ** 2), 1)

    if bmi < 18.5:
        category      = "Underweight"
        range_str     = "< 18.5"
        color         = "blue"
        advice        = "Focus on nutrient-dense foods and strength training to build muscle mass safely."
        cardio_risk   = "Low–Moderate"
        diabetes_risk = "Low"
        pro_tip       = "Eat 5–6 small meals a day rich in protein and healthy fats."
    elif bmi < 25:
        category      = "Normal"
        range_str     = "18.5 – 24.9"
        color         = "green"
        advice        = "Maintaining this BMI requires 150 min of moderate activity per week. Focus on lean proteins and complex carbohydrates."
        cardio_risk   = "Low"
        diabetes_risk = "Low"
        pro_tip       = "Measure your weight in the morning before eating for the most consistent results."
    elif bmi < 30:
        category      = "Overweight"
        range_str     = "25 – 29.9"
        color         = "orange"
        advice        = "A 500 kcal daily deficit combined with 200 min of weekly exercise can help return to normal range."
        cardio_risk   = "Moderate"
        diabetes_risk = "Moderate"
        pro_tip       = "Swap refined carbs for whole grains and increase daily steps by 2,000."
    else:
        category      = "Obese"
        range_str     = "≥ 30"
        color         = "red"
        advice        = "Consult a physician for a structured weight-loss plan. Even a 5–10% reduction significantly lowers health risks."
        cardio_risk   = "High"
        diabetes_risk = "High"
        pro_tip       = "Start with low-impact exercises like walking or swimming to protect your joints."

    return BMIResponse(
        bmi=bmi,
        category=category,
        range=range_str,
        color=color,
        advice=advice,
        cardio_risk=cardio_risk,
        diabetes_risk=diabetes_risk,
        pro_tip=pro_tip,
    )


@router.post("/calculate", response_model=BMIResponse)
def calculate_bmi(body: BMIRequest):
    return _calculate(body.height_cm, body.weight_kg)