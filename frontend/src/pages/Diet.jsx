// MediMate/frontend/src/pages/Diet.jsx
import { useState, useEffect } from "react"
import { useApp } from "../context/ThemeContext"
import { getProfile } from "../api/index"
import { sendChatMessage } from "../api/index"

const CONDITIONS = ["General","Diabetes","Hypertension","Obesity","Anemia"]

const CONDITION_DATA = {
  General:      { kcal:2000, protein:75,  carbs:250, fat:65 },
  Diabetes:     { kcal:1800, protein:90,  carbs:200, fat:60 },
  Hypertension: { kcal:2000, protein:75,  carbs:250, fat:55 },
  Obesity:      { kcal:1500, protein:100, carbs:150, fat:50 },
  Anemia:       { kcal:2000, protein:80,  carbs:260, fat:65 },
}

const MEAL_PLANS = {
  General: [
    { time:"Breakfast · 7AM",    cal:380, icon:"🌅", items:["2 eggs / poha (flattened rice)","Seasonal fruit","Chai with less sugar"] },
    { time:"Mid-Morning · 10AM", cal:140, icon:"☀️", items:["Handful of nuts","1 fruit"] },
    { time:"Lunch · 1PM",        cal:550, icon:"🌞", items:["2–3 rotis","Dal (lentils)","Sabzi (vegetables)","Salad","Curd"] },
    { time:"Evening · 4PM",      cal:120, icon:"☕", items:["Green tea","Sprouts chaat or roasted chana"] },
    { time:"Dinner · 7PM",       cal:500, icon:"🌙", items:["Rice or 2 rotis","Sabzi","Dal or fish/chicken"] },
  ],
  Diabetes: [
    { time:"Breakfast · 7AM",    cal:350, icon:"🌅", items:["Oats with nuts and seeds","1 boiled egg","Green tea (no sugar)"] },
    { time:"Mid-Morning · 10AM", cal:150, icon:"☀️", items:["1 small apple","10 almonds"] },
    { time:"Lunch · 1PM",        cal:500, icon:"🌞", items:["2 multigrain roti","Dal","Sabzi","Salad with lemon","Curd"] },
    { time:"Evening · 4PM",      cal:150, icon:"☕", items:["Karela juice / buttermilk","Roasted chana"] },
    { time:"Dinner · 7PM",       cal:450, icon:"🌙", items:["1 cup brown rice or 2 rotis","Sabzi","Dal","Cucumber raita"] },
    { time:"Bedtime · 9PM",      cal:80,  icon:"🌙", items:["Warm low-fat milk + pinch turmeric"] },
  ],
  Hypertension: [
    { time:"Breakfast · 7AM",    cal:380, icon:"🌅", items:["Oats porridge","1 banana","Low-fat milk"] },
    { time:"Mid-Morning · 10AM", cal:120, icon:"☀️", items:["Coconut water","Mixed nuts (unsalted)"] },
    { time:"Lunch · 1PM",        cal:520, icon:"🌞", items:["2 rotis (no salt)","Palak dal","Salad","Curd"] },
    { time:"Evening · 4PM",      cal:130, icon:"☕", items:["Pomegranate juice","Roasted makhana"] },
    { time:"Dinner · 7PM",       cal:480, icon:"🌙", items:["Brown rice","Rajma (unsalted)","Steamed vegetables"] },
  ],
  Obesity: [
    { time:"Breakfast · 7AM",    cal:300, icon:"🌅", items:["Moong dal chilla (2 pieces)","Green chutney","Herbal tea"] },
    { time:"Mid-Morning · 10AM", cal:100, icon:"☀️", items:["Cucumber / carrot sticks","Lemon water"] },
    { time:"Lunch · 1PM",        cal:450, icon:"🌞", items:["1–2 roti","Large salad","Dal","No rice"] },
    { time:"Evening · 4PM",      cal:100, icon:"☕", items:["Roasted makhana","Green tea"] },
    { time:"Dinner · 7PM",       cal:400, icon:"🌙", items:["Vegetable soup","1 roti","Sautéed vegetables"] },
  ],
  Anemia: [
    { time:"Breakfast · 7AM",    cal:380, icon:"🌅", items:["Besan chilla + iron-rich greens","Orange juice (Vitamin C)","Jaggery tea"] },
    { time:"Mid-Morning · 10AM", cal:150, icon:"☀️", items:["Dates (2–3)","Mixed seeds (pumpkin, sunflower)"] },
    { time:"Lunch · 1PM",        cal:550, icon:"🌞", items:["Rajma chawal or roti","Palak dal","Beetroot salad","Lemon water"] },
    { time:"Evening · 4PM",      cal:130, icon:"☕", items:["Pomegranate juice","Roasted chana"] },
    { time:"Dinner · 7PM",       cal:480, icon:"🌙", items:["Roti + Iron-rich sabzi (methi/palak)","Sprouts"] },
  ],
}

