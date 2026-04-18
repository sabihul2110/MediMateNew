// MediMate/frontend/src/layouts/AppLayout.jsx
import { useState, useEffect } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Scan, Activity, Heart, MessageSquare, AlertTriangle, TrendingUp, Sun, Moon, LogOut, User, Salad, Search, Bell, History } from "lucide-react"
import { useApp } from "../context/ThemeContext"
import { NotificationBell } from "../components/NotificationPanel"
import NotificationPanel from "../components/NotificationPanel"
import Onboarding, { getOnboardingKey } from "../components/Onboarding"
import { searchDiseases, searchSymptoms } from "../api/index"

const NAV = [
  { to: "/",           icon: LayoutDashboard, label: "Dashboard"       },
  { to: "/mediscan",   icon: Scan,            label: "MediScan"        },
  { to: "/tracking",   icon: Activity,        label: "Health Tracking" },
  { to: "/heart-risk", icon: Heart,           label: "Heart Risk"      },
  { to: "/diet",       icon: Salad,           label: "Diet & Nutrition"},
  { to: "/assistant",  icon: MessageSquare,   label: "AI Assistant"    },
  { to: "/insights",   icon: TrendingUp,      label: "Health Insights" },
  { to: "/history",    icon: History,         label: "Health History"  }, 
]

