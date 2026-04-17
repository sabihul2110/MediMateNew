// MediMate/frontend/src/layouts/AppLayout.jsx
import { useState, useEffect } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Scan, Activity, Heart, MessageSquare, AlertTriangle, TrendingUp, Sun, Moon, LogOut, User, Salad } from "lucide-react"
import { useApp } from "../context/ThemeContext"
import { NotificationBell } from "../components/NotificationPanel"
import NotificationPanel from "../components/NotificationPanel"
import Onboarding from "../components/Onboarding"

const NAV = [
  { to:"/",           icon:LayoutDashboard, label:"Dashboard"       },
  { to:"/mediscan",   icon:Scan,            label:"MediScan"        },
  { to:"/tracking",   icon:Activity,        label:"Health Tracking" },
  { to:"/heart-risk", icon:Heart,           label:"Heart Risk"      },
  { to:"/diet",       icon:Salad,           label:"Diet & Nutrition"},
  { to:"/assistant",  icon:MessageSquare,   label:"AI Assistant"    },
  { to:"/insights",   icon:TrendingUp,      label:"Health Insights" },
]

const ONBOARDING_KEY = "mm_onboarding_done"

export default function AppLayout() {
  const { theme, toggleTheme, user, logout } = useApp()
  const location = useLocation()
  const navigate  = useNavigate()
  const dark = theme === "dark"

  const [showNotifs,     setShowNotifs]     = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(()=>{
    if(!localStorage.getItem(ONBOARDING_KEY)){
      setTimeout(()=>setShowOnboarding(true), 800)
    }
  },[])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY,"1")
    setShowOnboarding(false)
  }

  const pageLabels = {"/emergency":"Emergency","/profile":"Profile","/find-doctor":"Find Doctor","/export":"Export Report","/diet":"Diet & Nutrition"}
  const current = NAV.find(n => n.to==="/" ? location.pathname==="/" : location.pathname.startsWith(n.to))
  const pageTitle = pageLabels[location.pathname] || current?.label || "MediMate"

  const C = {
    aside:  { width:220, flexShrink:0, backgroundColor:dark?"#1E293B":"#fff", boxShadow:dark?"2px 0 20px rgba(0,0,0,0.3)":"2px 0 16px rgba(27,58,107,0.06)", display:"flex", flexDirection:"column", zIndex:10 },
    header: { height:56, backgroundColor:dark?"#1E293B":"#fff", borderBottom:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0 },
    main:   { flex:1, overflowY:"auto", padding:24, backgroundColor:dark?"#0F172A":"#F4F6FA" },
    link:   (a)=>({ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, marginBottom:2, textDecoration:"none", fontSize:13, fontWeight:500, transition:"all 0.15s", backgroundColor:a?(dark?"#3B82F6":"#1B3A6B"):"transparent", color:a?"#fff":(dark?"#94A3B8":"#64748B") }),
  }

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <aside style={C.aside}>
        <div style={{ padding:"18px 20px", borderBottom:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, backgroundColor:dark?"#3B82F6":"#1B3A6B", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Heart size={15} color="#fff"/>
            </div>
            <div>
              <p style={{ color:dark?"#F1F5F9":"#1B3A6B", fontWeight:700, fontSize:15, margin:0 }}>MediMate</p>
              <p style={{ color:"#94A3B8", fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>AI Health</p>
            </div>
          </div>
        </div>

        {user&&(
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}` }}>
            <div onClick={()=>navigate("/profile")} style={{ display:"flex", alignItems:"center", gap:8, backgroundColor:dark?"#0F172A":"#F4F6FA", borderRadius:12, padding:"8px 10px", cursor:"pointer" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", backgroundColor:dark?"#3B82F6":"#1B3A6B", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>{user.avatar}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:dark?"#F1F5F9":"#1B3A6B", fontSize:12, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", margin:0 }}>{user.name}</p>
                <p style={{ color:"#94A3B8", fontSize:10, margin:0 }}>● Active</p>
              </div>
            </div>
          </div>
        )}

        <nav style={{ flex:1, padding:"10px 10px", overflowY:"auto" }}>
          {NAV.map(({ to, icon:Icon, label })=>(
            <NavLink key={to} to={to} end={to==="/"} style={({ isActive })=>C.link(isActive)}>
              <Icon size={16}/>{label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:"10px 14px", borderTop:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, display:"flex", flexDirection:"column", gap:4 }}>
          <NavLink to="/profile" style={({ isActive })=>({ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:12, textDecoration:"none", fontSize:13, fontWeight:500, backgroundColor:isActive?(dark?"#2D3F5A":"#F4F6FA"):"transparent", color:dark?"#94A3B8":"#64748B" })}>
            <User size={14}/> Profile
          </NavLink>
          <NavLink to="/emergency" style={({ isActive })=>({ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:12, textDecoration:"none", fontSize:13, fontWeight:600, backgroundColor:isActive?"#DC2626":"rgba(220,38,38,0.08)", color:isActive?"#fff":"#DC2626" })}>
            <AlertTriangle size={15}/> Emergency
          </NavLink>
          <button onClick={()=>{logout();navigate("/auth")}} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:12, border:0, fontSize:13, fontWeight:500, cursor:"pointer", backgroundColor:"transparent", color:dark?"#64748B":"#94A3B8", width:"100%" }}>
            <LogOut size={14}/> Log out
          </button>
        </div>
      </aside>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <header style={C.header}>
          <h1 style={{ fontSize:15, fontWeight:600, color:dark?"#F1F5F9":"#1A1A2E", margin:0 }}>{pageTitle}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <input placeholder="Search..." style={{ backgroundColor:dark?"#0F172A":"#F4F6FA", border:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, borderRadius:10, padding:"6px 14px", fontSize:13, color:dark?"#F1F5F9":"#1A1A2E", outline:"none", width:200 }}/>
            <button onClick={toggleTheme} style={{ background:"none", border:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, borderRadius:8, padding:"5px 8px", cursor:"pointer", color:dark?"#94A3B8":"#64748B", display:"flex", alignItems:"center" }}>
              {dark?<Sun size={15}/>:<Moon size={15}/>}
            </button>
            <NotificationBell onClick={()=>setShowNotifs(v=>!v)} dark={dark}/>
            {user&&<div onClick={()=>navigate("/profile")} style={{ width:32, height:32, borderRadius:"50%", backgroundColor:dark?"#3B82F6":"#1B3A6B", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:12, fontWeight:700, color:"#fff" }}>{user.avatar}</div>}
          </div>
        </header>

        {showNotifs&&<div style={{ position:"fixed", inset:0, zIndex:999 }} onClick={()=>setShowNotifs(false)}/>}
        {showNotifs&&<NotificationPanel onClose={()=>setShowNotifs(false)}/>}
        <main style={C.main}><Outlet/></main>
      </div>

      {showOnboarding&&<Onboarding onComplete={completeOnboarding}/>}
    </div>
  )
}