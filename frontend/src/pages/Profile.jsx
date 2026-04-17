// MediMate/frontend/src/pages/Profile.jsx
import { useState, useEffect } from "react"
import { useApp } from "../context/ThemeContext"
import { getProfile, updateProfile, changePassword } from "../api/index"
import { User, Save, CheckCircle, Lock, Eye, EyeOff, Shield } from "lucide-react"

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"]
const SECTIONS = [
  { title:"Personal", fields:[
    { key:"name",    label:"Full Name",   type:"text",   placeholder:"John Doe",   span:2 },
    { key:"age",     label:"Age",         type:"number", placeholder:"25",         span:1 },
    { key:"sex",     label:"Biological Sex", type:"select", opts:["male","female","other"], span:1 },
    { key:"phone",   label:"Phone",       type:"text",   placeholder:"+91 ...",    span:2 },
  ]},
  { title:"Medical", fields:[
    { key:"height_cm",  label:"Height (cm)",       type:"number", placeholder:"175",        span:1 },
    { key:"weight_kg",  label:"Weight (kg)",        type:"number", placeholder:"70",         span:1 },
    { key:"blood_group",label:"Blood Group",        type:"select", opts:BLOOD_GROUPS,        span:1 },
    { key:"allergies",  label:"Known Allergies",    type:"text",   placeholder:"Penicillin", span:1 },
    { key:"chronic",    label:"Chronic Conditions", type:"text",   placeholder:"Hypertension", span:2 },
    { key:"medications",label:"Current Medications",type:"text",   placeholder:"Metformin 500mg", span:2 },
  ]},
  { title:"Emergency", fields:[
    { key:"emergency_contact", label:"Emergency Contact", type:"text", placeholder:"Name · Phone", span:2 },
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

  // Password change
  const [currentPw,  setCurrentPw]  = useState("")
  const [newPw,      setNewPw]      = useState("")
  const [confirmPw,  setConfirmPw]  = useState("")
  const [showCurr,   setShowCurr]   = useState(false)
  const [showNew,    setShowNew]     = useState(false)
  const [pwError,    setPwError]     = useState("")
  const [pwSuccess,  setPwSuccess]   = useState(false)
  const [pwLoading,  setPwLoading]   = useState(false)

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  const inputSt = { width:"100%", backgroundColor:surface2, border:`1px solid ${border}`, borderRadius:10, padding:"11px 14px", fontSize:14, color:textMain, outline:"none", fontFamily:"DM Sans,sans-serif" }

  useEffect(()=>{
    getProfile().then(r=>{
      const d=r.data
      setForm(prev=>({...prev,...Object.fromEntries(Object.entries(d).map(([k,v])=>[k,v??""]))}))
    }).catch(()=>{}).finally(()=>setFetching(false))
  },[])

  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const save = async () => {
    setLoading(true); setSaved(false)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([,v])=>v!==""&&v!==null))
      await updateProfile(payload)
      if(payload.name) login({...user, name:payload.name, avatar:payload.name[0].toUpperCase()})
      setSaved(true); setTimeout(()=>setSaved(false),3000)
    } catch {}
    finally { setLoading(false) }
  }

  const handleChangePw = async () => {
    setPwError(""); setPwSuccess(false)
    if(!currentPw||!newPw||!confirmPw) return setPwError("All fields are required.")
    if(newPw.length<6) return setPwError("New password must be at least 6 characters.")
    if(newPw!==confirmPw) return setPwError("New passwords do not match.")
    setPwLoading(true)
    try {
      await changePassword(currentPw, newPw)
      setPwSuccess(true)
      setCurrentPw(""); setNewPw(""); setConfirmPw("")
      setTimeout(()=>setPwSuccess(false),4000)
    } catch(e){ setPwError(e.response?.data?.detail||"Failed. Check your current password.") }
    finally { setPwLoading(false) }
  }

  const bmi = form.height_cm&&form.weight_kg
    ? (parseFloat(form.weight_kg)/((parseFloat(form.height_cm)/100)**2)).toFixed(1) : null
  const bmiColor = bmi ? (bmi<18.5?"#3B82F6":bmi<25?"#22C55E":bmi<30?"#F59E0B":"#DC2626") : "#94A3B8"
  const bmiCat   = bmi ? (bmi<18.5?"Underweight":bmi<25?"Normal":bmi<30?"Overweight":"Obese") : null

  if(fetching) return <div style={{color:textMute, padding:40, textAlign:"center"}}>Loading profile…</div>

  return (
    <div style={{ maxWidth:800, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#1B3A6B,#2952A3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <User size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:textMain, margin:0 }}>Medical Profile</h1>
            <p style={{ fontSize:13, color:textMute, margin:0 }}>Personalises your AI tools and auto-fills health assessments</p>
          </div>
        </div>
        <button onClick={save} disabled={loading} style={{ display:"flex", alignItems:"center", gap:8, backgroundColor:saved?"#22C55E":"#1B3A6B", color:"#fff", border:0, borderRadius:12, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          {saved?<><CheckCircle size={15}/> Saved!</>:<><Save size={15}/> {loading?"Saving...":"Save Profile"}</>}
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        {[
          { label:"BMI",      value:bmi?`${bmi} · ${bmiCat}`:"—", color:bmiColor },
          { label:"Blood",    value:form.blood_group||"—",          color:"#DC2626" },
          { label:"Age",      value:form.age?`${form.age} yrs`:"—",color:"#1B3A6B" },
          { label:"Sex",      value:form.sex?form.sex.charAt(0).toUpperCase()+form.sex.slice(1):"—", color:"#7C3AED" },
          { label:"Height",   value:form.height_cm?`${form.height_cm} cm`:"—", color:"#0891B2" },
          { label:"Weight",   value:form.weight_kg?`${form.weight_kg} kg`:"—",  color:"#16A34A" },
        ].map(s=>(
          <div key={s.label} style={{ flex:1, backgroundColor:surface, borderRadius:12, padding:"12px 14px", boxShadow:"0 2px 12px rgba(27,58,107,0.08)", borderLeft:`3px solid ${s.color}` }}>
            <p style={{ fontSize:10, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{s.label}</p>
            <p style={{ fontSize:13, fontWeight:700, color:s.color, margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {[...SECTIONS.map(s=>s.title), "Security"].map(s=>(
          <button key={s} onClick={()=>setActiveSection(s)} style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${activeSection===s?(dark?"#3B82F6":"#1B3A6B"):border}`, backgroundColor:activeSection===s?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:activeSection===s?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:13, fontWeight:activeSection===s?700:400, cursor:"pointer" }}>
            {s==="Security"?<span style={{display:"flex",alignItems:"center",gap:5}}><Shield size={13}/>{s}</span>:s}
          </button>
        ))}
      </div>

      {/* Profile form sections */}
      {SECTIONS.filter(s=>s.title===activeSection).map(section=>(
        <div key={section.title} style={{ backgroundColor:surface, borderRadius:16, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", padding:28 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {section.fields.map(({ key, label, type, placeholder, opts, span })=>(
              <div key={key} style={{ gridColumn:span===2?"1/-1":"auto" }}>
                <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>{label}</label>
                {type==="select" ? (
                  <select value={form[key]} onChange={e=>set(key,e.target.value)} style={{...inputSt, cursor:"pointer"}}>
                    <option value="">Select…</option>
                    {opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key]} placeholder={placeholder} onChange={e=>set(key,e.target.value)} style={inputSt}/>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop:20, backgroundColor:dark?"#0F172A":"#F0FDF4", borderRadius:12, padding:14 }}>
            <p style={{ fontSize:12, color:dark?"#4ADE80":"#166534", lineHeight:1.5 }}>
              🔒 <strong>Privacy:</strong> Your medical profile is stored securely in MongoDB Atlas and only used to personalise your experience. It is never shared with third parties.
            </p>
          </div>
        </div>
      ))}

      {/* Security / Change Password */}
      {activeSection==="Security" && (
        <div style={{ backgroundColor:surface, borderRadius:16, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", padding:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:10, backgroundColor:dark?"#1E3A5F":"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Lock size={17} color={dark?"#60A5FA":"#1B3A6B"}/>
            </div>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, color:textMain, margin:0 }}>Change Password</h3>
              <p style={{ fontSize:12, color:textMute, margin:0 }}>Update your account password</p>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14, maxWidth:420 }}>
            {[
              { label:"Current Password", val:currentPw, set:setCurrentPw, show:showCurr, toggle:()=>setShowCurr(v=>!v) },
              { label:"New Password",     val:newPw,     set:setNewPw,     show:showNew,  toggle:()=>setShowNew(v=>!v)  },
              { label:"Confirm New Password", val:confirmPw, set:setConfirmPw, show:showNew, toggle:()=>setShowNew(v=>!v) },
            ].map(f=>(
              <div key={f.label}>
                <label style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>{f.label}</label>
                <div style={{ position:"relative" }}>
                  <input type={f.show?"text":"password"} value={f.val} onChange={e=>f.set(e.target.value)} placeholder="••••••••"
                    style={{...inputSt, paddingRight:44}}/>
                  <button onClick={f.toggle} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:0, cursor:"pointer", color:textMute }}>
                    {f.show?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </div>
            ))}
            {pwError   && <p style={{ color:"#DC2626", fontSize:12 }}>{pwError}</p>}
            {pwSuccess  && <div style={{ display:"flex", alignItems:"center", gap:6, color:"#16A34A", fontSize:13, fontWeight:600 }}><CheckCircle size={14}/> Password changed successfully!</div>}
            <button onClick={handleChangePw} disabled={pwLoading} style={{ padding:"11px 24px", borderRadius:12, backgroundColor:dark?"#3B82F6":"#1B3A6B", color:"#fff", border:0, fontSize:14, fontWeight:700, cursor:"pointer", opacity:pwLoading?0.7:1, width:"fit-content" }}>
              {pwLoading?"Updating...":"Update Password"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}