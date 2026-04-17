// MediMate/frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, Activity, Scale, AlertTriangle, MessageSquare, UserCheck, TrendingUp, ChevronRight, Scan } from "lucide-react"
import { useApp } from "../context/ThemeContext"
import { getHistory, getProfile, analyzeVitals } from "../api/index"

const QUICK_ACTIONS = [
  { icon:Activity,     label:"Check Symptoms",  sub:"AI symptom analysis",           to:"/mediscan",    color:"#2952A3", bg:"#EEF2FF", cta:"START ANALYSIS" },
  { icon:Heart,        label:"Check Vitals",    sub:"Log your health metrics",        to:"/tracking",    color:"#DC2626", bg:"#FEF2F2", cta:"VIEW VITALS"    },
  { icon:Scale,        label:"BMI Calculator",  sub:"Monitor body mass index",        to:"/tracking",    color:"#16A34A", bg:"#F0FDF4", cta:"CALCULATE",     bmiTab:true },
  { icon:Heart,        label:"Heart Risk",      sub:"AI cardiovascular risk",         to:"/heart-risk",  color:"#DC2626", bg:"#FEF2F2", cta:"PREDICT"        },
  { icon:MessageSquare,label:"Ask AI",          sub:"Chat with MediMate AI",          to:"/assistant",   color:"#7C3AED", bg:"#F5F3FF", cta:"CHAT NOW"       },
  { icon:UserCheck,    label:"Find Doctor",     sub:"Locate the right specialist",    to:"/find-doctor", color:"#0891B2", bg:"#ECFEFF", cta:"LOCATE"         },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { theme, user } = useApp()
  const dark = theme === "dark"

  const [recentLogs,setRecentLogs] = useState([])
  const [profile,   setProfile]    = useState(null)
  const [latestVitals, setLatestVitals] = useState(null)
  const [vitalsAnalysis, setVitalsAnalysis] = useState(null)
  const [hovered, setHovered] = useState(null)

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  useEffect(()=>{
    // Load profile for name
    getProfile().then(r=>setProfile(r.data)).catch(()=>{})
    // Load real history — use latest vitals log for dashboard display
    getHistory(10).then(r=>{
      const logs = r.data.logs || []
      setRecentLogs(logs.slice(0,4))
      const latestV = logs.find(l=>l.type==="vitals")
      if(latestV){
        setLatestVitals(latestV)
        // Run analysis on latest vitals to get status flags
        analyzeVitals({
          heart_rate:   latestV.heart_rate    || 72,
          systolic_bp:  latestV.systolic_bp   || 120,
          diastolic_bp: latestV.diastolic_bp  || 80,
          spo2:         latestV.spo2           || 98,
          blood_sugar:  latestV.blood_sugar    || 95,
          temperature_f:latestV.temperature_f  || 98.6,
          sugar_type:   latestV.sugar_type     || "fasting",
        }).then(r=>setVitalsAnalysis(r.data)).catch(()=>{})
      } else {
        // No real data yet — use default
        analyzeVitals({ heart_rate:72, systolic_bp:120, diastolic_bp:80, spo2:98, blood_sugar:95, temperature_f:98.6, sugar_type:"fasting" })
          .then(r=>setVitalsAnalysis(r.data)).catch(()=>{})
      }
    }).catch(()=>{})
  },[])

  const greeting = ()=>{ const h=new Date().getHours(); return h<12?"Good morning 👋":h<17?"Good afternoon 👋":"Good evening 👋" }
  const firstName = profile?.name?.split(" ")[0] || user?.name?.split(" ")[0] || "there"

  const handleAction = (action) => {
    if(action.bmiTab) navigate("/tracking", { state:{ tab:"bmi" } })
    else navigate(action.to)
  }

  const logIcon   = { vitals:"❤️", bmi:"⚖️", sleep:"🌙", activity:"⚡", mediscan:"🩺" }
  const logLabel  = { vitals:"Vitals Check", bmi:"BMI Update", sleep:"Sleep Log", activity:"Activity Log", mediscan:"MediScan" }
  const logDetail = log => {
    if(log.type==="vitals")   return `HR ${log.heart_rate} bpm · BP ${log.systolic_bp}/${log.diastolic_bp}`
    if(log.type==="bmi")      return `BMI ${log.bmi} · ${log.category}`
    if(log.type==="sleep")    return `${log.hours}h · ${log.quality}`
    if(log.type==="activity") return `${log.steps?.toLocaleString()} steps`
    if(log.type==="mediscan") return `Top: ${log.top_match||"—"}`
    return ""
  }
  const logStatus = log => {
    if(log.type==="mediscan") return {color:"#8B5CF6",bg:"#F5F3FF",dbg:"#1e0f3020",label:"Scanned"}
    if(log.overall==="optimal"||log.category==="Normal"||log.quality==="Good"||log.quality==="Excellent")
      return {color:"#22C55E",bg:"#F0FDF4",dbg:"#14532d20",label:"Stable"}
    if(log.overall==="critical") return {color:"#DC2626",bg:"#FEF2F2",dbg:"#5b202020",label:"Critical"}
    return {color:"#F59E0B",bg:"#FFFBEB",dbg:"#451a0320",label:"Elevated"}
  }

  // Real vitals display — from MongoDB or defaults
  const displayVitals = [
    {
      label:"Heart Rate",
      value: latestVitals ? `${latestVitals.heart_rate} bpm` : "— bpm",
      status: vitalsAnalysis?.heart_rate?.status || "normal",
      source: latestVitals ? "from last log" : "no data"
    },
    {
      label:"BP",
      value: latestVitals ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` : "—/—",
      status: vitalsAnalysis?.blood_pressure?.status || "normal",
      source: latestVitals ? "from last log" : "no data"
    },
    {
      label:"Temp",
      value: latestVitals ? `${latestVitals.temperature_f}°F` : "—°F",
      status: vitalsAnalysis?.temperature?.status || "normal",
      source: latestVitals ? "from last log" : "no data"
    },
  ]

  return (
    <div style={{ maxWidth:1100, margin:"0 auto" }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#1B3A6B 0%,#2952A3 60%,#1e4d8c 100%)", borderRadius:20, padding:"32px 36px", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", right:60, bottom:-60, width:160, height:160, borderRadius:"50%", background:"rgba(34,197,94,0.15)", pointerEvents:"none" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <p style={{ fontSize:13, opacity:0.75, marginBottom:4 }}>{greeting()}</p>
          <h1 style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>Welcome, {firstName}</h1>
          <p style={{ fontSize:14, opacity:0.8, maxWidth:380, lineHeight:1.5 }}>
            {latestVitals ? "Your last vitals look stable. Keep monitoring regularly." : "Start logging your vitals to see your health trends."}
          </p>
          <div style={{ display:"flex", gap:12, marginTop:20 }}>
            <button onClick={()=>navigate("/mediscan")} style={{ background:"#22C55E", color:"#fff", border:0, borderRadius:999, padding:"10px 22px", fontWeight:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <Scan size={14}/> Start Checkup
            </button>
            <button onClick={()=>navigate("/insights")} style={{ background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:999, padding:"10px 22px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              View Insights
            </button>
          </div>
        </div>
        {/* Real vitals pills */}
        <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:10, minWidth:220 }}>
          {displayVitals.map(v=>(
            <div key={v.label} onClick={()=>navigate("/tracking")} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"10px 16px", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
              <div>
                <span style={{ fontSize:10, opacity:0.6, display:"block" }}>{v.label}</span>
                <span style={{ fontWeight:700, fontSize:14 }}>{v.value}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:v.status==="normal"?"#22C55E":v.status==="elevated"?"#F59E0B":"#94A3B8" }}/>
                <span style={{ fontSize:9, opacity:0.5 }}>{v.source}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:textMain }}>Quick Actions</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {QUICK_ACTIONS.map(action=>{
            const { icon:Icon, label, sub, color, bg, cta } = action
            return (
              <div key={label}
                onClick={()=>handleAction(action)}
                onMouseEnter={()=>setHovered(label)}
                onMouseLeave={()=>setHovered(null)}
                style={{ background:surface, borderRadius:16, boxShadow:hovered===label?"0 8px 24px rgba(27,58,107,0.14)":"0 2px 12px rgba(27,58,107,0.08)", padding:20, cursor:"pointer", border:`1px solid ${border}`, transform:hovered===label?"translateY(-2px)":"none", transition:"all 0.2s" }}>
                <div style={{ width:40, height:40, borderRadius:12, background:dark?`${color}22`:bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Icon size={20} color={color}/>
                </div>
                <p style={{ fontWeight:600, fontSize:14, color:textMain, marginBottom:3 }}>{label}</p>
                <p style={{ fontSize:12, color:textMute, marginBottom:10 }}>{sub}</p>
                <span style={{ fontSize:11, color, fontWeight:600, display:"flex", alignItems:"center", gap:3 }}>
                  {cta} <ChevronRight size={11}/>
                </span>
              </div>
            )
          })}
          {/* Emergency card */}
          <div onClick={()=>navigate("/emergency")} onMouseEnter={()=>setHovered("em")} onMouseLeave={()=>setHovered(null)}
            style={{ background:dark?"#2D1515":"rgba(220,38,38,0.04)", borderRadius:16, border:`1px solid ${dark?"#5B2020":"rgba(220,38,38,0.15)"}`, padding:20, cursor:"pointer", transform:hovered==="em"?"translateY(-2px)":"none", transition:"all 0.2s" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"#DC2626", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <AlertTriangle size={20} color="#fff"/>
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:14, color:"#DC2626", marginBottom:3 }}>Immediate Emergency</p>
                <p style={{ fontSize:12, color:textMute, marginBottom:10 }}>Contact emergency services or find the nearest ER.</p>
                <button onClick={e=>{e.stopPropagation();navigate("/emergency")}} style={{ background:"#DC2626", color:"#fff", border:0, borderRadius:999, padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  EMERGENCY
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: History + Insights */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
        <div style={{ background:surface, borderRadius:16, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", padding:22 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:textMain }}>Recent History</h2>
            <span onClick={()=>navigate("/insights")} style={{ fontSize:12, color:"#2952A3", cursor:"pointer", fontWeight:500 }}>View All</span>
          </div>
          {recentLogs.length===0?(
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <p style={{ color:textMute, fontSize:13, marginBottom:12 }}>No health data logged yet.</p>
              <button onClick={()=>navigate("/tracking")} style={{ backgroundColor:dark?"#3B82F6":"#1B3A6B", color:"#fff", border:0, borderRadius:10, padding:"8px 20px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Start Tracking →
              </button>
            </div>
          ):(
            recentLogs.map((log,i)=>{
              const s = logStatus(log)
              const date = log.logged_at ? new Date(log.logged_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"
              return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px", gap:8, alignItems:"center", padding:"10px 0", borderTop:`1px solid ${border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:surface2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{logIcon[log.type]||"📋"}</div>
                    <div>
                      <span style={{ fontSize:13, fontWeight:500, color:textMain, display:"block" }}>{logLabel[log.type]||log.type}</span>
                      <span style={{ fontSize:11, color:textMute }}>{logDetail(log)}</span>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:textMute }}>{date}</span>
                  <span style={{ fontSize:11, fontWeight:700, backgroundColor:dark?s.dbg:s.bg, color:s.color, padding:"3px 8px", borderRadius:999, textAlign:"center" }}>{s.label}</span>
                </div>
              )
            })
          )}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"linear-gradient(135deg,#1B3A6B,#2952A3)", borderRadius:16, padding:20, color:"#fff" }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
              <TrendingUp size={14} color="#FFD700"/>
              <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", opacity:0.7 }}>AI Suggestion</span>
            </div>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Stay Consistent</h3>
            <p style={{ fontSize:12, opacity:0.8, lineHeight:1.5, marginBottom:14 }}>
              {latestVitals ? "Your last vitals were logged successfully. Log again today to track trends." : "Start by logging your vitals in Health Tracking to unlock AI health insights."}
            </p>
            <button onClick={()=>navigate("/tracking")} style={{ width:"100%", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.25)", borderRadius:10, padding:"8px 0", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {latestVitals ? "Log Today's Vitals" : "Start Tracking"}
            </button>
          </div>
          <div style={{ background:surface, borderRadius:16, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:textMain, marginBottom:6 }}>
              Quick Vitals {!latestVitals && <span style={{ fontSize:11, color:textMute, fontWeight:400 }}>— no data yet</span>}
            </h3>
            {latestVitals ? (
              displayVitals.map(v=>(
                <div key={v.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:13, color:textMute }}>{v.label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:textMain }}>{v.value}</span>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:v.status==="normal"?"#22C55E":"#F59E0B" }}/>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize:12, color:textMute, marginBottom:12 }}>Log your vitals to see them here.</p>
            )}
            <button onClick={()=>navigate("/tracking")} style={{ width:"100%", marginTop:4, background:surface2, color:dark?"#60A5FA":"#1B3A6B", border:0, borderRadius:10, padding:"8px 0", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {latestVitals ? "Update Vitals →" : "Log First Vitals →"}
            </button>
          </div>
        </div>
      </div>

      <button onClick={()=>navigate("/assistant")} style={{ position:"fixed", bottom:28, right:28, width:52, height:52, borderRadius:"50%", background:"#1B3A6B", color:"#fff", border:0, boxShadow:"0 4px 20px rgba(27,58,107,0.35)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, fontSize:24 }}>+</button>
    </div>
  )
}