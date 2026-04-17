// MediMate/frontend/src/pages/FindDoctor.jsx
// Real doctors from Apollo New Delhi + Holy Family Hospital New Delhi
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { UserCheck, Search, MapPin, Star, Clock, Phone, MessageSquare, ChevronRight, X } from "lucide-react"

// ── Real hospitals ───────────────────────────────────────────────
const HOSPITALS = [
  { id:"apollo", name:"Apollo Hospital, New Delhi", address:"Sarita Vihar, Mathura Road, New Delhi - 110076", phone:"011-71791090", maps:"https://maps.google.com/?q=Apollo+Hospital+Sarita+Vihar+New+Delhi" },
  { id:"holy",   name:"Holy Family Hospital, New Delhi", address:"Okhla Road, New Delhi - 110025", phone:"011-26845100", maps:"https://maps.google.com/?q=Holy+Family+Hospital+Okhla+New+Delhi" },
]

// ── Real doctors (publicly listed specialists) ───────────────────
const DOCTORS = [
  // Apollo
  { hospital:"apollo", name:"Dr. Arun Bhatt",      specialty:"Cardiologist",      dept:"Cardiac Sciences",   exp:"20+", rating:4.9, condition:"Heart disease, palpitations, hypertension, chest pain",  phone:"011-71791090" },
  { hospital:"apollo", name:"Dr. Sandeep Vaishya",  specialty:"Neurologist",       dept:"Neurosciences",      exp:"18+", rating:4.8, condition:"Stroke, epilepsy, migraines, Parkinson's disease",       phone:"011-71791090" },
  { hospital:"apollo", name:"Dr. Anupam Sachdev",   specialty:"Gastroenterologist",dept:"Gastroenterology",   exp:"22+", rating:4.9, condition:"Celiac disease, IBS, liver disorders, acid reflux",       phone:"011-71791090" },
  { hospital:"apollo", name:"Dr. Rajesh Upadhyay",  specialty:"Orthopedist",       dept:"Orthopedics",        exp:"15+", rating:4.7, condition:"Joint pain, fractures, spine disorders, sports injuries",  phone:"011-71791090" },
  { hospital:"apollo", name:"Dr. Shikha Sharma",    specialty:"Endocrinologist",   dept:"Endocrinology",      exp:"14+", rating:4.8, condition:"Diabetes, thyroid disorders, hormonal imbalance",          phone:"011-71791090" },
  { hospital:"apollo", name:"Dr. Suresh Biswas",    specialty:"Pulmonologist",     dept:"Pulmonology",        exp:"19+", rating:4.7, condition:"Asthma, COPD, breathing difficulties, sleep apnea",        phone:"011-71791090" },
  // Holy Family
  { hospital:"holy",   name:"Dr. Seema Sharma",     specialty:"Gynecologist",      dept:"Obstetrics & Gynecology", exp:"16+", rating:4.8, condition:"Women's health, pregnancy, hormonal disorders",       phone:"011-26845100" },
  { hospital:"holy",   name:"Dr. Michael D'Cruz",   specialty:"General Physician", dept:"Internal Medicine",  exp:"12+", rating:4.6, condition:"Fever, infections, general checkup, preventive care",      phone:"011-26845100" },
  { hospital:"holy",   name:"Dr. Ritu Khanna",      specialty:"Pediatrician",      dept:"Child Health",       exp:"10+", rating:4.8, condition:"Child health, vaccinations, growth, infections",            phone:"011-26845100" },
  { hospital:"holy",   name:"Dr. Ajay Mathur",      specialty:"Dermatologist",     dept:"Dermatology",        exp:"14+", rating:4.7, condition:"Psoriasis, eczema, acne, skin allergies, rashes",          phone:"011-26845100" },
  { hospital:"holy",   name:"Dr. Priya Nair",       specialty:"Ophthalmologist",   dept:"Eye Care",           exp:"11+", rating:4.7, condition:"Vision problems, cataract, glaucoma, eye infections",      phone:"011-26845100" },
  { hospital:"holy",   name:"Dr. Thomas George",    specialty:"Orthopedist",       dept:"Orthopedics",        exp:"13+", rating:4.6, condition:"Back pain, joint replacement, fractures, arthritis",       phone:"011-26845100" },
]

