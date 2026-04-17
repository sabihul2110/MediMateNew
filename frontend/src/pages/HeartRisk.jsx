// MediMate/frontend/src/pages/HeartRisk.jsx
// Heart Risk + Self/Other + Save to DB + Export + Empty State + History
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, Activity, CheckCircle, ChevronRight, Info, RotateCcw, Loader, User, Users, Download, Clock } from "lucide-react"
import { useApp } from "../context/ThemeContext"
import { predictHeartRisk, saveHeartRiskResult, getHeartRiskHistory, getProfile } from "../api/index"

const ACTIVITY_OPTS = ["low","moderate","high"]
const GENDER_OPTS   = ["male","female","other"]
const DEFAULTS = { age:"", gender:"male", systolic_bp:"", diastolic_bp:"", heart_rate:"", bmi:"", blood_sugar:"", smoking:false, activity_level:"moderate", cholesterol:"", diabetes:false, family_history:false }

const IMPACT = {
  high:     { bg:"#FEF2F2", border:"#FECACA", text:"#DC2626", dot:"#DC2626" },
  moderate: { bg:"#FFFBEB", border:"#FDE68A", text:"#D97706", dot:"#F59E0B" },
  low:      { bg:"#F0FDF4", border:"#BBF7D0", text:"#16A34A", dot:"#22C55E" },
}
const IMPACT_DARK = {
  high:     { bg:"#2D1515", border:"#5B2020", text:"#F87171", dot:"#DC2626" },
  moderate: { bg:"#2D1F05", border:"#78350F", text:"#FCD34D", dot:"#F59E0B" },
  low:      { bg:"#0D2010", border:"#14532D", text:"#4ADE80", dot:"#22C55E" },
}