const FOODS_DATA = {
  General: {
    eat:   ["Fruits & vegetables (5 servings/day)","Whole grains (oats, brown rice)","Lean protein (dal, eggs, chicken)","Healthy fats (nuts, olive oil)","Dairy / curd"],
    avoid: ["Trans fats & fried foods","Processed / packaged snacks","Excess sugar & maida","Excess salt"],
    tips:  ["Eat a rainbow of vegetables daily","8 glasses of water minimum","Don't skip breakfast","Eat slowly — 20 min per meal"],
  },
  Diabetes: {
    eat:   ["Bitter gourd (karela)","Fenugreek (methi)","Oats & barley","Leafy greens","Berries","Nuts & seeds","Cinnamon"],
    avoid: ["White rice & maida","Sugary drinks & juices","Sweets & mithai","Mango & grapes","Processed foods"],
    tips:  ["Small meals every 3–4 hrs","Check blood sugar before and 2hrs after meals","Never skip meals","Avoid fruit juices — eat whole fruit instead"],
  },
  Hypertension: {
    eat:   ["Bananas (potassium)","Spinach & leafy greens","Garlic","Flaxseeds","Oats","Low-fat dairy","Fish (omega-3)","Pomegranate"],
    avoid: ["Salt & pickles (achar)","Papad & namkeen","Processed meats","Alcohol","Excess caffeine","Fried foods"],
    tips:  ["Limit sodium <2g/day","Use lemon/herbs instead of salt","DASH diet approach","30 mins walk daily"],
  },
  Obesity: {
    eat:   ["Dal & legumes (high protein)","Salads with lemon dressing","Fruits (not juice)","Egg whites","Curd","Whole grains","Green tea"],
    avoid: ["Fried foods (samosa, pakoda)","Maida & white bread","Sugary drinks","Packaged snacks","Full-fat dairy"],
    tips:  ["500 kcal deficit per day","Drink water before meals","No eating after 8PM","High-protein breakfast reduces cravings"],
  },
  Anemia: {
    eat:   ["Spinach (palak)","Beetroot","Pomegranate","Dates & figs","Jaggery (gur)","Red meat","Rajma & chana","Pumpkin seeds","Vitamin C foods"],
    avoid: ["Tea/coffee with meals (blocks iron absorption)","Calcium-rich foods at same time as iron","Processed foods"],
    tips:  ["Eat iron + Vitamin C together for 2x absorption","Avoid tea 1 hr before/after iron-rich meals","Cook in iron cookware"],
  },
}

