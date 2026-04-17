// MediMate/frontend/src/api/index.js
import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
})

// ── MediScan Logs ───────────────────────────────────────────
export const saveMediScan = data =>
  api.post("/api/mediscan-logs/save", data, { headers: authHeader() })

export const getMediScanHistory = (limit = 20) =>
  api.get(`/api/mediscan-logs/?limit=${limit}`, { headers: authHeader() })

// ── Diseases ─────────────────────────────────────────────────
export const getAllDiseases     = ()       => api.get("/api/diseases/")
export const searchDiseases     = q        => api.get(`/api/diseases/search?q=${q}`)
export const getDiseaseProfile  = name     => api.get(`/api/diseases/${encodeURIComponent(name)}`)

// ── Symptoms ─────────────────────────────────────────────────
export const getAllSymptoms      = ()             => api.get("/api/symptoms/")
export const searchSymptoms     = q              => api.get(`/api/symptoms/search?q=${q}`)
export const matchSymptoms      = (symptoms, top_n=10) => api.post("/api/symptoms/match", { symptoms, top_n })

// ── BMI ──────────────────────────────────────────────────────
export const calculateBMI       = (height_cm, weight_kg) => api.post("/api/bmi/calculate", { height_cm, weight_kg })

// ── Vitals ───────────────────────────────────────────────────
export const analyzeVitals      = data => api.post("/api/vitals/analyze", data)

// ── Chat ─────────────────────────────────────────────────────
export const sendChatMessage    = (message, history=[]) => api.post("/api/chat/message", { message, history })

// ── Auth ─────────────────────────────────────────────────────
export const signup        = (data)                    => api.post("/api/auth/signup", data)
export const loginApi      = (email, password)         => api.post("/api/auth/login", { email, password })
export const getMe         = token                     => api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
export const changePassword= (current_password, new_password) =>
  api.post("/api/auth/change-password", { current_password, new_password }, { headers: authHeader() })

// ── Auth helper ──────────────────────────────────────────────
const authHeader = () => {
  try {
    const user = JSON.parse(localStorage.getItem("mm_user") || "{}")
    return user.token ? { Authorization: `Bearer ${user.token}` } : {}
  } catch { return {} }
}

// ── Health Logs ──────────────────────────────────────────────
export const saveVitals    = data        => api.post("/api/logs/vitals",   data,   { headers: authHeader() })
export const saveBMI       = data        => api.post("/api/logs/bmi",      data,   { headers: authHeader() })
export const saveSleep     = data        => api.post("/api/logs/sleep",    data,   { headers: authHeader() })
export const saveActivity  = data        => api.post("/api/logs/activity", data,   { headers: authHeader() })
export const getHistory    = (limit=30)  => api.get(`/api/logs/history?limit=${limit}`, { headers: authHeader() })

// ── Profile ──────────────────────────────────────────────────
export const getProfile    = ()     => api.get("/api/profile/",   { headers: authHeader() })
export const updateProfile = data   => api.put("/api/profile/",  data, { headers: authHeader() })

// ── Heart Risk ───────────────────────────────────────────────
export const predictHeartRisk  = data        => api.post("/api/heart-risk/predict", data)
export const saveHeartRiskResult = data      => api.post("/api/heart-risk-logs/save", data, { headers: authHeader() })
export const getHeartRiskHistory = (limit=20)=> api.get(`/api/heart-risk-logs/?limit=${limit}`, { headers: authHeader() })

export default api