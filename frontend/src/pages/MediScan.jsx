// MediMate/frontend/src/pages/MediScan.jsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { matchSymptoms, getDiseaseProfile, saveMediScan } from "../api/index"
import { Scan, ChevronDown, ChevronUp, MessageSquare, UserCheck, AlertTriangle, X, CheckCircle } from "lucide-react"

const QUICK_TAGS = ["Headache","Fever","Cough","Fatigue","Nausea","Vomiting","Dizziness","Chest Pain","Sore Throat","Body Ache","Breathlessness","Rash","Diarrhea","Chills","Weakness"]
const DURATIONS  = ["Today","1–3 Days","3–7 Days","1–2 Weeks","2+ Weeks"]
const CONF_COLOR = c => c>=70?"#22C55E":c>=40?"#F59E0B":"#EF4444"
const CONF_LABEL = c => c>=70?"High Match":c>=40?"Possible":"Rule Out"

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

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  const toggleTag = t => setTags(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t])

  const buildSymptoms = () => {
    const fromText = text.toLowerCase().split(/[\s,;.]+/).filter(w=>w.length>3)
    return [...new Set([...tags.map(t=>t.toLowerCase()),...fromText])]
  }

  const analyze = async () => {
    const symptoms = buildSymptoms()
    if(!symptoms.length){setError("Please describe your symptoms or select at least one tag.");return}
    setError(""); setLoading(true); setResults(null); setExpanded(null); setSaved(false)
    try {
      const r = await matchSymptoms(symptoms, 8)
      setResults(r.data)
      // Auto-save to history
      await saveMediScan({
        symptoms_text:  text,
        symptom_tags:   tags,
        severity,
        duration,
        top_conditions: r.data.results?.slice(0,3).map(x=>({ disease:x.disease, matched_count:x.matched_count, confidence:x.confidence })) || [],
        top_match:      r.data.results?.[0]?.disease || null,
      }).catch(()=>{})
      setSaved(true)
    } catch { setError("Could not reach the server. Make sure the backend is running.") }
    finally { setLoading(false) }
  }

  const toggleExpand = async disease => {
    if(expanded===disease){setExpanded(null);return}
    setExpanded(disease)
    if(!profiles[disease]){
      setProfLoad(p=>({...p,[disease]:true}))
      try { const r=await getDiseaseProfile(disease); setProfiles(p=>({...p,[disease]:r.data})) } catch {}
      finally { setProfLoad(p=>({...p,[disease]:false})) }
    }
  }

  const askAI = disease => navigate(`/assistant?q=${encodeURIComponent(`Tell me about ${disease}: symptoms, treatment, medicines, dos and don'ts.`)}`)

  return (
    <div style={{ maxWidth:960, margin:"0 auto" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <div style={{ width:40, height:40, borderRadius:12, backgroundColor:dark?"#1E3A5F":"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Scan size={20} color={dark?"#60A5FA":"#1B3A6B"}/>
          </div>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, color:textMain, margin:0 }}>MediScan</h1>
            <p style={{ fontSize:13, color:textMute, margin:0 }}>AI-Driven Diagnostic Support · <span style={{ color:dark?"#60A5FA":"#2952A3", fontWeight:500 }}>Not a substitute for professional diagnosis</span></p>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:results?"380px 1fr":"1fr", gap:20 }}>
        {/* Input */}
        <div style={{ backgroundColor:surface, borderRadius:16, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", padding:24 }}>
          <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>Describe Your Symptoms</label>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="e.g. I have a sharp pain in my upper abdomen after eating, accompanied by mild nausea..." rows={4}
            style={{ width:"100%", backgroundColor:surface2, border:`1px solid ${border}`, borderRadius:12, padding:"12px 14px", fontSize:13, color:textMain, outline:"none", resize:"vertical", fontFamily:"DM Sans,sans-serif", lineHeight:1.6 }}/>

          <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", margin:"16px 0 8px" }}>Quick Tags</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {QUICK_TAGS.map(tag=>{
              const sel=tags.includes(tag)
              return (
                <button key={tag} onClick={()=>toggleTag(tag)} style={{ padding:"5px 12px", borderRadius:999, border:`1.5px solid ${sel?(dark?"#3B82F6":"#1B3A6B"):border}`, backgroundColor:sel?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:sel?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:12, fontWeight:sel?600:400, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  {sel&&<X size={10}/>}{tag}
                </button>
              )
            })}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>Duration</label>
              <select value={duration} onChange={e=>setDuration(e.target.value)} style={{ width:"100%", backgroundColor:surface2, border:`1px solid ${border}`, borderRadius:10, padding:"10px 12px", fontSize:13, color:textMain, outline:"none", cursor:"pointer" }}>
                {DURATIONS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>
                Severity <span style={{ color:dark?"#3B82F6":"#1B3A6B", fontWeight:700 }}>{severity}/10</span>
              </label>
              <input type="range" min={1} max={10} value={severity} onChange={e=>setSeverity(+e.target.value)} style={{ width:"100%", accentColor:"#1B3A6B" }}/>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:textMute }}>Mild</span>
                <span style={{ fontSize:10, color:textMute }}>Severe</span>
              </div>
            </div>
          </div>

          {error && <p style={{ color:"#DC2626", fontSize:12, marginTop:12 }}>{error}</p>}

          <button onClick={analyze} disabled={loading} style={{ width:"100%", marginTop:20, backgroundColor:dark?"#3B82F6":"#1B3A6B", color:"#fff", border:0, borderRadius:999, padding:"13px 0", fontSize:14, fontWeight:700, cursor:loading?"wait":"pointer", opacity:loading?0.75:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Scan size={16}/>{loading?"Analyzing...":"Analyze Symptoms"}
          </button>

          {saved && (
            <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:6, backgroundColor:dark?"#14532d20":"#F0FDF4", borderRadius:10, padding:"8px 12px" }}>
              <CheckCircle size={14} color="#22C55E"/>
              <span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>Analysis saved to your health history</span>
            </div>
          )}

          {results && <p style={{ fontSize:11, color:textMute, textAlign:"center", marginTop:10 }}>Model confidence based on symptom overlap · Not a final medical diagnosis.</p>}
        </div>

        {/* Results */}
        {results && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:textMain }}>
                Possible Conditions <span style={{ color:textMute, fontWeight:400, fontSize:13 }}>· {results.total_matches} matches found</span>
              </h2>
            </div>

            {results.results.map((item,idx)=>{
              const conf=item.confidence, isExp=expanded===item.disease
              const prof=profiles[item.disease], pLoad=profLoad[item.disease]
              const color=CONF_COLOR(conf), isPrimary=idx===0
              return (
                <div key={item.disease} style={{ backgroundColor:surface, borderRadius:14, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", border:`1.5px solid ${isPrimary?(dark?"#3B82F6":"#1B3A6B"):border}`, overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <h3 style={{ fontSize:15, fontWeight:700, color:textMain }}>{item.disease}</h3>
                        {isPrimary&&<span style={{ fontSize:10, fontWeight:700, backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", padding:"2px 8px", borderRadius:999 }}>PRIMARY MATCH</span>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:12, color:textMute }}>Symptom overlap:</span>
                        <div style={{ flex:1, maxWidth:120, height:5, backgroundColor:dark?"#2D3F5A":"#F4F6FA", borderRadius:999 }}>
                          <div style={{ width:`${Math.min(conf,100)}%`, height:"100%", backgroundColor:color, borderRadius:999 }}/>
                        </div>
                        <span style={{ fontSize:13, fontWeight:700, color }}>{conf}%</span>
                        <span style={{ fontSize:11, backgroundColor:`${color}20`, color, padding:"2px 8px", borderRadius:999, fontWeight:600 }}>{CONF_LABEL(conf)}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>askAI(item.disease)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:999, border:0, backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        <MessageSquare size={13}/> Ask AI
                      </button>
                      <button onClick={()=>toggleExpand(item.disease)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:999, border:`1px solid ${border}`, backgroundColor:"transparent", color:textMute, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        {isExp?<ChevronUp size={13}/>:<ChevronDown size={13}/>}{isExp?"Less":"More Info"}
                      </button>
                    </div>
                  </div>

                  {isExp && (
                    <div style={{ borderTop:`1px solid ${border}`, padding:"16px 20px", backgroundColor:dark?"#162032":"#FAFBFD" }}>
                      {pLoad?<p style={{ color:textMute, fontSize:13 }}>Loading details...</p>
                      :prof?(
                        <div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:12 }}>
                            {[{title:"Symptoms",icon:"🩺",items:prof.symptoms?.slice(0,5)},{title:"Medicines (OTC)",icon:"💊",items:prof.medicines?.slice(0,4)},{title:"Precautions",icon:"🛡️",items:prof.precautions?.slice(0,4)}].map(({title,icon,items})=>(
                              <div key={title}>
                                <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{icon} {title}</p>
                                {items?.length>0?items.map(it=>(
                                  <div key={it} style={{ display:"flex", gap:6, alignItems:"flex-start", marginBottom:5 }}>
                                    <span style={{ color:"#22C55E", fontWeight:700, flexShrink:0, marginTop:1 }}>·</span>
                                    <span style={{ fontSize:12, color:textMain, lineHeight:1.4, textTransform:"capitalize" }}>{it}</span>
                                  </div>
                                )):<p style={{ fontSize:12, color:textMute }}>No data available</p>}
                              </div>
                            ))}
                          </div>
                          {prof.risk_factors?.length>0&&(
                            <div style={{ padding:"10px 14px", backgroundColor:dark?"#1a2540":"#FFF7ED", borderRadius:10, border:`1px solid ${dark?"#2D3F5A":"#FED7AA"}` }}>
                              <p style={{ fontSize:11, fontWeight:700, color:"#C2410C", marginBottom:4 }}>⚠ Risk Factors</p>
                              <p style={{ fontSize:12, color:dark?"#FDA35A":"#9A3412" }}>{prof.risk_factors.join(" · ")}</p>
                            </div>
                          )}
                        </div>
                      ):<p style={{ color:textMute, fontSize:13 }}>Could not load details. Try "Ask AI" instead.</p>}
                    </div>
                  )}
                </div>
              )
            })}

            {/* When to see doctor */}
            <div style={{ backgroundColor:surface, borderRadius:14, padding:20, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", border:`1px solid ${dark?"#5B2020":"#FECACA"}` }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
                <AlertTriangle size={18} color="#DC2626" style={{ flexShrink:0, marginTop:1 }}/>
                <div>
                  <h3 style={{ fontSize:14, fontWeight:700, color:"#DC2626", marginBottom:4 }}>When to See a Doctor</h3>
                  <p style={{ fontSize:12, color:textMute }}>Seek immediate attention if you experience:</p>
                </div>
              </div>
              {["Sudden, severe pain or difficulty breathing","High fever (above 103°F) lasting more than 3 days","Confusion, chest tightness, or loss of consciousness","Symptoms worsening despite home treatment"].map(s=>(
                <div key={s} style={{ display:"flex", gap:8, marginBottom:6 }}>
                  <span style={{ color:"#DC2626", flexShrink:0 }}>●</span>
                  <span style={{ fontSize:12, color:textMain }}>{s}</span>
                </div>
              ))}
              <div style={{ display:"flex", gap:10, marginTop:16 }}>
                <button onClick={()=>navigate("/emergency")} style={{ flex:1, backgroundColor:"#DC2626", color:"#fff", border:0, borderRadius:999, padding:"10px 0", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <AlertTriangle size={14}/> Emergency
                </button>
                <button onClick={()=>navigate("/find-doctor")} style={{ flex:1, backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", border:0, borderRadius:999, padding:"10px 0", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <UserCheck size={14}/> Find a Doctor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}