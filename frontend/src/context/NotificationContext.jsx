// MediMate/frontend/src/context/NotificationContext.jsx
// In-app notification system — stores in localStorage, auto-generates health reminders
import { createContext, useContext, useState, useEffect, useCallback } from "react"

const Ctx = createContext({})

const STORAGE_KEY = "mm_notifications"

function loadNotifs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]") } catch { return [] }
}
function saveNotifs(n) { localStorage.setItem(STORAGE_KEY, JSON.stringify(n)) }

export function NotificationProvider({ children }) {
  const [notifs, setNotifs] = useState(loadNotifs)

  useEffect(() => { saveNotifs(notifs) }, [notifs])

  const add = useCallback((notification) => {
    const n = { id: Date.now(), read: false, timestamp: new Date().toISOString(), ...notification }
    setNotifs(prev => [n, ...prev].slice(0, 50)) // keep last 50
    return n.id
  }, [])

  const markRead  = id  => setNotifs(prev => prev.map(n => n.id===id?{...n,read:true}:n))
  const markAll   = ()  => setNotifs(prev => prev.map(n=>({...n,read:true})))
  const remove    = id  => setNotifs(prev => prev.filter(n=>n.id!==id))
  const clearAll  = ()  => setNotifs([])
  const unread    = notifs.filter(n=>!n.read).length

  // Auto-generate daily reminder if none today
  useEffect(() => {
    const today = new Date().toDateString()
    const lastReminder = localStorage.getItem("mm_last_reminder")
    if (lastReminder === today) return
    const hasTodayReminder = notifs.some(n => n.type==="reminder" && new Date(n.timestamp).toDateString()===today)
    if (!hasTodayReminder) {
      const hour = new Date().getHours()
      if (hour >= 8 && hour < 22) {
        add({ type:"reminder", title:"Daily Health Check", message:"Log your vitals to keep your health score accurate.", icon:"❤️", link:"/tracking" })
        localStorage.setItem("mm_last_reminder", today)
      }
    }
  }, [])

  return <Ctx.Provider value={{ notifs, add, markRead, markAll, remove, clearAll, unread }}>{children}</Ctx.Provider>
}

export const useNotifications = () => useContext(Ctx)

// ── Helper: add health alert from any page ──────────────────────
export function createHealthAlert(add, type, message, link="/insights") {
  const configs = {
    "high_bp":    { icon:"🩺", title:"Blood Pressure Alert",   severity:"warning" },
    "high_hr":    { icon:"❤️", title:"Heart Rate Alert",       severity:"warning" },
    "low_spo2":   { icon:"💨", title:"Low Oxygen Alert",       severity:"danger"  },
    "high_sugar": { icon:"🩸", title:"Blood Sugar Alert",      severity:"warning" },
    "high_risk":  { icon:"⚠️", title:"High Cardiovascular Risk",severity:"danger"  },
    "scan_done":  { icon:"🩺", title:"MediScan Complete",      severity:"info"    },
    "vitals_saved":{ icon:"✅",title:"Vitals Saved",           severity:"success" },
  }
  const cfg = configs[type] || { icon:"ℹ️", title:"Health Update", severity:"info" }
  return add({ type, ...cfg, message, link })
}