function RiskCircle({ probability, riskLevel, riskColor }) {
  const pct=Math.round(probability*100), r=70, circ=2*Math.PI*r
  const dash=circ*probability, gap=circ-dash
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
      <div style={{ position:"relative", width:180, height:180 }}>
        <svg width={180} height={180} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={90} cy={90} r={r} fill="none" stroke="#E5E9F2" strokeWidth={14}/>
          <circle cx={90} cy={90} r={r} fill="none" stroke={riskColor} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${dash} ${gap}`}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:36, fontWeight:800, color:riskColor, lineHeight:1 }}>{pct}%</span>
          <span style={{ fontSize:11, color:"#94A3B8", marginTop:4, fontWeight:500 }}>probability</span>
        </div>
      </div>
      <div style={{ background:riskColor+"22", color:riskColor, borderRadius:999, padding:"6px 20px", fontSize:13, fontWeight:700 }}>
        {riskLevel.toUpperCase()} RISK
      </div>
    </div>
  )
}

function Field({ label, name, form, setForm, placeholder, step }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em", color:"inherit" }}>{label}</label>
      <input type="number" value={form[name]} step={step} placeholder={placeholder}
        onChange={e=>setForm(f=>({...f,[name]:e.target.value}))}
        style={{ width:"100%", padding:"9px 12px", fontSize:14, borderRadius:10, outline:"none", boxSizing:"border-box", border:"1.5px solid var(--hr-border)", background:"var(--hr-input-bg)", color:"var(--hr-text)", fontFamily:"DM Sans,sans-serif" }}
        onFocus={e=>e.target.style.borderColor="#2952A3"}
        onBlur={e=>e.target.style.borderColor="var(--hr-border)"}/>
    </div>
  )
}

function Toggle({ label, name, form, setForm }) {
  const on=form[name]
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 0" }}>
      <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
      <div onClick={()=>setForm(f=>({...f,[name]:!f[name]}))} style={{ width:44, height:24, borderRadius:999, cursor:"pointer", background:on?"#2952A3":"var(--hr-border)", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
        <span style={{ position:"absolute", top:3, left:on?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
      </div>
    </div>
  )
}

function Seg({ label, name, options, form, setForm }) {
  return (
    <div>
      {label&&<label style={{ display:"block", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</label>}
      <div style={{ display:"flex", gap:6 }}>
        {options.map(opt=>(
          <button key={opt} onClick={()=>setForm(f=>({...f,[name]:opt}))}
            style={{ flex:1, padding:"8px 4px", borderRadius:8, border:"1.5px solid", fontSize:12, fontWeight:600, cursor:"pointer", textTransform:"capitalize", transition:"all 0.15s",
              borderColor:form[name]===opt?"#2952A3":"var(--hr-border)",
              background:form[name]===opt?"#2952A3":"var(--hr-input-bg)",
              color:form[name]===opt?"#fff":"var(--hr-muted)" }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Export PDF/text report ─────────────────────────────────────
function exportReport(result, form, mode) {
  if (!result) return
  const lines = [
    "═══════════════════════════════════════",
    "       MediMate — Heart Risk Report     ",
    "═══════════════════════════════════════",
    `Date:         ${new Date().toLocaleString()}`,
    `Mode:         ${mode === "self" ? "Self Assessment" : "Third-party Assessment"}`,
    "",
    "── Input Parameters ────────────────────",
    `Age:          ${form.age} yrs`,
    `Gender:       ${form.gender}`,
    `Systolic BP:  ${form.systolic_bp} mmHg`,
    `Diastolic BP: ${form.diastolic_bp || "estimated"} mmHg`,
    `Heart Rate:   ${form.heart_rate} bpm`,
    `BMI:          ${form.bmi || "not provided"}`,
    `Blood Sugar:  ${form.blood_sugar} mg/dL`,
    `Cholesterol:  ${form.cholesterol || "not provided"} mg/dL`,
    `Smoking:      ${form.smoking ? "Yes" : "No"}`,
    `Diabetes:     ${form.diabetes ? "Yes" : "No"}`,
    `Family Hist:  ${form.family_history ? "Yes" : "No"}`,
    `Activity:     ${form.activity_level}`,
    "",
    "── Risk Assessment ─────────────────────",
    `Risk Level:   ${result.risk_level}`,
    `Probability:  ${result.probability_pct}%`,
    `Model Score:  ${result.score}`,
    "",
    "── Contributing Factors ────────────────",
    ...result.contributing_factors.map(f => `[${f.impact.toUpperCase()}] ${f.factor}: ${f.value}`),
    "",
    "── Recommendations ─────────────────────",
    ...result.recommendations.map((r,i) => `${i+1}. ${r}`),
    "",
    "── Disclaimer ──────────────────────────",
    result.disclaimer,
    "═══════════════════════════════════════",
  ]
  const blob = new Blob([lines.join("\n")], { type:"text/plain" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `MediMate_HeartRisk_${new Date().toISOString().slice(0,10)}.txt`
  a.click()
}

export default function HeartRisk() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const navigate = useNavigate()

  const [mode,    setMode]    = useState("self")
  const [form,    setForm]    = useState(DEFAULTS)
  const [profile, setProfile] = useState(null)
  const [result,  setResult]  = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMuted= dark?"#94A3B8":"#64748B"
  const cssVars  = { "--hr-surface":surface,"--hr-surface2":surface2,"--hr-border":border,"--hr-text":textMain,"--hr-muted":textMuted,"--hr-input-bg":surface2 }

  useEffect(()=>{
    getProfile().then(r=>setProfile(r.data)).catch(()=>{})
    getHeartRiskHistory(5).then(r=>setHistory(r.data.history||[])).catch(()=>{})
  },[])

  useEffect(()=>{
    if(mode==="self"&&profile){
      const bmi = profile.height_cm&&profile.weight_kg
        ? String((profile.weight_kg/((profile.height_cm/100)**2)).toFixed(1)) : ""
      setForm(f=>({ ...f, age:profile.age||"", gender:profile.sex||"male", bmi }))
    } else if(mode==="other"){
      setForm(DEFAULTS); setResult(null); setSaved(false)
    }
  },[mode,profile])

  const handlePredict = async () => {
    setError(null); setSaved(false)
    for(const k of ["age","systolic_bp","heart_rate","blood_sugar"]){
      if(!form[k]||isNaN(Number(form[k]))){ setError(`Please fill in: ${k.replace(/_/g," ")}`); return }
    }
    const payload = { age:+form.age, gender:form.gender, systolic_bp:+form.systolic_bp,
      diastolic_bp:form.diastolic_bp?+form.diastolic_bp:undefined, heart_rate:+form.heart_rate,
      bmi:form.bmi?+form.bmi:undefined, blood_sugar:+form.blood_sugar, smoking:form.smoking,
      activity_level:form.activity_level, cholesterol:form.cholesterol?+form.cholesterol:undefined,
      diabetes:form.diabetes, family_history:form.family_history }
    setLoading(true)
    try {
      const res = await predictHeartRisk(payload)
      setResult(res.data)
      setTimeout(()=>document.getElementById("hr-result")?.scrollIntoView({behavior:"smooth"}),100)
    } catch { setError("Prediction failed. Ensure backend is running.") }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    if(!result) return
    setSaving(true)
    try {
      await saveHeartRiskResult({ ...result, mode, input_snapshot:form })
      setSaved(true)
      // Refresh history
      const r = await getHeartRiskHistory(5)
      setHistory(r.data.history||[])
    } catch {}
    finally { setSaving(false) }
  }

  const impPal = dark?IMPACT_DARK:IMPACT
  const rc = result?.risk_color||"#22C55E"

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", ...cssVars }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#DC2626,#7f1d1d)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Heart size={22} color="#fff" fill="#fff"/>
            </div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:textMain, margin:0 }}>Heart Risk Predictor</h1>
              <p style={{ fontSize:13, color:textMuted, margin:0 }}>Cardiovascular risk estimation · Logistic-regression model</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* History toggle */}
            <button onClick={()=>setShowHistory(v=>!v)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, border:`1px solid ${border}`, backgroundColor:showHistory?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:showHistory?(dark?"#60A5FA":"#1B3A6B"):textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
              <Clock size={13}/> History ({history.length})
            </button>
            {/* Self/Other */}
            <div style={{ display:"flex", backgroundColor:surface2, borderRadius:12, padding:4, border:`1px solid ${border}` }}>
              {[["self","Self",User],["other","Other",Users]].map(([val,label,Icon])=>(
                <button key={val} onClick={()=>setMode(val)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:10, border:0, fontWeight:600, fontSize:12, cursor:"pointer", backgroundColor:mode===val?(dark?"#3B82F6":"#1B3A6B"):"transparent", color:mode===val?"#fff":textMuted }}>
                  <Icon size={13}/>{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info banners */}
        {mode==="self"&&profile?.age&&(
          <div style={{ background:dark?"#0D2010":"#F0FDF4", border:`1px solid ${dark?"#14532D":"#BBF7D0"}`, borderRadius:10, padding:"8px 14px", display:"flex", gap:8, alignItems:"center" }}>
            <CheckCircle size={14} color="#22C55E"/>
            <p style={{ fontSize:12, color:dark?"#4ADE80":"#166534", margin:0 }}>
              Auto-filled: age {profile.age}, {profile.sex||"sex unknown"}{profile.height_cm&&profile.weight_kg?`, BMI ${(profile.weight_kg/((profile.height_cm/100)**2)).toFixed(1)}`:""}.{" "}
              <span onClick={()=>navigate("/profile")} style={{ textDecoration:"underline", cursor:"pointer" }}>Update profile →</span>
            </p>
          </div>
        )}
        {mode==="self"&&!profile?.age&&(
          <div style={{ background:dark?"#2D1F05":"#FFFBEB", border:`1px solid ${dark?"#78350F":"#FDE68A"}`, borderRadius:10, padding:"8px 14px", display:"flex", gap:8, alignItems:"center" }}>
            <Info size={14} color="#D97706"/>
            <p style={{ fontSize:12, color:dark?"#FCD34D":"#92400E", margin:0 }}>
              <span onClick={()=>navigate("/profile")} style={{ textDecoration:"underline", cursor:"pointer" }}>Complete your profile</span> for auto-fill. Enter values manually for now.
            </p>
          </div>
        )}
      </div>

      {/* History panel */}
      {showHistory&&(
        <div style={{ backgroundColor:surface, borderRadius:16, border:`1px solid ${border}`, padding:20, marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:textMain, marginBottom:14 }}>Recent Assessments</h3>
          {history.length===0 ? (
            <p style={{ color:textMuted, fontSize:13 }}>No saved assessments yet. Run a prediction and click Save.</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {history.map((h,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", backgroundColor:surface2, borderRadius:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:999, border:`3px solid ${h.risk_color}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:12, fontWeight:800, color:h.risk_color }}>{h.probability_pct}%</span>
                    </div>
                    <div>
                      <span style={{ fontSize:13, fontWeight:600, color:textMain }}>{h.risk_level} Risk</span>
                      <p style={{ fontSize:11, color:textMuted, margin:0 }}>{h.contributing_factors?.length} factors · {h.mode==="self"?"Self":"Other"}</p>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:textMuted }}>{new Date(h.logged_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start" }}>
        {/* Form */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:surface, borderRadius:16, border:`1px solid ${border}`, padding:20, color:textMain }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:textMuted, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 14px" }}>Demographics</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Age (yrs)" name="age" form={form} setForm={setForm} placeholder="52"/>
              <Seg label="Gender" name="gender" options={GENDER_OPTS} form={form} setForm={setForm}/>
            </div>
          </div>
          <div style={{ background:surface, borderRadius:16, border:`1px solid ${border}`, padding:20, color:textMain }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:textMuted, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 14px" }}>Vitals</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Systolic BP (mmHg)" name="systolic_bp" form={form} setForm={setForm} placeholder="130"/>
              <Field label="Diastolic BP (mmHg)" name="diastolic_bp" form={form} setForm={setForm} placeholder="85"/>
              <Field label="Heart Rate (bpm)" name="heart_rate" form={form} setForm={setForm} placeholder="78"/>
              <Field label="BMI (optional)" name="bmi" form={form} setForm={setForm} placeholder="27.4" step="0.1"/>
              <Field label="Blood Sugar (mg/dL)" name="blood_sugar" form={form} setForm={setForm} placeholder="105"/>
              <Field label="Cholesterol (optional)" name="cholesterol" form={form} setForm={setForm} placeholder="220"/>
            </div>
          </div>
          <div style={{ background:surface, borderRadius:16, border:`1px solid ${border}`, padding:20, color:textMain }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:textMuted, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 14px" }}>Lifestyle & History</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <Seg label="Physical Activity" name="activity_level" options={ACTIVITY_OPTS} form={form} setForm={setForm}/>
              <Toggle label="Current Smoker" name="smoking" form={form} setForm={setForm}/>
              <Toggle label="Diagnosed Diabetes" name="diabetes" form={form} setForm={setForm}/>
              <Toggle label="Family History of Heart Disease" name="family_history" form={form} setForm={setForm}/>
            </div>
          </div>
          {error&&<div style={{ background:dark?"#2D1515":"#FEF2F2", border:`1px solid ${dark?"#5B2020":"#FECACA"}`, borderRadius:10, padding:"10px 14px", color:"#DC2626", fontSize:13 }}>⚠ {error}</div>}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handlePredict} disabled={loading} style={{ flex:1, padding:"13px 0", borderRadius:12, background:loading?"#94A3B8":"linear-gradient(135deg,#1B3A6B,#2952A3)", color:"#fff", border:0, fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading?<><Loader size={16} style={{animation:"spin 1s linear infinite"}}/> Analysing…</>:<><Heart size={16}/> Predict Risk</>}
            </button>
            <button onClick={()=>{setForm(mode==="self"&&profile?.age?{...DEFAULTS,age:profile.age||"",gender:profile.sex||"male",bmi:profile.height_cm&&profile.weight_kg?String((profile.weight_kg/((profile.height_cm/100)**2)).toFixed(1)):""}:DEFAULTS);setResult(null);setError(null);setSaved(false)}}
              style={{ padding:"13px 16px", borderRadius:12, background:surface2, border:`1px solid ${border}`, color:textMuted, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13 }}>
              <RotateCcw size={14}/> Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div id="hr-result" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* ── EMPTY STATE ── */}
          {!result&&(
            <div style={{ background:surface, borderRadius:16, border:`1px solid ${border}`, padding:40, textAlign:"center" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:dark?"#2D3F5A":"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <Heart size={30} color={dark?"#475569":"#2952A3"}/>
              </div>
              <p style={{ color:textMain, fontWeight:700, fontSize:16, marginBottom:8 }}>No assessment yet</p>
              <p style={{ color:textMuted, fontSize:13, lineHeight:1.6, marginBottom:24, maxWidth:300, margin:"0 auto 24px" }}>
                Fill in the form on the left and click <b>Predict Risk</b> to receive your cardiovascular risk assessment with full explainability.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:280, margin:"0 auto" }}>
                {["Demographics (age, sex)","Vitals (BP, heart rate, blood sugar)","Lifestyle (smoking, activity, diabetes)"].map((tip,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, backgroundColor:surface2, borderRadius:10, padding:"10px 14px", textAlign:"left" }}>
                    <span style={{ width:22, height:22, borderRadius:"50%", backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
                    <span style={{ fontSize:12, color:textMuted }}>{tip}</span>
                  </div>
                ))}
              </div>
              {history.length>0&&(
                <div style={{ marginTop:24, padding:"12px 16px", backgroundColor:surface2, borderRadius:12, border:`1px solid ${border}` }}>
                  <p style={{ fontSize:12, color:textMuted, marginBottom:8 }}>Last assessment:</p>
                  <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center" }}>
                    <span style={{ fontSize:18, fontWeight:800, color:history[0].risk_color }}>{history[0].probability_pct}%</span>
                    <span style={{ fontSize:13, fontWeight:600, color:history[0].risk_color }}>{history[0].risk_level} Risk</span>
                    <span style={{ fontSize:11, color:textMuted }}>· {new Date(history[0].logged_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {result&&(
            <>
              {/* Risk summary */}
              <div style={{ background:dark?"linear-gradient(135deg,#1E293B,#0F172A)":"linear-gradient(135deg,#fff,#F0F4FF)", borderRadius:20, border:`2px solid ${rc}44`, padding:28, boxShadow:`0 8px 32px ${rc}22` }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:20 }}>
                  <RiskCircle probability={result.probability} riskLevel={result.risk_level} riskColor={rc}/>
                  <p style={{ fontSize:12, color:textMuted, textAlign:"center", maxWidth:260, lineHeight:1.5 }}>
                    {mode==="other"?"Assessment for another person":"Your cardiovascular risk estimate"} · {result.contributing_factors.length} factors
                  </p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  {[{label:"Risk Level",value:result.risk_level,color:rc},{label:"Probability",value:`${result.probability_pct}%`,color:rc},{label:"Model Score",value:result.score.toFixed(3),color:textMain},{label:"Factors",value:`${result.contributing_factors.length}`,color:textMain}].map(s=>(
                    <div key={s.label} style={{ background:surface2, borderRadius:10, padding:"12px 14px", border:`1px solid ${border}` }}>
                      <p style={{ fontSize:10, color:textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 4px" }}>{s.label}</p>
                      <p style={{ fontSize:16, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Save + Export buttons */}
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={handleSave} disabled={saving||saved} style={{ flex:1, padding:"10px 0", borderRadius:10, border:0, backgroundColor:saved?"#22C55E":"#1B3A6B", color:"#fff", fontSize:13, fontWeight:700, cursor:saved?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    {saving?<><Loader size={13} style={{animation:"spin 1s linear infinite"}}/> Saving…</>:saved?<><CheckCircle size={13}/> Saved to History</>:<>💾 Save Result</>}
                  </button>
                  <button onClick={()=>exportReport(result,form,mode)} style={{ padding:"10px 16px", borderRadius:10, border:`1px solid ${border}`, backgroundColor:surface2, color:textMuted, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    <Download size={14}/> Export
                  </button>
                </div>
              </div>

              {/* Contributing factors */}
              <div style={{ background:surface, borderRadius:16, border:`1px solid ${border}`, padding:20 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:textMain, margin:"0 0 12px", display:"flex", alignItems:"center", gap:8 }}>
                  <Activity size={15} color="#2952A3"/> Contributing Factors
                </h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {result.contributing_factors.map((f,i)=>{
                    const pal=impPal[f.impact]||impPal.low
                    return (
                      <div key={i} style={{ background:pal.bg, border:`1px solid ${pal.border}`, borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:pal.dot, flexShrink:0, marginTop:5 }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:pal.text }}>{f.factor}</span>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:11, color:pal.text, fontWeight:600 }}>{f.value}</span>
                              <span style={{ fontSize:10, textTransform:"uppercase", background:pal.border, color:pal.text, padding:"1px 7px", borderRadius:999, fontWeight:700 }}>{f.impact}</span>
                            </div>
                          </div>
                          <p style={{ fontSize:12, color:dark?"#94A3B8":"#64748B", margin:0, lineHeight:1.4 }}>{f.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recommendations */}
              <div style={{ background:surface, borderRadius:16, border:`1px solid ${border}`, padding:20 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:textMain, margin:"0 0 12px", display:"flex", alignItems:"center", gap:8 }}>
                  <CheckCircle size={15} color="#22C55E"/> Clinical Recommendations
                </h3>
                {result.recommendations.map((r,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"7px 0", borderBottom:i<result.recommendations.length-1?`1px solid ${border}`:"none" }}>
                    <ChevronRight size={14} color="#22C55E" style={{ flexShrink:0, marginTop:2 }}/>
                    <p style={{ fontSize:13, color:textMain, margin:0, lineHeight:1.5 }}>{r}</p>
                  </div>
                ))}
              </div>

              <div style={{ background:surface2, borderRadius:10, padding:"10px 14px", border:`1px solid ${border}` }}>
                <p style={{ fontSize:11, color:textMuted, margin:0, lineHeight:1.5 }}>⚕ <b>Disclaimer:</b> {result.disclaimer}</p>
              </div>

              <button onClick={()=>navigate("/assistant?q=What can I do to reduce my cardiovascular risk?")}
                style={{ width:"100%", padding:"13px 0", borderRadius:12, background:"linear-gradient(135deg,#1B3A6B,#2952A3)", color:"#fff", border:0, fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Heart size={15}/> Ask AI About My Heart Risk
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}