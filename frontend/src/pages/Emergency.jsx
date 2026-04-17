// MediMate/frontend/src/pages/Emergency.jsx
// Emergency numbers from user profile (set during onboarding)
import { useState, useEffect } from "react"
import { useApp } from "../context/ThemeContext"
import { AlertTriangle, Phone, MapPin, Clock, ChevronRight, Download, Settings } from "lucide-react"
import { getProfile } from "../api/index"

const EMERGENCIES = [
  { icon:"❤️", label:"Chest Pain",    color:"#DC2626", steps:["Call emergency services immediately","Sit or lie down in a comfortable position","Loosen tight clothing around chest","Do not eat or drink anything","Stay calm and breathe slowly"] },
  { icon:"💨", label:"Low Oxygen",   color:"#7C3AED", steps:["Sit upright to open airways","Use any available inhaler","Breathe slowly and deeply","Call emergency services if SpO2 drops below 90%","Move to fresh air if possible"] },
  { icon:"🩸", label:"High BP",      color:"#EA580C", steps:["Sit quietly in a calm environment","Do not exert yourself","Take prescribed medication if available","Avoid caffeine and stimulants","Seek medical help if BP is above 180/120"] },
  { icon:"😵", label:"Fainting",     color:"#6D28D9", steps:["Lay the person flat on their back","Elevate their legs slightly","Do not give food or water","Monitor breathing and pulse","Call emergency services if unconscious >1 minute"] },
  { icon:"🤕", label:"Severe Injury",color:"#B45309", steps:["Do not move if spine injury suspected","Apply pressure to bleeding wounds","Keep the person warm and calm","Call emergency services immediately","Do not remove embedded objects"] },
  { icon:"🌡️", label:"High Fever",   color:"#DC2626", steps:["Apply cool wet cloths to forehead","Ensure adequate hydration","Take paracetamol if available","Remove excess clothing","Seek care if fever exceeds 103°F / 39.4°C"] },
]

const STEPS_GENERAL = [
  { n:"01", title:"Loosen Tight Clothing", desc:"Ensure the patient can breathe easily. Undo top buttons or restrictive belts immediately." },
  { n:"02", title:"Stay Upright & Calm",   desc:"If breathing is difficult, sit upright. Take slow, deep breaths to maximize oxygen flow." },
  { n:"03", title:"Monitor Consciousness", desc:"Keep talking to the patient. Note any sudden changes in alertness for the responders." },
  { n:"04", title:"Do Not Leave Alone",    desc:"Stay with the person until emergency services arrive. Keep bystanders at a distance." },
]

// Country emergency numbers
const COUNTRY_NUMBERS = {
  "IN": { ambulance:"108", police:"100", fire:"101", label:"India" },
  "US": { ambulance:"911", police:"911", fire:"911", label:"USA" },
  "UK": { ambulance:"999", police:"999", fire:"999", label:"UK" },
  "AU": { ambulance:"000", police:"000", fire:"000", label:"Australia" },
  "CA": { ambulance:"911", police:"911", fire:"911", label:"Canada" },
  "SG": { ambulance:"995", police:"999", fire:"995", label:"Singapore" },
  "AE": { ambulance:"998", police:"999", fire:"997", label:"UAE" },
}

const STORAGE_KEY = "mm_emergency_config"

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null") } catch { return null }
}

function exportEmergencyGuide(selected, config) {
  const sel = EMERGENCIES.find(e=>e.label===selected)
  const steps = sel?.steps || STEPS_GENERAL.map(s=>s.title+": "+s.desc)
  const lines = [
    "═══════════════════════════════════════",
    "     MediMate — Emergency First Aid     ",
    "═══════════════════════════════════════",
    `Generated: ${new Date().toLocaleString()}`,
    `Emergency: ${selected || "General"}`,
    "",
    "── Emergency Numbers ───────────────────",
    `Ambulance: ${config?.ambulance || "108 (India) / 911 (USA)"}`,
    `Police:    ${config?.police    || "100 (India) / 911 (USA)"}`,
    `Doctor:    ${config?.doctorPhone || "Your primary care doctor"}`,
    `Contact:   ${config?.emergencyContact || "Emergency contact"}`,
    "",
    "── Immediate Steps ─────────────────────",
    ...steps.map((s,i)=>`${i+1}. ${s}`),
    "",
    "── DO NOT ──────────────────────────────",
    "· Leave the patient alone",
    "· Give food or water",
    "· Move if spinal injury suspected",
    "· Panic — stay calm and focused",
    "═══════════════════════════════════════",
    "This guide is for reference only.",
    "Always call emergency services first.",
  ]
  const blob = new Blob([lines.join("\n")], {type:"text/plain"})
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `MediMate_Emergency_${selected||"General"}_${new Date().toISOString().slice(0,10)}.txt`
  a.click()
}

