// MediMate/frontend/src/pages/Auth.jsx
// Login + Signup with optional onboarding fields
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, Eye, EyeOff, Sun, Moon, ChevronRight, ChevronLeft } from "lucide-react"
import { useApp } from "../context/ThemeContext"
import { signup, loginApi } from "../api/index"

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"]

export default function Auth() {
  const { theme, toggleTheme, login } = useApp()
  const navigate = useNavigate()
  const dark = theme === "dark"

  const [tab,    setTab]    = useState("login")
  const [step,   setStep]   = useState(1)   // signup: step 1 = basic, step 2 = medical
  const [showPw, setShowPw] = useState(false)
  const [error,  setError]  = useState("")
  const [loading,setLoading]= useState(false)

  // Step 1
  const [name,     setName]     = useState("")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  // Step 2 (medical onboarding)
  const [age,         setAge]        = useState("")
  const [sex,         setSex]        = useState("")
  const [heightCm,    setHeightCm]   = useState("")
  const [weightKg,    setWeightKg]   = useState("")
  const [bloodGroup,  setBloodGroup] = useState("")

  const S = {
    page:  { minHeight:"100vh", display:"flex", backgroundColor:dark?"#0F172A":"#F4F6FA" },
    panel: { width:440, flexShrink:0, backgroundColor:dark?"#1E293B":"#fff", display:"flex", flexDirection:"column", padding:"40px 36px", justifyContent:"center", boxShadow:"2px 0 20px rgba(27,58,107,0.08)", overflowY:"auto" },
    input: { width:"100%", backgroundColor:dark?"#0F172A":"#F4F6FA", border:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, borderRadius:12, padding:"11px 14px", fontSize:14, color:dark?"#F1F5F9":"#1A1A2E", outline:"none", fontFamily:"DM Sans,sans-serif" },
    label: { fontSize:11, fontWeight:600, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 },
    tab:   a => ({ flex:1, padding:"10px 0", border:0, borderRadius:10, fontWeight:600, fontSize:14, cursor:"pointer", backgroundColor:a?"#1B3A6B":"transparent", color:a?"#fff":dark?"#94A3B8":"#64748B" }),
    btn:   { width:"100%", background:"#1B3A6B", color:"#fff", border:0, borderRadius:999, padding:"13px 0", fontSize:15, fontWeight:700, cursor:"pointer", marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
    seg:   (a) => ({ flex:1, padding:"9px 4px", borderRadius:10, border:`1.5px solid ${a?"#1B3A6B":dark?"#2D3F5A":"#E5E9F2"}`, backgroundColor:a?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:a?(dark?"#60A5FA":"#1B3A6B"):dark?"#94A3B8":"#64748B", fontSize:13, fontWeight:600, cursor:"pointer" }),
  }

  const handleLogin = async () => {
    setError("")
    if (!email || !password) return setError("All fields are required.")
    setLoading(true)
    try {
      const r = await loginApi(email, password)
      login({ ...r.data.user, token: r.data.token })
      navigate("/")
    } catch (e) { setError(e.response?.data?.detail || "Invalid credentials.") }
    finally { setLoading(false) }
  }

  const handleStep1Next = () => {
    setError("")
    if (!name || !email || !password) return setError("Name, email and password are required.")
    if (password.length < 6) return setError("Password must be at least 6 characters.")
    setStep(2)
  }

  const handleSignup = async () => {
    setError(""); setLoading(true)
    try {
      const payload = { name, email, password,
        age: age ? parseInt(age) : undefined,
        sex: sex || undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        blood_group: bloodGroup || undefined,
      }
      const r = await signup(payload)
      login({ ...r.data.user, token: r.data.token })
      navigate("/")
    } catch (e) { setError(e.response?.data?.detail || "Signup failed. Try again.") }
    finally { setLoading(false) }
  }

  return (
    <div style={S.page}>
      {/* Left panel */}
      <div style={S.panel}>
        {/* Logo + theme */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, backgroundColor:"#1B3A6B", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Heart size={18} color="#fff"/>
            </div>
            <div>
              <p style={{ color:"#1B3A6B", fontWeight:700, fontSize:16, margin:0 }}>MediMate</p>
              <p style={{ color:"#94A3B8", fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>AI Health</p>
            </div>
          </div>
          <button onClick={toggleTheme} style={{ background:"none", border:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", color:dark?"#94A3B8":"#64748B", display:"flex", alignItems:"center" }}>
            {dark ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", backgroundColor:dark?"#0F172A":"#F4F6FA", borderRadius:12, padding:4, marginBottom:24 }}>
          <button style={S.tab(tab==="login")}  onClick={()=>{setTab("login");setStep(1);setError("")}}>Log In</button>
          <button style={S.tab(tab==="signup")} onClick={()=>{setTab("signup");setStep(1);setError("")}}>Sign Up</button>
        </div>

        {/* ── LOGIN ── */}
        {tab==="login" && (
          <>
            <h2 style={{ fontSize:22, fontWeight:700, color:dark?"#F1F5F9":"#1A1A2E", marginBottom:4 }}>Welcome back</h2>
            <p style={{ fontSize:13, color:"#64748B", marginBottom:24 }}>Log in to access your health dashboard.</p>
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            </div>
            <div style={{ marginBottom:4 }}>
              <label style={S.label}>Password</label>
              <div style={{ position:"relative" }}>
                <input style={{...S.input, paddingRight:44}} type={showPw?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
                <button onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:0, cursor:"pointer", color:"#94A3B8" }}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            {error && <p style={{ color:"#DC2626", fontSize:12, marginTop:6 }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading} style={{...S.btn, opacity:loading?0.7:1}}>
              {loading?"Logging in...":"Log In"}
            </button>
            <p style={{ textAlign:"center", fontSize:12, color:"#94A3B8", marginTop:16 }}>
              Don't have an account?{" "}
              <span onClick={()=>{setTab("signup");setStep(1);setError("")}} style={{ color:"#2952A3", fontWeight:600, cursor:"pointer" }}>Sign up</span>
            </p>
          </>
        )}

        {/* ── SIGNUP STEP 1: Basic ── */}
        {tab==="signup" && step===1 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <h2 style={{ fontSize:20, fontWeight:700, color:dark?"#F1F5F9":"#1A1A2E", margin:0 }}>Create account</h2>
              <span style={{ fontSize:11, color:"#94A3B8" }}>Step 1 of 2</span>
            </div>
            <p style={{ fontSize:13, color:"#64748B", marginBottom:20 }}>Basic information to get started.</p>
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="John Doe" value={name} onChange={e=>setName(e.target.value)}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            </div>
            <div style={{ marginBottom:4 }}>
              <label style={S.label}>Password</label>
              <div style={{ position:"relative" }}>
                <input style={{...S.input, paddingRight:44}} type={showPw?"text":"password"} placeholder="Min 6 characters" value={password} onChange={e=>setPassword(e.target.value)}/>
                <button onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:0, cursor:"pointer", color:"#94A3B8" }}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            {error && <p style={{ color:"#DC2626", fontSize:12, marginTop:6 }}>{error}</p>}
            <button onClick={handleStep1Next} style={{...S.btn, marginTop:16}}>
              Next: Medical Info <ChevronRight size={16}/>
            </button>
            <p style={{ textAlign:"center", fontSize:12, color:"#94A3B8", marginTop:14 }}>
              Already have an account?{" "}
              <span onClick={()=>{setTab("login");setError("")}} style={{ color:"#2952A3", fontWeight:600, cursor:"pointer" }}>Log in</span>
            </p>
          </>
        )}

        {/* ── SIGNUP STEP 2: Medical Onboarding ── */}
        {tab==="signup" && step===2 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <h2 style={{ fontSize:20, fontWeight:700, color:dark?"#F1F5F9":"#1A1A2E", margin:0 }}>Medical profile</h2>
              <span style={{ fontSize:11, color:"#94A3B8" }}>Step 2 of 2</span>
            </div>
            <p style={{ fontSize:13, color:"#64748B", marginBottom:6 }}>Used to personalise your AI health tools. All optional — you can fill this later.</p>
            <div style={{ backgroundColor:dark?"#0F172A":"#F0FDF4", borderRadius:10, padding:"8px 12px", marginBottom:20, border:`1px solid ${dark?"#2D3F5A":"#BBF7D0"}` }}>
              <p style={{ fontSize:11, color:dark?"#4ADE80":"#166534", margin:0 }}>🔒 Your medical data is stored securely and only used to personalise your experience.</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              <div>
                <label style={S.label}>Age</label>
                <input style={S.input} type="number" placeholder="25" value={age} onChange={e=>setAge(e.target.value)}/>
              </div>
              <div>
                <label style={S.label}>Biological Sex</label>
                <div style={{ display:"flex", gap:4 }}>
                  {["male","female","other"].map(s=>(
                    <button key={s} onClick={()=>setSex(s)} style={{...S.seg(sex===s), fontSize:11, padding:"9px 4px", textTransform:"capitalize"}}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Height (cm)</label>
                <input style={S.input} type="number" placeholder="175" value={heightCm} onChange={e=>setHeightCm(e.target.value)}/>
              </div>
              <div>
                <label style={S.label}>Weight (kg)</label>
                <input style={S.input} type="number" placeholder="70" value={weightKg} onChange={e=>setWeightKg(e.target.value)}/>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>Blood Group</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {BLOOD_GROUPS.map(bg=>(
                  <button key={bg} onClick={()=>setBloodGroup(bg)} style={{ padding:"6px 12px", borderRadius:8, border:`1.5px solid ${bloodGroup===bg?"#1B3A6B":dark?"#2D3F5A":"#E5E9F2"}`, backgroundColor:bloodGroup===bg?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:bloodGroup===bg?(dark?"#60A5FA":"#1B3A6B"):dark?"#94A3B8":"#64748B", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{ color:"#DC2626", fontSize:12, marginBottom:8 }}>{error}</p>}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{setStep(1);setError("")}} style={{ padding:"13px 20px", borderRadius:999, border:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, backgroundColor:"transparent", color:dark?"#94A3B8":"#64748B", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <ChevronLeft size={16}/> Back
              </button>
              <button onClick={handleSignup} disabled={loading} style={{...S.btn, flex:1, marginTop:0, opacity:loading?0.7:1}}>
                {loading?"Creating account...":"Create Account"}
              </button>
            </div>
            <button onClick={handleSignup} disabled={loading} style={{ width:"100%", background:"none", border:0, color:"#94A3B8", fontSize:12, cursor:"pointer", marginTop:10 }}>
              Skip for now →
            </button>
          </>
        )}
      </div>

      {/* Right branding panel */}
      <div style={{ flex:1, background:"linear-gradient(145deg,#1B3A6B 0%,#2952A3 50%,#1B3A6B 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, position:"relative", overflow:"hidden" }}>
        {[[300,-80,-80,0.08],[200,"auto",-60,0.06],[150,80,80,0.1]].map(([size,right,top,op],i)=>(
          <div key={i} style={{ position:"absolute", width:size, height:size, borderRadius:"50%", background:`rgba(255,255,255,${op})`, right, top, pointerEvents:"none" }}/>
        ))}
        <div style={{ position:"relative", zIndex:1, textAlign:"center", color:"#fff", maxWidth:360 }}>
          <div style={{ width:72, height:72, borderRadius:20, backgroundColor:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", backdropFilter:"blur(8px)" }}>
            <Heart size={36} color="#fff"/>
          </div>
          <h1 style={{ fontSize:30, fontWeight:700, marginBottom:14, lineHeight:1.2 }}>Your AI Health Companion</h1>
          <p style={{ fontSize:14, opacity:0.8, lineHeight:1.6, marginBottom:28 }}>
            Symptom analysis, vitals tracking, cardiovascular risk prediction, and emergency support — all in one empathetic platform.
          </p>
          {["AI-powered symptom diagnosis","Real-time vitals monitoring","Heart Risk prediction model","Personalized health insights","24/7 emergency guidance"].map(f=>(
            <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, textAlign:"left" }}>
              <div style={{ width:18, height:18, borderRadius:"50%", backgroundColor:"#22C55E", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:10, color:"#fff", fontWeight:700 }}>✓</span>
              </div>
              <span style={{ fontSize:13, opacity:0.9 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}