// MediMate/frontend/src/pages/Insights.jsx
// Recharts for proper charts + real data + health score + confidence + risk engine
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { getHistory, predictHeartRisk, getProfile, getMediScanHistory } from "../api/index"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Heart, RefreshCw, Scan } from "lucide-react"
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

// ── Health Score ────────────────────────────────────────────────
function calcHealthScore(logs, riskResult) {
  let score = 100
  const vitals = logs.filter(l=>l.type==="vitals")
  const sleep  = logs.filter(l=>l.type==="sleep")
  const act    = logs.filter(l=>l.type==="activity")
  if(vitals.length===0) score-=20
  else {
    const l=vitals[0]
    if(l.heart_rate>100||l.heart_rate<55) score-=15
    if(l.systolic_bp>140) score-=15
    if(l.spo2<95) score-=10
    if(l.blood_sugar>126) score-=10
  }
  if(sleep.length>0){
    const avg=sleep.reduce((s,l)=>s+(l.hours||0),0)/sleep.length
    if(avg<6) score-=10; else if(avg>=7&&avg<=9) score+=5
  } else score-=5
  if(act.length>0){
    const avg=act.reduce((s,l)=>s+(l.steps||0),0)/act.length
    if(avg>8000) score+=5; else if(avg<3000) score-=5
  }
  if(riskResult){
    if(riskResult.risk_level==="High") score-=20
    else if(riskResult.risk_level==="Moderate") score-=8
    else score+=3
  }
  return Math.max(0,Math.min(100,Math.round(score)))
}

function scoreMeta(s){
  if(s>=85) return {label:"Excellent",color:"#22C55E"}
  if(s>=70) return {label:"Good",     color:"#3B82F6"}
  if(s>=50) return {label:"Fair",     color:"#F59E0B"}
  return          {label:"Poor",      color:"#DC2626"}
}

// ── Confidence badge ────────────────────────────────────────────
function ConfidenceBadge({logs,dark}){
  const v=logs.filter(l=>l.type==="vitals").length
  const b=logs.filter(l=>l.type==="bmi").length
  const s=logs.filter(l=>l.type==="sleep").length
  const a=logs.filter(l=>l.type==="activity").length
  const total=Math.min(v,5)+Math.min(b,2)+Math.min(s,3)+Math.min(a,3)
  const pct=Math.round((total/13)*100)
  const color=pct>=80?"#22C55E":pct>=50?"#F59E0B":"#DC2626"
  const label=pct>=80?"High":pct>=50?"Moderate":"Low"
  const textMute=dark?"#94A3B8":"#64748B"
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:textMute,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Prediction Confidence</span>
        <span style={{fontSize:12,fontWeight:700,color,backgroundColor:`${color}18`,padding:"2px 10px",borderRadius:999}}>{label} ({pct}%)</span>
      </div>
      <div style={{height:6,backgroundColor:dark?"#2D3F5A":"#E5E9F2",borderRadius:999}}>
        <div style={{width:`${pct}%`,height:"100%",backgroundColor:color,borderRadius:999,transition:"width 1s ease"}}/>
      </div>
      <p style={{fontSize:11,color:textMute,lineHeight:1.4}}>
        Based on {v} vitals, {b} BMI, {s} sleep, {a} activity logs.
        {pct<50?" Log more data for higher confidence.":""}
      </p>
    </div>
  )
}

