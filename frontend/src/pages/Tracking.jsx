// MediMate/frontend/src/pages/Tracking.jsx — Redesigned
import { useState } from "react"
import { useLocation } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { analyzeVitals, calculateBMI, saveVitals, saveBMI, saveSleep, saveActivity } from "../api/index"
import { Activity, Scale, Moon, Zap, RefreshCw, CheckCircle, Heart, TrendingUp, TrendingDown } from "lucide-react"

const TABS = [
  { id:"vitals",   icon:Heart,     label:"Vitals",   color:"#DC2626" },
  { id:"bmi",      icon:Scale,     label:"BMI",      color:"#22C55E" },
  { id:"sleep",    icon:Moon,      label:"Sleep",    color:"#6366F1" },
  { id:"activity", icon:Activity,  label:"Activity", color:"#F59E0B" },
]

// ── Shared input component ──────────────────────────────────────
function Field({ label, value, onChange, unit, step=1, min, max, dark }) {
  const border  = dark?"#2D3F5A":"#E5E9F2"
  const surface = dark?"#0F172A":"#F8FAFC"
  const text    = dark?"#F1F5F9":"#1A1A2E"
  const mute    = dark?"#94A3B8":"#64748B"
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input type="number" value={value} step={step} min={min} max={max}
          onChange={e=>onChange(+e.target.value)}
          style={{ width:"100%", backgroundColor:surface, border:`2px solid ${border}`, borderRadius:12, padding:"12px 46px 12px 16px", fontSize:18, fontWeight:700, color:text, outline:"none", fontFamily:"DM Sans,sans-serif", boxSizing:"border-box" }}
          onFocus={e=>e.target.style.borderColor="#1B3A6B"}
          onBlur={e=>e.target.style.borderColor=border}/>
        <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:11, fontWeight:600, color:mute }}>{unit}</span>
      </div>
    </div>
  )
}

// ── Status helpers ──────────────────────────────────────────────
function StatusPill({ status, label }) {
  const COLORS = { normal:{bg:"#F0FDF4",text:"#16A34A"}, elevated:{bg:"#FFFBEB",text:"#D97706"}, high:{bg:"#FEF2F2",text:"#DC2626"}, low:{bg:"#EFF6FF",text:"#2563EB"}, critical:{bg:"#FEF2F2",text:"#DC2626"} }
  const c = COLORS[status] || COLORS.normal
  return <span style={{ fontSize:11, fontWeight:700, backgroundColor:c.bg, color:c.text, padding:"3px 10px", borderRadius:999 }}>{label}</span>
}