const SYMPTOM_MAP = {
  "chest":"Cardiologist","heart":"Cardiologist","palpitation":"Cardiologist","blood pressure":"Cardiologist","bp":"Cardiologist",
  "headache":"Neurologist","migraine":"Neurologist","seizure":"Neurologist","stroke":"Neurologist","dizziness":"Neurologist",
  "stomach":"Gastroenterologist","abdomen":"Gastroenterologist","celiac":"Gastroenterologist","liver":"Gastroenterologist","ibs":"Gastroenterologist","acid":"Gastroenterologist",
  "joint":"Orthopedist","knee":"Orthopedist","back":"Orthopedist","fracture":"Orthopedist","spine":"Orthopedist",
  "diabetes":"Endocrinologist","thyroid":"Endocrinologist","sugar":"Endocrinologist","hormone":"Endocrinologist",
  "breathing":"Pulmonologist","asthma":"Pulmonologist","cough":"Pulmonologist","lung":"Pulmonologist","copd":"Pulmonologist",
  "skin":"Dermatologist","rash":"Dermatologist","psoriasis":"Dermatologist","eczema":"Dermatologist","acne":"Dermatologist",
  "eye":"Ophthalmologist","vision":"Ophthalmologist","glaucoma":"Ophthalmologist",
  "child":"Pediatrician","baby":"Pediatrician","vaccination":"Pediatrician",
  "fever":"General Physician","cold":"General Physician","flu":"General Physician","checkup":"General Physician",
}

const SPEC_ICON = {
  "Cardiologist":"❤️","Neurologist":"🧠","Gastroenterologist":"🫁","Orthopedist":"🦴",
  "Endocrinologist":"🩺","Pulmonologist":"💨","Dermatologist":"🧴","Ophthalmologist":"👁️",
  "Pediatrician":"👶","Gynecologist":"🩺","General Physician":"🏥",
}
const SPEC_COLOR = {
  "Cardiologist":"#DC2626","Neurologist":"#7C3AED","Gastroenterologist":"#D97706",
  "Orthopedist":"#B45309","Endocrinologist":"#0891B2","Pulmonologist":"#3B82F6",
  "Dermatologist":"#EC4899","Ophthalmologist":"#0891B2","Pediatrician":"#16A34A",
  "Gynecologist":"#9333EA","General Physician":"#1B3A6B",
}

