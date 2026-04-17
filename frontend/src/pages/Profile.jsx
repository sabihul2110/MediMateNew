// MediMate/frontend/src/pages/Profile.jsx
import { useState, useEffect } from "react"
import { useApp } from "../context/ThemeContext"
import { getProfile, updateProfile, changePassword } from "../api/index"
import { User, Save, CheckCircle, Lock, Eye, EyeOff, Shield, Heart, Activity, Droplets, Ruler, Weight, Phone, AlertCircle, Edit3 } from "lucide-react"

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"]
const SECTIONS = [
  { title: "Personal", icon: User, fields: [
    { key: "name",    label: "Full Name",      type: "text",   placeholder: "John Doe",      span: 2 },
    { key: "age",     label: "Age",            type: "number", placeholder: "25",            span: 1 },
    { key: "sex",     label: "Biological Sex", type: "select", opts: ["male","female","other"], span: 1 },
    { key: "phone",   label: "Phone",          type: "text",   placeholder: "+91 ...",       span: 2 },
  ]},
  { title: "Medical", icon: Heart, fields: [
    { key: "height_cm",   label: "Height (cm)",          type: "number", placeholder: "175",           span: 1 },
    { key: "weight_kg",   label: "Weight (kg)",           type: "number", placeholder: "70",            span: 1 },
    { key: "blood_group", label: "Blood Group",           type: "select", opts: BLOOD_GROUPS,            span: 1 },
    { key: "allergies",   label: "Known Allergies",       type: "text",   placeholder: "Penicillin",    span: 1 },
    { key: "chronic",     label: "Chronic Conditions",    type: "text",   placeholder: "Hypertension",  span: 2 },
    { key: "medications", label: "Current Medications",   type: "text",   placeholder: "Metformin 500mg", span: 2 },
  ]},
  { title: "Emergency", icon: AlertCircle, fields: [
    { key: "emergency_contact", label: "Emergency Contact", type: "text", placeholder: "Name · Phone", span: 2 },
  ]},
]

