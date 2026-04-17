// MediMate/frontend/src/pages/MediScan.jsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { matchSymptoms, getDiseaseProfile, saveMediScan } from "../api/index"
import { Scan, ChevronDown, ChevronUp, MessageSquare, UserCheck, AlertTriangle, X, CheckCircle, Zap, Activity, Shield } from "lucide-react"

const QUICK_TAGS = ["Headache","Fever","Cough","Fatigue","Nausea","Vomiting","Dizziness","Chest Pain","Sore Throat","Body Ache","Breathlessness","Rash","Diarrhea","Chills","Weakness"]
const DURATIONS  = ["Today","1–3 Days","3–7 Days","1–2 Weeks","2+ Weeks"]
const CONF_COLOR = c => c >= 70 ? "#22C55E" : c >= 40 ? "#F59E0B" : "#EF4444"
const CONF_LABEL = c => c >= 70 ? "High Match" : c >= 40 ? "Possible" : "Rule Out"
const CONF_BG    = c => c >= 70 ? "rgba(34,197,94,0.12)" : c >= 40 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)"

export default function MediScan() {
  const { theme } = useApp()
  const navigate   = useNavigate()
  const dark = theme === "dark"

  const [text,     setText]     = useState("")
  const [tags,     setTags]     = useState([])
  const [duration, setDuration] = useState("1–3 Days")
  const [severity, setSeverity] = useState(5)
  const [results,  setResults]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [profiles, setProfiles] = useState({})
  const [profLoad, setProfLoad] = useState({})
  const [error,    setError]    = useState("")
  const [saved,    setSaved]    = useState(false)

  // Design tokens
  const glass      = dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)"
  const glassDeep  = dark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.5)"
  const border     = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const inputBg    = dark ? "rgba(255,255,255,0.04)" : "rgba(27,58,107,0.04)"
  const textMain   = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute   = dark ? "#64748B" : "#8899B4"
  const accent     = dark ? "#60A5FA" : "#1B3A6B"

  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const STOPWORDS = new Set(["a","an","the","and","or","of","in","is","it","i","have","has","for","with","my","feel","feeling","some","since","days","been","very","bit","also","just","like","really","much","after","before","when","then","that","this","from","about"])
  const buildSymptoms = () => {
    const tagPhrases = tags.map(t => t.toLowerCase())
    const fromText   = text.toLowerCase().split(/[\s,;.]+/).filter(w => w.length > 2 && !STOPWORDS.has(w))
    return [...new Set([...tagPhrases, ...fromText])]
  }

  const analyze = async () => {
    const symptoms = buildSymptoms()
    if (!symptoms.length) { setError("Please describe your symptoms or select at least one tag."); return }
    setError(""); setLoading(true); setResults(null); setExpanded(null); setSaved(false)
    try {
      const r = await matchSymptoms(symptoms, 8)
      setResults(r.data)
      await saveMediScan({
        symptoms_text:  text,
        symptom_tags:   tags,
        severity, duration,
        top_conditions: r.data.results?.slice(0, 3).map(x => ({ disease: x.disease, matched_count: x.matched_count, confidence: x.confidence })) || [],
        top_match:      r.data.results?.[0]?.disease || null,
      }).catch(() => {})
      setSaved(true)
    } catch { setError("Could not reach the server. Make sure the backend is running.") }
    finally { setLoading(false) }
  }

  const toggleExpand = async disease => {
    if (expanded === disease) { setExpanded(null); return }
    setExpanded(disease)
    if (!profiles[disease]) {
      setProfLoad(p => ({ ...p, [disease]: true }))
      try { const r = await getDiseaseProfile(disease); setProfiles(p => ({ ...p, [disease]: r.data })) } catch {}
      finally { setProfLoad(p => ({ ...p, [disease]: false })) }
    }
  }

  const askAI = disease => navigate(`/assistant?q=${encodeURIComponent(`Tell me about ${disease}: symptoms, treatment, medicines, dos and don'ts.`)}`)

  const severityColor = s => s <= 3 ? "#22C55E" : s <= 6 ? "#F59E0B" : "#DC2626"
  const severityLabel = s => s <= 3 ? "Mild" : s <= 6 ? "Moderate" : "Severe"

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: "linear-gradient(135deg, #1B3A6B, #2952A3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(27,58,107,0.35)",
          }}>
            <Scan size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: textMain, margin: 0, letterSpacing: "-0.5px" }}>MediScan</h1>
            <p style={{ fontSize: 12.5, color: textMute, margin: 0 }}>
              AI-Driven Diagnostic Support ·{" "}
              <span style={{ color: dark ? "#60A5FA" : "#2952A3", fontWeight: 600 }}>Not a substitute for professional diagnosis</span>
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: results ? "370px 1fr" : "600px", gap: 20, justifyContent: results ? "stretch" : "center" }}>

        {/* ═══ INPUT PANEL ═══ */}
        <div style={{
          background: glass, borderRadius: 22,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${border}`,
          padding: "26px 24px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          height: "fit-content",
        }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>
            Describe Your Symptoms
          </label>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="e.g. I have a sharp pain in my upper abdomen after eating, with mild nausea..."
            rows={4}
            style={{
              width: "100%", background: inputBg,
              border: `1px solid ${border}`, borderRadius: 14,
              padding: "13px 16px", fontSize: 13.5, color: textMain,
              outline: "none", resize: "vertical",
              fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={e => { e.target.style.borderColor = dark ? "rgba(96,165,250,0.4)" : "rgba(27,58,107,0.3)"; e.target.style.boxShadow = "0 0 0 3px rgba(27,58,107,0.08)" }}
            onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = "none" }}
          />

          {/* Quick Tags */}
          <label style={{ fontSize: 10.5, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", margin: "18px 0 10px" }}>Quick Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_TAGS.map(tag => {
              const sel = tags.includes(tag)
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: "5px 12px", borderRadius: 999,
                  border: `1.5px solid ${sel ? (dark ? "#3B82F6" : "#1B3A6B") : border}`,
                  background: sel ? (dark ? "rgba(59,130,246,0.2)" : "rgba(27,58,107,0.1)") : "transparent",
                  color: sel ? (dark ? "#60A5FA" : "#1B3A6B") : textMute,
                  fontSize: 12, fontWeight: sel ? 700 : 400,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  transition: "all 0.15s",
                  boxShadow: sel ? `0 2px 8px ${dark ? "rgba(59,130,246,0.2)" : "rgba(27,58,107,0.15)"}` : "none",
                }}>
                  {sel && <X size={9} />}{tag}
                </button>
              )
            })}
          </div>

          {/* Duration + Severity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)} style={{
                width: "100%", background: inputBg,
                border: `1px solid ${border}`, borderRadius: 12,
                padding: "10px 14px", fontSize: 13, color: textMain,
                outline: "none", cursor: "pointer", fontFamily: "inherit",
              }}>
                {DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>
                Severity · <span style={{ color: severityColor(severity), fontWeight: 800 }}>{severity}/10 ({severityLabel(severity)})</span>
              </label>
              <input type="range" min={1} max={10} value={severity} onChange={e => setSeverity(+e.target.value)}
                style={{ width: "100%", accentColor: severityColor(severity), cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 600 }}>Mild</span>
                <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>Severe</span>
              </div>
            </div>
          </div>

          {/* Severity indicator bar */}
          <div style={{ marginTop: 12, height: 4, borderRadius: 999, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{
              width: `${severity * 10}%`, height: "100%",
              background: `linear-gradient(90deg, #22C55E, ${severityColor(severity)})`,
              borderRadius: 999, transition: "all 0.3s",
            }} />
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <p style={{ color: "#DC2626", fontSize: 12.5, margin: 0 }}>{error}</p>
            </div>
          )}

          <button onClick={analyze} disabled={loading} style={{
            width: "100%", marginTop: 20,
            background: loading ? (dark ? "rgba(59,130,246,0.3)" : "rgba(27,58,107,0.4)") : "linear-gradient(135deg, #1B3A6B, #2952A3)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "14px 0",
            fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            boxShadow: loading ? "none" : "0 4px 18px rgba(27,58,107,0.4)",
            transition: "all 0.2s", letterSpacing: "0.01em",
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)" }}
          >
            {loading ? (
              <>
                <Activity size={16} style={{ animation: "spin 1s linear infinite" }} /> Analyzing…
              </>
            ) : (
              <><Scan size={16} /> Analyze Symptoms</>
            )}
          </button>

          {saved && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "10px 14px" }}>
              <CheckCircle size={14} color="#22C55E" />
              <span style={{ fontSize: 12.5, color: "#16A34A", fontWeight: 600 }}>Analysis saved to your health history</span>
            </div>
          )}

          {results && (
            <p style={{ fontSize: 11, color: textMute, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
              Confidence scores based on symptom overlap · Not a final medical diagnosis
            </p>
          )}
        </div>

        {/* ═══ RESULTS PANEL ═══ */}
        {results && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Results header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: glass, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              borderRadius: 16, padding: "14px 20px", border: `1px solid ${border}`,
            }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: textMain, margin: 0 }}>Possible Conditions</h2>
                <p style={{ fontSize: 11.5, color: textMute, margin: "2px 0 0" }}>{results.total_matches} conditions matched from symptom analysis</p>
              </div>
              <div style={{ display: "flex", items: "center", gap: 6 }}>
                <div style={{ padding: "4px 12px", borderRadius: 999, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700 }}>AI Powered</span>
                </div>
              </div>
            </div>

            {/* Condition cards */}
            {results.results.map((item, idx) => {
              const conf      = item.confidence
              const isExp     = expanded === item.disease
              const prof      = profiles[item.disease]
              const pLoad     = profLoad[item.disease]
              const color     = CONF_COLOR(conf)
              const isPrimary = idx === 0

              return (
                <div key={item.disease} style={{
                  background: glass,
                  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                  borderRadius: 20, overflow: "hidden",
                  border: `1.5px solid ${isPrimary ? (dark ? "rgba(96,165,250,0.3)" : "rgba(27,58,107,0.25)") : border}`,
                  boxShadow: isPrimary ? `0 8px 32px ${dark ? "rgba(27,58,107,0.25)" : "rgba(27,58,107,0.1)"}` : "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.2s",
                }}>
                  {/* Card header */}
                  <div style={{ padding: "18px 22px" }}>
                    {isPrimary && (
                      <div style={{ marginBottom: 10 }}>
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em",
                          background: dark ? "rgba(96,165,250,0.15)" : "rgba(27,58,107,0.1)",
                          color: accent, padding: "3px 10px", borderRadius: 999,
                          border: `1px solid ${dark ? "rgba(96,165,250,0.2)" : "rgba(27,58,107,0.15)"}`,
                        }}>
                          ★ PRIMARY MATCH
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: textMain, margin: "0 0 10px", letterSpacing: "-0.3px" }}>{item.disease}</h3>

                        {/* Confidence visualization */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, color: textMute }}>Symptom overlap confidence</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18, fontWeight: 800, color }}>{conf}%</span>
                              <span style={{ fontSize: 11, fontWeight: 700, background: CONF_BG(conf), color, padding: "3px 10px", borderRadius: 999 }}>{CONF_LABEL(conf)}</span>
                            </div>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                            <div style={{
                              width: `${Math.min(conf, 100)}%`, height: "100%",
                              background: `linear-gradient(90deg, ${color}88, ${color})`,
                              borderRadius: 999, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                            }} />
                          </div>
                        </div>

                        <p style={{ fontSize: 11.5, color: textMute, margin: 0 }}>
                          {item.matched_count} symptom{item.matched_count !== 1 ? "s" : ""} matched
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => askAI(item.disease)} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 16px", borderRadius: 10,
                          border: "none",
                          background: dark ? "rgba(96,165,250,0.15)" : "rgba(27,58,107,0.08)",
                          color: accent, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                          transition: "all 0.2s",
                          whiteSpace: "nowrap",
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(96,165,250,0.25)" : "rgba(27,58,107,0.15)"}
                          onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(96,165,250,0.15)" : "rgba(27,58,107,0.08)"}
                        >
                          <MessageSquare size={13} /> Ask AI
                        </button>
                        <button onClick={() => toggleExpand(item.disease)} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 16px", borderRadius: 10,
                          border: `1px solid ${border}`, background: "transparent",
                          color: textMute, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.2s",
                          whiteSpace: "nowrap",
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = textMain}
                          onMouseLeave={e => e.currentTarget.style.color = textMute}
                        >
                          {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {isExp ? "Collapse" : "Details"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExp && (
                    <div style={{
                      borderTop: `1px solid ${border}`,
                      padding: "20px 22px",
                      background: dark ? "rgba(0,0,0,0.2)" : "rgba(27,58,107,0.02)",
                    }}>
                      {pLoad ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                          <Activity size={15} color={textMute} />
                          <span style={{ color: textMute, fontSize: 13 }}>Loading details…</span>
                        </div>
                      ) : prof ? (
                        <div>
                          {/* 3-column info grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                            {[
                              { title: "Symptoms", icon: "🩺", color: "#3B82F6", bg: "rgba(59,130,246,0.08)", items: prof.symptoms?.slice(0, 5) },
                              { title: "Medicines (OTC)", icon: "💊", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", items: prof.medicines?.slice(0, 4) },
                              { title: "Precautions", icon: "🛡️", color: "#22C55E", bg: "rgba(34,197,94,0.08)", items: prof.precautions?.slice(0, 4) },
                            ].map(({ title, icon, color, bg, items }) => (
                              <div key={title} style={{ background: bg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${color}18` }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                                  <span>{icon}</span> {title}
                                </p>
                                {items?.length > 0 ? items.map(it => (
                                  <div key={it} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 6 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
                                    <span style={{ fontSize: 12.5, color: textMain, lineHeight: 1.4, textTransform: "capitalize" }}>{it}</span>
                                  </div>
                                )) : <p style={{ fontSize: 12, color: textMute, margin: 0 }}>No data available</p>}
                              </div>
                            ))}
                          </div>

                          {prof.risk_factors?.length > 0 && (
                            <div style={{
                              padding: "12px 16px", borderRadius: 12,
                              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                              display: "flex", gap: 10, alignItems: "flex-start",
                            }}>
                              <span style={{ fontSize: 14 }}>⚠️</span>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#D97706", marginBottom: 4 }}>Risk Factors</p>
                                <p style={{ fontSize: 12.5, color: dark ? "#FCD34D" : "#92400E", margin: 0 }}>{prof.risk_factors.join(" · ")}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p style={{ color: textMute, fontSize: 13 }}>Could not load details. Try "Ask AI" instead.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* When to see a doctor */}
            <div style={{
              background: dark ? "rgba(220,38,38,0.08)" : "rgba(220,38,38,0.04)",
              borderRadius: 20, padding: "20px 22px",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(220,38,38,0.2)",
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(220,38,38,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertTriangle size={17} color="#DC2626" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#DC2626", margin: 0 }}>When to See a Doctor</h3>
                  <p style={{ fontSize: 12, color: textMute, margin: "3px 0 0" }}>Seek immediate attention if you experience:</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  "Sudden, severe pain or difficulty breathing",
                  "High fever (above 103°F) lasting 3+ days",
                  "Confusion, chest tightness, or fainting",
                  "Symptoms worsening despite home treatment",
                ].map(s => (
                  <div key={s} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(220,38,38,0.06)", borderRadius: 10, padding: "9px 12px" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#DC2626", flexShrink: 0, marginTop: 4 }} />
                    <span style={{ fontSize: 12, color: textMain, lineHeight: 1.45 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => navigate("/emergency")} style={{
                  flex: 1, background: "linear-gradient(135deg, #DC2626, #B91C1C)",
                  color: "#fff", border: "none", borderRadius: 999, padding: "11px 0",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  boxShadow: "0 4px 16px rgba(220,38,38,0.35)",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <AlertTriangle size={14} /> Emergency
                </button>
                <button onClick={() => navigate("/find-doctor")} style={{
                  flex: 1, background: dark ? "rgba(255,255,255,0.06)" : "rgba(27,58,107,0.08)",
                  color: accent, border: `1px solid ${border}`, borderRadius: 999, padding: "11px 0",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(27,58,107,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(27,58,107,0.08)"}
                >
                  <UserCheck size={14} /> Find a Doctor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}