export default function Emergency() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const [selected,   setSelected]   = useState(null)
  const [config,     setConfig]     = useState(loadConfig)
  const [showConfig, setShowConfig] = useState(false)
  const [country,    setCountry]    = useState(config?.country || "IN")
  // Editable number fields
  const [ambulance,   setAmbulance]         = useState(config?.ambulance || "108")
  const [police,      setPolice]            = useState(config?.police || "100")
  const [doctorPhone, setDoctorPhone]       = useState(config?.doctorPhone || "")
  const [doctorName,  setDoctorName]        = useState(config?.doctorName || "Dr. Smith")
  const [emergContact,setEmergContact]      = useState(config?.emergencyContact || "")

  const surface = dark?"#1E293B":"#fff"
  const surface2= dark?"#0F172A":"#F4F6FA"
  const border  = dark?"#2D3F5A":"#E5E9F2"
  const textMain= dark?"#F1F5F9":"#1A1A2E"
  const textMute= dark?"#94A3B8":"#64748B"

  useEffect(()=>{
    // Try to pre-fill from user profile
    getProfile().then(r=>{
      const p = r.data
      if(p.emergency_contact && !config?.emergencyContact) setEmergContact(p.emergency_contact)
    }).catch(()=>{})

    // Auto-detect country from browser locale
    if(!config?.country){
      const lang = navigator.language || ""
      if(lang.includes("en-IN")) setCountry("IN")
      else if(lang.includes("en-US")) setCountry("US")
      else if(lang.includes("en-GB")) setCountry("UK")
      // Default India since user is in Ghaziabad
      else setCountry("IN")
    }
  },[])

  const saveConfig = () => {
    const cfg = { country, ambulance, police, doctorPhone, doctorName, emergencyContact:emergContact }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
    setConfig(cfg)
    setShowConfig(false)
  }

  const applyCountry = (c) => {
    setCountry(c)
    const nums = COUNTRY_NUMBERS[c]
    if(nums){ setAmbulance(nums.ambulance); setPolice(nums.police) }
  }

  const sel = EMERGENCIES.find(e=>e.label===selected)
  const displayAmbulance = config?.ambulance || ambulance || "108"
  const displayDoctor    = config?.doctorName || doctorName || "Doctor"
  const displayDoctorPh  = config?.doctorPhone || doctorPhone || ""

  const inputSt = { width:"100%", backgroundColor:surface2, border:`1px solid ${border}`, borderRadius:8, padding:"8px 12px", fontSize:13, color:textMain, outline:"none", fontFamily:"DM Sans,sans-serif" }

  return (
    <div style={{ maxWidth:1000, margin:"0 auto" }}>
      {/* Config modal */}
      {showConfig && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ backgroundColor:surface, borderRadius:20, padding:28, width:420, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:textMain, marginBottom:16 }}>⚙️ Emergency Configuration</h3>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Country</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {Object.entries(COUNTRY_NUMBERS).map(([code,{label}])=>(
                  <button key={code} onClick={()=>applyCountry(code)} style={{ padding:"5px 12px", borderRadius:8, border:`1.5px solid ${country===code?"#1B3A6B":border}`, backgroundColor:country===code?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:country===code?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {[
              { label:"Ambulance Number", val:ambulance, set:setAmbulance },
              { label:"Police Number",    val:police,    set:setPolice    },
              { label:"Doctor Name",      val:doctorName,set:setDoctorName},
              { label:"Doctor Phone",     val:doctorPhone,set:setDoctorPhone},
              { label:"Emergency Contact",val:emergContact,set:setEmergContact},
            ].map(f=>(
              <div key={f.label} style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:5 }}>{f.label}</label>
                <input value={f.val} onChange={e=>f.set(e.target.value)} style={inputSt} placeholder={f.label}/>
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={saveConfig} style={{ flex:1, backgroundColor:"#1B3A6B", color:"#fff", border:0, borderRadius:10, padding:"11px 0", fontSize:14, fontWeight:700, cursor:"pointer" }}>Save</button>
              <button onClick={()=>setShowConfig(false)} style={{ flex:1, background:"none", border:`1px solid ${border}`, borderRadius:10, padding:"11px 0", fontSize:14, color:textMute, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Critical banner */}
      <div style={{ backgroundColor:"#DC2626", borderRadius:16, padding:"24px 28px", marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <AlertTriangle size={18} color="rgba(255,255,255,0.9)"/>
            <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.1em" }}>Emergency Warning</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#fff", marginBottom:6 }}>Critical Situation Detected</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.8)" }}>Please remain calm. Follow the immediate actions below or contact emergency responders immediately.</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>exportEmergencyGuide(selected, config)} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,0.3)", backgroundColor:"rgba(255,255,255,0.1)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            <Download size={14}/> Export Guide
          </button>
          <button onClick={()=>setShowConfig(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,0.3)", backgroundColor:"rgba(255,255,255,0.1)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            <Settings size={14}/> Setup Numbers
          </button>
        </div>
      </div>

      {/* Call buttons — real numbers */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:24 }}>
        <a href={`tel:${displayAmbulance}`} style={{ textDecoration:"none" }}>
          <div style={{ backgroundColor:"#DC2626", borderRadius:14, padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Phone size={18} color="#fff"/>
              </div>
              <div>
                <p style={{ fontSize:10, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>Ambulance</p>
                <p style={{ fontSize:18, fontWeight:700, color:"#fff", margin:0 }}>Call {displayAmbulance}</p>
              </div>
            </div>
            <ChevronRight size={20} color="rgba(255,255,255,0.7)"/>
          </div>
        </a>
        <a href={displayDoctorPh?`tel:${displayDoctorPh}`:"#"} style={{ textDecoration:"none" }}>
          <div style={{ backgroundColor:dark?"#1E3A5F":"#1B3A6B", borderRadius:14, padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Phone size={18} color="#fff"/>
              </div>
              <div>
                <p style={{ fontSize:10, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>Primary Care</p>
                <p style={{ fontSize:18, fontWeight:700, color:"#fff", margin:0 }}>Call {displayDoctor}</p>
                {!displayDoctorPh&&<p style={{ fontSize:10, color:"rgba(255,255,255,0.5)", margin:0 }}>Set number in ⚙️ Setup</p>}
              </div>
            </div>
            <ChevronRight size={20} color="rgba(255,255,255,0.7)"/>
          </div>
        </a>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>
        <div>
          {/* Type selector */}
          <div style={{ backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", marginBottom:20 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:16 }}>Select Current Emergency</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {EMERGENCIES.map(e=>(
                <button key={e.label} onClick={()=>setSelected(sel?.label===e.label?null:e.label)} style={{ padding:"16px 10px", borderRadius:14, border:`1.5px solid ${selected===e.label?e.color:border}`, backgroundColor:selected===e.label?`${e.color}15`:(dark?"#162032":"#F9FAFB"), cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:24 }}>{e.icon}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:selected===e.label?e.color:textMute }}>{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div style={{ backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:textMain }}>{sel?`Steps for ${sel.label}`:"Immediate Life-Saving Steps"}</h2>
              <button onClick={()=>exportEmergencyGuide(selected,config)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:`1px solid ${border}`, backgroundColor:"transparent", color:textMute, fontSize:12, cursor:"pointer" }}>
                <Download size={12}/> Export
              </button>
            </div>
            {(sel?sel.steps.map((s,i)=>({n:String(i+1).padStart(2,"0"),title:s,desc:""})):STEPS_GENERAL).map(step=>(
              <div key={step.n} style={{ display:"flex", gap:16, marginBottom:18 }}>
                <span style={{ fontSize:22, fontWeight:700, color:dark?"#2D3F5A":"#E5E9F2", flexShrink:0, lineHeight:1.2 }}>{step.n}</span>
                <div>
                  <p style={{ fontSize:14, fontWeight:600, color:sel?"#DC2626":(dark?"#60A5FA":"#1B3A6B"), marginBottom:3 }}>{step.title}</p>
                  {step.desc&&<p style={{ fontSize:13, color:textMute, lineHeight:1.5 }}>{step.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Map */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ backgroundColor:surface, borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:textMain, marginBottom:4 }}>Nearest Hospital</h3>
            <p style={{ fontSize:12, color:textMute, marginBottom:12 }}>Search for hospitals near you</p>
            {/* Static map link — no API key needed */}
            <div style={{ borderRadius:12, overflow:"hidden", marginBottom:12, height:150, backgroundColor:surface2, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
              <MapPin size={28} color={dark?"#60A5FA":"#1B3A6B"}/>
              <p style={{ fontSize:12, color:textMute, textAlign:"center", maxWidth:180 }}>Tap "Get Directions" to find the nearest hospital on Google Maps</p>
            </div>
            <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
              <button style={{ width:"100%", backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", border:0, borderRadius:10, padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:12 }}>
                <MapPin size={14}/> Find Nearest Hospital
              </button>
            </a>
            {config?.emergencyContact && (
              <div style={{ backgroundColor:surface2, borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
                <p style={{ fontSize:10, color:textMute, marginBottom:2 }}>Emergency Contact</p>
                <p style={{ fontSize:13, fontWeight:600, color:textMain }}>{config.emergencyContact}</p>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ backgroundColor:surface2, borderRadius:10, padding:"10px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <Clock size={11} color="#22C55E"/>
                  <span style={{ fontSize:10, color:textMute }}>Ambulance</span>
                </div>
                <p style={{ fontSize:15, fontWeight:700, color:"#22C55E", margin:0 }}>{displayAmbulance}</p>
              </div>
              <div style={{ backgroundColor:surface2, borderRadius:10, padding:"10px 12px" }}>
                <p style={{ fontSize:10, color:textMute, marginBottom:3 }}>Doctor</p>
                <p style={{ fontSize:12, fontWeight:600, color:textMain, margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displayDoctor}</p>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor:surface, borderRadius:14, padding:18, border:`1px solid ${dark?"#5B2020":"#FECACA"}`, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#DC2626", marginBottom:10 }}>⛔ Do NOT</p>
            {["Leave the patient alone","Give food or water","Move if spinal injury suspected","Panic — stay calm and focused"].map(s=>(
              <p key={s} style={{ fontSize:12, color:textMain, marginBottom:6 }}>● {s}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}