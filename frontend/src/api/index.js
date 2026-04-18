// MediMate/frontend/src/api/index.js
import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
})

// ── MediScan History ──────────────────────────────────────────────────────────
export const saveMediScan         = (data)       => api.post("/api/mediscan-logs/save", data, { headers: authHeader() })  // ← ADD THIS
export const getMediScanHistory   = (limit = 50) => api.get(`/api/mediscan-logs/?limit=${limit}`, { headers: authHeader() })
export const deleteMediScan       = (id)         => api.delete(`/api/mediscan-logs/${id}`,         { headers: authHeader() })
export const clearMediScanHistory = ()           => api.delete("/api/mediscan-logs/all",           { headers: authHeader() })

// ── Diseases ─────────────────────────────────────────────────
export const getAllDiseases      = ()           => api.get("/api/diseases/")
export const searchDiseases      = q            => api.get(`/api/diseases/search?q=${q}`)
export const getDiseaseProfile   = name         => api.get(`/api/diseases/${encodeURIComponent(name)}`)

// ── Symptoms ─────────────────────────────────────────────────
export const getAllSymptoms       = ()                       => api.get("/api/symptoms/")
export const searchSymptoms      = q                        => api.get(`/api/symptoms/search?q=${q}`)
export const matchSymptoms       = (symptoms, top_n=10)     => api.post("/api/symptoms/match",   { symptoms, top_n })
export const analyzeSymptoms = (body) =>
  api.post("/api/symptoms/analyze", body, { headers: authHeader() })

// ── BMI ──────────────────────────────────────────────────────
export const calculateBMI        = (height_cm, weight_kg)  => api.post("/api/bmi/calculate", { height_cm, weight_kg })

// ── Vitals ───────────────────────────────────────────────────
export const analyzeVitals       = data                     => api.post("/api/vitals/analyze", data)

// ── Chat ─────────────────────────────────────────────────────
export const sendChatMessage = (message, history=[]) =>
  api.post("/api/chat/message", { message, history }, { headers: authHeader() })
export const getChatHistory     = (limit = 50)  => api.get(`/api/chat/history?limit=${limit}`,       { headers: authHeader() })
export const deleteChatEntry    = (id)           => api.delete(`/api/chat/history/${id}`,             { headers: authHeader() })
export const clearChatHistory   = ()             => api.delete("/api/chat/history/all",               { headers: authHeader() })


// ── Auth ─────────────────────────────────────────────────────
export const signup              = data                     => api.post("/api/auth/signup", data)
export const loginApi            = (email, password)        => api.post("/api/auth/login", { email, password })
export const getMe               = token                    => api.get("/api/auth/me",      { headers: { Authorization: `Bearer ${token}` } })
export const changePassword      = (current_password, new_password) =>
  api.post("/api/auth/change-password", { current_password, new_password }, { headers: authHeader() })

// ── Auth helper ──────────────────────────────────────────────
const authHeader = () => {
  try {
    const user = JSON.parse(localStorage.getItem("mm_user") || "{}")
    return user.token ? { Authorization: `Bearer ${user.token}` } : {}
  } catch { return {} }
}

// ── Health Logs ──────────────────────────────────────────────
export const saveVitals          = data        => api.post("/api/logs/vitals",   data, { headers: authHeader() })
export const saveBMI             = data        => api.post("/api/logs/bmi",      data, { headers: authHeader() })
export const saveSleep           = data        => api.post("/api/logs/sleep",    data, { headers: authHeader() })
export const saveActivity        = data        => api.post("/api/logs/activity", data, { headers: authHeader() })
export const getHistory          = (limit=30)  => api.get(`/api/logs/history?limit=${limit}`, { headers: authHeader() })

// ── Profile ──────────────────────────────────────────────────
export const getProfile          = ()          => api.get("/api/profile/",  { headers: authHeader() })
export const updateProfile       = data        => api.put("/api/profile/", data, { headers: authHeader() })

// ── Heart Risk ───────────────────────────────────────────────
export const predictHeartRisk    = data        => api.post("/api/heart-risk/predict", data)
export const saveHeartRiskResult = data        => api.post("/api/heart-risk-logs/save", data, { headers: authHeader() })
export const getHeartRiskHistory = (limit=20)  => api.get(`/api/heart-risk-logs/?limit=${limit}`, { headers: authHeader() })



api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const stored = JSON.parse(localStorage.getItem("mm_user") || "{}")
        if (!stored.refresh_token) return Promise.reject(err)
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/refresh`,
          { refresh_token: stored.refresh_token }
        )
        const { token } = res.data
        const updated = { ...stored, token }
        localStorage.setItem("mm_user", JSON.stringify(updated))
        original.headers["Authorization"] = `Bearer ${token}`
        return api(original)
      } catch { localStorage.removeItem("mm_user"); window.location.href = "/auth" }
    }
    return Promise.reject(err)
  }
)

export default api