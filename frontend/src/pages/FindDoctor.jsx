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
  "breathing":"Pulmonologist","asthma":"Pulmonologist","cough":"Pulmonologist","chest":  "Pulmonologist","copd":"Pulmonologist",
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

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

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
  const urgencyBg = urgency==="urgent"?(dark?"#2D1515":"#FEF2F2"):urgency==="soon"?(dark?"#2D1F05":"#FFFBEB"):(dark?"#0D2010":"#F0FDF4")

  return (
    <div style={{ maxWidth:1060, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#1B3A6B,#2952A3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <UserCheck size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:textMain, margin:0 }}>Find a Doctor</h1>
            <p style={{ fontSize:13, color:textMute, margin:0 }}>Specialists at Apollo New Delhi & Holy Family Hospital</p>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, marginBottom:16 }}>
        <div style={{ position:"relative" }}>
          <Search size={16} color={textMute} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by symptom, name, or specialty (e.g. headache, Dr. Sharma)..."
            style={{ width:"100%", backgroundColor:surface, border:`1px solid ${border}`, borderRadius:12, padding:"11px 14px 11px 42px", fontSize:14, color:textMain, outline:"none", boxShadow:"0 2px 12px rgba(27,58,107,0.08)", boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["routine","Routine"],["soon","Soon"],["urgent","Urgent"]].map(([val,label])=>(
            <button key={val} onClick={()=>setUrgency(val)} style={{ padding:"10px 14px", borderRadius:12, border:`1.5px solid ${urgency===val?urgencyColor:border}`, backgroundColor:urgency===val?urgencyBg:"transparent", color:urgency===val?urgencyColor:textMute, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hospital tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <button onClick={()=>setHospital("all")} style={{ padding:"7px 18px", borderRadius:10, border:`1px solid ${hospital==="all"?"#1B3A6B":border}`, backgroundColor:hospital==="all"?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:hospital==="all"?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:13, fontWeight:hospital==="all"?700:400, cursor:"pointer" }}>
          All ({DOCTORS.length})
        </button>
        {HOSPITALS.map(h=>(
          <button key={h.id} onClick={()=>setHospital(h.id)} style={{ padding:"7px 18px", borderRadius:10, border:`1px solid ${hospital===h.id?"#1B3A6B":border}`, backgroundColor:hospital===h.id?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:hospital===h.id?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:13, fontWeight:hospital===h.id?700:400, cursor:"pointer" }}>
            {h.id==="apollo"?"🏥 Apollo":"🏥 Holy Family"} ({DOCTORS.filter(d=>d.hospital===h.id).length})
          </button>
        ))}
      </div>

      {/* Suggest banner */}
      {suggestedSpec && (
        <div style={{ backgroundColor:dark?"#1E3A5F":"#EEF2FF", border:`1px solid ${dark?"#2D3F5A":"#BFDBFE"}`, borderRadius:12, padding:"10px 16px", marginBottom:14, display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:16 }}>💡</span>
          <p style={{ fontSize:13, color:dark?"#60A5FA":"#1B3A6B", margin:0 }}>
            For "{search}", you likely need a <strong>{suggestedSpec}</strong>.
          </p>
          <button onClick={()=>setSearch(suggestedSpec)} style={{ marginLeft:"auto", fontSize:12, color:dark?"#60A5FA":"#1B3A6B", fontWeight:600, background:"none", border:0, cursor:"pointer" }}>
            Filter →
          </button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
        {/* Doctor grid */}
        <div>
          {filtered.length===0?(
            <div style={{ backgroundColor:surface, borderRadius:16, padding:40, textAlign:"center", boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
              <p style={{ color:textMute, fontSize:14 }}>No doctors found for "{search}". Try "headache", "diabetes", or a specialty name.</p>
            </div>
          ):(
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {filtered.map(doc=>{
                const isSel = selected===doc.name
                const color = SPEC_COLOR[doc.specialty]||"#1B3A6B"
                const hosp  = HOSPITALS.find(h=>h.id===doc.hospital)
                return (
                  <div key={doc.name}
                    style={{ backgroundColor:surface, borderRadius:14, boxShadow:isSel?"0 8px 24px rgba(27,58,107,0.14)":"0 2px 12px rgba(27,58,107,0.08)", border:`1.5px solid ${isSel?color:border}`, padding:18, cursor:"pointer", transition:"all 0.2s" }}
                    onClick={()=>setSelected(isSel?null:doc.name)}>
                    <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                      {/* Avatar */}
                      <div style={{ width:48, height:48, borderRadius:12, backgroundColor:dark?`${color}25`:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                        {SPEC_ICON[doc.specialty]||"🏥"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:2 }}>
                          <div>
                            <h3 style={{ fontSize:15, fontWeight:700, color:textMain, margin:0 }}>{doc.name}</h3>
                            <p style={{ fontSize:12, color, fontWeight:600, margin:"2px 0" }}>{doc.specialty} · {doc.dept}</p>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B"/>
                            <span style={{ fontSize:12, fontWeight:700, color:textMain }}>{doc.rating}</span>
                          </div>
                        </div>
                        <p style={{ fontSize:11, color:textMute, marginBottom:8, lineHeight:1.4 }}>{doc.condition}</p>
                        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:textMute, display:"flex", alignItems:"center", gap:4 }}>
                            <Clock size={11}/> {doc.exp} yrs exp.
                          </span>
                          <span style={{ fontSize:11, color:textMute }}>🏥 {hosp?.name?.split(",")[0]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded: contact + AI */}
                    {isSel && (
                      <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${border}` }}>
                        <p style={{ fontSize:12, color:textMute, marginBottom:10 }}>📍 {hosp?.address}</p>
                        <div style={{ display:"flex", gap:10 }}>
                          <a href={`tel:${doc.phone}`} style={{ textDecoration:"none", flex:1 }}>
                            <button style={{ width:"100%", padding:"9px 0", borderRadius:10, border:0, backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                              <Phone size={14}/> Call {doc.phone}
                            </button>
                          </a>
                          <button onClick={e=>{e.stopPropagation();navigate(`/assistant?q=${encodeURIComponent(`I need to see a ${doc.specialty}. What should I know and what symptoms should I mention to ${doc.name}?`)}`)}}
                            style={{ flex:1, padding:"9px 0", borderRadius:10, border:0, backgroundColor:color, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                            <MessageSquare size={14}/> Ask AI about {doc.specialty}
                          </button>
                          <a href={hosp?.maps} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                            <button onClick={e=>e.stopPropagation()} style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${border}`, backgroundColor:"transparent", color:textMute, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                              <MapPin size={14}/> Map
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
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Urgency guide */}
          <div style={{ backgroundColor:surface, borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:textMain, marginBottom:14 }}>When to Seek Care</h3>
            {[
              { level:"Urgent",  color:"#DC2626", desc:"Chest pain, difficulty breathing, sudden weakness, loss of consciousness" },
              { level:"Soon",    color:"#F59E0B", desc:"Persistent fever, worsening pain, symptoms lasting more than 3 days" },
              { level:"Routine", color:"#22C55E", desc:"Annual checkup, minor complaints, preventive care, follow-ups" },
            ].map(({ level, color, desc })=>(
              <div key={level} style={{ display:"flex", gap:10, marginBottom:12 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", backgroundColor:color, flexShrink:0, marginTop:5 }}/>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color, margin:"0 0 2px" }}>{level}</p>
                  <p style={{ fontSize:12, color:textMute, lineHeight:1.4, margin:0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hospital info cards */}
          {HOSPITALS.map(h=>(
            <div key={h.id} style={{ backgroundColor:surface, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:textMain, marginBottom:4 }}>🏥 {h.name.split(",")[0]}</h3>
              <p style={{ fontSize:11, color:textMute, marginBottom:10, lineHeight:1.5 }}>{h.address}</p>
              <div style={{ display:"flex", gap:8 }}>
                <a href={`tel:${h.phone}`} style={{ textDecoration:"none", flex:1 }}>
                  <button style={{ width:"100%", padding:"8px 0", borderRadius:10, border:0, backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <Phone size={12}/> {h.phone}
                  </button>
                </a>
                <a href={h.maps} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                  <button style={{ padding:"8px 12px", borderRadius:10, border:`1px solid ${border}`, backgroundColor:"transparent", color:textMute, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                    <MapPin size={12}/> Directions
                  </button>
                </a>
              </div>
            </div>
          ))}

          {/* AI Referral */}
          <div style={{ background:"linear-gradient(135deg,#1B3A6B,#2952A3)", borderRadius:16, padding:20, color:"#fff" }}>
            <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", opacity:0.7, marginBottom:8 }}>🤖 AI Referral</p>
            <h3 style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Not sure which specialist?</h3>
            <p style={{ fontSize:12, opacity:0.85, lineHeight:1.6, marginBottom:14 }}>
              Describe your symptoms to the AI and it will recommend the right specialist.
            </p>
            <button onClick={()=>navigate("/assistant?q=Based on my symptoms, which type of doctor should I see and why?")}
              style={{ width:"100%", backgroundColor:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.25)", borderRadius:10, padding:"9px 0", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              Ask AI for Referral →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}