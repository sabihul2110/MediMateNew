// MediMate/frontend/src/components/Onboarding.jsx
// Shows ONCE per user account (key includes user email)
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { Heart, Scan, Activity, TrendingUp, ArrowRight, X } from "lucide-react"

const STEPS = [
  {
    icon:"👋", title:"Welcome to MediMate!",
    desc:"Your AI-powered health companion. Let's show you what's available.",
    cta:"Get Started", secondary:null,
  },
  {
    icon:"🩺", title:"Your Profile is Ready",
    desc:"You filled in your medical details during signup — great! You can update them anytime in Profile → Medical tab. Your data auto-fills the Heart Risk predictor.",
    cta:"View Profile", link:"/profile", secondary:"Skip",
  },
  {
    icon:"❤️", title:"Log Your First Vitals",
    desc:"Go to Health Tracking and enter your heart rate, blood pressure, SpO2, and blood sugar. Your Health Insights charts will come alive after 2–3 entries.",
    cta:"Go to Tracking", link:"/tracking", secondary:"Skip",
  },
  {
    icon:"🔍", title:"Try MediScan",
    desc:"Describe your symptoms in plain English — 'I have stomach pain and loose motions' — and MediScan will match possible conditions with medicines and precautions.",
    cta:"Try MediScan", link:"/mediscan", secondary:"Done — let's go!",
  },
]

export function getOnboardingKey(userEmail) {
  return `mm_onboarding_${userEmail || "guest"}`
}

export default function Onboarding({ onComplete }) {
  const { theme, user } = useApp()
  const dark    = theme === "dark"
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const surface = dark?"#1E293B":"#fff"
  const textMain= dark?"#F1F5F9":"#1A1A2E"
  const textMute= dark?"#94A3B8":"#64748B"
  const border  = dark?"#2D3F5A":"#E5E9F2"
  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  const done = () => {
    const key = getOnboardingKey(user?.email)
    localStorage.setItem(key, "1")
    onComplete()
  }

  const handleCta = () => {
    if(current.link) navigate(current.link)
    if(isLast) { done(); return }
    setStep(s => s+1)
  }

  const handleSecondary = () => {
    if(isLast) { done(); return }
    setStep(s => s+1)
  }

  return (
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
      <div style={{ backgroundColor:surface, borderRadius:24, padding:36, maxWidth:460, width:"90%", boxShadow:"0 24px 64px rgba(0,0,0,0.2)", position:"relative" }}>
        <button onClick={done} style={{ position:"absolute", top:16, right:16, background:"none", border:0, cursor:"pointer", color:textMute }}>
          <X size={18}/>
        </button>

        {/* Progress */}
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:28 }}>
          {STEPS.map((_,i)=>(
            <div key={i} style={{ width:i===step?24:8, height:8, borderRadius:999, backgroundColor:i===step?"#1B3A6B":i<step?"#22C55E":(dark?"#2D3F5A":"#E5E9F2"), transition:"all 0.3s" }}/>
          ))}
        </div>

        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:"linear-gradient(135deg,#1B3A6B,#2952A3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:36 }}>
            {current.icon}
          </div>
          <h2 style={{ fontSize:22, fontWeight:700, color:textMain, marginBottom:8 }}>{current.title}</h2>
          <p style={{ fontSize:14, color:textMute, lineHeight:1.6, maxWidth:340, margin:"0 auto" }}>{current.desc}</p>
        </div>

        {step === 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
            {[
              {icon:Scan,       label:"MediScan AI",      color:"#1B3A6B"},
              {icon:Activity,   label:"Health Tracking",  color:"#DC2626"},
              {icon:Heart,      label:"Heart Risk",       color:"#DC2626"},
              {icon:TrendingUp, label:"Health Insights",  color:"#22C55E"},
            ].map(({icon:Icon,label,color})=>(
              <div key={label} style={{ display:"flex", alignItems:"center", gap:8, backgroundColor:dark?"#0F172A":"#F4F6FA", borderRadius:10, padding:"10px 12px" }}>
                <Icon size={16} color={color}/>
                <span style={{ fontSize:12, color:textMute, fontWeight:500 }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={handleCta} style={{ width:"100%", backgroundColor:"#1B3A6B", color:"#fff", border:0, borderRadius:12, padding:"13px 0", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {current.cta} <ArrowRight size={16}/>
          </button>
          {current.secondary && (
            <button onClick={handleSecondary} style={{ width:"100%", background:"none", border:`1px solid ${border}`, borderRadius:12, padding:"11px 0", fontSize:14, color:textMute, cursor:"pointer" }}>
              {current.secondary}
            </button>
          )}
        </div>
        <p style={{ textAlign:"center", fontSize:11, color:textMute, marginTop:16 }}>Step {step+1} of {STEPS.length}</p>
      </div>
    </div>
  )
}