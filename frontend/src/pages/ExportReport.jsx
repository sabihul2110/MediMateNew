// MediMate/frontend/src/pages/ExportReport.jsx
// Accessible from Profile → Security tab or Insights
import { useState } from "react"
import { useApp } from "../context/ThemeContext"
import { getHistory, getProfile, getHeartRiskHistory, getMediScanHistory } from "../api/index"
import { exportHealthReportPDF } from "../utils/exportPDF"
import { Download, FileText, CheckCircle, Loader } from "lucide-react"

export default function ExportReport() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [counts,  setCounts]  = useState(null)

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  const doExport = async () => {
    setLoading(true); setDone(false)
    try {
      const [hist, prof, risk, scan] = await Promise.all([
        getHistory(200),
        getProfile(),
        getHeartRiskHistory(50),
        getMediScanHistory(50),
      ])
      const logs        = hist.data.logs||[]
      const profile     = prof.data
      const riskHistory = risk.data.history||[]
      const scanHistory = scan.data.history||[]
      setCounts({
        vitals:   logs.filter(l=>l.type==="vitals").length,
        bmi:      logs.filter(l=>l.type==="bmi").length,
        sleep:    logs.filter(l=>l.type==="sleep").length,
        activity: logs.filter(l=>l.type==="activity").length,
        risk:     riskHistory.length,
        scan:     scanHistory.length,
      })
      await exportHealthReportPDF(logs, profile, riskHistory, scanHistory)
      setDone(true)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth:500, margin:"0 auto" }}>
      <div style={{ backgroundColor:surface, borderRadius:20, padding:32, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#1B3A6B,#2952A3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <FileText size={28} color="#fff"/>
          </div>
          <h2 style={{ fontSize:20, fontWeight:700, color:textMain, marginBottom:8 }}>Export Health Report</h2>
          <p style={{ fontSize:13, color:textMute, lineHeight:1.6 }}>
            Downloads your complete health history — vitals, BMI, sleep, activity, heart risk assessments, and MediScan records as a PDF report.
          </p>
        </div>

        <div style={{ backgroundColor:surface2, borderRadius:12, padding:16, marginBottom:24 }}>
          <p style={{ fontSize:12, fontWeight:700, color:textMain, marginBottom:10 }}>What's included:</p>
          {[
            { icon:"❤️", label:"Vitals logs (HR, BP, SpO2, Temperature, Sugar)" },
            { icon:"⚖️", label:"BMI history" },
            { icon:"🌙", label:"Sleep logs" },
            { icon:"⚡", label:"Activity / step logs" },
            { icon:"🫀", label:"Heart Risk assessments" },
            { icon:"🩺", label:"MediScan symptom checks" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:16 }}>{icon}</span>
              <span style={{ fontSize:12, color:textMute }}>{label}</span>
            </div>
          ))}
        </div>

        {counts && (
          <div style={{ backgroundColor:dark?"#0D2010":"#F0FDF4", borderRadius:10, padding:14, marginBottom:16, border:`1px solid ${dark?"#14532D":"#BBF7D0"}` }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#16A34A", marginBottom:6 }}>Records found:</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
              {Object.entries(counts).map(([k,v])=>(
                <div key={k} style={{ textAlign:"center" }}>
                  <p style={{ fontSize:18, fontWeight:800, color:textMain, margin:0 }}>{v}</p>
                  <p style={{ fontSize:10, color:textMute, margin:0, textTransform:"capitalize" }}>{k}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {done && (
          <div style={{ display:"flex", alignItems:"center", gap:8, backgroundColor:dark?"#0D2010":"#F0FDF4", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
            <CheckCircle size={16} color="#22C55E"/>
            <span style={{ fontSize:13, color:"#16A34A", fontWeight:600 }}>Report downloaded successfully!</span>
          </div>
        )}

        <button onClick={doExport} disabled={loading} style={{ width:"100%", backgroundColor:loading?"#94A3B8":"#1B3A6B", color:"#fff", border:0, borderRadius:12, padding:"14px 0", fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading ? <><Loader size={16} style={{animation:"spin 1s linear infinite"}}/> Generating Report…</> : <><Download size={16}/> Download Health Report (PDF)</>}
        </button>

        <p style={{ textAlign:"center", fontSize:11, color:textMute, marginTop:12, lineHeight:1.5 }}>
          Install <code style={{ backgroundColor:surface2, padding:"1px 6px", borderRadius:4 }}>jsPDF</code> for PDF format: <code style={{ backgroundColor:surface2, padding:"1px 6px", borderRadius:4 }}>npm install jspdf</code><br/>
          Falls back to .txt if jsPDF is not installed.
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}