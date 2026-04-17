// MediMate/frontend/src/pages/Diet.jsx
// Diet & Nutrition system — personalized based on profile + conditions
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { getProfile } from "../api/index"
import { sendChatMessage } from "../api/index"

const CONDITION_DIETS = {
  "Diabetes": {
    avoid:     ["White rice","White bread","Sugary drinks","Sweets","Processed foods","High-sugar fruits (mango, grapes)"],
    eat:       ["Brown rice","Oats","Leafy greens","Bitter gourd (karela)","Fenugreek (methi)","Berries","Nuts","Legumes"],
    tips:      ["Eat small meals every 3–4 hours","Avoid skipping meals","Monitor blood sugar before and after meals","Stay hydrated — min 8 glasses water/day"],
    calories:  1800, protein:90, carbs:200, fat:60,
  },
  "Hypertension": {
    avoid:     ["Salt/sodium","Pickles (achar)","Papad","Processed meats","Fried foods","Alcohol","Excess caffeine"],
    eat:       ["Bananas","Spinach","Garlic","Pomegranate","Flaxseeds","Oats","Low-fat dairy","Fish (omega-3)"],
    tips:      ["Limit sodium to <2g/day","Use lemon/herbs instead of salt","DASH diet approach recommended","Walk 30 mins daily"],
    calories:  2000, protein:75, carbs:250, fat:55,
  },
  "Obesity": {
    avoid:     ["Fried foods","Maida (refined flour)","Sugary drinks","Packaged snacks","Full-fat dairy","White bread"],
    eat:       ["Dal (lentils)","Vegetables","Salads","Fruits","Whole grains","Egg whites","Chicken breast","Yogurt (curd)"],
    tips:      ["500 kcal deficit per day for weight loss","Drink water before meals","No eating after 8PM","High-protein breakfast"],
    calories:  1500, protein:100, carbs:150, fat:50,
  },
  "Anemia": {
    avoid:     ["Tea/coffee with meals (blocks iron)","Calcium-rich foods during iron-rich meals","Processed foods"],
    eat:       ["Spinach (palak)","Beetroot","Pomegranate","Dates (khajoor)","Jaggery (gur)","Red meat","Legumes","Vitamin C foods"],
    tips:      ["Eat iron-rich foods with Vitamin C for better absorption","Avoid tea 1hr before/after iron-rich meals","Cook in iron cookware"],
    calories:  2000, protein:80, carbs:260, fat:65,
  },
  "General": {
    avoid:     ["Trans fats","Processed foods","Excess sugar","Excess salt","Refined carbs"],
    eat:       ["Fruits & vegetables","Whole grains","Lean protein","Healthy fats (nuts, olive oil)","Dairy/alternatives"],
    tips:      ["Eat a rainbow of vegetables","Stay hydrated — 8 glasses/day","Don't skip breakfast","Mindful eating — eat slowly"],
    calories:  2000, protein:75, carbs:250, fat:65,
  },
}

const MEAL_PLANS = {
  "Diabetes": [
    { meal:"Breakfast (7AM)",   items:["Oats with nuts and seeds","1 boiled egg","Green tea (no sugar)"],                      cal:350 },
    { meal:"Mid-Morning (10AM)",items:["1 small apple","10 almonds"],                                                           cal:150 },
    { meal:"Lunch (1PM)",       items:["2 multigrain roti","Dal (lentil curry)","Sabzi (vegetable)","Salad with lemon"],       cal:500 },
    { meal:"Evening (4PM)",     items:["Karela (bitter gourd) juice / buttermilk","Roasted chana (chickpeas)"],                cal:150 },
    { meal:"Dinner (7PM)",      items:["1 cup brown rice or 2 rotis","Sabzi","Dal","Cucumber raita"],                          cal:450 },
    { meal:"Bedtime (9PM)",     items:["1 glass warm low-fat milk with pinch of turmeric"],                                   cal:80  },
  ],
  "Hypertension": [
    { meal:"Breakfast (7AM)",   items:["Oats porridge","1 banana","1 glass low-fat milk"],                                    cal:380 },
    { meal:"Mid-Morning (10AM)",items:["Coconut water","Mixed nuts"],                                                          cal:120 },
    { meal:"Lunch (1PM)",       items:["2 rotis","Palak (spinach) dal","Salad","Curd (yogurt)"],                              cal:520 },
    { meal:"Evening (4PM)",     items:["Pomegranate juice","Roasted makhana"],                                                 cal:130 },
    { meal:"Dinner (7PM)",      items:["Brown rice","Rajma (kidney bean) curry","Steamed vegetables"],                        cal:480 },
    { meal:"Bedtime (9PM)",     items:["Chamomile tea or warm water with flaxseeds"],                                         cal:40  },
  ],
  "General": [
    { meal:"Breakfast (7AM)",   items:["2 eggs or poha (flattened rice)","Fruit","Chai/coffee (limited sugar)"],              cal:380 },
    { meal:"Mid-Morning (10AM)",items:["Seasonal fruit","Handful of nuts"],                                                    cal:140 },
    { meal:"Lunch (1PM)",       items:["2–3 rotis","Dal","Sabzi","Salad","Curd"],                                             cal:550 },
    { meal:"Evening (4PM)",     items:["Green tea","Sprouts chaat or fruit"],                                                 cal:120 },
    { meal:"Dinner (7PM)",      items:["1 cup rice or 2 rotis","Sabzi","Dal or fish/chicken"],                                cal:500 },
  ],
}