// ── VITALS TAB ──────────────────────────────────────────────────
function VitalsTab({ dark }) {
  const bg    = dark?"#0F172A":"#F4F6FA"
  const card  = dark?"#1E293B":"#fff"
  const inner = dark?"#162032":"#F8FAFC"
  const bdr   = dark?"#2D3F5A":"#E5E9F2"
  const text  = dark?"#F1F5F9":"#1A1A2E"
  const mute  = dark?"#94A3B8":"#64748B"

  const [form, setForm]    = useState({ heart_rate:72, systolic_bp:120, diastolic_bp:80, spo2:98, blood_sugar:95, temperature_f:98.6, sugar_type:"fasting" })
  const [result, setResult]= useState(null)
  const [loading,setLoad]  = useState(false)
  const [saved,  setSaved] = useState(false)
  const [error,  setErr]   = useState("")
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const VITAL_RANGES = {
    heart_rate:   { label:"Heart Rate",  unit:"bpm",  min:40,  max:200, step:1,   icon:"❤️",  norm:"60–100" },
    spo2:         { label:"Oxygen",      unit:"%",    min:70,  max:100, step:0.1, icon:"💨",  norm:"95–100" },
    blood_sugar:  { label:"Blood Sugar", unit:"mg/dL",min:50,  max:600, step:1,   icon:"🩸",  norm:"70–99 (fasting)" },
    temperature_f:{ label:"Temperature", unit:"°F",   min:95,  max:106, step:0.1, icon:"🌡️", norm:"97–99" },
  }

  const submit = async () => {
    setErr(""); setLoad(true); setSaved(false)
    try {
      const r = await analyzeVitals(form)
      setResult(r.data)
      await saveVitals({ ...form, overall: r.data.overall })
      setSaved(true); setTimeout(()=>setSaved(false),3000)
    } catch { setErr("Backend not reachable. Start uvicorn first.") }
    finally { setLoad(false) }
  }

  const statusColor = s => ({ normal:"#22C55E",low:"#3B82F6",critical:"#DC2626",elevated:"#F59E0B",high:"#F59E0B" })[s]||"#94A3B8"

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
      {/* Left — input form */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* BP row — special treatment */}
        <div style={{ backgroundColor:card, borderRadius:18, padding:22, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <div style={{ width:32, height:32, borderRadius:8, backgroundColor:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🩺</div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:text, margin:0 }}>Blood Pressure</p>
              <p style={{ fontSize:10, color:mute, margin:0 }}>Normal range: 90–120 / 60–80 mmHg</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:5 }}>Systolic</label>
              <input type="number" value={form.systolic_bp} onChange={e=>set("systolic_bp",+e.target.value)}
                style={{ width:"100%", backgroundColor:inner, border:`2px solid ${bdr}`, borderRadius:12, padding:"12px 14px", fontSize:20, fontWeight:800, color:text, outline:"none", textAlign:"center", boxSizing:"border-box" }}/>
            </div>
            <span style={{ fontSize:28, color:mute, fontWeight:200, marginTop:14, flexShrink:0 }}>/</span>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:5 }}>Diastolic</label>
              <input type="number" value={form.diastolic_bp} onChange={e=>set("diastolic_bp",+e.target.value)}
                style={{ width:"100%", backgroundColor:inner, border:`2px solid ${bdr}`, borderRadius:12, padding:"12px 14px", fontSize:20, fontWeight:800, color:text, outline:"none", textAlign:"center", boxSizing:"border-box" }}/>
            </div>
            <div style={{ flexShrink:0, marginTop:14 }}>
              <span style={{ fontSize:11, color:mute }}>mmHg</span>
            </div>
          </div>
        </div>

        {/* Other vitals grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {Object.entries(VITAL_RANGES).map(([key, cfg])=>(
            <div key={key} style={{ backgroundColor:card, borderRadius:16, padding:18, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
                <span style={{ fontSize:18 }}>{cfg.icon}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:text, margin:0 }}>{cfg.label}</p>
                  <p style={{ fontSize:9, color:mute, margin:0 }}>Normal: {cfg.norm}</p>
                </div>
              </div>
              <Field label="" value={form[key]} onChange={v=>set(key,v)} unit={cfg.unit} step={cfg.step} min={cfg.min} max={cfg.max} dark={dark}/>
            </div>
          ))}
        </div>

        {/* Sugar type */}
        <div style={{ backgroundColor:card, borderRadius:16, padding:18, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
          <p style={{ fontSize:11, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Sugar Reading Type</p>
          <div style={{ display:"flex", gap:8 }}>
            {["fasting","random"].map(t=>(
              <button key={t} onClick={()=>set("sugar_type",t)} style={{ flex:1, padding:"10px 0", borderRadius:12, border:`2px solid ${form.sugar_type===t?"#1B3A6B":bdr}`, backgroundColor:form.sugar_type===t?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:form.sugar_type===t?(dark?"#60A5FA":"#1B3A6B"):mute, fontSize:13, fontWeight:700, cursor:"pointer", textTransform:"capitalize" }}>
                {t==="fasting"?"🌙 Fasting":"🍽️ Post-meal"}
              </button>
            ))}
          </div>
        </div>

        {error&&<p style={{ color:"#DC2626", fontSize:12, margin:0 }}>⚠ {error}</p>}

        <button onClick={submit} disabled={loading} style={{ width:"100%", background:loading?"#94A3B8":"linear-gradient(135deg,#1B3A6B,#2952A3)", color:"#fff", border:0, borderRadius:14, padding:"15px 0", fontSize:15, fontWeight:700, cursor:loading?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 16px rgba(27,58,107,0.25)" }}>
          <RefreshCw size={16} style={{ animation:loading?"spin 1s linear infinite":"none" }}/> {loading?"Analyzing Vitals…":"Analyze & Save Vitals"}
        </button>
        {saved&&<div style={{ display:"flex", alignItems:"center", gap:8, backgroundColor:dark?"#0D2010":"#F0FDF4", borderRadius:12, padding:"10px 14px", border:`1px solid ${dark?"#14532D":"#86EFAC"}` }}>
          <CheckCircle size={16} color="#22C55E"/><span style={{ fontSize:13, color:"#16A34A", fontWeight:600 }}>Vitals saved to health history ✓</span>
        </div>}
      </div>

      {/* Right — results */}
      {result ? (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Overall status */}
          <div style={{ background:`linear-gradient(135deg,${result.overall==="optimal"?"#1B3A6B":"#DC2626"},${result.overall==="optimal"?"#2952A3":"#991B1B"})`, borderRadius:18, padding:22, color:"#fff" }}>
            <p style={{ fontSize:11, opacity:0.7, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 6px" }}>Overall Status</p>
            <p style={{ fontSize:26, fontWeight:800, margin:"0 0 6px", textTransform:"capitalize" }}>{result.overall==="optimal"?"✓ Stable & Optimal":"⚠ Attention Needed"}</p>
            {result.alerts.length>0
              ? result.alerts.map(a=><p key={a} style={{ fontSize:12, opacity:0.9, margin:"4px 0" }}>• {a}</p>)
              : <p style={{ fontSize:12, opacity:0.8, margin:0 }}>All readings within healthy ranges. Keep up the good work!</p>}
          </div>

          {/* Individual vitals */}
          {[
            { label:"Heart Rate",   key:"heart_rate",    unit:"bpm",   emoji:"❤️", value:form.heart_rate },
            { label:"Oxygen",       key:"spo2",           unit:"%",     emoji:"💨", value:form.spo2 },
            { label:"Blood Sugar",  key:"blood_sugar",   unit:"mg/dL", emoji:"🩸", value:form.blood_sugar },
            { label:"Temperature",  key:"temperature",   unit:"°F",    emoji:"🌡️", value:form.temperature_f },
          ].map(({ label, key, unit, emoji, value }) => {
            const f = result[key]; if(!f) return null
            const sc = statusColor(f.status)
            return (
              <div key={key} style={{ backgroundColor:card, borderRadius:16, padding:18, boxShadow:"0 2px 16px rgba(27,58,107,0.08)", display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:48, height:48, borderRadius:12, backgroundColor:`${sc}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:mute }}>{label}</span>
                    <StatusPill status={f.status} label={f.label}/>
                  </div>
                  <p style={{ fontSize:24, fontWeight:800, color:sc, margin:"0 0 4px" }}>{f.value} <span style={{ fontSize:12, color:mute, fontWeight:400 }}>{unit}</span></p>
                  <p style={{ fontSize:11, color:mute, margin:0, lineHeight:1.4 }}>{f.note}</p>
                </div>
              </div>
            )
          })}

          {/* Blood pressure result */}
          {result.blood_pressure&&(()=>{
            const f = result.blood_pressure; const sc = statusColor(f.status)
            return (
              <div style={{ backgroundColor:card, borderRadius:16, padding:18, boxShadow:"0 2px 16px rgba(27,58,107,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:48, height:48, borderRadius:12, backgroundColor:`${sc}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🩺</div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, color:mute, margin:0 }}>Blood Pressure</p>
                    <p style={{ fontSize:28, fontWeight:800, color:sc, margin:"2px 0" }}>{form.systolic_bp}/{form.diastolic_bp} <span style={{ fontSize:12, color:mute, fontWeight:400 }}>mmHg</span></p>
                    <p style={{ fontSize:11, color:mute, margin:0 }}>{f.note}</p>
                  </div>
                </div>
                <StatusPill status={f.status} label={f.label}/>
              </div>
            )
          })()}

          {/* Reference panel */}
          <div style={{ backgroundColor:dark?"#162032":"#F8FAFC", borderRadius:16, padding:18, border:`1px solid ${bdr}` }}>
            <p style={{ fontSize:11, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>🏥 Normal Ranges Reference</p>
            {[["Heart Rate","60–100 bpm"],["BP","90–120 / 60–80 mmHg"],["SpO2","95–100%"],["Temp","97–99°F"],["Sugar (fasting)","70–99 mg/dL"]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${bdr}` }}>
                <span style={{ fontSize:12, color:mute }}>{l}</span>
                <span style={{ fontSize:12, fontWeight:600, color:text }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor:card, borderRadius:18, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 16px rgba(27,58,107,0.08)", padding:40, gap:16 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", backgroundColor:dark?"#162032":"#F4F6FA", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Heart size={36} color={dark?"#2D3F5A":"#CBD5E1"}/>
          </div>
          <p style={{ fontSize:16, fontWeight:700, color:text }}>Ready to Analyze</p>
          <p style={{ fontSize:13, color:mute, textAlign:"center", maxWidth:240, lineHeight:1.6 }}>Fill in your vitals on the left and click Analyze to see your real-time health status.</p>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── BMI TAB ─────────────────────────────────────────────────────
function BMITab({ dark }) {
  const card  = dark?"#1E293B":"#fff"
  const bdr   = dark?"#2D3F5A":"#E5E9F2"
  const text  = dark?"#F1F5F9":"#1A1A2E"
  const mute  = dark?"#94A3B8":"#64748B"
  const inner = dark?"#0F172A":"#F8FAFC"

  const [height,setH] = useState(175)
  const [weight,setW] = useState(72)
  const [result,setR] = useState(null)
  const [load,  setL] = useState(false)
  const [saved, setS] = useState(false)

  const calc = async () => {
    setL(true); setS(false)
    try {
      const r = await calculateBMI(+height,+weight)
      setR(r.data)
      await saveBMI({ height_cm:+height, weight_kg:+weight, bmi:r.data.bmi, category:r.data.category })
      setS(true); setTimeout(()=>setS(false),3000)
    } catch {} finally { setL(false) }
  }

  const bmi  = result?.bmi || (weight/((height/100)**2)).toFixed(1)
  const cat  = result?.category || (bmi<18.5?"Underweight":bmi<25?"Normal":bmi<30?"Overweight":"Obese")
  const cc   = {Underweight:"#3B82F6",Normal:"#22C55E",Overweight:"#F59E0B",Obese:"#DC2626"}[cat]||"#94A3B8"
  const pct  = Math.min(Math.max(((+bmi-10)/35)*100,0),100)

  return (
    <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ backgroundColor:card, borderRadius:18, padding:24, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:text, marginBottom:18 }}>📏 Body Measurements</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Height" value={height} onChange={setH} unit="cm" min={100} max={250} dark={dark}/>
            <Field label="Weight" value={weight} onChange={setW} unit="kg" min={20} max={300} dark={dark}/>
          </div>
          <div style={{ backgroundColor:dark?"#1E3A5F":"#EEF2FF", borderRadius:12, padding:12, marginTop:16, marginBottom:18 }}>
            <p style={{ fontSize:11, color:dark?"#93C5FD":"#1E40AF", lineHeight:1.5, margin:0 }}>💡 Weigh yourself in the morning before eating for consistent results.</p>
          </div>
          <button onClick={calc} disabled={load} style={{ width:"100%", background:"linear-gradient(135deg,#16A34A,#15803D)", color:"#fff", border:0, borderRadius:14, padding:"14px 0", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 16px rgba(22,163,74,0.25)" }}>
            <RefreshCw size={15}/> {load?"Calculating…":"Calculate BMI"}
          </button>
          {saved&&<div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, backgroundColor:dark?"#0D2010":"#F0FDF4", borderRadius:10, padding:"9px 12px" }}>
            <CheckCircle size={14} color="#22C55E"/><span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>BMI logged to history ✓</span>
          </div>}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Big BMI display */}
        <div style={{ backgroundColor:card, borderRadius:18, padding:28, boxShadow:"0 2px 16px rgba(27,58,107,0.08)", textAlign:"center" }}>
          <div style={{ position:"relative", width:140, height:140, margin:"0 auto 20px" }}>
            <svg width={140} height={140} style={{ transform:"rotate(-90deg)" }}>
              <circle cx={70} cy={70} r={58} fill="none" stroke={dark?"#2D3F5A":"#F4F6FA"} strokeWidth={12}/>
              <circle cx={70} cy={70} r={58} fill="none" stroke={cc} strokeWidth={12} strokeLinecap="round"
                strokeDasharray={`${pct*3.644} ${364.4}`}/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:32, fontWeight:900, color:cc, lineHeight:1 }}>{(+bmi).toFixed(1)}</span>
              <span style={{ fontSize:11, color:mute }}>BMI</span>
            </div>
          </div>
          <div style={{ display:"inline-block", backgroundColor:`${cc}18`, color:cc, fontSize:15, fontWeight:700, padding:"6px 20px", borderRadius:999, marginBottom:12 }}>{cat}</div>
          {result&&<p style={{ fontSize:13, color:mute, lineHeight:1.6 }}>{result.advice}</p>}

          {/* Scale bar */}
          <div style={{ marginTop:20 }}>
            <div style={{ display:"flex", height:10, borderRadius:999, overflow:"hidden" }}>
              {[["#3B82F6",24],["#22C55E",30],["#F59E0B",22],["#DC2626",24]].map(([c,w],i)=>(
                <div key={i} style={{ width:`${w}%`, backgroundColor:c }}/>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
              {[["<18.5","Underweight"],["18.5–24.9","Normal"],["25–29.9","Overweight"],[">30","Obese"]].map(([v,l])=>(
                <div key={l} style={{ textAlign:"center" }}>
                  <p style={{ fontSize:9, color:mute, margin:0 }}>{v}</p>
                  <p style={{ fontSize:9, color:mute, margin:0 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk cards */}
        {result&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[{label:"Cardiovascular Risk",value:result.cardio_risk},{label:"Type II Diabetes Risk",value:result.diabetes_risk}].map(({label,value})=>{
            const rc = {Low:"#22C55E",Moderate:"#F59E0B",High:"#DC2626"}[value]||"#94A3B8"
            const pv = {Low:20,Moderate:55,High:90}[value]||50
            return (
              <div key={label} style={{ backgroundColor:card, borderRadius:14, padding:18, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:12, color:mute, lineHeight:1.3 }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:rc }}>{value}</span>
                </div>
                <div style={{ height:6, backgroundColor:dark?"#2D3F5A":"#F4F6FA", borderRadius:999 }}>
                  <div style={{ width:`${pv}%`, height:"100%", backgroundColor:rc, borderRadius:999 }}/>
                </div>
              </div>
            )
          })}
        </div>}
      </div>
    </div>
  )
}

// ── SLEEP TAB ────────────────────────────────────────────────────
function SleepTab({ dark }) {
  const card = dark?"#1E293B":"#fff"
  const bdr  = dark?"#2D3F5A":"#E5E9F2"
  const text = dark?"#F1F5F9":"#1A1A2E"
  const mute = dark?"#94A3B8":"#64748B"

  const [hours,   setH] = useState(7)
  const [quality, setQ] = useState("Good")
  const [saved,   setS] = useState(false)

  const QUALITIES = [
    { val:"Poor",      emoji:"😴", color:"#DC2626" },
    { val:"Fair",      emoji:"😐", color:"#F59E0B" },
    { val:"Good",      emoji:"🙂", color:"#3B82F6" },
    { val:"Excellent", emoji:"😊", color:"#22C55E" },
  ]
  const qData  = QUALITIES.find(q=>q.val===quality)||QUALITIES[2]
  const hColor = hours>=7?"#22C55E":hours>=5?"#F59E0B":"#DC2626"
  const hLabel = hours>=7?"Optimal":hours>=5?"Fair":"Insufficient"

  const STAGES = [
    { label:"Light Sleep",  pct:50, color:"#3B82F6" },
    { label:"Deep Sleep",   pct:25, color:"#6366F1" },
    { label:"REM Sleep",    pct:25, color:"#8B5CF6" },
  ]

  const doSave = async () => {
    await saveSleep({ hours, quality }).catch(()=>{})
    setS(true); setTimeout(()=>setS(false),3000)
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:20 }}>
      <div style={{ backgroundColor:card, borderRadius:18, padding:28, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:text, marginBottom:24 }}>🌙 Log Your Sleep</h3>

        {/* Hours ring */}
        <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:24 }}>
          <div style={{ position:"relative", width:100, height:100, flexShrink:0 }}>
            <svg width={100} height={100} style={{ transform:"rotate(-90deg)" }}>
              <circle cx={50} cy={50} r={42} fill="none" stroke={dark?"#2D3F5A":"#F4F6FA"} strokeWidth={10}/>
              <circle cx={50} cy={50} r={42} fill="none" stroke={hColor} strokeWidth={10} strokeLinecap="round"
                strokeDasharray={`${(hours/12)*263.9} 263.9`}/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:22, fontWeight:900, color:hColor, lineHeight:1 }}>{hours}h</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize:20, fontWeight:700, color:hColor, margin:"0 0 4px" }}>{hLabel}</p>
            <p style={{ fontSize:12, color:mute, lineHeight:1.5 }}>{hours>=7?"Great sleep! Your body is recovering well.":hours>=5?"A bit short. Aim for 7-9 hours.":"Too little. Chronic sleep loss impacts health."}</p>
          </div>
        </div>

        <label style={{ fontSize:10, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:10 }}>Hours Slept — drag to adjust</label>
        <input type="range" min={1} max={12} step={0.5} value={hours} onChange={e=>setH(+e.target.value)}
          style={{ width:"100%", accentColor:hColor, marginBottom:24, height:6 }}/>

        <label style={{ fontSize:10, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:10 }}>Sleep Quality</label>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:24 }}>
          {QUALITIES.map(q=>(
            <button key={q.val} onClick={()=>setQ(q.val)} style={{ padding:"12px 4px", borderRadius:12, border:`2px solid ${quality===q.val?q.color:bdr}`, backgroundColor:quality===q.val?`${q.color}15`:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:20 }}>{q.emoji}</span>
              <span style={{ fontSize:11, fontWeight:600, color:quality===q.val?q.color:mute }}>{q.val}</span>
            </button>
          ))}
        </div>

        <button onClick={doSave} style={{ width:"100%", background:`linear-gradient(135deg,#6366F1,#4F46E5)`, color:"#fff", border:0, borderRadius:14, padding:"14px 0", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 16px rgba(99,102,241,0.25)" }}>
          <Moon size={15}/> Log Sleep
        </button>
        {saved&&<div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, backgroundColor:dark?"#0D2010":"#F0FDF4", borderRadius:10, padding:"9px 12px" }}>
          <CheckCircle size={14} color="#22C55E"/><span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>Sleep logged ✓</span>
        </div>}
      </div>

      {/* Sleep info */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ backgroundColor:card, borderRadius:18, padding:24, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
          <p style={{ fontSize:13, fontWeight:700, color:text, marginBottom:16 }}>Sleep Architecture</p>
          {STAGES.map(s=>(
            <div key={s.label} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:12, color:mute }}>{s.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:text }}>{Math.round(hours*s.pct/100*10)/10}h ({s.pct}%)</span>
              </div>
              <div style={{ height:8, backgroundColor:dark?"#2D3F5A":"#F4F6FA", borderRadius:999 }}>
                <div style={{ width:`${s.pct}%`, height:"100%", backgroundColor:s.color, borderRadius:999 }}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor:dark?"#1E1B30":"#F5F3FF", borderRadius:16, padding:18, border:`1px solid ${dark?"#3730A3":"#DDD6FE"}` }}>
          <p style={{ fontSize:12, fontWeight:700, color:dark?"#A5B4FC":"#4338CA", marginBottom:8 }}>💜 Sleep Tips</p>
          {["Sleep and wake up at the same time daily","Avoid screens 1hr before bed","Keep room dark and cool (65-68°F)","Avoid caffeine after 2PM"].map(t=>(
            <p key={t} style={{ fontSize:12, color:dark?"#C7D2FE":"#4F46E5", marginBottom:5 }}>· {t}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── ACTIVITY TAB ─────────────────────────────────────────────────
function ActivityTab({ dark }) {
  const card = dark?"#1E293B":"#fff"
  const bdr  = dark?"#2D3F5A":"#E5E9F2"
  const text = dark?"#F1F5F9":"#1A1A2E"
  const mute = dark?"#94A3B8":"#64748B"

  const [steps,setSteps]   = useState(6200)
  const [mins,  setMins]   = useState(30)
  const [saved, setSaved]  = useState(false)

  const GOAL = 10000
  const pct  = Math.min((steps/GOAL)*100,100)
  const sc   = steps>=GOAL?"#22C55E":steps>=5000?"#F59E0B":"#DC2626"
  const cal  = Math.round(steps*0.04 + mins*5)

  const doSave = async () => {
    await saveActivity({ steps, exercise_mins:mins }).catch(()=>{})
    setSaved(true); setTimeout(()=>setSaved(false),3000)
  }

  const METRICS = [
    { label:"Steps",         value:steps.toLocaleString(),  icon:"👟", color:sc },
    { label:"Calories Burned",value:`~${cal}`,              icon:"🔥", color:"#F59E0B" },
    { label:"Exercise",      value:`${mins} min`,           icon:"💪", color:"#3B82F6" },
    { label:"Goal Progress", value:`${Math.round(pct)}%`,  icon:"🎯", color:sc },
  ]

  return (
    <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:20 }}>
      <div style={{ backgroundColor:card, borderRadius:18, padding:28, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:text, marginBottom:24 }}>⚡ Log Activity</h3>

        {/* Step ring */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
          <div style={{ position:"relative", width:140, height:140 }}>
            <svg width={140} height={140} style={{ transform:"rotate(-90deg)" }}>
              <circle cx={70} cy={70} r={58} fill="none" stroke={dark?"#2D3F5A":"#F4F6FA"} strokeWidth={12}/>
              <circle cx={70} cy={70} r={58} fill="none" stroke={sc} strokeWidth={12} strokeLinecap="round"
                strokeDasharray={`${pct*3.644} 364.4`}/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
              <span style={{ fontSize:10, color:mute, fontWeight:600, textTransform:"uppercase" }}>Steps</span>
              <span style={{ fontSize:26, fontWeight:900, color:sc, lineHeight:1 }}>{steps.toLocaleString()}</span>
              <span style={{ fontSize:10, color:mute }}>/ {GOAL.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <label style={{ fontSize:10, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>Steps Today: <strong style={{ color:text }}>{steps.toLocaleString()}</strong></label>
        <input type="range" min={0} max={20000} step={100} value={steps} onChange={e=>setSteps(+e.target.value)}
          style={{ width:"100%", accentColor:sc, marginBottom:20, height:6 }}/>

        <label style={{ fontSize:10, fontWeight:700, color:mute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>Exercise Duration: <strong style={{ color:text }}>{mins} min</strong></label>
        <input type="range" min={0} max={180} step={5} value={mins} onChange={e=>setMins(+e.target.value)}
          style={{ width:"100%", accentColor:"#3B82F6", marginBottom:24, height:6 }}/>

        <button onClick={doSave} style={{ width:"100%", background:"linear-gradient(135deg,#D97706,#B45309)", color:"#fff", border:0, borderRadius:14, padding:"14px 0", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 16px rgba(217,119,6,0.25)" }}>
          <Zap size={15}/> Log Activity
        </button>
        {saved&&<div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, backgroundColor:dark?"#0D2010":"#F0FDF4", borderRadius:10, padding:"9px 12px" }}>
          <CheckCircle size={14} color="#22C55E"/><span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>Activity logged ✓</span>
        </div>}
      </div>

      {/* Metrics grid */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {METRICS.map(m=>(
            <div key={m.label} style={{ backgroundColor:card, borderRadius:16, padding:20, boxShadow:"0 2px 16px rgba(27,58,107,0.08)", textAlign:"center" }}>
              <span style={{ fontSize:28, display:"block", marginBottom:8 }}>{m.icon}</span>
              <p style={{ fontSize:26, fontWeight:900, color:m.color, margin:"0 0 4px" }}>{m.value}</p>
              <p style={{ fontSize:11, color:mute, margin:0 }}>{m.label}</p>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor:card, borderRadius:16, padding:20, boxShadow:"0 2px 16px rgba(27,58,107,0.08)" }}>
          <p style={{ fontSize:13, fontWeight:700, color:text, marginBottom:14 }}>Activity Benchmarks</p>
          {[["Sedentary","<5,000 steps","#DC2626"],[" Lightly Active","5,000–7,499","#F59E0B"],["Active","7,500–9,999","#3B82F6"],["Very Active","10,000+","#22C55E"]].map(([l,r,c])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${bdr}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", backgroundColor:c, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:mute }}>{l}</span>
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:text }}>{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── MAIN ────────────────────────────────────────────────────────
export default function Tracking() {
  const { theme } = useApp()
  const dark      = theme === "dark"
  const location  = useLocation()
  const [tab, setTab] = useState(location.state?.tab || "vitals")

  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"
  const surface  = dark?"#1E293B":"#fff"

  const activeTab = TABS.find(t=>t.id===tab)

  return (
    <div style={{ maxWidth:1100, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:textMain, marginBottom:4 }}>Health Tracking</h1>
        <p style={{ fontSize:13, color:textMute }}>Monitor your vitals, BMI, sleep, and activity. Everything saves to your health history automatically.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:10, marginBottom:28 }}>
        {TABS.map(({ id, icon:Icon, label, color })=>{
          const active = tab===id
          return (
            <button key={id} onClick={()=>setTab(id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 22px", borderRadius:14, border:"none", backgroundColor:active?color:(dark?"#1E293B":"#fff"), color:active?"#fff":(dark?"#94A3B8":"#64748B"), fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:active?`0 4px 16px ${color}44`:"0 2px 12px rgba(27,58,107,0.06)", transform:active?"translateY(-1px)":"none", transition:"all 0.2s" }}>
              <Icon size={17}/>
              {label}
              {active&&<span style={{ width:6, height:6, borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.6)" }}/>}
            </button>
          )
        })}
      </div>

      {tab==="vitals"   && <VitalsTab   dark={dark}/>}
      {tab==="bmi"      && <BMITab      dark={dark}/>}
      {tab==="sleep"    && <SleepTab    dark={dark}/>}
      {tab==="activity" && <ActivityTab dark={dark}/>}
    </div>
  )
}