// ── Custom tooltip ──────────────────────────────────────────────
function ChartTooltip({active,payload,label,unit,dark}){
  if(!active||!payload?.length) return null
  const surface=dark?"#1E293B":"#fff", border=dark?"#2D3F5A":"#E5E9F2", textMain=dark?"#F1F5F9":"#1A1A2E"
  return (
    <div style={{backgroundColor:surface,border:`1px solid ${border}`,borderRadius:8,padding:"8px 12px",boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
      <p style={{fontSize:11,color:dark?"#94A3B8":"#64748B",marginBottom:2}}>{label}</p>
      <p style={{fontSize:14,fontWeight:700,color:textMain}}>{payload[0].value} {unit}</p>
    </div>
  )
}

const TYPE_ICON  = {vitals:"❤️",bmi:"⚖️",sleep:"🌙",activity:"⚡",mediscan:"🩺"}
const TYPE_LABEL = {vitals:"Vitals Check",bmi:"BMI Update",sleep:"Sleep Log",activity:"Activity Log",mediscan:"MediScan"}

export default function Insights() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const navigate = useNavigate()

  const [logs,        setLogs]        = useState([])
  const [scanHistory, setScanHistory] = useState([])
  const [riskResult,  setRiskResult]  = useState(null)
  const [riskLoad,    setRiskLoad]    = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState("All")

  const glass    = dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)"
  const surface2 = dark ? "rgba(255,255,255,0.025)" : "rgba(27,58,107,0.04)"
  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const textMain = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute = dark ? "#64748B" : "#8899B4"

  useEffect(()=>{ fetchAll() },[])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [hist, scans] = await Promise.all([getHistory(50), getMediScanHistory(10)])
      setLogs(hist.data.logs||[])
      setScanHistory(scans.data.history||[])
    } catch {}
    finally { setLoading(false) }
  }

  const runRiskEngine = async () => {
    setRiskLoad(true)
    try {
      const prof = await getProfile()
      const p = prof.data
      const vLogs = logs.filter(l=>l.type==="vitals")
      const latest = vLogs[0]||{}
      const payload = {
        age:p.age||35, gender:p.sex||"male",
        systolic_bp:latest.systolic_bp||120, diastolic_bp:latest.diastolic_bp||80,
        heart_rate:latest.heart_rate||72, blood_sugar:latest.blood_sugar||95,
        bmi:p.height_cm&&p.weight_kg?parseFloat((p.weight_kg/((p.height_cm/100)**2)).toFixed(1)):undefined,
        smoking:false, activity_level:"moderate", diabetes:false, family_history:false,
      }
      const r = await predictHeartRisk(payload)
      setRiskResult(r.data)
    } catch {}
    finally { setRiskLoad(false) }
  }

  const vitalsLogs = logs.filter(l=>l.type==="vitals")
  const bmiLogs    = logs.filter(l=>l.type==="bmi")
  const sleepLogs  = logs.filter(l=>l.type==="sleep")
  const actLogs    = logs.filter(l=>l.type==="activity")

  const last = (arr,k) => arr.length?arr[0]?.[k]:null
  const prev = (arr,k) => arr.length>1?arr[1]?.[k]:null
  const avg  = (arr,k) => arr.length?arr.reduce((s,x)=>s+(x[k]||0),0)/arr.length:null

  // Build chart data — oldest first, labeled by date
  const chartData = (arr, key) => arr.slice(0,7).reverse().map(l=>({
    date: l.logged_at?new Date(l.logged_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"",
    value: l[key]||0,
  }))

  const CHARTS = [
    { label:"Heart Rate",  unit:"bpm",  data:chartData(vitalsLogs,"heart_rate"),  color:"#EF4444", latest:last(vitalsLogs,"heart_rate"),  prev:prev(vitalsLogs,"heart_rate")  },
    { label:"Systolic BP", unit:"mmHg", data:chartData(vitalsLogs,"systolic_bp"), color:"#F59E0B", latest:last(vitalsLogs,"systolic_bp"), prev:prev(vitalsLogs,"systolic_bp") },
    { label:"SpO2",        unit:"%",    data:chartData(vitalsLogs,"spo2"),         color:"#3B82F6", latest:last(vitalsLogs,"spo2"),         prev:prev(vitalsLogs,"spo2")         },
    { label:"Blood Sugar", unit:"mg/dL",data:chartData(vitalsLogs,"blood_sugar"), color:"#8B5CF6", latest:last(vitalsLogs,"blood_sugar"),  prev:prev(vitalsLogs,"blood_sugar")  },
    { label:"BMI",         unit:"",     data:chartData(bmiLogs,"bmi"),            color:"#22C55E", latest:last(bmiLogs,"bmi"),             prev:prev(bmiLogs,"bmi")            },
    { label:"Sleep",       unit:"hrs",  data:chartData(sleepLogs,"hours"),        color:"#6366F1", latest:last(sleepLogs,"hours"),         prev:prev(sleepLogs,"hours")        },
  ]

  const healthScore = calcHealthScore(logs, riskResult)
  const { label:scoreLabel, color:scoreColor } = scoreMeta(healthScore)

  const FILTERS = ["All","Vitals","BMI","Sleep","Activity","MediScan"]
  const allLogsWithScans = [
    ...logs,
    ...scanHistory.map(s=>({...s, type:"mediscan"}))
  ].sort((a,b)=>new Date(b.logged_at)-new Date(a.logged_at))

  const filteredLogs = filter==="All"?allLogsWithScans
    :filter==="MediScan"?allLogsWithScans.filter(l=>l.type==="mediscan")
    :allLogsWithScans.filter(l=>l.type===filter.toLowerCase())

  const groupByDate = arr => {
    const g={}
    arr.forEach(l=>{
      const d=l.logged_at?new Date(l.logged_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Unknown"
      if(!g[d])g[d]=[]
      g[d].push(l)
    })
    return g
  }
  const grouped = groupByDate(filteredLogs)
  const rc = riskResult?.risk_color||"#22C55E"

  const logDetail = log => {
    if(log.type==="vitals")   return `HR ${log.heart_rate} bpm · BP ${log.systolic_bp}/${log.diastolic_bp} · SpO2 ${log.spo2}%`
    if(log.type==="bmi")      return `BMI ${log.bmi} · ${log.category}`
    if(log.type==="sleep")    return `${log.hours}h · ${log.quality}`
    if(log.type==="activity") return `${log.steps?.toLocaleString()} steps · ${log.exercise_mins} min`
    if(log.type==="mediscan") return `${log.symptom_tags?.join(", ")||log.symptoms_text?.slice(0,40)||"symptom check"} · Top: ${log.top_match||"—"}`
    return ""
  }
  const logStatus = log => {
    if(log.type==="mediscan") return {color:"#8B5CF6",bg:"#F5F3FF",dbg:"#1e0f3020",label:"Scanned"}
    if(log.overall==="optimal"||log.category==="Normal"||log.quality==="Good"||log.quality==="Excellent")
      return {color:"#22C55E",bg:"#F0FDF4",dbg:"#14532d20",label:"Stable"}
    if(log.overall==="critical") return {color:"#DC2626",bg:"#FEF2F2",dbg:"#5b202020",label:"Critical"}
    return {color:"#F59E0B",bg:"#FFFBEB",dbg:"#451a0320",label:"Elevated"}
  }

  return (
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:700,color:textMain,marginBottom:4}}>Health Insights</h1>
        <p style={{fontSize:13,color:textMute}}>Real-time trends, AI risk analysis, and your health score.</p>
      </div>

      {/* Health Score Banner */}
      <div style={{background:`linear-gradient(135deg,${scoreColor}18,${scoreColor}08)`,border:`1.5px solid ${scoreColor}44`,borderRadius:16,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
            <svg width={80} height={80} style={{transform:"rotate(-90deg)"}}>
              <circle cx={40} cy={40} r={32} fill="none" stroke={dark?"#2D3F5A":"#E5E9F2"} strokeWidth={8}/>
              <circle cx={40} cy={40} r={32} fill="none" stroke={scoreColor} strokeWidth={8} strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*32*(healthScore/100)} ${2*Math.PI*32*(1-healthScore/100)}`}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:20,fontWeight:800,color:scoreColor,lineHeight:1}}>{healthScore}</span>
              <span style={{fontSize:8,color:textMute}}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <h2 style={{fontSize:18,fontWeight:700,color:textMain,margin:0}}>Overall Health Score</h2>
              <span style={{fontSize:12,fontWeight:700,color:scoreColor,backgroundColor:`${scoreColor}18`,padding:"2px 10px",borderRadius:999}}>{scoreLabel}</span>
            </div>
            <p style={{fontSize:13,color:textMute,margin:0,maxWidth:400,lineHeight:1.5}}>
              Composite score based on your vitals, sleep, activity, and cardiovascular risk.
              {logs.length===0?" Start logging data to improve accuracy.":""}
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={fetchAll} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,border:`1px solid ${border}`,backgroundColor:"transparent",color:textMute,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <RefreshCw size={13}/> Refresh
          </button>
          <button onClick={()=>navigate("/tracking")} style={{padding:"8px 16px",borderRadius:10,border:0,backgroundColor:dark?"#3B82F6":"#1B3A6B",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            Log Data →
          </button>
        </div>
      </div>

      {/* Charts grid — Recharts */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        {CHARTS.map(({label,unit,data,color,latest,prev:prevVal})=>{
          const delta = latest&&prevVal?latest-prevVal:null
          const hasData = data.some(d=>d.value>0)
          return (
            <div key={label} style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:14,padding:18,boxShadow:"0 2px 12px rgba(27,58,107,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:600,color:textMute}}>{label}</span>
                {delta!==null&&(
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    {delta>0.5?<TrendingUp size={12} color="#F59E0B"/>:delta<-0.5?<TrendingDown size={12} color="#22C55E"/>:<Minus size={12} color="#94A3B8"/>}
                    <span style={{fontSize:10,color:textMute}}>{delta>0?"+":""}{Math.round(delta*10)/10}</span>
                  </div>
                )}
              </div>
              <div style={{marginBottom:8}}>
                <span style={{fontSize:24,fontWeight:800,color:latest?textMain:textMute}}>{latest?Math.round(latest*10)/10:"—"}</span>
                {unit&&<span style={{fontSize:11,color:textMute,marginLeft:3}}>{unit}</span>}
              </div>
              {hasData?(
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={data} margin={{top:0,right:0,bottom:0,left:0}}>
                    <defs>
                      <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${label})`} strokeWidth={2} dot={false}/>
                    <Tooltip content={props=><ChartTooltip {...props} unit={unit} dark={dark}/>}/>
                  </AreaChart>
                </ResponsiveContainer>
              ):<p style={{fontSize:11,color:textMute,fontStyle:"italic",textAlign:"center",paddingTop:10}}>No data yet</p>}
            </div>
          )
        })}
      </div>

      {/* Sleep & Activity bar charts */}
      {(sleepLogs.length>1||actLogs.length>1)&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          {sleepLogs.length>1&&(
            <div style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:14,padding:18,boxShadow:"0 2px 12px rgba(27,58,107,0.08)"}}>
              <p style={{fontSize:13,fontWeight:700,color:textMain,marginBottom:14}}>🌙 Sleep Trend (hrs)</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData(sleepLogs,"hours")} margin={{top:0,right:0,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark?"#2D3F5A":"#F4F6FA"}/>
                  <XAxis dataKey="date" tick={{fontSize:9,fill:textMute}}/>
                  <YAxis tick={{fontSize:9,fill:textMute}} domain={[0,12]}/>
                  <Tooltip content={props=><ChartTooltip {...props} unit="hrs" dark={dark}/>}/>
                  <Bar dataKey="value" fill="#6366F1" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {actLogs.length>1&&(
            <div style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:14,padding:18,boxShadow:"0 2px 12px rgba(27,58,107,0.08)"}}>
              <p style={{fontSize:13,fontWeight:700,color:textMain,marginBottom:14}}>⚡ Daily Steps</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData(actLogs,"steps")} margin={{top:0,right:0,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark?"#2D3F5A":"#F4F6FA"}/>
                  <XAxis dataKey="date" tick={{fontSize:9,fill:textMute}}/>
                  <YAxis tick={{fontSize:9,fill:textMute}}/>
                  <Tooltip content={props=><ChartTooltip {...props} unit="steps" dark={dark}/>}/>
                  <Bar dataKey="value" fill="#22C55E" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {logs.length===0&&!loading&&(
        <div style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:16,padding:40,textAlign:"center",boxShadow:"0 2px 12px rgba(27,58,107,0.08)",marginBottom:20}}>
          <p style={{fontSize:15,fontWeight:600,color:textMain,marginBottom:8}}>No data yet</p>
          <p style={{fontSize:13,color:textMute,marginBottom:16}}>Start logging your vitals, BMI, sleep and activity in Health Tracking to see trends here.</p>
          <button onClick={()=>navigate("/tracking")} style={{backgroundColor:dark?"#3B82F6":"#1B3A6B",color:"#fff",border:0,borderRadius:12,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
            Go to Health Tracking →
          </button>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
        {/* History timeline */}
        <div style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:16,padding:22,boxShadow:"0 2px 12px rgba(27,58,107,0.08)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h2 style={{fontSize:15,fontWeight:700,color:textMain}}>Activity History</h2>
            <button onClick={fetchAll} style={{background:"none",border:0,cursor:"pointer",color:textMute,display:"flex",alignItems:"center",gap:4,fontSize:12}}>
              <RefreshCw size={13}/> Refresh
            </button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:999,border:`1px solid ${filter===f?(dark?"#3B82F6":"#1B3A6B"):border}`,backgroundColor:filter===f?(dark?"#1E3A5F":"#EEF2FF"):"transparent",color:filter===f?(dark?"#60A5FA":"#1B3A6B"):textMute,fontSize:12,fontWeight:filter===f?700:400,cursor:"pointer"}}>
                {f}
              </button>
            ))}
          </div>

          {loading?<p style={{color:textMute,textAlign:"center",padding:20}}>Loading…</p>
          :Object.keys(grouped).length===0?<p style={{color:textMute,textAlign:"center",padding:20}}>No logs yet.</p>
          :Object.entries(grouped).map(([date,entries])=>(
            <div key={date} style={{marginBottom:18}}>
              <p style={{fontSize:10,fontWeight:700,color:textMute,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>{date}</p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {entries.map((log,i)=>{
                  const time=log.logged_at?new Date(log.logged_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}):""
                  const s=logStatus(log)
                  return (
                    <div key={i} style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:12,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{width:36,height:36,borderRadius:10,background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                        {TYPE_ICON[log.type]||"📋"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                          <span style={{fontSize:13,fontWeight:600,color:textMain}}>{TYPE_LABEL[log.type]||log.type}</span>
                          <span style={{fontSize:10,color:textMute,flexShrink:0,marginLeft:8}}>{time}</span>
                        </div>
                        <p style={{fontSize:11,color:textMute,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{logDetail(log)}</p>
                        <span style={{fontSize:10,fontWeight:700,backgroundColor:dark?s.dbg:s.bg,color:s.color,padding:"2px 8px",borderRadius:999,textTransform:"capitalize"}}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Risk Score Engine */}
          <div style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:16,boxShadow:"0 2px 12px rgba(27,58,107,0.08)",padding:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{fontSize:14,fontWeight:700,color:textMain,display:"flex",alignItems:"center",gap:8}}>
                <Heart size={15} color="#DC2626"/> Risk Score Engine
              </h2>
              <button onClick={runRiskEngine} disabled={riskLoad} style={{backgroundColor:dark?"#3B82F6":"#1B3A6B",color:"#fff",border:0,borderRadius:10,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                {riskLoad?<><RefreshCw size={11} style={{animation:"spin 1s linear infinite"}}/> Running…</>:"Run Analysis"}
              </button>
            </div>
            {!riskResult&&!riskLoad&&(
              <p style={{fontSize:12,color:textMute,lineHeight:1.6,marginBottom:12}}>
                Runs the Heart Risk model using your latest vitals + profile data automatically.
              </p>
            )}
            {riskLoad&&<p style={{fontSize:13,color:textMute,textAlign:"center",padding:12}}>Analysing…</p>}
            {riskResult&&(
              <>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                  <div style={{position:"relative",width:72,height:72,flexShrink:0}}>
                    <svg width={72} height={72} style={{transform:"rotate(-90deg)"}}>
                      <circle cx={36} cy={36} r={28} fill="none" stroke={dark?"#2D3F5A":"#E5E9F2"} strokeWidth={7}/>
                      <circle cx={36} cy={36} r={28} fill="none" stroke={rc} strokeWidth={7} strokeLinecap="round"
                        strokeDasharray={`${2*Math.PI*28*riskResult.probability} ${2*Math.PI*28*(1-riskResult.probability)}`}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:14,fontWeight:800,color:rc,lineHeight:1}}>{riskResult.probability_pct}%</span>
                    </div>
                  </div>
                  <div>
                    <span style={{fontSize:15,fontWeight:700,color:rc}}>{riskResult.risk_level} Risk</span>
                    <p style={{fontSize:12,color:textMute,marginTop:4,lineHeight:1.4}}>{riskResult.contributing_factors.length} factors · {riskResult.recommendations.length} recs</p>
                    <button onClick={()=>navigate("/heart-risk")} style={{marginTop:6,fontSize:11,color:dark?"#60A5FA":"#2952A3",background:"none",border:0,cursor:"pointer",padding:0,fontWeight:600}}>
                      Full analysis →
                    </button>
                  </div>
                </div>
                <div style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:10,padding:12,marginBottom:12}}>
                  <ConfidenceBadge logs={logs} dark={dark}/>
                </div>
                {riskResult.contributing_factors.slice(0,3).map((f,i)=>{
                  const fc=f.impact==="high"?"#DC2626":f.impact==="moderate"?"#F59E0B":"#22C55E"
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:`1px solid ${border}`}}>
                      <span style={{fontSize:12,color:textMain}}>{f.factor}</span>
                      <span style={{fontSize:10,fontWeight:700,color:fc,backgroundColor:`${fc}18`,padding:"2px 8px",borderRadius:999,textTransform:"uppercase"}}>{f.impact}</span>
                    </div>
                  )
                })}
                <button onClick={runRiskEngine} style={{width:"100%",marginTop:12,background:"none",border:`1px solid ${border}`,borderRadius:10,padding:"7px 0",fontSize:12,color:textMute,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <RefreshCw size={11}/> Re-run
                </button>
              </>
            )}
          </div>

          {/* This week */}
          <div style={{background:glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(27,58,107,0.08)"}}>
            <h3 style={{fontSize:14,fontWeight:700,color:textMain,marginBottom:14}}>This Week</h3>
            {[
              {label:"Vitals logged",    value:vitalsLogs.length,                                                              icon:"❤️"},
              {label:"Avg sleep",        value:avg(sleepLogs,"hours")?`${avg(sleepLogs,"hours").toFixed(1)} hrs`:"—",           icon:"🌙"},
              {label:"Steps (avg/day)",  value:avg(actLogs,"steps")?Math.round(avg(actLogs,"steps")).toLocaleString():"—",     icon:"⚡"},
              {label:"Symptom scans",    value:scanHistory.length,                                                             icon:"🩺"},
            ].map(({label,value,icon})=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderTop:`1px solid ${border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{icon}</span>
                  <span style={{fontSize:13,color:textMute}}>{label}</span>
                </div>
                <span style={{fontSize:14,fontWeight:700,color:textMain}}>{value||0}</span>
              </div>
            ))}
          </div>

          {/* AI suggestion */}
          <div style={{background:"linear-gradient(135deg,#1B3A6B,#2952A3)",borderRadius:16,padding:20,color:"#fff"}}>
            <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",opacity:0.7,marginBottom:8}}>💡 AI Suggestion</p>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:8}}>
              {riskResult?.risk_level==="High"?"Consult a cardiologist":riskResult?.risk_level==="Moderate"?"Lifestyle Improvements":"Keep it up!"}
            </h3>
            <p style={{fontSize:12,opacity:0.85,lineHeight:1.6,marginBottom:14}}>
              {riskResult?riskResult.recommendations[0]:"Log your vitals daily and run the Risk Score Engine for personalised AI health recommendations."}
            </p>
            <button onClick={()=>navigate("/assistant?q=How can I improve my overall health based on my recent vitals?")}
              style={{width:"100%",backgroundColor:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,padding:"9px 0",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Ask AI for a Health Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}