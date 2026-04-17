// MediMate/frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, Activity, Scale, AlertTriangle, MessageSquare, UserCheck, TrendingUp, ChevronRight, Scan, ArrowUpRight, Zap } from "lucide-react"
import { useApp } from "../context/ThemeContext"
import { getHistory, getProfile, analyzeVitals } from "../api/index"

const QUICK_ACTIONS = [
  { icon: Activity,      label: "Check Symptoms",  sub: "AI symptom analysis",        to: "/mediscan",    color: "#2952A3", glow: "rgba(41,82,163,0.25)",  cta: "Start Analysis" },
  { icon: Heart,         label: "Check Vitals",    sub: "Log your health metrics",     to: "/tracking",    color: "#DC2626", glow: "rgba(220,38,38,0.2)",   cta: "View Vitals"    },
  { icon: Scale,         label: "BMI Calculator",  sub: "Monitor body mass index",     to: "/tracking",    color: "#16A34A", glow: "rgba(22,163,74,0.2)",   cta: "Calculate",     bmiTab: true },
  { icon: Heart,         label: "Heart Risk",       sub: "AI cardiovascular risk",      to: "/heart-risk",  color: "#DC2626", glow: "rgba(220,38,38,0.2)",   cta: "Predict"        },
  { icon: MessageSquare, label: "Ask AI",           sub: "Chat with MediMate AI",       to: "/assistant",   color: "#7C3AED", glow: "rgba(124,58,237,0.2)",  cta: "Chat Now"       },
  { icon: UserCheck,     label: "Find Doctor",      sub: "Locate the right specialist", to: "/find-doctor", color: "#0891B2", glow: "rgba(8,145,178,0.2)",   cta: "Locate"         },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { theme, user } = useApp()
  const dark = theme === "dark"

  const [recentLogs,     setRecentLogs]     = useState([])
  const [profile,        setProfile]        = useState(null)
  const [latestVitals,   setLatestVitals]   = useState(null)
  const [vitalsAnalysis, setVitalsAnalysis] = useState(null)
  const [hovered,        setHovered]        = useState(null)

  // Design tokens
  const glass      = dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.75)"
  const glassHover = dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.95)"
  const border     = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const textMain   = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute   = dark ? "#64748B" : "#8899B4"
  const surface2   = dark ? "rgba(255,255,255,0.03)" : "rgba(27,58,107,0.04)"

  useEffect(() => {
    getProfile().then(r => setProfile(r.data)).catch(() => {})
    getHistory(10).then(r => {
      const logs = r.data.logs || []
      setRecentLogs(logs.slice(0, 4))
      const latestV = logs.find(l => l.type === "vitals")
      if (latestV) {
        setLatestVitals(latestV)
        analyzeVitals({
          heart_rate:    latestV.heart_rate    || 72,
          systolic_bp:   latestV.systolic_bp   || 120,
          diastolic_bp:  latestV.diastolic_bp  || 80,
          spo2:          latestV.spo2           || 98,
          blood_sugar:   latestV.blood_sugar    || 95,
          temperature_f: latestV.temperature_f  || 98.6,
          sugar_type:    latestV.sugar_type     || "fasting",
        }).then(r => setVitalsAnalysis(r.data)).catch(() => {})
      } else {
        analyzeVitals({ heart_rate: 72, systolic_bp: 120, diastolic_bp: 80, spo2: 98, blood_sugar: 95, temperature_f: 98.6, sugar_type: "fasting" })
          .then(r => setVitalsAnalysis(r.data)).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const greeting  = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening" }
  const firstName = profile?.name?.split(" ")[0] || user?.name?.split(" ")[0] || "there"
  const handleAction = (action) => {
    if (action.bmiTab) navigate("/tracking", { state: { tab: "bmi" } })
    else navigate(action.to)
  }

  const logIcon   = { vitals: "❤️", bmi: "⚖️", sleep: "🌙", activity: "⚡", mediscan: "🩺" }
  const logLabel  = { vitals: "Vitals Check", bmi: "BMI Update", sleep: "Sleep Log", activity: "Activity Log", mediscan: "MediScan" }
  const logDetail = log => {
    if (log.type === "vitals")   return `HR ${log.heart_rate} bpm · BP ${log.systolic_bp}/${log.diastolic_bp}`
    if (log.type === "bmi")      return `BMI ${log.bmi} · ${log.category}`
    if (log.type === "sleep")    return `${log.hours}h · ${log.quality}`
    if (log.type === "activity") return `${log.steps?.toLocaleString()} steps`
    if (log.type === "mediscan") return `Top: ${log.top_match || "—"}`
    return ""
  }
  const logStatus = log => {
    if (log.type === "mediscan") return { color: "#8B5CF6", bg: "rgba(139,92,246,0.15)", label: "Scanned" }
    if (log.overall === "optimal" || log.category === "Normal" || log.quality === "Good" || log.quality === "Excellent")
      return { color: "#22C55E", bg: "rgba(34,197,94,0.12)", label: "Stable" }
    if (log.overall === "critical") return { color: "#DC2626", bg: "rgba(220,38,38,0.12)", label: "Critical" }
    return { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", label: "Elevated" }
  }

  const displayVitals = [
    {
      label: "Heart Rate", icon: "❤️",
      value: latestVitals ? `${latestVitals.heart_rate} bpm` : "—",
      status: vitalsAnalysis?.heart_rate?.status || "normal",
      source: latestVitals ? "from last log" : "no data yet",
    },
    {
      label: "Blood Pressure", icon: "🩸",
      value: latestVitals ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` : "—/—",
      status: vitalsAnalysis?.blood_pressure?.status || "normal",
      source: latestVitals ? "from last log" : "no data yet",
    },
    {
      label: "Temperature", icon: "🌡️",
      value: latestVitals ? `${latestVitals.temperature_f}°F` : "—",
      status: vitalsAnalysis?.temperature?.status || "normal",
      source: latestVitals ? "from last log" : "no data yet",
    },
  ]

  const statusColor = s => s === "normal" ? "#22C55E" : s === "elevated" ? "#F59E0B" : "#94A3B8"

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>

      {/* ═══ HERO ═══ */}
      <div style={{
        position: "relative", borderRadius: 24, overflow: "hidden",
        marginBottom: 28, padding: "36px 40px",
        background: "linear-gradient(135deg, #0D2147 0%, #1B3A6B 45%, #1a4d8c 100%)",
        boxShadow: "0 20px 60px rgba(27,58,107,0.4), 0 1px 0 rgba(255,255,255,0.06) inset",
      }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(41,82,163,0.4) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: "35%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, left: "50%", width: 1, height: "60%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          {/* Left: greeting */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E" }} />
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0, letterSpacing: "0.05em" }}>{greeting()}</p>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
              Welcome back, <span style={{ background: "linear-gradient(90deg, #60A5FA, #22C55E)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{firstName}</span>
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "0 0 24px", maxWidth: 380, lineHeight: 1.6 }}>
              {latestVitals ? "Your vitals look stable. Stay consistent with daily tracking." : "Start logging vitals to unlock personalized AI health insights."}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => navigate("/mediscan")} style={{
                background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "#fff",
                border: "none", borderRadius: 999, padding: "11px 24px",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7,
                boxShadow: "0 4px 16px rgba(34,197,94,0.35)",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <Scan size={14} /> Start Checkup
              </button>
              <button onClick={() => navigate("/insights")} style={{
                background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999,
                padding: "11px 24px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                backdropFilter: "blur(8px)",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              >
                View Insights
              </button>
            </div>
          </div>

          {/* Right: floating vitals pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 230 }}>
            {displayVitals.map((v, i) => (
              <div key={v.label} onClick={() => navigate("/tracking")} style={{
                background: "rgba(255,255,255,0.08)", borderRadius: 14,
                padding: "12px 16px",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                animationDelay: `${i * 80}ms`,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; e.currentTarget.style.transform = "translateX(-3px)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateX(0)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{v.icon}</span>
                  <div>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 2 }}>{v.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{v.value}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(v.status), boxShadow: `0 0 6px ${statusColor(v.status)}` }} />
                  </div>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{v.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: textMain, margin: 0, letterSpacing: "-0.3px" }}>Quick Actions</h2>
            <p style={{ fontSize: 12, color: textMute, margin: "2px 0 0" }}>Everything you need, one tap away</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {QUICK_ACTIONS.map(action => {
            const { icon: Icon, label, sub, color, glow, cta } = action
            const isHov = hovered === label
            return (
              <div key={label}
                onClick={() => handleAction(action)}
                onMouseEnter={() => setHovered(label)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHov ? glassHover : glass,
                  borderRadius: 18, padding: "20px 18px",
                  cursor: "pointer",
                  border: `1px solid ${isHov ? color + "30" : border}`,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  transform: isHov ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: isHov ? `0 12px 32px ${glow}, 0 1px 0 rgba(255,255,255,0.08) inset` : "0 2px 12px rgba(0,0,0,0.06)",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  position: "relative", overflow: "hidden",
                }}>
                {/* Subtle gradient background on hover */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 18, pointerEvents: "none",
                  background: isHov ? `radial-gradient(circle at top left, ${color}08, transparent 60%)` : "none",
                  transition: "opacity 0.3s",
                }} />
                <div style={{
                  width: 42, height: 42, borderRadius: 13,
                  background: `${color}15`,
                  border: `1px solid ${color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                  transition: "all 0.2s",
                  boxShadow: isHov ? `0 4px 12px ${glow}` : "none",
                }}>
                  <Icon size={19} color={color} />
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: textMain, margin: "0 0 4px", letterSpacing: "-0.2px" }}>{label}</p>
                <p style={{ fontSize: 11.5, color: textMute, margin: "0 0 14px", lineHeight: 1.4 }}>{sub}</p>
                <span style={{ fontSize: 11, color, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, letterSpacing: "0.03em" }}>
                  {cta} <ArrowUpRight size={11} />
                </span>
              </div>
            )
          })}

          {/* Emergency card */}
          <div onClick={() => navigate("/emergency")}
            onMouseEnter={() => setHovered("em")}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === "em" ? "rgba(220,38,38,0.12)" : "rgba(220,38,38,0.06)",
              borderRadius: 18, padding: "20px 18px",
              cursor: "pointer",
              border: `1px solid ${hovered === "em" ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.15)"}`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              transform: hovered === "em" ? "translateY(-4px)" : "translateY(0)",
              boxShadow: hovered === "em" ? "0 12px 32px rgba(220,38,38,0.2)" : "0 2px 12px rgba(0,0,0,0.06)",
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
            }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13,
              background: "linear-gradient(135deg, #DC2626, #B91C1C)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
              boxShadow: "0 4px 14px rgba(220,38,38,0.35)",
            }}>
              <AlertTriangle size={19} color="#fff" />
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#DC2626", margin: "0 0 4px" }}>Emergency</p>
            <p style={{ fontSize: 11.5, color: textMute, margin: "0 0 14px", lineHeight: 1.4 }}>Contact emergency services or find nearest ER</p>
            <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              Get Help Now <ArrowUpRight size={11} />
            </span>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM: HISTORY + PANEL ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

        {/* Recent History */}
        <div style={{
          background: glass,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 20,
          border: `1px solid ${border}`,
          padding: "24px 26px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: textMain, margin: 0 }}>Recent History</h2>
              <p style={{ fontSize: 11.5, color: textMute, margin: "2px 0 0" }}>Your latest health events</p>
            </div>
            <span onClick={() => navigate("/insights")} style={{ fontSize: 12, color: "#2952A3", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              View All <ChevronRight size={12} />
            </span>
          </div>

          {recentLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: surface2, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 22 }}>📋</div>
              <p style={{ color: textMute, fontSize: 13, marginBottom: 16 }}>No health data logged yet.</p>
              <button onClick={() => navigate("/tracking")} style={{
                background: "linear-gradient(135deg, #1B3A6B, #2952A3)",
                color: "#fff", border: 0, borderRadius: 12,
                padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(27,58,107,0.3)",
              }}>
                Start Tracking →
              </button>
            </div>
          ) : (
            <div>
              {recentLogs.map((log, i) => {
                const s = logStatus(log)
                const date = log.logged_at ? new Date(log.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"
                const isFirst = i === 0
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 14px", marginBottom: 8, borderRadius: 14,
                    background: isFirst ? (dark ? "rgba(255,255,255,0.05)" : "rgba(27,58,107,0.04)") : "transparent",
                    border: isFirst ? `1px solid ${border}` : "1px solid transparent",
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(27,58,107,0.04)"; e.currentTarget.style.borderColor = border }}
                    onMouseLeave={e => { if (!isFirst) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent" } }}
                  >
                    {/* Timeline dot */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 11, background: dark ? "rgba(255,255,255,0.06)" : "rgba(27,58,107,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        {logIcon[log.type] || "📋"}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: textMain, display: "block", marginBottom: 2 }}>{logLabel[log.type] || log.type}</span>
                      <span style={{ fontSize: 11.5, color: textMute }}>{logDetail(log)}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 999 }}>{s.label}</span>
                      <span style={{ fontSize: 10.5, color: textMute }}>{date}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* AI Suggestion card */}
          <div style={{
            background: "linear-gradient(145deg, #0D2147, #1B3A6B 50%, #1e4d8c)",
            borderRadius: 20, padding: "22px 20px", color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(27,58,107,0.35)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(34,197,94,0.12)", pointerEvents: "none" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(255,215,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={12} color="#FFD700" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.6 }}>AI Suggestion</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Stay Consistent</h3>
            <p style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.6, margin: "0 0 18px" }}>
              {latestVitals
                ? "Your last vitals were logged successfully. Track again today to see trends."
                : "Start by logging your vitals to unlock AI-powered health insights."}
            </p>
            <button onClick={() => navigate("/tracking")} style={{
              width: "100%", background: "rgba(255,255,255,0.1)",
              color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12, padding: "10px 0", fontSize: 12.5,
              fontWeight: 700, cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              {latestVitals ? "Log Today's Vitals →" : "Start Tracking →"}
            </button>
          </div>

          {/* Quick Vitals */}
          <div style={{
            background: glass, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            borderRadius: 20, border: `1px solid ${border}`,
            padding: "20px 20px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: textMain, margin: 0 }}>Live Vitals</h3>
              {!latestVitals && <span style={{ fontSize: 10.5, color: textMute, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: 999 }}>No data</span>}
            </div>

            {latestVitals ? (
              displayVitals.map(v => (
                <div key={v.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{v.icon}</span>
                    <span style={{ fontSize: 12.5, color: textMute }}>{v.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: textMain }}>{v.value}</span>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor(v.status), boxShadow: `0 0 6px ${statusColor(v.status)}` }} />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12.5, color: textMute, margin: "0 0 14px" }}>Log your vitals to see them here.</p>
            )}

            <button onClick={() => navigate("/tracking")} style={{
              width: "100%", marginTop: 4,
              background: dark ? "rgba(255,255,255,0.05)" : "rgba(27,58,107,0.06)",
              color: dark ? "#60A5FA" : "#1B3A6B",
              border: `1px solid ${border}`, borderRadius: 12,
              padding: "9px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.09)" : "rgba(27,58,107,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(27,58,107,0.06)"}
            >
              {latestVitals ? "Update Vitals →" : "Log First Vitals →"}
            </button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => navigate("/assistant")} style={{
        position: "fixed", bottom: 28, right: 28,
        width: 54, height: 54, borderRadius: "50%",
        background: "linear-gradient(135deg, #1B3A6B, #2952A3)",
        color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 6px 24px rgba(27,58,107,0.5)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, fontSize: 22, fontWeight: 300,
        transition: "all 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(27,58,107,0.7)" }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(27,58,107,0.5)" }}
      >+</button>
    </div>
  )
}