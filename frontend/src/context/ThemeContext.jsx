// MediMate/frontend/src/context/ThemeContext.jsx
// Global theme (light/dark) + auth state context.
import { createContext, useContext, useState, useEffect, useCallback } from "react"

const Ctx = createContext({})

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("mm_theme") || "light")
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("mm_user")) } catch { return null }
  })

  useEffect(() => {
    localStorage.setItem("mm_theme", theme)
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light")
  const login  = (u) => { setUser(u); localStorage.setItem("mm_user", JSON.stringify(u)) }
  const logout = ()  => { setUser(null); localStorage.removeItem("mm_user") }

  const refreshAccessToken = useCallback(async () => {
    try {
      const stored = JSON.parse(localStorage.getItem("mm_user") || "{}")
      if (!stored.refresh_token) { logout(); return null }
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: stored.refresh_token }),
      })
      if (!res.ok) { logout(); return null }
      const { token } = await res.json()
      const updated = { ...stored, token }
      localStorage.setItem("mm_user", JSON.stringify(updated))
      setUser(updated)
      return token
    } catch { logout(); return null }
  }, [])

  return (
    <Ctx.Provider value={{ theme, toggleTheme, user, login, logout, refreshAccessToken }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)