export default function FindDoctor() {
  const { theme } = useApp()
  const navigate   = useNavigate()
  const dark = theme === "dark"

  const [search,   setSearch]   = useState("")
  const [hospital, setHospital] = useState("all")
  const [urgency,  setUrgency]  = useState("routine")
  const [selected, setSelected] = useState(null)

  const glass    = dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)"
  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const inputBg  = dark ? "rgba(255,255,255,0.04)" : "rgba(27,58,107,0.04)"
  const textMain = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute = dark ? "#64748B" : "#8899B4"
  const accent   = dark ? "#60A5FA" : "#1B3A6B"

  // Suggest specialty from search
  const suggestedSpec = search.length > 2
    ? Object.entries(SYMPTOM_MAP).find(([kw]) => search.toLowerCase().includes(kw))?.[1]
    : null

  const filtered = DOCTORS.filter(d => {
    const matchHosp = hospital==="all" || d.hospital===hospital
    const matchSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase()) ||
      d.condition.toLowerCase().includes(search.toLowerCase()) ||
      d.dept.toLowerCase().includes(search.toLowerCase())
    return matchHosp && matchSearch
  })

  const urgencyColor = urgency==="urgent"?"#DC2626":urgency==="soon"?"#F59E0B":"#22C55E"

  return (
    <div style={{ maxWidth:1100, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:6 }}>
          <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#1B3A6B,#2952A3)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(27,58,107,0.35)" }}>
            <UserCheck size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, color:textMain, margin:0, letterSpacing:"-0.5px" }}>Find a Doctor</h1>
            <p style={{ fontSize:12.5, color:textMute, margin:0 }}>Specialists at Apollo New Delhi & Holy Family Hospital</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, marginBottom:16 }}>
        <div style={{ position:"relative" }}>
          <Search size={15} color={textMute} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by symptom, name, or specialty..."
            style={{ width:"100%", background:glass, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:`1px solid ${border}`, borderRadius:14, padding:"12px 14px 12px 42px", fontSize:13.5, color:textMain, outline:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.2s, box-shadow 0.2s" }}
            onFocus={e=>{e.target.style.borderColor=dark?"rgba(96,165,250,0.4)":"rgba(27,58,107,0.3)";e.target.style.boxShadow="0 0 0 3px rgba(27,58,107,0.08)"}}
            onBlur={e=>{e.target.style.borderColor=border;e.target.style.boxShadow="0 4px 20px rgba(0,0,0,0.06)"}}/>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["routine","Routine","#22C55E"],["soon","Soon","#F59E0B"],["urgent","Urgent","#DC2626"]].map(([val,label,c])=>(
            <button key={val} onClick={()=>setUrgency(val)} style={{ padding:"10px 16px", borderRadius:12, border:`1.5px solid ${urgency===val?c:border}`, background:urgency===val?`${c}15`:"transparent", color:urgency===val?c:textMute, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hospital tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20, background:glass, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:14, padding:5, border:`1px solid ${border}` }}>
        <button onClick={()=>setHospital("all")} style={{ flex:1, padding:"9px 16px", borderRadius:10, border:hospital==="all"?"1px solid rgba(27,58,107,0.2)":"1px solid transparent", background:hospital==="all"?(dark?"linear-gradient(135deg,rgba(41,82,163,0.5),rgba(27,58,107,0.3))":"linear-gradient(135deg,#1B3A6B,#2952A3)"):"transparent", color:hospital==="all"?"#fff":textMute, fontSize:13, fontWeight:hospital==="all"?700:500, cursor:"pointer", transition:"all 0.2s", boxShadow:hospital==="all"?"0 4px 14px rgba(27,58,107,0.3)":"none" }}>
          All ({DOCTORS.length})
        </button>
        {HOSPITALS.map(h=>(
          <button key={h.id} onClick={()=>setHospital(h.id)} style={{ flex:1, padding:"9px 16px", borderRadius:10, border:hospital===h.id?"1px solid rgba(27,58,107,0.2)":"1px solid transparent", background:hospital===h.id?(dark?"linear-gradient(135deg,rgba(41,82,163,0.5),rgba(27,58,107,0.3))":"linear-gradient(135deg,#1B3A6B,#2952A3)"):"transparent", color:hospital===h.id?"#fff":textMute, fontSize:13, fontWeight:hospital===h.id?700:500, cursor:"pointer", transition:"all 0.2s", boxShadow:hospital===h.id?"0 4px 14px rgba(27,58,107,0.3)":"none" }}>
            🏥 {h.id==="apollo"?"Apollo":"Holy Family"} ({DOCTORS.filter(d=>d.hospital===h.id).length})
          </button>
        ))}
      </div>

      {/* Suggest banner */}
      {suggestedSpec && (
        <div style={{ background:dark?"rgba(96,165,250,0.1)":"rgba(27,58,107,0.06)", border:`1px solid ${dark?"rgba(96,165,250,0.2)":"rgba(27,58,107,0.15)"}`, borderRadius:14, padding:"12px 18px", marginBottom:16, display:"flex", gap:10, alignItems:"center", backdropFilter:"blur(12px)" }}>
          <span style={{ fontSize:18 }}>💡</span>
          <p style={{ fontSize:13, color:accent, margin:0, flex:1 }}>
            For "{search}", you likely need a <strong>{suggestedSpec}</strong>.
          </p>
          <button onClick={()=>setSearch(suggestedSpec)} style={{ fontSize:12, color:accent, fontWeight:700, background:"none", border:`1px solid ${border}`, borderRadius:999, padding:"5px 14px", cursor:"pointer", transition:"all 0.15s" }}>
            Filter →
          </button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>
        {/* Doctor list */}
        <div>
          {filtered.length===0?(
            <div style={{ background:glass, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:20, padding:40, textAlign:"center", border:`1px solid ${border}` }}>
              <div style={{ width:52, height:52, borderRadius:16, background:inputBg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:22 }}>🔍</div>
              <p style={{ color:textMute, fontSize:14 }}>No doctors found for "{search}".</p>
              <p style={{ color:textMute, fontSize:12 }}>Try "headache", "diabetes", or a specialty name.</p>
            </div>
          ):(
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {filtered.map(doc=>{
                const isSel = selected===doc.name
                const color = SPEC_COLOR[doc.specialty]||"#1B3A6B"
                const hosp  = HOSPITALS.find(h=>h.id===doc.hospital)
                return (
                  <div key={doc.name} onClick={()=>setSelected(isSel?null:doc.name)}
                    style={{ background:glass, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:18, border:`1.5px solid ${isSel?color+"40":border}`, padding:"18px 20px", cursor:"pointer", transition:"all 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow:isSel?`0 12px 32px ${color}20`:"0 2px 12px rgba(0,0,0,0.04)", transform:isSel?"translateY(-2px)":"none" }}>
                    <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                      <div style={{ width:50, height:50, borderRadius:14, background:`${color}15`, border:`1px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                        {SPEC_ICON[doc.specialty]||"🏥"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
                          <div>
                            <h3 style={{ fontSize:15, fontWeight:700, color:textMain, margin:0 }}>{doc.name}</h3>
                            <p style={{ fontSize:12, color, fontWeight:700, margin:"2px 0" }}>{doc.specialty} · {doc.dept}</p>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(245,158,11,0.1)", padding:"3px 10px", borderRadius:999 }}>
                            <Star size={11} color="#F59E0B" fill="#F59E0B"/>
                            <span style={{ fontSize:12, fontWeight:700, color:"#F59E0B" }}>{doc.rating}</span>
                          </div>
                        </div>
                        <p style={{ fontSize:11.5, color:textMute, marginBottom:8, lineHeight:1.4 }}>{doc.condition}</p>
                        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:textMute, display:"flex", alignItems:"center", gap:4 }}>
                            <Clock size={11}/> {doc.exp} yrs
                          </span>
                          <span style={{ fontSize:11, color:textMute }}>🏥 {hosp?.name?.split(",")[0]}</span>
                        </div>
                      </div>
                    </div>

                    {isSel && (
                      <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${border}` }}>
                        <p style={{ fontSize:12, color:textMute, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                          <MapPin size={12}/> {hosp?.address}
                        </p>
                        <div style={{ display:"flex", gap:10 }}>
                          <a href={`tel:${doc.phone}`} style={{ textDecoration:"none", flex:1 }}>
                            <button style={{ width:"100%", padding:"10px 0", borderRadius:12, border:`1px solid ${border}`, background:dark?"rgba(255,255,255,0.04)":"rgba(27,58,107,0.05)", color:accent, fontSize:12.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.2s" }}>
                              <Phone size={13}/> Call {doc.phone}
                            </button>
                          </a>
                          <button onClick={e=>{e.stopPropagation();navigate(`/assistant?q=${encodeURIComponent(`I need to see a ${doc.specialty}. What should I know and what symptoms should I mention to ${doc.name}?`)}`)}}
                            style={{ flex:1, padding:"10px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${color},${color}CC)`, color:"#fff", fontSize:12.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:`0 4px 14px ${color}40`, transition:"all 0.2s" }}>
                            <MessageSquare size={13}/> Ask AI
                          </button>
                          <a href={hosp?.maps} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                            <button onClick={e=>e.stopPropagation()} style={{ padding:"10px 14px", borderRadius:12, border:`1px solid ${border}`, background:"transparent", color:textMute, fontSize:12.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5, transition:"all 0.2s" }}>
                              <MapPin size={13}/> Map
                            </button>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Urgency guide */}
          <div style={{ background:glass, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:20, padding:"20px 20px", border:`1px solid ${border}`, boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:textMain, marginBottom:16 }}>When to Seek Care</h3>
            {[
              { level:"Urgent", color:"#DC2626", desc:"Chest pain, breathing difficulty, sudden weakness" },
              { level:"Soon",   color:"#F59E0B", desc:"Persistent fever, worsening pain, 3+ day symptoms" },
              { level:"Routine",color:"#22C55E", desc:"Annual checkup, minor complaints, follow-ups" },
            ].map(({ level, color, desc })=>(
              <div key={level} style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:color, boxShadow:`0 0 8px ${color}`, flexShrink:0, marginTop:5 }}/>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color, margin:"0 0 2px" }}>{level}</p>
                  <p style={{ fontSize:11.5, color:textMute, lineHeight:1.4, margin:0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hospital cards */}
          {HOSPITALS.map(h=>(
            <div key={h.id} style={{ background:glass, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:18, padding:"18px 18px", border:`1px solid ${border}`, boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:textMain, marginBottom:4 }}>🏥 {h.name.split(",")[0]}</h3>
              <p style={{ fontSize:11, color:textMute, marginBottom:12, lineHeight:1.5 }}>{h.address}</p>
              <div style={{ display:"flex", gap:8 }}>
                <a href={`tel:${h.phone}`} style={{ textDecoration:"none", flex:1 }}>
                  <button style={{ width:"100%", padding:"9px 0", borderRadius:10, border:`1px solid ${border}`, background:dark?"rgba(255,255,255,0.04)":"rgba(27,58,107,0.05)", color:accent, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all 0.2s" }}>
                    <Phone size={12}/> {h.phone}
                  </button>
                </a>
                <a href={h.maps} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                  <button style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${border}`, background:"transparent", color:textMute, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontWeight:600, transition:"all 0.2s" }}>
                    <MapPin size={12}/> Directions
                  </button>
                </a>
              </div>
            </div>
          ))}

          {/* AI Referral */}
          <div style={{ background:"linear-gradient(145deg,#0D2147,#1B3A6B 50%,#1e4d8c)", borderRadius:20, padding:"22px 20px", color:"#fff", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 8px 32px rgba(27,58,107,0.35)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:"rgba(34,197,94,0.12)", pointerEvents:"none" }}/>
            <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", opacity:0.6, marginBottom:10 }}>🤖 AI Referral</p>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Not sure which specialist?</h3>
            <p style={{ fontSize:12.5, opacity:0.65, lineHeight:1.6, marginBottom:16 }}>
              Describe your symptoms to the AI and it will recommend the right specialist.
            </p>
            <button onClick={()=>navigate("/assistant?q=Based on my symptoms, which type of doctor should I see and why?")}
              style={{ width:"100%", background:"rgba(255,255,255,0.1)", color:"#fff", border:"1px solid rgba(255,255,255,0.2)", borderRadius:12, padding:"10px 0", fontSize:12.5, fontWeight:700, cursor:"pointer", backdropFilter:"blur(8px)", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.18)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
              Ask AI for Referral →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
