// MediMate/frontend/src/components/NotificationPanel.jsx
import { useNavigate } from "react-router-dom"
import { useNotifications } from "../context/NotificationContext"
import { Bell, X, CheckCheck, Trash2 } from "lucide-react"
import { useApp } from "../context/ThemeContext"

const SEV = {
  danger:  {bg:"#FEF2F2",bdr:"#FECACA",dot:"#DC2626",dbg:"#2D1515",dbdr:"#5B2020"},
  warning: {bg:"#FFFBEB",bdr:"#FDE68A",dot:"#F59E0B",dbg:"#2D1F05",dbdr:"#78350F"},
  success: {bg:"#F0FDF4",bdr:"#BBF7D0",dot:"#22C55E",dbg:"#0D2010",dbdr:"#14532D"},
  info:    {bg:"#EFF6FF",bdr:"#BFDBFE",dot:"#3B82F6",dbg:"#1E293B",dbdr:"#2D3F5A"},
  reminder:{bg:"#F5F3FF",bdr:"#DDD6FE",dot:"#7C3AED",dbg:"#1E1B30",dbdr:"#4C1D95"},
}

export function NotificationBell({ onClick, dark }) {
  const { unread } = useNotifications()
  return (
    <button onClick={onClick} style={{ position:"relative", background:"none", border:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, borderRadius:8, padding:"5px 8px", cursor:"pointer", color:dark?"#94A3B8":"#64748B", display:"flex", alignItems:"center" }}>
      <Bell size={15}/>
      {unread > 0 && <span style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", backgroundColor:"#DC2626", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{unread>9?"9+":unread}</span>}
    </button>
  )
}

export default function NotificationPanel({ onClose }) {
  const { theme } = useApp()
  const dark = theme === "dark"
  const { notifs, markRead, markAll, remove, clearAll } = useNotifications()
  const navigate = useNavigate()

  const surface=dark?"#1E293B":"#fff", border=dark?"#2D3F5A":"#E5E9F2", textMain=dark?"#F1F5F9":"#1A1A2E", textMute=dark?"#94A3B8":"#64748B"

  const timeAgo = ts => {
    const d=Date.now()-new Date(ts).getTime(), m=Math.floor(d/60000)
    if(m<1) return "just now"; if(m<60) return `${m}m ago`
    const h=Math.floor(m/60); if(h<24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }

  return (
    <div style={{ position:"fixed", top:56, right:16, width:360, backgroundColor:surface, borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.2)", border:`1px solid ${border}`, zIndex:1000, overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:textMain, margin:0 }}>Notifications</h3>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {notifs.length>0&&<>
            <button onClick={markAll} style={{ background:"none", border:0, cursor:"pointer", color:textMute, display:"flex", alignItems:"center", gap:4, fontSize:12 }}><CheckCheck size={14}/> Read all</button>
            <button onClick={clearAll} style={{ background:"none", border:0, cursor:"pointer", color:textMute }}><Trash2 size={14}/></button>
          </>}
          <button onClick={onClose} style={{ background:"none", border:0, cursor:"pointer", color:textMute }}><X size={16}/></button>
        </div>
      </div>
      <div style={{ maxHeight:400, overflowY:"auto" }}>
        {notifs.length===0?(
          <div style={{ padding:"32px 20px", textAlign:"center" }}>
            <p style={{ fontSize:32, marginBottom:8 }}>🔔</p>
            <p style={{ color:textMute, fontSize:14 }}>No notifications yet</p>
          </div>
        ):notifs.map(n=>{
          const pal=SEV[n.severity||n.type]||SEV.info
          return (
            <div key={n.id} onClick={()=>{markRead(n.id);if(n.link){navigate(n.link);onClose()}}}
              style={{ padding:"12px 18px", borderBottom:`1px solid ${border}`, cursor:n.link?"pointer":"default", backgroundColor:n.read?"transparent":(dark?`${pal.dot}12`:`${pal.dot}08`), display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{ width:32, height:32, borderRadius:10, backgroundColor:dark?pal.dbg:pal.bg, border:`1px solid ${dark?pal.dbdr:pal.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{n.icon||"ℹ️"}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <p style={{ fontSize:13, fontWeight:n.read?500:700, color:textMain, margin:0 }}>{n.title}</p>
                  <span style={{ fontSize:10, color:textMute, flexShrink:0, marginLeft:8 }}>{timeAgo(n.timestamp)}</span>
                </div>
                <p style={{ fontSize:12, color:textMute, margin:0, lineHeight:1.4 }}>{n.message}</p>
              </div>
              <button onClick={e=>{e.stopPropagation();remove(n.id)}} style={{ background:"none", border:0, cursor:"pointer", color:textMute, padding:2, flexShrink:0 }}><X size={12}/></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}