// MediMate/frontend/src/pages/Tracking.jsx
import { useState } from "react"
import { useLocation } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { analyzeVitals, calculateBMI, saveVitals, saveBMI, saveSleep, saveActivity } from "../api/index"
import { Heart, Scale, Moon, Zap, RefreshCw, CheckCircle } from "lucide-react"

const TABS = [
  { id:"vitals",   icon:Heart,  label:"Vitals"   },
  { id:"bmi",      icon:Scale,  label:"BMI"      },
  { id:"sleep",    icon:Moon,   label:"Sleep"    },
  { id:"activity", icon:Zap,    label:"Activity" },
]

// ── Vitals Tab ─────────────────────────────────────────────────
function VitalsTab({ dark }) {
  const surface  = dark ? "#1E293B" : "#fff"
  const surface2 = dark ? "#0F172A" : "#F4F6FA"
  const border   = dark ? "#2D3F5A" : "#E5E9F2"
  const textMain = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute = dark ? "#94A3B8" : "#64748B"

  const [form, setForm] = useState({ heart_rate:72, systolic_bp:120, diastolic_bp:80, spo2:98, blood_sugar:95, temperature_f:98.6, sugar_type:"fasting" })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState("")

  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const statusColor = s => s==="normal"?"#22C55E":s==="low"?"#3B82F6":s==="critical"?"#DC2626":"#F59E0B"
  const statusBg    = s => dark
    ? (s==="normal"?"#14532d20":s==="low"?"#1e3a5f":s==="critical"?"#5b202020":"#451a0320")
    : (s==="normal"?"#F0FDF4":s==="low"?"#EFF6FF":s==="critical"?"#FEF2F2":"#FFFBEB")

  const inputStyle = {
    width:"100%", backgroundColor:surface2, border:`1px solid ${border}`,
    borderRadius:10, fontSize:16, fontWeight:600, color:textMain, outline:"none",
    fontFamily:"DM Sans,sans-serif",
  }

  const submit = async () => {
    setError(""); setLoading(true); setSaved(false)
    try {
      const r = await analyzeVitals(form)
      setResult(r.data)
      // Save to MongoDB
      await saveVitals({ ...form, overall: r.data.overall })
      setSaved(true)
      setTimeout(()=>setSaved(false), 3000)
    } catch { setError("Backend not reachable.") }
    finally { setLoading(false) }
  }

  const FIELDS = [
    { key:"heart_rate",    label:"Heart Rate (BPM)",   unit:"bpm",   step:1   },
    { key:"spo2",          label:"Oxygen (SpO2 %)",    unit:"%",     step:0.1 },
    { key:"blood_sugar",   label:"Blood Sugar (mg/dL)",unit:"mg/dL", step:1   },
    { key:"temperature_f", label:"Temperature (°F)",   unit:"°F",    step:0.1 },
  ]

  return (
    <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:20 }}>
      {/* Input */}
      <div style={{ backgroundColor:surface, borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:18 }}>📋 New Entry</h3>

        {FIELDS.map(({ key, label, unit, step }) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>{label}</label>
            <div style={{ position:"relative" }}>
              <input type="number" step={step} value={form[key]} onChange={e=>set(key,+e.target.value)}
                style={{ ...inputStyle, padding:"10px 48px 10px 14px" }}/>
              <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:textMute }}>{unit}</span>
            </div>
          </div>
        ))}

        {/* Blood Pressure — FIXED: both fields properly contained */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Blood Pressure (mmHg)</label>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ flex:1, position:"relative" }}>
              <input type="number" value={form.systolic_bp} onChange={e=>set("systolic_bp",+e.target.value)}
                style={{ ...inputStyle, padding:"10px 14px", textAlign:"center", width:"100%" }}/>
            </div>
            <span style={{ color:textMute, fontWeight:700, flexShrink:0 }}>/</span>
            <div style={{ flex:1, position:"relative" }}>
              <input type="number" value={form.diastolic_bp} onChange={e=>set("diastolic_bp",+e.target.value)}
                style={{ ...inputStyle, padding:"10px 14px", textAlign:"center", width:"100%" }}/>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:10, color:textMute }}>Systolic</span>
            <span style={{ fontSize:10, color:textMute }}>Diastolic</span>
          </div>
        </div>

        {/* Sugar type */}
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Sugar Reading Type</label>
          <div style={{ display:"flex", gap:6 }}>
            {["fasting","random"].map(t=>(
              <button key={t} onClick={()=>set("sugar_type",t)} style={{ flex:1, padding:"8px 0", borderRadius:10, border:`1.5px solid ${form.sugar_type===t?(dark?"#3B82F6":"#1B3A6B"):border}`, backgroundColor:form.sugar_type===t?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:form.sugar_type===t?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:13, fontWeight:600, cursor:"pointer", textTransform:"capitalize" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color:"#DC2626", fontSize:12, marginBottom:10 }}>{error}</p>}

        <button onClick={submit} disabled={loading} style={{ width:"100%", backgroundColor:dark?"#3B82F6":"#1B3A6B", color:"#fff", border:0, borderRadius:999, padding:"12px 0", fontSize:14, fontWeight:700, cursor:loading?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:loading?0.75:1 }}>
          <RefreshCw size={15}/> {loading?"Analyzing...":"Update Real-time Analysis"}
        </button>

        {saved && (
          <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:6, backgroundColor:dark?"#14532d20":"#F0FDF4", borderRadius:10, padding:"8px 12px" }}>
            <CheckCircle size={14} color="#22C55E"/>
            <span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>Vitals saved to your health history</span>
          </div>
        )}

        <div style={{ marginTop:16, backgroundColor:surface2, borderRadius:12, padding:14 }}>
          <p style={{ fontSize:12, fontWeight:700, color:textMain, marginBottom:8 }}>🏥 When to see a doctor</p>
          {["Resting HR above 100 or below 60 bpm","SpO2 drops below 94%","BP spike above 180/120 mmHg","Fever above 103°F for 3+ days"].map(s=>(
            <p key={s} style={{ fontSize:11, color:textMute, marginBottom:4 }}>· {s}</p>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {result ? (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
              {[
                { label:"Heart Rate",   key:"heart_rate",   unit:"bpm",   emoji:"❤️" },
                { label:"Oxygen (SpO2)",key:"spo2",         unit:"%",     emoji:"💨" },
                { label:"Blood Sugar",  key:"blood_sugar",  unit:"mg/dL", emoji:"🩸" },
                { label:"Temperature",  key:"temperature",  unit:"°F",    emoji:"🌡️" },
              ].map(({ label, key, unit, emoji }) => {
                const f = result[key]; if(!f) return null
                const sc = statusColor(f.status)
                return (
                  <div key={key} style={{ backgroundColor:surface, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", borderLeft:`3px solid ${sc}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em" }}>{emoji} {label}</span>
                      <span style={{ fontSize:10, fontWeight:700, backgroundColor:statusBg(f.status), color:sc, padding:"2px 8px", borderRadius:999 }}>{f.label}</span>
                    </div>
                    <p style={{ fontSize:26, fontWeight:700, color:sc, marginBottom:4 }}>{f.value} <span style={{ fontSize:13, fontWeight:400, color:textMute }}>{unit}</span></p>
                    <p style={{ fontSize:11, color:textMute, lineHeight:1.4 }}>{f.note}</p>
                  </div>
                )
              })}
            </div>

            {result.blood_pressure && (() => {
              const f = result.blood_pressure; const sc = statusColor(f.status)
              return (
                <div style={{ backgroundColor:surface, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", borderLeft:`3px solid ${sc}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <span style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em" }}>🩺 Blood Pressure</span>
                    <p style={{ fontSize:26, fontWeight:700, color:sc, marginTop:4 }}>{form.systolic_bp}/{form.diastolic_bp} <span style={{ fontSize:13, fontWeight:400, color:textMute }}>mmHg</span></p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:11, fontWeight:700, backgroundColor:statusBg(f.status), color:sc, padding:"4px 12px", borderRadius:999, display:"block", marginBottom:6 }}>{f.label}</span>
                    <p style={{ fontSize:11, color:textMute, maxWidth:200, lineHeight:1.4 }}>{f.note}</p>
                  </div>
                </div>
              )
            })()}

            <div style={{ backgroundColor: result.overall==="optimal"?(dark?"#14532d20":"#F0FDF4"):result.overall==="critical"?(dark?"#5b202020":"#FEF2F2"):(dark?"#451a0320":"#FFFBEB"), borderRadius:14, padding:18, border:`1px solid ${result.overall==="optimal"?"#86EFAC":result.overall==="critical"?"#FECACA":"#FED7AA"}` }}>
              <p style={{ fontSize:13, fontWeight:700, color:result.overall==="optimal"?"#16A34A":result.overall==="critical"?"#DC2626":"#D97706", marginBottom:4, textTransform:"capitalize" }}>
                Overall Status: {result.overall}
              </p>
              {result.alerts.length>0 ? result.alerts.map(a=><p key={a} style={{ fontSize:12, color:"#DC2626" }}>⚠ {a}</p>) :
                <p style={{ fontSize:12, color:textMute }}>No critical alerts. Keep monitoring regularly.</p>}
            </div>
          </>
        ) : (
          <div style={{ backgroundColor:surface, borderRadius:16, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 12px rgba(27,58,107,0.08)", minHeight:300, gap:12 }}>
            <Heart size={40} color={dark?"#2D3F5A":"#E5E9F2"}/>
            <p style={{ color:textMute, fontSize:14, textAlign:"center", maxWidth:260, lineHeight:1.5 }}>Enter your vitals and click <strong>Update Real-time Analysis</strong></p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── BMI Tab ─────────────────────────────────────────────────────
function BMITab({ dark }) {
  const surface=dark?"#1E293B":"#fff", surface2=dark?"#0F172A":"#F4F6FA", border=dark?"#2D3F5A":"#E5E9F2", textMain=dark?"#F1F5F9":"#1A1A2E", textMute=dark?"#94A3B8":"#64748B"
  const [height, setHeight] = useState(175)
  const [weight, setWeight] = useState(72)
  const [result, setResult] = useState(null)
  const [loading,setLoading]= useState(false)
  const [saved,  setSaved]  = useState(false)
  const CAT_COLOR = { Normal:"#22C55E", Underweight:"#3B82F6", Overweight:"#F59E0B", Obese:"#DC2626" }

  const calc = async () => {
    setLoading(true); setSaved(false)
    try {
      const r = await calculateBMI(+height, +weight)
      setResult(r.data)
      await saveBMI({ height_cm:+height, weight_kg:+weight, bmi:r.data.bmi, category:r.data.category })
      setSaved(true); setTimeout(()=>setSaved(false),3000)
    } catch {}
    finally { setLoading(false) }
  }

  const catColor = CAT_COLOR[result?.category]||"#22C55E"
  const inputSt = { width:"100%", backgroundColor:surface2, border:`1px solid ${border}`, borderRadius:10, padding:"12px 48px 12px 14px", fontSize:20, fontWeight:700, color:textMain, outline:"none" }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20 }}>
      <div style={{ backgroundColor:surface, borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        {[{label:"Height (cm)",val:height,set:setHeight,unit:"cm"},{label:"Weight (kg)",val:weight,set:setWeight,unit:"kg"}].map(f=>(
          <div key={f.label} style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>{f.label}</label>
            <div style={{ position:"relative" }}>
              <input type="number" value={f.val} onChange={e=>f.set(e.target.value)} style={inputSt}/>
              <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:textMute }}>{f.unit}</span>
            </div>
          </div>
        ))}
        <div style={{ backgroundColor:dark?"#0F172A":"#EEF2FF", borderRadius:12, padding:14, marginBottom:18 }}>
          <p style={{ fontSize:11, fontWeight:600, color:dark?"#60A5FA":"#1B3A6B", marginBottom:4 }}>ℹ Pro-tip</p>
          <p style={{ fontSize:12, color:textMute, lineHeight:1.5 }}>Weigh yourself in the morning before eating for consistent results.</p>
        </div>
        <button onClick={calc} disabled={loading} style={{ width:"100%", backgroundColor:dark?"#3B82F6":"#1B3A6B", color:"#fff", border:0, borderRadius:999, padding:"12px 0", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <RefreshCw size={15}/> {loading?"Calculating...":"Calculate BMI"}
        </button>
        {saved && <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:6, backgroundColor:dark?"#14532d20":"#F0FDF4", borderRadius:10, padding:"8px 12px" }}>
          <CheckCircle size={14} color="#22C55E"/>
          <span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>BMI saved to history</span>
        </div>}
      </div>

      {result ? (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ backgroundColor:surface, borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:24 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ width:100, height:100, borderRadius:"50%", border:`6px solid ${catColor}`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
                  <span style={{ fontSize:26, fontWeight:800, color:catColor }}>{result.bmi}</span>
                  <span style={{ fontSize:10, color:textMute }}>BMI</span>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <span style={{ display:"inline-block", backgroundColor:`${catColor}18`, color:catColor, fontSize:12, fontWeight:700, padding:"4px 14px", borderRadius:999, marginBottom:10 }}>✓ {result.category}</span>
                <p style={{ fontSize:13, color:textMute, lineHeight:1.6 }}>{result.advice}</p>
              </div>
            </div>
            <div style={{ marginTop:20, display:"flex", height:8, borderRadius:999, overflow:"hidden", gap:2 }}>
              {[["#3B82F6",33],["#22C55E",33],["#F59E0B",20],["#DC2626",14]].map(([c,w],i)=>(
                <div key={i} style={{ width:`${w}%`, backgroundColor:c }}/>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              {["Under","Normal","Over","Obese"].map(l=><span key={l} style={{ fontSize:10, color:textMute }}>{l}</span>)}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[{label:"Cardio Risk",value:result.cardio_risk},{label:"Diabetes Type II",value:result.diabetes_risk}].map(({label,value})=>{
              const rc=value==="Low"?"#22C55E":value==="Moderate"?"#F59E0B":"#DC2626"
              const pct=value==="Low"?20:value==="Moderate"?55:90
              return (
                <div key={label} style={{ backgroundColor:surface, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontSize:13, color:textMute }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:rc }}>{value}</span>
                  </div>
                  <div style={{ height:6, backgroundColor:dark?"#2D3F5A":"#F4F6FA", borderRadius:999 }}>
                    <div style={{ width:`${pct}%`, height:"100%", backgroundColor:rc, borderRadius:999 }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor:surface, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 12px rgba(27,58,107,0.08)", minHeight:260 }}>
          <p style={{ color:textMute }}>Enter measurements and calculate.</p>
        </div>
      )}
    </div>
  )
}

// ── Sleep Tab ───────────────────────────────────────────────────
function SleepTab({ dark }) {
  const surface=dark?"#1E293B":"#fff", surface2=dark?"#0F172A":"#F4F6FA", border=dark?"#2D3F5A":"#E5E9F2", textMain=dark?"#F1F5F9":"#1A1A2E", textMute=dark?"#94A3B8":"#64748B"
  const [hours,setHours]=useState(7), [quality,setQuality]=useState("Good"), [saved,setSaved]=useState(false)
  const sleepColor=hours>=7?"#22C55E":hours>=5?"#F59E0B":"#DC2626"
  const sleepLabel=hours>=7?"Optimal":hours>=5?"Fair":"Poor"
  const doSave = async () => {
    await saveSleep({ hours, quality }).catch(()=>{})
    setSaved(true); setTimeout(()=>setSaved(false),3000)
  }
  return (
    <div style={{ maxWidth:480 }}>
      <div style={{ backgroundColor:surface, borderRadius:16, padding:28, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:20 }}>🌙 Log Tonight's Sleep</h3>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:100, height:100, borderRadius:"50%", border:`6px solid ${sleepColor}`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", margin:"0 auto 12px" }}>
            <span style={{ fontSize:26, fontWeight:800, color:sleepColor }}>{hours}h</span>
          </div>
          <span style={{ backgroundColor:`${sleepColor}18`, color:sleepColor, fontSize:12, fontWeight:700, padding:"3px 14px", borderRadius:999 }}>{sleepLabel}</span>
        </div>
        <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:8 }}>Hours Slept: <strong style={{ color:textMain }}>{hours}h</strong></label>
        <input type="range" min={1} max={12} step={0.5} value={hours} onChange={e=>setHours(+e.target.value)} style={{ width:"100%", accentColor:"#1B3A6B", marginBottom:20 }}/>
        <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:8 }}>Sleep Quality</label>
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {["Poor","Fair","Good","Excellent"].map(q=>(
            <button key={q} onClick={()=>setQuality(q)} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:`1.5px solid ${quality===q?(dark?"#3B82F6":"#1B3A6B"):border}`, backgroundColor:quality===q?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:quality===q?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:12, fontWeight:600, cursor:"pointer" }}>{q}</button>
          ))}
        </div>
        <button onClick={doSave} style={{ width:"100%", backgroundColor:dark?"#3B82F6":"#1B3A6B", color:"#fff", border:0, borderRadius:999, padding:"12px 0", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          Log Sleep
        </button>
        {saved && <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:6, backgroundColor:dark?"#14532d20":"#F0FDF4", borderRadius:10, padding:"8px 12px" }}>
          <CheckCircle size={14} color="#22C55E"/>
          <span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>Sleep logged to history</span>
        </div>}
      </div>
    </div>
  )
}

// ── Activity Tab ─────────────────────────────────────────────────
function ActivityTab({ dark }) {
  const surface=dark?"#1E293B":"#fff", border=dark?"#2D3F5A":"#E5E9F2", textMain=dark?"#F1F5F9":"#1A1A2E", textMute=dark?"#94A3B8":"#64748B"
  const [steps,setSteps]=useState(6200), [exercise,setExercise]=useState(30), [saved,setSaved]=useState(false)
  const stepGoal=10000, stepPct=Math.min((steps/stepGoal)*100,100)
  const stepColor=steps>=stepGoal?"#22C55E":steps>=5000?"#F59E0B":"#DC2626"
  const doSave = async () => {
    await saveActivity({ steps, exercise_mins:exercise }).catch(()=>{})
    setSaved(true); setTimeout(()=>setSaved(false),3000)
  }
  return (
    <div style={{ maxWidth:560 }}>
      <div style={{ backgroundColor:surface, borderRadius:16, padding:28, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:20 }}>⚡ Log Today's Activity</h3>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ position:"relative", width:120, height:120, margin:"0 auto" }}>
            <svg viewBox="0 0 120 120" style={{ transform:"rotate(-90deg)", width:120, height:120 }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke={dark?"#2D3F5A":"#F4F6FA"} strokeWidth="10"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke={stepColor} strokeWidth="10" strokeDasharray={`${stepPct*3.14} 314`} strokeLinecap="round"/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:20, fontWeight:800, color:stepColor }}>{steps.toLocaleString()}</span>
              <span style={{ fontSize:10, color:textMute }}>/ {stepGoal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:8 }}>Steps: <strong style={{ color:textMain }}>{steps.toLocaleString()}</strong></label>
        <input type="range" min={0} max={20000} step={100} value={steps} onChange={e=>setSteps(+e.target.value)} style={{ width:"100%", accentColor:"#1B3A6B", marginBottom:20 }}/>
        <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:8 }}>Exercise: <strong style={{ color:textMain }}>{exercise} min</strong></label>
        <input type="range" min={0} max={120} step={5} value={exercise} onChange={e=>setExercise(+e.target.value)} style={{ width:"100%", accentColor:"#22C55E", marginBottom:24 }}/>
        <button onClick={doSave} style={{ width:"100%", backgroundColor:dark?"#3B82F6":"#1B3A6B", color:"#fff", border:0, borderRadius:999, padding:"12px 0", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          Log Activity
        </button>
        {saved && <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:6, backgroundColor:dark?"#14532d20":"#F0FDF4", borderRadius:10, padding:"8px 12px" }}>
          <CheckCircle size={14} color="#22C55E"/>
          <span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>Activity logged to history</span>
        </div>}
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────
export default function Tracking() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const location = useLocation()
  // Support navigating directly to BMI tab (from Dashboard BMI card)
  const [tab, setTab] = useState(location.state?.tab || "vitals")
  const surface=dark?"#1E293B":"#fff", border=dark?"#2D3F5A":"#E5E9F2", textMain=dark?"#F1F5F9":"#1A1A2E", textMute=dark?"#94A3B8":"#64748B"

  return (
    <div style={{ maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:700, color:textMain, marginBottom:4 }}>Health Tracking</h1>
        <p style={{ fontSize:13, color:textMute }}>Monitor your vitals, BMI, sleep, and activity. All entries are saved to your health history.</p>
      </div>
      <div style={{ display:"flex", gap:6, backgroundColor:surface, borderRadius:14, padding:6, marginBottom:24, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", width:"fit-content" }}>
        {TABS.map(({ id, icon:Icon, label }) => (
          <button key={id} onClick={()=>setTab(id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:10, border:0, backgroundColor:tab===id?(dark?"#3B82F6":"#1B3A6B"):"transparent", color:tab===id?"#fff":textMute, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>
      {tab==="vitals"   && <VitalsTab   dark={dark}/>}
      {tab==="bmi"      && <BMITab      dark={dark}/>}
      {tab==="sleep"    && <SleepTab    dark={dark}/>}
      {tab==="activity" && <ActivityTab dark={dark}/>}
    </div>
  )
}