// ── Nutrient-wise foods ────────────────────────────────────────
const NUTRIENTS = [
  {
    key:"vitA", name:"Vitamin A", emoji:"🥕", color:"#F59E0B",
    role:"Vision, immune system, skin health",
    rda:"900 mcg/day (men) · 700 mcg/day (women)",
    foods:[
      { name:"Sweet potato",    amount:"1 medium",    pct:204 },
      { name:"Carrot (gajar)",  amount:"1 medium",    pct:148 },
      { name:"Spinach (palak)", amount:"½ cup cooked",pct:105 },
      { name:"Mango",           amount:"1 cup",       pct:36  },
      { name:"Eggs",            amount:"1 large",     pct:15  },
      { name:"Milk",            amount:"1 cup",       pct:12  },
    ],
  },
  {
    key:"vitB12", name:"Vitamin B12", emoji:"🥩", color:"#DC2626",
    role:"Nerve function, red blood cells, DNA synthesis",
    rda:"2.4 mcg/day",
    foods:[
      { name:"Beef / mutton",   amount:"100g",       pct:833  },
      { name:"Chicken liver",   amount:"100g",       pct:2917 },
      { name:"Eggs",            amount:"2 large",    pct:46   },
      { name:"Milk",            amount:"1 cup",      pct:21   },
      { name:"Curd/Yogurt",     amount:"1 cup",      pct:23   },
      { name:"Paneer",          amount:"100g",       pct:8    },
    ],
    vegetarianNote:"⚠ B12 is found almost exclusively in animal products. Vegetarians should take B12 supplements.",
  },
  {
    key:"vitC", name:"Vitamin C", emoji:"🍋", color:"#22C55E",
    role:"Immune function, collagen synthesis, iron absorption",
    rda:"90 mg/day (men) · 75 mg/day (women)",
    foods:[
      { name:"Amla (Indian gooseberry)", amount:"1 fruit",  pct:1567 },
      { name:"Guava (amrood)",           amount:"1 medium", pct:228  },
      { name:"Capsicum (red)",           amount:"1 medium", pct:213  },
      { name:"Lemon",                    amount:"juice of 1",pct:51  },
      { name:"Orange (santara)",         amount:"1 medium", pct:93   },
      { name:"Tomato",                   amount:"1 medium", pct:28   },
    ],
  },
  {
    key:"vitD", name:"Vitamin D", emoji:"☀️", color:"#F59E0B",
    role:"Bone health, calcium absorption, immunity",
    rda:"600 IU/day (15 mcg)",
    foods:[
      { name:"Sunlight exposure",       amount:"15–20 mins/day", pct:100 },
      { name:"Fatty fish (salmon)",     amount:"100g",           pct:100 },
      { name:"Egg yolk",                amount:"1 large",        pct:6   },
      { name:"Fortified milk",          amount:"1 cup",          pct:15  },
      { name:"Mushrooms (sun-dried)",   amount:"½ cup",          pct:46  },
    ],
    vegetarianNote:"⚠ Most Indians are D-deficient. 20 mins of morning sunlight daily is the best free source.",
  },
  {
    key:"iron", name:"Iron", emoji:"🩸", color:"#DC2626",
    role:"Oxygen transport, energy production, immune function",
    rda:"8 mg/day (men) · 18 mg/day (women) · 27 mg pregnant",
    foods:[
      { name:"Liver (chicken/beef)", amount:"100g",         pct:175 },
      { name:"Rajma (kidney beans)", amount:"1 cup cooked", pct:29  },
      { name:"Spinach (palak)",      amount:"1 cup cooked", pct:36  },
      { name:"Tofu",                 amount:"½ cup",        pct:19  },
      { name:"Pumpkin seeds",        amount:"30g",          pct:23  },
      { name:"Dates (khajoor)",      amount:"5 pieces",     pct:8   },
      { name:"Jaggery (gur)",        amount:"1 tbsp",       pct:6   },
    ],
    tip:"Eat with Vitamin C foods to increase absorption by 2–3x.",
  },
  {
    key:"calcium", name:"Calcium", emoji:"🦴", color:"#3B82F6",
    role:"Bone & teeth strength, muscle function, nerve signals",
    rda:"1000 mg/day adults · 1200 mg/day women 51+",
    foods:[
      { name:"Curd / Dahi",         amount:"1 cup",       pct:30 },
      { name:"Milk",                amount:"1 cup",       pct:28 },
      { name:"Paneer",              amount:"100g",        pct:21 },
      { name:"Ragi (finger millet)",amount:"100g",        pct:35 },
      { name:"Til (sesame seeds)",  amount:"1 tbsp",      pct:10 },
      { name:"Almonds (badam)",     amount:"30g",         pct:8  },
      { name:"Spinach",             amount:"1 cup cooked",pct:25 },
    ],
  },
  {
    key:"protein", name:"Protein", emoji:"💪", color:"#7C3AED",
    role:"Muscle building, repair, enzyme & hormone production",
    rda:"0.8–1g per kg body weight per day",
    foods:[
      { name:"Chicken breast",    amount:"100g",        g:31 },
      { name:"Eggs",              amount:"1 large",     g:6  },
      { name:"Moong dal",         amount:"1 cup cooked",g:14 },
      { name:"Rajma",             amount:"1 cup cooked",g:15 },
      { name:"Paneer",            amount:"100g",        g:18 },
      { name:"Soya chunks",       amount:"½ cup dry",   g:52 },
      { name:"Greek yogurt",      amount:"1 cup",       g:17 },
      { name:"Peanuts (mungfali)",amount:"30g",         g:7  },
    ],
  },
  {
    key:"omega3", name:"Omega-3 Fatty Acids", emoji:"🐟", color:"#0891B2",
    role:"Heart health, brain function, inflammation reduction",
    rda:"1.6g/day (men) · 1.1g/day (women)",
    foods:[
      { name:"Salmon / Mackerel (rohu)", amount:"100g",   g:2.3 },
      { name:"Flaxseeds (alsi)",         amount:"1 tbsp", g:2.3 },
      { name:"Chia seeds",               amount:"1 tbsp", g:1.8 },
      { name:"Walnuts (akhrot)",         amount:"30g",    g:2.6 },
      { name:"Soybeans",                 amount:"1 cup",  g:1.0 },
      { name:"Mustard oil",              amount:"1 tbsp", g:0.8 },
    ],
    vegetarianNote:"Vegetarians: prioritise flaxseeds, chia seeds, and walnuts daily.",
  },
  {
    key:"fiber", name:"Dietary Fiber", emoji:"🌾", color:"#16A34A",
    role:"Digestive health, blood sugar control, cholesterol reduction",
    rda:"25g/day (women) · 38g/day (men)",
    foods:[
      { name:"Rajma",                     amount:"1 cup cooked", g:15  },
      { name:"Chana (chickpeas)",         amount:"1 cup cooked", g:12  },
      { name:"Oats",                      amount:"1 cup cooked", g:4   },
      { name:"Avocado",                   amount:"½ avocado",    g:5   },
      { name:"Psyllium husk (isabgol)",   amount:"1 tsp",        g:3   },
      { name:"Pears",                     amount:"1 medium",     g:5.5 },
      { name:"Whole wheat roti",          amount:"2 rotis",      g:4   },
    ],
  },
]

