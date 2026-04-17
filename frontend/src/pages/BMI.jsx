// MediMate/frontend/src/pages/BMI.jsx
import { useState } from "react"
import { calculateBMI } from "../api/index"
import { Info, TrendingUp, RefreshCw, Scale } from "lucide-react"

const CAT_COLOR = { Normal: "#22C55E", Underweight: "#3B82F6", Overweight: "#F59E0B", Obese: "#DC2626" }
const CAT_BG    = { Normal: "#F0FDF4", Underweight: "#EFF6FF", Overweight: "#FFFBEB", Obese: "#FEF2F2" }

function GaugeArc({ bmi }) {
  // bmi 10–40 mapped to 0–180 degrees
  const clamped = Math.min(Math.max(bmi, 10), 40)
  const pct = (clamped - 10) / 30
  const angle = pct * 180 - 90   // -90 to 90
  const rad = (angle * Math.PI) / 180
  const cx = 100, cy = 100, r = 70
  const nx = cx + r * Math.cos(rad)
  const ny = cy + r * Math.sin(rad)

  const arc = (startDeg, endDeg, color) => {
    const s = ((startDeg - 90) * Math.PI) / 180
    const e = ((endDeg - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }

  return (
    <svg viewBox="0 0 200 120" style={{ width: 200, height: 120 }}>
      {/* Track */}
      <path d={arc(0, 180)} fill="none" stroke="#E5E9F2" strokeWidth={14} strokeLinecap="round" />
      {/* Underweight */}
      <path d={arc(0, 49)} fill="none" stroke="#3B82F6" strokeWidth={14} />
      {/* Normal */}
      <path d={arc(49, 99)} fill="none" stroke="#22C55E" strokeWidth={14} />
      {/* Overweight */}
      <path d={arc(99, 139)} fill="none" stroke="#F59E0B" strokeWidth={14} />
      {/* Obese */}
      <path d={arc(139, 180)} fill="none" stroke="#DC2626" strokeWidth={14} />
      {/* Needle */}
      <line
        x1={cx} y1={cy}
        x2={nx} y2={ny}
        stroke="#1B3A6B" strokeWidth={3} strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={5} fill="#1B3A6B" />
      {/* Score */}
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize={22} fontWeight="700" fill="#1A1A2E">
        {bmi}
      </text>
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={9} fill="#94A3B8" letterSpacing="1">
        BMI SCORE
      </text>
    </svg>
  )
}

export default function BMI() {
  const [height, setHeight] = useState(175)
  const [weight, setWeight] = useState(72)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const calculate = async () => {
    if (!height || !weight) { setError("Please enter both height and weight."); return }
    setError(""); setLoading(true)
    try {
      const r = await calculateBMI(parseFloat(height), parseFloat(weight))
      setResult(r.data)
    } catch { setError("Could not connect to server. Is the backend running?") }
    finally { setLoading(false) }
  }

  const cat = result?.category
  const catColor = CAT_COLOR[cat] || "#22C55E"
  const catBg    = CAT_BG[cat]   || "#F0FDF4"

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>BMI Calculator</h1>
      <p style={{ color: "#64748B", fontSize: 14, marginBottom: 28 }}>
        Body Mass Index is a key indicator of body composition and potential health risks.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>

        {/* Left — Input card */}
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(27,58,107,0.08)", padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>
              HEIGHT (CM)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number" value={height}
                onChange={e => setHeight(e.target.value)}
                style={{
                  width: "100%", background: "#F4F6FA", border: "1px solid #E5E9F2",
                  borderRadius: 12, padding: "12px 48px 12px 16px", fontSize: 18,
                  fontWeight: 600, color: "#1A1A2E", outline: "none",
                }}
              />
              <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>cm</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>
              WEIGHT (KG)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number" value={weight}
                onChange={e => setWeight(e.target.value)}
                style={{
                  width: "100%", background: "#F4F6FA", border: "1px solid #E5E9F2",
                  borderRadius: 12, padding: "12px 48px 12px 16px", fontSize: 18,
                  fontWeight: 600, color: "#1A1A2E", outline: "none",
                }}
              />
              <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>kg</span>
            </div>
          </div>

          {/* Pro tip */}
          <div style={{ background: "#1B3A6B", borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Info size={15} color="#93C5FD" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ color: "#93C5FD", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Pro-tip</p>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 1.5 }}>
                  Measure your weight in the morning before eating for the most consistent medical results.
                </p>
              </div>
            </div>
          </div>

          {error && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <button
            onClick={calculate}
            disabled={loading}
            style={{
              width: "100%", background: "#1B3A6B", color: "#fff",
              border: 0, borderRadius: 999, padding: "14px 0",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            {loading ? "Calculating..." : "Recalculate Now"}
          </button>
        </div>

        {/* Right — Results */}
        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Gauge + category */}
            <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(27,58,107,0.08)", padding: 24 }}>
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <GaugeArc bmi={result.bmi} />
                  {/* Legend */}
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    {[["Under","#3B82F6"],["Normal","#22C55E"],["Over","#F59E0B"],["Obese","#DC2626"]].map(([l,c]) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 20, height: 4, borderRadius: 2, background: c }} />
                        <span style={{ fontSize: 10, color: "#94A3B8" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: catBg, color: catColor, fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 999, marginBottom: 10 }}>
                    ✓ {cat} Range
                  </span>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", marginBottom: 8 }}>
                    {cat === "Normal" ? "Your body weight is ideal." :
                     cat === "Underweight" ? "You may need to gain weight." :
                     cat === "Overweight" ? "Consider a healthier lifestyle." :
                     "Medical attention recommended."}
                  </h2>
                  <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                    You are in the <strong>"{cat}"</strong> category ({result.range}).
                    {cat === "Normal" ? " This is associated with the lowest risk of cardiovascular disease." : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Advice + Metabolic Risk */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(27,58,107,0.08)", padding: 20 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={16} color="#3B82F6" />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>MediMate Advice</h3>
                </div>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 12 }}>{result.advice}</p>
                <span style={{ fontSize: 12, color: "#2952A3", fontWeight: 600, cursor: "pointer" }}>View Nutrition Plan →</span>
              </div>

              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(27,58,107,0.08)", padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", marginBottom: 14 }}>Metabolic Risk</h3>
                {[
                  { label: "Cardio Risk",    value: result.cardio_risk },
                  { label: "Diabetes Type II", value: result.diabetes_risk },
                ].map(({ label, value }) => {
                  const rc = value === "Low" ? "#22C55E" : value === "Moderate" ? "#F59E0B" : "#DC2626"
                  const pct = value === "Low" ? 20 : value === "Moderate" ? 55 : 90
                  return (
                    <div key={label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#64748B" }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: rc }}>{value}</span>
                      </div>
                      <div style={{ height: 6, background: "#F4F6FA", borderRadius: 999 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: rc, borderRadius: 999, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI Analysis */}
            <div style={{ background: "linear-gradient(135deg, #1B3A6B, #2952A3)", borderRadius: 16, padding: 24, color: "#fff" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>AI Contextual Analysis</h3>
              <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                "Your current BMI of {result.bmi} indicates a {cat.toLowerCase()} weight range. {result.advice} {result.pro_tip}"
              </p>
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(27,58,107,0.08)", padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F4F6FA", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Scale size={28} color="#94A3B8" />
            </div>
            <p style={{ color: "#64748B", fontSize: 14 }}>Enter your measurements and click <strong>Recalculate Now</strong></p>
          </div>
        )}
      </div>
    </div>
  )
}