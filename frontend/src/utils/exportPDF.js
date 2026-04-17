// MediMate/frontend/src/utils/exportPDF.js
function pad(n){return String(n).padStart(2,"0")}
function fmtDate(ts){if(!ts)return "—";const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`}

export async function exportHealthReportPDF(logs, profile, riskHistory=[], scanHistory=[]) {
  const name = (profile?.name||"User").replace(/\s+/g,"_")
  const date = new Date().toISOString().slice(0,10)

  // ── Try real PDF with jsPDF ──────────────────────────────────
  let jsPDFClass
  try {
    // jsPDF can be imported multiple ways depending on version
    const mod = await import("jspdf")
    jsPDFClass = mod.jsPDF || mod.default?.jsPDF || mod.default
    if(!jsPDFClass) throw new Error("jsPDF class not found in module")
  } catch(e) {
    console.warn("[PDF] jsPDF import failed:", e.message, "→ falling back to text")
    return downloadText(logs, profile, riskHistory, scanHistory, name, date)
  }

  try {
    const doc = new jsPDFClass({ orientation:"portrait", unit:"mm", format:"a4" })

    // ── Header ──
    doc.setFillColor(27,58,107)
    doc.rect(0,0,210,30,"F")
    doc.setTextColor(255,255,255)
    doc.setFontSize(20); doc.setFont("helvetica","bold")
    doc.text("MediMate",14,13)
    doc.setFontSize(9); doc.setFont("helvetica","normal")
    doc.text("Complete Health Report",14,21)
    doc.text(`Generated: ${new Date().toLocaleString()}`,105,13)
    doc.text(`Patient: ${profile?.name||"User"}`,105,21)

    // ── Profile strip ──
    doc.setFillColor(238,242,255)
    doc.rect(10,34,190,20,"F")
    doc.setTextColor(27,58,107)
    doc.setFontSize(9.5); doc.setFont("helvetica","bold")
    doc.text("Patient Profile",14,42)
    const pi = [
      profile?.age     ? `Age: ${profile.age} yr`                                                            : null,
      profile?.sex     ? `Sex: ${profile.sex}`                                                                : null,
      profile?.blood_group ? `Blood Group: ${profile.blood_group}`                                           : null,
      profile?.height_cm&&profile?.weight_kg
        ? `BMI: ${(profile.weight_kg/((profile.height_cm/100)**2)).toFixed(1)} (${profile.height_cm}cm / ${profile.weight_kg}kg)` : null,
      profile?.chronic ? `Conditions: ${profile.chronic}` : null,
    ].filter(Boolean).join("   |   ")
    doc.setFont("helvetica","normal"); doc.setTextColor(60,60,60); doc.setFontSize(8.5)
    doc.text(pi||"No profile data on record",14,50)

    let y = 60

    const addSection = (title, color, rows, cols) => {
      if(y > 255){ doc.addPage(); y=15 }
      // Section header
      doc.setFillColor(...color)
      doc.rect(10,y,190,8,"F")
      doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont("helvetica","bold")
      doc.text(title,14,y+5.5)
      y+=10

      if(!rows||rows.length===0){
        doc.setTextColor(160,160,160); doc.setFont("helvetica","italic"); doc.setFontSize(8)
        doc.text("No records found",14,y+5); y+=12; return
      }

      // Column headers
      doc.setFillColor(235,240,255)
      doc.rect(10,y,190,7,"F")
      doc.setTextColor(27,58,107); doc.setFont("helvetica","bold"); doc.setFontSize(7.5)
      let hx=12; cols.forEach(c=>{ doc.text(c.label,hx,y+5); hx+=c.w })
      y+=8

      // Rows
      rows.forEach((row,i)=>{
        if(y>268){ doc.addPage(); y=15 }
        if(i%2===1){ doc.setFillColor(248,250,255); doc.rect(10,y,190,6,"F") }
        doc.setTextColor(50,50,50); doc.setFont("helvetica","normal"); doc.setFontSize(7)
        let rx=12; cols.forEach(c=>{
          const val=String(row[c.k]||"—")
          const maxChars=Math.floor(c.w/1.65)
          doc.text(val.length>maxChars?val.slice(0,maxChars-1)+"…":val, rx, y+4.5)
          rx+=c.w
        }); y+=7
      })
      y+=5
    }

    addSection("VITALS LOG",[27,58,107],
      logs.filter(l=>l.type==="vitals").map(l=>({
        dt:fmtDate(l.logged_at), hr:`${l.heart_rate}bpm`,
        bp:`${l.systolic_bp}/${l.diastolic_bp}`, sp:`${l.spo2}%`,
        tm:`${l.temperature_f}°F`, su:`${l.blood_sugar}`, st:l.overall||"—"
      })),
      [{label:"Date/Time",w:43,k:"dt"},{label:"Heart Rate",w:20,k:"hr"},
       {label:"Blood Pressure",w:26,k:"bp"},{label:"SpO2",w:16,k:"sp"},
       {label:"Temp",w:20,k:"tm"},{label:"Blood Sugar",w:25,k:"su"},{label:"Status",w:25,k:"st"}]
    )

    addSection("BMI RECORDS",[22,197,94],
      logs.filter(l=>l.type==="bmi").map(l=>({
        dt:fmtDate(l.logged_at), bm:l.bmi?.toFixed(1), ca:l.category,
        ht:`${l.height_cm}cm`, wt:`${l.weight_kg}kg`
      })),
      [{label:"Date/Time",w:55,k:"dt"},{label:"BMI",w:22,k:"bm"},
       {label:"Category",w:45,k:"ca"},{label:"Height",w:34,k:"ht"},{label:"Weight",w:30,k:"wt"}]
    )

    addSection("SLEEP LOG",[99,102,241],
      logs.filter(l=>l.type==="sleep").map(l=>({dt:fmtDate(l.logged_at),hr:`${l.hours}h`,ql:l.quality})),
      [{label:"Date/Time",w:80,k:"dt"},{label:"Hours Slept",w:35,k:"hr"},{label:"Quality",w:60,k:"ql"}]
    )

    addSection("ACTIVITY LOG",[34,197,94],
      logs.filter(l=>l.type==="activity").map(l=>({
        dt:fmtDate(l.logged_at), st:l.steps?.toLocaleString(), ex:`${l.exercise_mins} min`
      })),
      [{label:"Date/Time",w:80,k:"dt"},{label:"Steps",w:55,k:"st"},{label:"Exercise",w:45,k:"ex"}]
    )

    addSection("HEART RISK ASSESSMENTS",[220,38,38],
      riskHistory.map(r=>({
        dt:fmtDate(r.logged_at), rl:r.risk_level, pb:`${r.probability_pct}%`,
        mo:r.mode, fa:`${r.contributing_factors?.length||0}`
      })),
      [{label:"Date/Time",w:55,k:"dt"},{label:"Risk Level",w:32,k:"rl"},
       {label:"Probability",w:28,k:"pb"},{label:"Mode",w:28,k:"mo"},{label:"Factors",w:22,k:"fa"}]
    )

    addSection("MEDISCAN HISTORY",[139,92,246],
      scanHistory.map(s=>({
        dt:fmtDate(s.logged_at),
        tg:(s.symptom_tags||[]).slice(0,3).join(", ")||s.symptoms_text?.slice(0,30)||"—",
        tp:s.top_match||"—", sv:`${s.severity}/10`
      })),
      [{label:"Date/Time",w:50,k:"dt"},{label:"Symptoms",w:68,k:"tg"},
       {label:"Top Match",w:52,k:"tp"},{label:"Severity",w:22,k:"sv"}]
    )

    // ── Footer ──
    if(y>260){ doc.addPage(); y=260 }
    doc.setFillColor(240,244,255); doc.rect(10,275,190,17,"F")
    doc.setTextColor(120,120,120); doc.setFontSize(6.8); doc.setFont("helvetica","italic")
    doc.text("This report is generated by MediMate AI for personal health tracking only. It is NOT a substitute for professional medical advice or diagnosis.",14,281)
    doc.text("Always consult a licensed healthcare provider for any medical decisions. MediMate does not provide clinical diagnosis.",14,286)

    doc.save(`MediMate_HealthReport_${name}_${date}.pdf`)
    console.log("[PDF] Generated successfully")
  } catch(e) {
    console.error("[PDF] Generation error:", e)
    downloadText(logs, profile, riskHistory, scanHistory, name, date)
  }
}

function downloadText(logs, profile, riskHistory, scanHistory, name, date) {
  const rows=(arr,fn)=>arr.length>0?arr.map(fn):["(no records)"]
  const text=[
    "MEDIMATE — COMPLETE HEALTH REPORT",
    `Generated: ${new Date().toLocaleString()}`,
    `Patient: ${profile?.name||"User"}`,
    "",
    "=== VITALS ===",
    ...rows(logs.filter(l=>l.type==="vitals"),l=>`${fmtDate(l.logged_at)}  HR:${l.heart_rate}bpm  BP:${l.systolic_bp}/${l.diastolic_bp}  SpO2:${l.spo2}%  [${l.overall||"—"}]`),
    "","=== BMI ===",
    ...rows(logs.filter(l=>l.type==="bmi"),l=>`${fmtDate(l.logged_at)}  BMI:${l.bmi} [${l.category}]`),
    "","=== SLEEP ===",
    ...rows(logs.filter(l=>l.type==="sleep"),l=>`${fmtDate(l.logged_at)}  ${l.hours}h  ${l.quality}`),
    "","=== HEART RISK ===",
    ...rows(riskHistory,r=>`${fmtDate(r.logged_at)}  ${r.risk_level} (${r.probability_pct}%)`),
    "","=== MEDISCAN ===",
    ...rows(scanHistory,s=>`${fmtDate(s.logged_at)}  Top:${s.top_match||"—"}  Sev:${s.severity}/10`),
  ].join("\n")
  const blob=new Blob([text],{type:"text/plain"})
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob)
  a.download=`MediMate_HealthReport_${name||"User"}_${date}.txt`; a.click()
}