// ── Nutrient Card ──────────────────────────────────────────────
function NutrientCard({ n, dark }) {
  const [open, setOpen] = useState(false)
  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  return (
    <div style={{ backgroundColor:surface, borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(27,58,107,0.08)", border:`1px solid ${border}` }}>
      <div onClick={()=>setOpen(v=>!v)} style={{ padding:"16px 18px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, backgroundColor:`${n.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
            {n.emoji}
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:textMain, margin:0 }}>{n.name}</p>
            <p style={{ fontSize:11, color:textMute, margin:0 }}>{n.role}</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, backgroundColor:`${n.color}18`, color:n.color, padding:"2px 8px", borderRadius:999, fontWeight:600 }}>
            RDA: {n.rda.split("·")[0].trim()}
          </span>
          <span style={{ color:textMute, fontSize:18, transition:"transform 0.2s", transform:open?"rotate(180deg)":"none", display:"inline-block" }}>⌄</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${border}`, padding:"14px 18px", backgroundColor:surface2 }}>
          <p style={{ fontSize:11, fontWeight:700, color:n.color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Top Food Sources</p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {n.foods.map((f,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", backgroundColor:surface, borderRadius:8 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ width:20, height:20, borderRadius:"50%", backgroundColor:`${n.color}18`, color:n.color, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{i+1}</span>
                  <span style={{ fontSize:13, color:textMain, fontWeight:500 }}>{f.name}</span>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:textMute }}>{f.amount}</span>
                  {f.pct && <span style={{ fontSize:11, fontWeight:700, color:f.pct>=100?"#22C55E":f.pct>=50?"#F59E0B":"#94A3B8", backgroundColor:f.pct>=100?"#F0FDF4":f.pct>=50?"#FFFBEB":"transparent", padding:"1px 7px", borderRadius:999 }}>{f.pct}% DV</span>}
                  {f.g   && <span style={{ fontSize:11, fontWeight:700, color:n.color, backgroundColor:`${n.color}18`, padding:"1px 7px", borderRadius:999 }}>{f.g}g</span>}
                </div>
              </div>
            ))}
          </div>
          {n.vegetarianNote && <p style={{ fontSize:12, color:"#D97706", marginTop:10, lineHeight:1.5 }}>{n.vegetarianNote}</p>}
          {n.tip            && <p style={{ fontSize:12, color:"#16A34A", marginTop:10, lineHeight:1.5 }}>💡 {n.tip}</p>}
        </div>
      )}
    </div>
  )
}

// ── AI Response Renderer — renders the full structured chat.py response ──────
function AIResponseCard({ result, dark }) {
  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  if (!result) return null

  const { reply, sections, preliminary_assessment, suggested_questions, disclaimer } = result
  const s = sections || {}

  // Helper: render a tagged list (green bullets)
  const TagList = ({ items, color="#22C55E", bg }) => {
    if (!items?.length) return null
    return (
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            fontSize:12, padding:"4px 10px", borderRadius:8,
            backgroundColor: bg || (dark?"#0F172A":"#F4F6FA"),
            color: textMain, border:`1px solid ${border}`,
            lineHeight:1.4
          }}>
            {item}
          </span>
        ))}
      </div>
    )
  }

  // Helper: render a two-column dos/donts grid
  const DosDonts = () => {
    if (!s.dos?.length && !s.donts?.length) return null
    return (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:4 }}>
        {s.dos?.length > 0 && (
          <div style={{ backgroundColor:dark?"#052e16":"#f0fdf4", borderRadius:10, padding:12, border:`1px solid ${dark?"#14532d":"#bbf7d0"}` }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#16A34A", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>✅ Do's</p>
            {s.dos.map((d,i) => (
              <div key={i} style={{ display:"flex", gap:6, marginBottom:5 }}>
                <span style={{ color:"#22C55E", fontWeight:700, flexShrink:0 }}>+</span>
                <span style={{ fontSize:12, color:textMain, lineHeight:1.45 }}>{d}</span>
              </div>
            ))}
          </div>
        )}
        {s.donts?.length > 0 && (
          <div style={{ backgroundColor:dark?"#2d0a0a":"#fff5f5", borderRadius:10, padding:12, border:`1px solid ${dark?"#5b2020":"#fecaca"}` }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#DC2626", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>❌ Don'ts</p>
            {s.donts.map((d,i) => (
              <div key={i} style={{ display:"flex", gap:6, marginBottom:5 }}>
                <span style={{ color:"#DC2626", fontWeight:700, flexShrink:0 }}>−</span>
                <span style={{ fontSize:12, color:textMain, lineHeight:1.45 }}>{d}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ backgroundColor:surface2, borderRadius:14, border:`1px solid ${border}`, overflow:"hidden" }}>

      {/* Reply summary banner */}
      {reply && (
        <div style={{ backgroundColor:dark?"#1e3a5f":"#EEF2FF", padding:"14px 18px", borderBottom:`1px solid ${border}` }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:20, flexShrink:0 }}>🤖</span>
            <p style={{ fontSize:13, fontWeight:600, color:dark?"#93C5FD":"#1B3A6B", lineHeight:1.6, margin:0 }}>{reply}</p>
          </div>
        </div>
      )}

      <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* Overview */}
        {s.overview && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>📋 Overview</p>
            <p style={{ fontSize:13, color:textMain, lineHeight:1.7, margin:0, backgroundColor:surface, borderRadius:10, padding:12, border:`1px solid ${border}` }}>{s.overview}</p>
          </div>
        )}

        {/* Possible Conditions */}
        {preliminary_assessment?.possible_conditions?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>🔍 Possible Conditions</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {preliminary_assessment.possible_conditions.map((c,i) => (
                <span key={i} style={{ fontSize:12, padding:"4px 12px", borderRadius:999, backgroundColor:i===0?(dark?"#1e3a5f":"#EEF2FF"):(dark?"#1E293B":"#F4F6FA"), color:i===0?(dark?"#60A5FA":"#1B3A6B"):textMute, fontWeight:i===0?700:400, border:`1px solid ${i===0?(dark?"#3B82F6":"#C7D2FE"):border}` }}>
                  {i===0?"★ ":""}{c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Foods / Symptoms — whichever fits the nutrition context, show as "Key Foods" */}
        {s.symptoms?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>🥗 Key Foods / Items</p>
            <TagList items={s.symptoms} />
          </div>
        )}

        {/* Medicines / Supplements */}
        {s.medicines?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>💊 Supplements / Medicines</p>
            <TagList items={s.medicines} color="#7C3AED" />
          </div>
        )}

        {/* Precautions */}
        {s.precautions?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>⚠️ Precautions</p>
            <TagList items={s.precautions} color="#F59E0B" />
          </div>
        )}

        {/* Risk Factors */}
        {s.risk_factors?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>🚨 Risk Factors</p>
            <TagList items={s.risk_factors} color="#DC2626" />
          </div>
        )}

        {/* Do's & Don'ts */}
        <DosDonts />

        {/* Suggested Questions */}
        {suggested_questions?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:textMute, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>💬 Follow-up Questions</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {suggested_questions.map((q,i) => (
                <div key={i} style={{ fontSize:12, color:dark?"#60A5FA":"#2952A3", backgroundColor:dark?"#1e3a5f":"#EEF2FF", borderRadius:8, padding:"7px 12px", cursor:"pointer", border:`1px solid ${dark?"#3B82F6":"#C7D2FE"}` }}
                  onClick={() => {/* parent will wire this */}}>
                  → {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <p style={{ fontSize:11, color:textMute, borderTop:`1px solid ${border}`, paddingTop:10, margin:0, lineHeight:1.5, fontStyle:"italic" }}>
            ⚕️ {disclaimer}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Diet Page ─────────────────────────────────────────────
export default function Diet() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const [condition, setCondition] = useState("General")
  const [profile,   setProfile]   = useState(null)
  const [tab,       setTab]       = useState("plan")
  const [aiQuery,   setAiQuery]   = useState("")
  const [aiResult,  setAiResult]  = useState(null)   // now an object, not a string
  const [aiLoad,    setAiLoad]    = useState(false)
  const [nutSearch, setNutSearch] = useState("")

  const surface  = dark?"#1E293B":"#fff"
  const surface2 = dark?"#0F172A":"#F4F6FA"
  const border   = dark?"#2D3F5A":"#E5E9F2"
  const textMain = dark?"#F1F5F9":"#1A1A2E"
  const textMute = dark?"#94A3B8":"#64748B"

  useEffect(()=>{
    getProfile().then(r=>{
      const p = r.data; setProfile(p)
      const c = (p.chronic||"").toLowerCase()
      if(c.includes("diabet"))                               setCondition("Diabetes")
      else if(c.includes("hypertension")||c.includes("bp")) setCondition("Hypertension")
      else if(c.includes("obes"))                            setCondition("Obesity")
      else if(c.includes("anemia")||c.includes("anaemia"))  setCondition("Anemia")
    }).catch(()=>{})
  },[])

  const macro    = CONDITION_DATA[condition]
  const meal     = MEAL_PLANS[condition]  || MEAL_PLANS.General
  const foods    = FOODS_DATA[condition]  || FOODS_DATA.General
  const bmi      = profile?.height_cm && profile?.weight_kg
    ? (profile.weight_kg / ((profile.height_cm / 100) ** 2)).toFixed(1) : null
  const totalCal = meal.reduce((s,m) => s + m.cal, 0)

  const askAI = async (query) => {
    const q = (query || aiQuery).trim()
    if (!q || aiLoad) return
    if (query) setAiQuery(query)   // fill input when clicking a chip
    setAiLoad(true)
    setAiResult(null)
    try {
      // Enrich query with condition context for better Gemini results
      const enriched = `Diet and nutrition advice (Indian context) for ${condition}: ${q}. Give practical, specific food suggestions.`
      const r = await sendChatMessage(enriched, [])
      // r.data IS the full structured response from chat.py
      setAiResult(r.data)
    } catch {
      setAiResult({
        reply: "Backend not reachable. Please make sure the server is running.",
        sections: null,
        disclaimer: null,
        suggested_questions: [],
      })
    } finally {
      setAiLoad(false)
    }
  }

  const filteredNutrients = NUTRIENTS.filter(n =>
    !nutSearch ||
    n.name.toLowerCase().includes(nutSearch.toLowerCase()) ||
    n.foods.some(f => f.name.toLowerCase().includes(nutSearch.toLowerCase()))
  )

  const CHIPS = [
    `Best breakfast for ${condition}`,
    "High protein vegetarian Indian foods",
    "Foods rich in Vitamin B12",
    "Low calorie Indian snacks",
    "Iron rich foods for anemia",
  ]

  return (
    <div style={{ maxWidth:1000, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:24, fontWeight:700, color:textMain, marginBottom:4 }}>Diet & Nutrition</h1>
        <p style={{ fontSize:13, color:textMute }}>
          Personalized Indian nutrition guidance.
          {profile?.chronic && (
            <span style={{ color:dark?"#60A5FA":"#2952A3" }}> Auto-detected: <strong>{condition}</strong></span>
          )}
        </p>
      </div>

      {/* Condition pills */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        {CONDITIONS.map(c => {
          const emojis = {General:"🥗",Diabetes:"🍽️",Hypertension:"🩺",Obesity:"⚖️",Anemia:"🩸"}
          return (
            <button key={c} onClick={()=>setCondition(c)}
              style={{ padding:"8px 18px", borderRadius:999, border:`1.5px solid ${condition===c?"#1B3A6B":border}`, backgroundColor:condition===c?(dark?"#1E3A5F":"#EEF2FF"):"transparent", color:condition===c?(dark?"#60A5FA":"#1B3A6B"):textMute, fontSize:13, fontWeight:condition===c?700:400, cursor:"pointer" }}>
              {emojis[c]} {c}
            </button>
          )
        })}
      </div>

      {/* Macro banner */}
      <div style={{ background:"linear-gradient(135deg,#1B3A6B,#2952A3)", borderRadius:16, padding:"20px 28px", marginBottom:20, color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontSize:11, opacity:0.7, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Daily Targets · {condition}</p>
            <div style={{ display:"flex", gap:24 }}>
              {[["Calories",macro.kcal,"kcal"],["Protein",macro.protein,"g"],["Carbs",macro.carbs,"g"],["Fat",macro.fat,"g"]].map(([l,v,u])=>(
                <div key={l} style={{ textAlign:"center" }}>
                  <p style={{ fontSize:22, fontWeight:800, margin:0 }}>{v}</p>
                  <p style={{ fontSize:10, opacity:0.7, margin:0 }}>{u} {l}</p>
                </div>
              ))}
            </div>
          </div>
          {bmi && (
            <div style={{ backgroundColor:"rgba(255,255,255,0.12)", borderRadius:12, padding:"10px 20px", textAlign:"center" }}>
              <p style={{ fontSize:11, opacity:0.7, margin:0 }}>Your BMI</p>
              <p style={{ fontSize:24, fontWeight:800, margin:0 }}>{bmi}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:6, backgroundColor:surface, borderRadius:12, padding:5, marginBottom:20, width:"fit-content", boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        {[["plan","🗓️ Meal Plan"],["foods","🥗 Foods Guide"],["nutrients","💊 Nutrients & Vitamins"],["ai","🤖 Ask AI"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:"8px 16px", borderRadius:9, border:0, backgroundColor:tab===id?(dark?"#3B82F6":"#1B3A6B"):"transparent", color:tab===id?"#fff":textMute, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Meal Plan tab ── */}
      {tab==="plan" && (
        <div>
          <p style={{ fontSize:13, color:textMute, marginBottom:14 }}>Indian meal plan for <strong>{condition}</strong> · ~{totalCal} kcal/day</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {meal.map((m,i)=>(
              <div key={i} style={{ backgroundColor:surface, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", display:"flex", gap:16, alignItems:"flex-start" }}>
                <div style={{ width:48, height:48, borderRadius:12, backgroundColor:surface2, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:22 }}>
                  {m.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:textMain, margin:0 }}>{m.time}</p>
                    <span style={{ fontSize:12, backgroundColor:dark?"#1E3A5F":"#EEF2FF", color:dark?"#60A5FA":"#1B3A6B", padding:"2px 10px", borderRadius:999, fontWeight:600 }}>~{m.cal} kcal</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {m.items.map(item=>(
                      <span key={item} style={{ fontSize:12, backgroundColor:surface2, color:textMute, padding:"4px 10px", borderRadius:8, border:`1px solid ${border}` }}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Foods Guide tab ── */}
      {tab==="foods" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div style={{ backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", border:`1px solid ${dark?"#14532D":"#BBF7D0"}` }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:"#16A34A", marginBottom:14 }}>✅ Eat More</h3>
              {foods.eat.map(f=>(
                <div key={f} style={{ display:"flex", gap:8, alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${border}` }}>
                  <span style={{ color:"#22C55E", fontWeight:700 }}>+</span>
                  <span style={{ fontSize:13, color:textMain }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", border:`1px solid ${dark?"#5B2020":"#FECACA"}` }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:"#DC2626", marginBottom:14 }}>❌ Avoid / Limit</h3>
              {foods.avoid.map(f=>(
                <div key={f} style={{ display:"flex", gap:8, alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${border}` }}>
                  <span style={{ color:"#DC2626", fontWeight:700 }}>−</span>
                  <span style={{ fontSize:13, color:textMain }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor:surface, borderRadius:16, padding:22, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:14 }}>💡 Tips for {condition}</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {foods.tips.map((tip,i)=>(
                <div key={i} style={{ display:"flex", gap:10, backgroundColor:surface2, borderRadius:10, padding:12 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{"💧🥗🍽️🚶"[i]||"💡"}</span>
                  <span style={{ fontSize:13, color:textMain, lineHeight:1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Nutrients tab ── */}
      {tab==="nutrients" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <h2 style={{ fontSize:16, fontWeight:700, color:textMain, margin:0 }}>Nutrient & Vitamin Guide</h2>
              <p style={{ fontSize:13, color:textMute, margin:"4px 0 0" }}>Daily value (DV) % based on recommended daily intake. Indian food sources highlighted.</p>
            </div>
            <input value={nutSearch} onChange={e=>setNutSearch(e.target.value)}
              placeholder="Search vitamin or food..."
              style={{ backgroundColor:surface, border:`1px solid ${border}`, borderRadius:10, padding:"8px 14px", fontSize:13, color:textMain, outline:"none", width:220 }}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filteredNutrients.map(n=><NutrientCard key={n.key} n={n} dark={dark}/>)}
          </div>
          <div style={{ backgroundColor:surface2, borderRadius:12, padding:14, marginTop:16, border:`1px solid ${border}` }}>
            <p style={{ fontSize:12, color:textMute, lineHeight:1.6, margin:0 }}>
              📌 <strong>DV = Daily Value</strong> percentage. Values above 100% mean a single serving covers more than the daily requirement.
              All values are approximate. Consult a registered dietitian for personalised targets.
            </p>
          </div>
        </div>
      )}

      {/* ── AI Nutrition Assistant tab ── */}
      {tab==="ai" && (
        <div style={{ maxWidth:760 }}>
          <div style={{ backgroundColor:surface, borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(27,58,107,0.08)", marginBottom:16 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:4 }}>🤖 AI Nutrition Assistant</h3>
            <p style={{ fontSize:13, color:textMute, marginBottom:16 }}>Ask anything about diet, Indian food options, nutrients, or meal planning for your condition.</p>

            {/* Input row */}
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <input
                value={aiQuery}
                onChange={e=>setAiQuery(e.target.value)}
                onKeyDown={e=>e.key==="Enter" && askAI()}
                placeholder={`e.g. Can I eat rice with ${condition}? Best protein sources for vegetarians?`}
                style={{ flex:1, backgroundColor:surface2, border:`1px solid ${border}`, borderRadius:10, padding:"11px 14px", fontSize:14, color:textMain, outline:"none", fontFamily:"DM Sans,sans-serif" }}
              />
              <button
                onClick={()=>askAI()}
                disabled={aiLoad || !aiQuery.trim()}
                style={{ padding:"11px 22px", borderRadius:10, border:0, backgroundColor:aiQuery.trim()&&!aiLoad?"#1B3A6B":"#94A3B8", color:"#fff", fontSize:14, fontWeight:600, cursor:aiQuery.trim()&&!aiLoad?"pointer":"default", flexShrink:0 }}>
                {aiLoad ? "…" : "Ask"}
              </button>
            </div>

            {/* Quick-question chips */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {CHIPS.map(q=>(
                <button key={q} onClick={()=>askAI(q)}
                  style={{ fontSize:11, padding:"5px 12px", borderRadius:999, border:`1px solid ${border}`, backgroundColor:"transparent", color:dark?"#60A5FA":"#2952A3", cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {aiLoad && (
            <div style={{ backgroundColor:surface, borderRadius:14, padding:24, border:`1px solid ${border}`, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🤖</div>
              <p style={{ fontSize:13, color:textMute, margin:0 }}>Analysing your question…</p>
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:12 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:8, height:8, borderRadius:"50%", backgroundColor:"#1B3A6B", opacity:0.4, animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                ))}
              </div>
              <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
            </div>
          )}

          {/* Full structured response */}
          {!aiLoad && aiResult && (
            <AIResponseCard result={aiResult} dark={dark} />
          )}
        </div>
      )}
    </div>
  )
}