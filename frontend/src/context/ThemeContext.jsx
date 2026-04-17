// MediMate/frontend/src/context/ThemeContext.jsx
// Global theme (light/dark) + auth state context.
import { createContext, useContext, useState, useEffect } from "react"

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

  return (
    <Ctx.Provider value={{ theme, toggleTheme, user, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)