export default function AppLayout() {
  const { theme, toggleTheme, user, logout } = useApp()
  const location = useLocation()
  const navigate  = useNavigate()
  const dark = theme === "dark"

  const [showNotifs,     setShowNotifs]     = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hoveredNav,     setHoveredNav]     = useState(null)
  const [searchFocused,  setSearchFocused]  = useState(false)
  const [searchQuery,    setSearchQuery]    = useState("")
  const [searchResults,  setSearchResults]  = useState([])

  const handleSearch = async (q) => {
  setSearchQuery(q)
  if (q.trim().length < 2) { setSearchResults([]); return }
  try {
    const [d, s] = await Promise.all([searchDiseases(q), searchSymptoms(q)])
    const diseases  = (d.data.diseases || []).slice(0, 4).map(r => ({ label: r, type: "disease", to: `/mediscan` }))
    const symptoms  = (s.data.symptoms || []).slice(0, 3).map(r => ({ label: r, type: "symptom", to: `/mediscan` }))
    setSearchResults([...diseases, ...symptoms])
  } catch { setSearchResults([]) }
}

  useEffect(() => {
    if (!user?.email) return
    const key = getOnboardingKey(user.email)
    if (!localStorage.getItem(key)) {
      setTimeout(() => setShowOnboarding(true), 1000)
    }
  }, [user?.email])

  const completeOnboarding = () => setShowOnboarding(false)

  const pageLabels = {
    "/emergency": "Emergency", "/profile": "Profile", "/find-doctor": "Find Doctor",
    "/export": "Export Report", "/diet": "Diet & Nutrition", "/history":     "Health History",
  }
  const current   = NAV.find(n => n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to))
  const pageTitle = pageLabels[location.pathname] || current?.label || "MediMate"

  // Design tokens
  const bg         = dark ? "#060D1A" : "#F0F4FF"
  const sidebarBg  = dark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.75)"
  const headerBg   = dark ? "rgba(6,13,26,0.80)" : "rgba(240,244,255,0.85)"
  const glassB     = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)"
  const borderC    = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const textMain   = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute   = dark ? "#64748B" : "#8899B4"
  const accent     = "#1B3A6B"
  const accentGlow = dark ? "rgba(41,82,163,0.35)" : "rgba(27,58,107,0.12)"

  const activeNavStyle = {
    background: dark
      ? "linear-gradient(135deg, rgba(41,82,163,0.6), rgba(27,58,107,0.4))"
      : "linear-gradient(135deg, #1B3A6B, #2952A3)",
    color: "#fff",
    boxShadow: `0 4px 16px ${accentGlow}`,
    border: "1px solid rgba(255,255,255,0.12)",
  }

  const inactiveNavStyle = (hov) => ({
    background: hov ? (dark ? "rgba(255,255,255,0.05)" : "rgba(27,58,107,0.06)") : "transparent",
    color: hov ? (dark ? "#CBD5E1" : accent) : textMute,
    border: "1px solid transparent",
  })

  const baseNavStyle = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 14, marginBottom: 3,
    textDecoration: "none", fontSize: 13, fontWeight: 500,
    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
    cursor: "pointer",
  }

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: dark
        ? "radial-gradient(ellipse at 20% 50%, rgba(27,58,107,0.15) 0%, #060D1A 60%)"
        : "radial-gradient(ellipse at 20% 50%, rgba(41,82,163,0.08) 0%, #F0F4FF 60%)",
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>

      {/* Sidebar */}
      <aside style={{
        width: 228, flexShrink: 0,
        background: sidebarBg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: `1px solid ${borderC}`,
        display: "flex", flexDirection: "column",
        zIndex: 20,
        boxShadow: dark ? "4px 0 32px rgba(0,0,0,0.4)" : "4px 0 24px rgba(27,58,107,0.08)",
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${borderC}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #1B3A6B, #2952A3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(27,58,107,0.4)",
            }}>
              <Heart size={16} color="#fff" fill="rgba(255,255,255,0.3)" />
            </div>
            <div>
              <p style={{ color: dark ? "#F1F5F9" : "#1B3A6B", fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: "-0.3px" }}>MediMate</p>
              <p style={{ color: textMute, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>AI Health Platform</p>
            </div>
          </div>
        </div>

        {/* User block */}
        {user && (
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${borderC}` }}>
            <div onClick={() => navigate("/profile")} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(27,58,107,0.05)",
              borderRadius: 12, padding: "10px 12px", cursor: "pointer",
              border: `1px solid ${borderC}`,
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.08)" : "rgba(27,58,107,0.09)"}
              onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(27,58,107,0.05)"}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #1B3A6B, #2952A3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 2px 8px rgba(27,58,107,0.35)",
              }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{user.avatar}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: dark ? "#F1F5F9" : "#1B3A6B", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{user.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E" }} />
                  <p style={{ color: "#22C55E", fontSize: 10, margin: 0, fontWeight: 500 }}>Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 4px 8px", paddingLeft: 4 }}>Navigation</p>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              style={({ isActive }) => ({
                ...baseNavStyle,
                ...(isActive ? activeNavStyle : inactiveNavStyle(hoveredNav === to)),
              })}
              onMouseEnter={() => setHoveredNav(to)}
              onMouseLeave={() => setHoveredNav(null)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: "10px 10px 14px", borderTop: `1px solid ${borderC}` }}>
          <NavLink to="/profile"
            style={({ isActive }) => ({
              ...baseNavStyle,
              ...(isActive ? { ...activeNavStyle, marginBottom: 3 } : { ...inactiveNavStyle(hoveredNav === "/profile"), marginBottom: 3 }),
            })}
            onMouseEnter={() => setHoveredNav("/profile")}
            onMouseLeave={() => setHoveredNav(null)}
          >
            <User size={15} /> Profile
          </NavLink>

          <NavLink to="/emergency"
            style={({ isActive }) => ({
              ...baseNavStyle,
              background: isActive ? "#DC2626" : "rgba(220,38,38,0.08)",
              color: isActive ? "#fff" : "#DC2626",
              border: "1px solid rgba(220,38,38,0.2)",
              marginBottom: 3,
            })}
          >
            <AlertTriangle size={15} /> Emergency
          </NavLink>

          <button onClick={() => { logout(); navigate("/auth") }} style={{
            ...baseNavStyle,
            background: "transparent", color: textMute,
            border: "1px solid transparent", width: "100%",
            marginBottom: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"; e.currentTarget.style.color = textMain }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = textMute }}
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{
          height: 60, flexShrink: 0,
          background: headerBg,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${borderC}`,
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          zIndex: 15,
          boxShadow: dark ? "0 1px 24px rgba(0,0,0,0.3)" : "0 1px 16px rgba(27,58,107,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {current?.icon && <current.icon size={16} color={textMute} />}
              <h1 style={{ fontSize: 15, fontWeight: 600, color: textMain, margin: 0 }}>{pageTitle}</h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: searchFocused
                  ? (dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.95)")
                  : (dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)"),
                border: `1px solid ${searchFocused ? (dark ? "rgba(41,82,163,0.5)" : "rgba(27,58,107,0.2)") : borderC}`,
                borderRadius: 10, padding: "7px 14px",
                transition: "all 0.2s",
              boxShadow: searchFocused ? `0 0 0 3px ${accentGlow}` : "none",
            }}>
              <Search size={13} color={textMute} />
              <input
                placeholder="Search diseases, symptoms..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => { setSearchFocused(false); setSearchResults([]) }, 150)}
                style={{
                  background: "none", border: "none", outline: "none",
                  fontSize: 13, color: textMain, width: 180,
                  fontFamily: "inherit",
                }}
              />
            </div>
            {searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: 46, left: 0, right: 0,
                background: dark ? "#0F172A" : "#fff",
                border: `1px solid ${borderC}`, borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden",
              }}>
                {searchResults.map((r, i) => (
                  <div key={i} onClick={() => { navigate(r.to); setSearchQuery(""); setSearchResults([]) }}
                    style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                      borderBottom: i < searchResults.length - 1 ? `1px solid ${borderC}` : "none",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(27,58,107,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999,
                      background: r.type === "disease" ? (dark ? "#1E3A5F" : "#EEF2FF") : (dark ? "#14532d20" : "#F0FDF4"),
                      color: r.type === "disease" ? (dark ? "#60A5FA" : "#1B3A6B") : "#16A34A",
                      fontWeight: 600 }}>
                      {r.type}
                    </span>
                    <span style={{ fontSize: 13, color: textMain }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
            {/* Theme toggle */}
            <button onClick={toggleTheme} style={{
              background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
              border: `1px solid ${borderC}`,
              borderRadius: 9, padding: "7px 9px",
              cursor: "pointer", color: textMute,
              display: "flex", alignItems: "center",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = textMain}
              onMouseLeave={e => e.currentTarget.style.color = textMute}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notifications */}
            <NotificationBell onClick={() => setShowNotifs(v => !v)} dark={dark} />

            {/* Avatar */}
            {user && (
              <div onClick={() => navigate("/profile")} style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #1B3A6B, #2952A3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff",
                boxShadow: "0 2px 10px rgba(27,58,107,0.35)",
                border: "2px solid rgba(255,255,255,0.15)",
                transition: "transform 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {user.avatar}
              </div>
            )}
          </div>
        </header>

        {/* Notification overlay */}
        {showNotifs && <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setShowNotifs(false)} />}
        {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}

        {/* Page content */}
        <main style={{
          flex: 1, overflowY: "auto", padding: 28,
        }}>
          <Outlet />
        </main>
      </div>

      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
    </div>
  )
}