export default function Profile() {
  const { theme, user, login } = useApp()
  const dark = theme === "dark"
  const [form,     setForm]     = useState({ name:"",age:"",sex:"",phone:"",height_cm:"",weight_kg:"",blood_group:"",allergies:"",chronic:"",medications:"",emergency_contact:"" })
  const [saved,    setSaved]    = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)
  const [activeSection, setActiveSection] = useState("Personal")

  const [currentPw, setCurrentPw] = useState("")
  const [newPw,     setNewPw]     = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showCurr,  setShowCurr]  = useState(false)
  const [showNew,   setShowNew]   = useState(false)
  const [pwError,   setPwError]   = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // Design tokens
  const glass    = dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)"
  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const inputBg  = dark ? "rgba(255,255,255,0.04)" : "rgba(27,58,107,0.04)"
  const textMain = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute = dark ? "#64748B" : "#8899B4"
  const accent   = dark ? "#60A5FA" : "#1B3A6B"

  const inputSt = {
    width: "100%", background: inputBg,
    border: `1px solid ${border}`, borderRadius: 12,
    padding: "11px 14px", fontSize: 14, color: textMain,
    outline: "none", fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  }

  useEffect(() => {
    getProfile().then(r => {
      const d = r.data
      setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ""])) }))
    }).catch(() => {}).finally(() => setFetching(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setLoading(true); setSaved(false)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "" && v !== null))
      await updateProfile(payload)
      if (payload.name) login({ ...user, name: payload.name, avatar: payload.name[0].toUpperCase() })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch {}
    finally { setLoading(false) }
  }

  const handleChangePw = async () => {
    setPwError(""); setPwSuccess(false)
    if (!currentPw || !newPw || !confirmPw) return setPwError("All fields are required.")
    if (newPw.length < 6) return setPwError("New password must be at least 6 characters.")
    if (newPw !== confirmPw) return setPwError("New passwords do not match.")
    setPwLoading(true)
    try {
      await changePassword(currentPw, newPw)
      setPwSuccess(true); setCurrentPw(""); setNewPw(""); setConfirmPw("")
      setTimeout(() => setPwSuccess(false), 4000)
    } catch (e) { setPwError(e.response?.data?.detail || "Failed. Check your current password.") }
    finally { setPwLoading(false) }
  }

  const bmi      = form.height_cm && form.weight_kg ? (parseFloat(form.weight_kg) / ((parseFloat(form.height_cm) / 100) ** 2)).toFixed(1) : null
  const bmiColor = bmi ? (bmi < 18.5 ? "#3B82F6" : bmi < 25 ? "#22C55E" : bmi < 30 ? "#F59E0B" : "#DC2626") : "#94A3B8"
  const bmiCat   = bmi ? (bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese") : null

  if (fetching) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
      <div style={{ textAlign: "center" }}>
        <Activity size={32} color={textMute} style={{ marginBottom: 12 }} />
        <p style={{ color: textMute, fontSize: 14 }}>Loading your profile…</p>
      </div>
    </div>
  )

  // Health identity stat cards config
  const healthStats = [
    { label: "BMI",       value: bmi ? `${bmi}` : "—",           sub: bmiCat || "Not set",     color: bmiColor, glow: `${bmiColor}30`, icon: Activity },
    { label: "Blood",     value: form.blood_group || "—",          sub: "Blood Group",           color: "#DC2626", glow: "rgba(220,38,38,0.2)", icon: Droplets },
    { label: "Age",       value: form.age ? `${form.age}` : "—", sub: "Years old",             color: "#1B3A6B", glow: "rgba(27,58,107,0.2)",  icon: User },
    { label: "Height",    value: form.height_cm ? `${form.height_cm}` : "—", sub: "Centimetres", color: "#0891B2", glow: "rgba(8,145,178,0.2)", icon: Ruler },
    { label: "Weight",    value: form.weight_kg ? `${form.weight_kg}` : "—", sub: "Kilograms",   color: "#16A34A", glow: "rgba(22,163,74,0.2)", icon: Weight },
    { label: "Sex",       value: form.sex ? form.sex.charAt(0).toUpperCase() + form.sex.slice(1) : "—", sub: "Biological Sex", color: "#7C3AED", glow: "rgba(124,58,237,0.2)", icon: User },
  ]

  const tabs = [...SECTIONS.map(s => s.title), "Security"]

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* ═══ HERO HEADER ═══ */}
      <div style={{
        position: "relative", borderRadius: 24, overflow: "hidden",
        marginBottom: 24, padding: "32px 36px",
        background: "linear-gradient(135deg, #0D2147 0%, #1B3A6B 50%, #1a4d8c 100%)",
        boxShadow: "0 16px 48px rgba(27,58,107,0.4)",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(41,82,163,0.3)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "40%", width: 180, height: 180, borderRadius: "50%", background: "rgba(34,197,94,0.12)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Avatar */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: 68, height: 68, borderRadius: 20,
                background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                backdropFilter: "blur(12px)",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 800, color: "#fff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}>
                {user?.avatar || "?"}
              </div>
              <div style={{
                position: "absolute", bottom: -3, right: -3,
                width: 18, height: 18, borderRadius: "50%",
                background: "#22C55E", border: "2px solid #0D2147",
                boxShadow: "0 0 8px rgba(34,197,94,0.6)",
              }} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.4px" }}>
                  {form.name || user?.name || "Your Profile"}
                </h1>
                <div style={{ padding: "2px 10px", borderRadius: 999, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <span style={{ fontSize: 10, color: "#4ADE80", fontWeight: 700 }}>VERIFIED</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                {user?.email || "Health Identity Dashboard"}
              </p>
              {form.blood_group && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Blood Group:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#FCA5A5" }}>{form.blood_group}</span>
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <button onClick={save} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: saved ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.1)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 14, padding: "12px 24px",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            backdropFilter: "blur(8px)",
            boxShadow: saved ? "0 4px 16px rgba(34,197,94,0.35)" : "none",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { if (!saved) e.currentTarget.style.background = "rgba(255,255,255,0.18)" }}
            onMouseLeave={e => { if (!saved) e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
          >
            {saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> {loading ? "Saving…" : "Save Profile"}</>}
          </button>
        </div>
      </div>

      {/* ═══ HEALTH STATS STRIP ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
        {healthStats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{
              background: glass,
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              borderRadius: 16, padding: "16px 14px",
              border: `1px solid ${border}`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.05)`,
              borderLeft: `3px solid ${s.color}`,
              transition: "all 0.2s",
              position: "relative", overflow: "hidden",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${s.glow}`; e.currentTarget.style.transform = "translateY(-2px)" }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "translateY(0)" }}
            >
              <p style={{ fontSize: 9.5, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, margin: "0 0 6px" }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: "0 0 2px", letterSpacing: "-0.5px" }}>{s.value}</p>
              <p style={{ fontSize: 10.5, color: textMute, margin: 0 }}>{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* ═══ SECTION TABS ═══ */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 20,
        background: glass, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderRadius: 16, padding: 6, border: `1px solid ${border}`,
      }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveSection(t)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 12,
            border: activeSection === t ? "1px solid rgba(27,58,107,0.2)" : "1px solid transparent",
            background: activeSection === t
              ? (dark ? "linear-gradient(135deg, rgba(41,82,163,0.5), rgba(27,58,107,0.3))" : "linear-gradient(135deg, #1B3A6B, #2952A3)")
              : "transparent",
            color: activeSection === t ? "#fff" : textMute,
            fontSize: 13, fontWeight: activeSection === t ? 700 : 500,
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: activeSection === t ? "0 4px 14px rgba(27,58,107,0.3)" : "none",
          }}>
            {t === "Security" && <Shield size={13} />}
            {t}
          </button>
        ))}
      </div>

      {/* ═══ PROFILE FORM ═══ */}
      {SECTIONS.filter(s => s.title === activeSection).map(section => {
        const Icon = section.icon
        return (
          <div key={section.title} style={{
            background: glass,
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            borderRadius: 22, border: `1px solid ${border}`,
            padding: "28px 30px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: dark ? "rgba(41,82,163,0.2)" : "rgba(27,58,107,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={17} color={accent} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: textMain, margin: 0 }}>{section.title} Information</h3>
                <p style={{ fontSize: 12, color: textMute, margin: 0 }}>Keep this up to date for accurate AI analysis</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {section.fields.map(({ key, label, type, placeholder, opts, span }) => (
                <div key={key} style={{ gridColumn: span === 2 ? "1/-1" : "auto" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>{label}</label>
                  {type === "select" ? (
                    <select value={form[key]} onChange={e => set(key, e.target.value)} style={{ ...inputSt, cursor: "pointer" }}
                      onFocus={e => { e.target.style.borderColor = dark ? "rgba(96,165,250,0.4)" : "rgba(27,58,107,0.3)"; e.target.style.boxShadow = "0 0 0 3px rgba(27,58,107,0.08)" }}
                      onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = "none" }}
                    >
                      <option value="">Select…</option>
                      {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={form[key]} placeholder={placeholder} onChange={e => set(key, e.target.value)}
                      style={inputSt}
                      onFocus={e => { e.target.style.borderColor = dark ? "rgba(96,165,250,0.4)" : "rgba(27,58,107,0.3)"; e.target.style.boxShadow = "0 0 0 3px rgba(27,58,107,0.08)" }}
                      onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = "none" }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Privacy notice */}
            <div style={{ marginTop: 22, background: dark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.06)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(34,197,94,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <p style={{ fontSize: 12.5, color: dark ? "#4ADE80" : "#166534", lineHeight: 1.5, margin: 0 }}>
                <strong>Privacy First:</strong> Your medical profile is stored securely in MongoDB Atlas. It personalises your AI experience and is never shared with third parties.
              </p>
            </div>
          </div>
        )
      })}

      {/* ═══ SECURITY ═══ */}
      {activeSection === "Security" && (
        <div style={{
          background: glass,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderRadius: 22, border: `1px solid ${border}`,
          padding: "28px 30px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #1B3A6B, #2952A3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(27,58,107,0.3)" }}>
              <Lock size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: textMain, margin: 0 }}>Security Settings</h3>
              <p style={{ fontSize: 12.5, color: textMute, margin: 0 }}>Update your account credentials</p>
            </div>
          </div>

          <div style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { label: "Current Password", val: currentPw, set: setCurrentPw, show: showCurr, toggle: () => setShowCurr(v => !v) },
              { label: "New Password",     val: newPw,     set: setNewPw,     show: showNew,  toggle: () => setShowNew(v => !v)  },
              { label: "Confirm New Password", val: confirmPw, set: setConfirmPw, show: showNew, toggle: () => setShowNew(v => !v) },
            ].map((f, i) => (
              <div key={f.label}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textMute, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>{f.label}</label>
                <div style={{ position: "relative" }}>
                  <input type={f.show ? "text" : "password"} value={f.val} onChange={e => f.set(e.target.value)} placeholder="••••••••"
                    style={{ ...inputSt, paddingRight: 48 }}
                    onFocus={e => { e.target.style.borderColor = dark ? "rgba(96,165,250,0.4)" : "rgba(27,58,107,0.3)"; e.target.style.boxShadow = "0 0 0 3px rgba(27,58,107,0.08)" }}
                    onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = "none" }}
                  />
                  <button onClick={f.toggle} style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: 0, cursor: "pointer", color: textMute,
                    display: "flex", alignItems: "center", padding: 0,
                    transition: "color 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = textMain}
                    onMouseLeave={e => e.currentTarget.style.color = textMute}
                  >
                    {f.show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}

            {pwError && (
              <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{pwError}</p>
              </div>
            )}
            {pwSuccess && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle size={15} color="#22C55E" />
                <span style={{ color: "#16A34A", fontSize: 13, fontWeight: 600 }}>Password changed successfully!</span>
              </div>
            )}

            <button onClick={handleChangePw} disabled={pwLoading} style={{
              padding: "12px 28px", borderRadius: 14, width: "fit-content",
              background: pwLoading ? "rgba(27,58,107,0.4)" : "linear-gradient(135deg, #1B3A6B, #2952A3)",
              color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 14, fontWeight: 700, cursor: pwLoading ? "wait" : "pointer",
              boxShadow: pwLoading ? "none" : "0 4px 16px rgba(27,58,107,0.35)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { if (!pwLoading) e.currentTarget.style.transform = "translateY(-1px)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)" }}
            >
              {pwLoading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}