function MacroBar({ label, value, max, color }) {
  const pct = Math.min((value/max)*100, 100)
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, fontWeight:600, color:"inherit" }}>{label}</span>
        <span style={{ fontSize:12, color:"inherit" }}>{value}g / {max}g</span>
      </div>
      <div style={{ height:8, backgroundColor:"rgba(255,255,255,0.15)", borderRadius:999 }}>
        <div style={{ width:`${pct}%`, height:"100%", backgroundColor:color, borderRadius:999 }}/>
      </div>
    </div>
  )
}

export default function Diet() {
  const { theme } = useApp()
  const navigate   = useNavigate()
  const dark = theme === "dark"
  const [profile,   setProfile]   = useState(null)
  const [condition, setCondition] = useState("General")
  const [aiQuery,   setAiQuery]   = useState("")
  const [aiResult,  setAiResult]  = useState("")
  const [aiLoad,    setAiLoad]    = useState(false)
  const [tab,       setTab]       = useState("plan")

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  useEffect(()=>{
    getProfile().then(r=>{
      const p = r.data
      setProfile(p)
      // Auto-detect condition from profile
      const c = p.chronic?.toLowerCase()||""
      if(c.includes("diabet")) setCondition("Diabetes")
      else if(c.includes("hypertension")||c.includes("blood pressure")) setCondition("Hypertension")
      else if(c.includes("obes")) setCondition("Obesity")
      else if(c.includes("anemia")) setCondition("Anemia")
    }).catch(()=>{})
  },[])

  const dietData = CONDITION_DIETS[condition] || CONDITION_DIETS["General"]
  const mealPlan = MEAL_PLANS[condition]      || MEAL_PLANS["General"]

  const askAI = async () => {
    if(!aiQuery.trim()) return
    setAiLoad(true); setAiResult("")
    try {
      const q = `Diet and nutrition advice: ${aiQuery}. Give practical Indian diet tips with specific foods.`
      const r = await sendChatMessage(q, [])
      setAiResult(r.data.reply || r.data.sections?.overview || "")
    } catch { setAiResult("Could not get AI response. Check backend.") }
    finally { setAiLoad(false) }
  }

  const bmi = profile?.height_cm && profile?.weight_kg
    ? (profile.weight_kg / ((profile.height_cm/100)**2)).toFixed(1) : null

  return (
    <div style={{ maxWidth:1060, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:24, fontWeight:700, color:textMain, marginBottom:4 }}>Diet & Nutrition</h1>
        <p style={{ fontSize:13, color:textMute }}>
          Personalized nutrition guidance based on your health profile.
          {profile?.chronic && <span style={{ color:dark?"#60A5FA":"#2952A3" }}> Detected: {profile.chronic}</span>}
        </p>
      </div>

      {/* Condition selector */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        {Object.keys(CONDITION_DIETS).map(c=>(
          <button key={c} onClick={()=>setCondition(c)} style={{ padding:"8px 18px", borderRadius:999, border:`1.5px solid ${condition===c?"#1B3A6B":border}`, backgroundColor:condition===c?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:condition===c?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:13, fontWeight:condition===c?700:400, cursor:"pointer" }}>
            {c === "General" ? "🥗 General" : c === "Diabetes" ? "🍽️ Diabetes" : c === "Hypertension" ? "🩺 Hypertension" : c === "Obesity" ? "⚖️ Obesity" : "🩸 Anemia"}
          </button>
        ))}
      </div>

      {/* Macros banner */}
      <div style={{ background:"linear-gradient(135deg,#1B3A6B,#2952A3)", borderRadius:16, padding:"20px 24px", marginBottom:20, color:"#fff" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
          <div>
            <p style={{ fontSize:12, opacity:0.7, marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>Daily Targets for {condition}</p>
            <div style={{ display:"flex", gap:20, marginBottom:14 }}>
              {[{l:"Calories",v:dietData.calories,u:"kcal"},{l:"Protein",v:dietData.protein,u:"g"},{l:"Carbs",v:dietData.carbs,u:"g"},{l:"Fat",v:dietData.fat,u:"g"}].map(m=>(
                <div key={m.l} style={{ textAlign:"center" }}>
                  <p style={{ fontSize:20, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ fontSize:10, opacity:0.7, margin:0 }}>{m.u}<br/>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize:12, opacity:0.7, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>Macro Distribution</p>
            <MacroBar label="Protein" value={dietData.protein} max={dietData.protein+20} color="#22C55E"/>
            <MacroBar label="Carbs"   value={dietData.carbs}   max={dietData.carbs+50}   color="#F59E0B"/>
            <MacroBar label="Fat"     value={dietData.fat}     max={dietData.fat+20}      color="#EF4444"/>
          </div>
        </div>
        {bmi && <p style={{ fontSize:12, opacity:0.7, marginTop:8 }}>Your BMI: {bmi} · Targets adjusted based on condition and profile</p>}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:6, backgroundColor:surface, borderRadius:12, padding:5, marginBottom:20, width:"fit-content", boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        {[["plan","🗓️ Meal Plan"],["foods","🥗 Foods Guide"],["ai","🤖 Ask AI"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 18px", borderRadius:9, border:0, backgroundColor:tab===id?(dark?"#3B82F6":"#1B3A6B"):"transparent", color:tab===id?"#fff":textMute, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab==="plan" && (
        <div>
          <p style={{ fontSize:13, color:textMute, marginBottom:14 }}>Sample Indian meal plan for <strong>{condition}</strong>. Adjust portions based on your dietitian's advice.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {mealPlan.map((meal,i)=>(
              <div key={i} style={{ backgroundColor:surface, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", display:"flex", gap:16, alignItems:"flex-start" }}>
                <div style={{ width:48, height:48, borderRadius:12, backgroundColor:dark?"#1E3A5F":"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:20 }}>{"🌅🌤️🌞☕🌙🌙"[i]||"🍽️"}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:textMain, margin:0 }}>{meal.meal}</p>
                    <span style={{ fontSize:12, backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", padding:"2px 10px", borderRadius:999, fontWeight:600 }}>{meal.cal} kcal</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {meal.items.map(item=>(
                      <span key={item} style={{ fontSize:12, backgroundColor:surface2, color:textMute, padding:"4px 10px", borderRadius:8, border:`1px solid ${border}` }}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="foods" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Eat */}
          <div style={{ backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", border:`1px solid ${dark?"#14532D":"#BBF7D0"}` }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:"#16A34A", marginBottom:14 }}>✅ Eat More</h3>
            {dietData.eat.map(f=>(
              <div key={f} style={{ display:"flex", gap:8, alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${border}` }}>
                <span style={{ color:"#22C55E", fontWeight:700 }}>+</span>
                <span style={{ fontSize:13, color:textMain }}>{f}</span>
              </div>
            ))}
          </div>
          {/* Avoid */}
          <div style={{ backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", border:`1px solid ${dark?"#5B2020":"#FECACA"}` }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:"#DC2626", marginBottom:14 }}>❌ Avoid / Limit</h3>
            {dietData.avoid.map(f=>(
              <div key={f} style={{ display:"flex", gap:8, alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${border}` }}>
                <span style={{ color:"#DC2626", fontWeight:700 }}>−</span>
                <span style={{ fontSize:13, color:textMain }}>{f}</span>
              </div>
            ))}
          </div>
          {/* Tips full width */}
          <div style={{ gridColumn:"1/-1", backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:14 }}>💡 Nutrition Tips for {condition}</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {dietData.tips.map((tip,i)=>(
                <div key={i} style={{ display:"flex", gap:10, backgroundColor:surface2, borderRadius:10, padding:12 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{"💧🥗🍽️🚶"[i]||"💡"}</span>
                  <span style={{ fontSize:13, color:textMain, lineHeight:1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==="ai" && (
        <div style={{ maxWidth:700 }}>
          <div style={{ backgroundColor:surface, borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:6 }}>🤖 AI Nutrition Assistant</h3>
            <p style={{ fontSize:13, color:textMute, marginBottom:16 }}>Ask anything about diet, nutrients, Indian food alternatives, or meal planning.</p>
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <input value={aiQuery} onChange={e=>setAiQuery(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&askAI()}
                placeholder="e.g. What should I eat for breakfast with diabetes? Is rice ok?"
                style={{ flex:1, backgroundColor:surface2, border:`1px solid ${border}`, borderRadius:10, padding:"11px 14px", fontSize:14, color:textMain, outline:"none", fontFamily:"DM Sans,sans-serif" }}/>
              <button onClick={askAI} disabled={aiLoad||!aiQuery.trim()} style={{ padding:"11px 20px", borderRadius:10, border:0, backgroundColor:aiQuery.trim()?"#1B3A6B":"#94A3B8", color:"#fff", fontSize:14, fontWeight:600, cursor:aiQuery.trim()?"pointer":"default" }}>
                {aiLoad?"…":"Ask"}
              </button>
            </div>
            {/* Quick questions */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {[`Best breakfast for ${condition}`,`Indian foods to avoid with ${condition}`,"How much water daily?","Low calorie Indian snacks"].map(q=>(
                <button key={q} onClick={()=>{setAiQuery(q);setTimeout(()=>askAI(),100)}} style={{ fontSize:11, padding:"5px 12px", borderRadius:999, border:`1px solid ${border}`, backgroundColor:"transparent", color:dark?"#60A5FA":"#2952A3", cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
                  {q}
                </button>
              ))}
            </div>
            {aiResult && (
              <div style={{ backgroundColor:surface2, borderRadius:12, padding:16, border:`1px solid ${border}` }}>
                <p style={{ fontSize:13, color:textMain, lineHeight:1.7, margin:0 }}>{aiResult}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}