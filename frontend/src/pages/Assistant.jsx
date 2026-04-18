// MediMate/frontend/src/pages/Assistant.jsx
import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import { sendChatMessage } from "../api/index"
import { Send, Bot, User, Mic } from "lucide-react"

const SUGGESTIONS = [
  "I have a headache and fever for 2 days.",
  "Tell me about malaria treatment.",
  "What are symptoms of diabetes?",
  "How do I lower high blood pressure?",
  "I have tooth pain. What should I do?",
]

function StructuredCard({ data, dark, onSuggestedClick }) {
  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const textMain = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute = dark ? "#64748B" : "#8899B4"
  const s = data.sections

  if(!s) return null

  const Section = ({ title, icon, items, color="#1B3A6B" }) => {
    if(!items?.length) return null
    return (
      <div style={{ marginBottom:12 }}>
        <p style={{ fontSize:11, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{icon} {title}</p>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {items.map((item,i)=>(
            <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
              <span style={{ color, fontWeight:700, flexShrink:0, marginTop:1 }}>·</span>
              <span style={{ fontSize:12, color:textMain, lineHeight:1.4, textTransform:"capitalize" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
      {/* Overview */}
      {s.overview && (
        <div style={{ backgroundColor:dark?"#1E3A5F":"#EEF2FF", borderRadius:12, padding:"10px 14px" }}>
          <p style={{ fontSize:13, color:dark?"#CBD5E1":"#334155", lineHeight:1.6, margin:0 }}>{s.overview}</p>
        </div>
      )}

      {/* Possible conditions (symptom analysis) */}
      {data.preliminary_assessment?.possible_conditions&&(
        <div style={{ backgroundColor:dark?"#1E3A5F":"#EEF2FF", borderRadius:12, padding:"10px 14px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:dark?"#60A5FA":"#1B3A6B", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>🩺 Possible Conditions</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {data.preliminary_assessment.possible_conditions.map((c,i)=>(
              <span key={c} style={{ fontSize:12, fontWeight:i===0?700:400, backgroundColor:i===0?(dark?"#1B3A6B":"#1B3A6B"):(dark?"#162032":"#fff"), color:i===0?"#fff":(dark?"#94A3B8":"#64748B"), padding:"3px 10px", borderRadius:999, border:i===0?"none":`1px solid ${border}` }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* 2-col detail grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {s.symptoms?.length>0&&(
          <div style={{ backgroundColor:dark?"#0F172A":"#F9FAFB", borderRadius:12, padding:"12px 14px", border:`1px solid ${border}` }}>
            <Section title="Symptoms" icon="🩺" items={s.symptoms.slice(0,5)} color={dark?"#60A5FA":"#1B3A6B"}/>
          </div>
        )}
        {s.medicines?.length>0&&(
          <div style={{ backgroundColor:dark?"#14532d20":"#F0FDF4", borderRadius:12, padding:"12px 14px", border:`1px solid ${dark?"#2D3F5A":"#BBF7D0"}` }}>
            <Section title="Medicines" icon="💊" items={s.medicines.slice(0,5)} color="#16A34A"/>
          </div>
        )}
        {s.precautions?.length>0&&(
          <div style={{ backgroundColor:dark?"#451a0320":"#FFFBEB", borderRadius:12, padding:"12px 14px", border:`1px solid ${dark?"#2D3F5A":"#FDE68A"}` }}>
            <Section title="Precautions" icon="🛡️" items={s.precautions.slice(0,4)} color="#D97706"/>
          </div>
        )}
        {s.risk_factors?.length>0&&(
          <div style={{ backgroundColor:dark?"#5b202020":"#FEF2F2", borderRadius:12, padding:"12px 14px", border:`1px solid ${dark?"#2D3F5A":"#FECACA"}` }}>
            <Section title="Risk Factors" icon="⚠️" items={s.risk_factors.slice(0,4)} color="#DC2626"/>
          </div>
        )}
      </div>

      {/* Do's and Don'ts */}
      {(s.dos?.length>0||s.donts?.length>0)&&(
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {s.dos?.length>0&&(
            <div style={{ backgroundColor:dark?"#14532d20":"#F0FDF4", borderRadius:12, padding:"12px 14px" }}>
              <p style={{ fontSize:11, fontWeight:700, color:"#16A34A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>✅ Do's</p>
              {s.dos.map((d,i)=><p key={i} style={{ fontSize:12, color:dark?"#86EFAC":"#166534", marginBottom:4 }}>· {d}</p>)}
            </div>
          )}
          {s.donts?.length>0&&(
            <div style={{ backgroundColor:dark?"#5b202020":"#FEF2F2", borderRadius:12, padding:"12px 14px" }}>
              <p style={{ fontSize:11, fontWeight:700, color:"#DC2626", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>❌ Don'ts</p>
              {s.donts.map((d,i)=><p key={i} style={{ fontSize:12, color:dark?"#FCA5A5":"#991B1B", marginBottom:4 }}>· {d}</p>)}
            </div>
          )}
        </div>
      )}

      {/* ── CLICKABLE suggested questions ── */}
      {data.suggested_questions?.length>0&&(
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
          {data.suggested_questions.map(q=>(
            <button key={q} onClick={()=>onSuggestedClick && onSuggestedClick(q)}
              style={{ fontSize:11, padding:"6px 12px", border:`1px solid ${dark?"#2D3F5A":"#E5E9F2"}`, borderRadius:999, color:dark?"#60A5FA":"#2952A3", cursor:"pointer", backgroundColor:dark?"#0F172A":"#F4F6FA", fontWeight:500, textAlign:"left", transition:"all 0.15s", fontFamily:"DM Sans,sans-serif" }}
              onMouseEnter={e=>e.target.style.backgroundColor=dark?"#1E293B":"#EEF2FF"}
              onMouseLeave={e=>e.target.style.backgroundColor=dark?"#0F172A":"#F4F6FA"}>
              "{q}"
            </button>
          ))}
        </div>
      )}

      {data.disclaimer&&(
        <p style={{ fontSize:11, color:dark?"#64748B":"#94A3B8", fontStyle:"italic" }}>{data.disclaimer}</p>
      )}
    </div>
  )
}

function MsgBubble({ msg, dark, onSuggestedClick }) {
  const isUser = msg.role==="user"
  const textMain= dark?"#F1F5F9":"#1A1A2E"
  return (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", justifyContent:isUser?"flex-end":"flex-start", marginBottom:16 }}>
      {!isUser&&(
        <div style={{ width:32, height:32, borderRadius:"50%", backgroundColor:dark?"#3B82F6":"#1B3A6B", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
          <Bot size={16} color="#fff"/>
        </div>
      )}
      <div style={{ maxWidth:"75%", display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ backgroundColor:isUser?(dark?"#3B82F6":"#1B3A6B"):(dark?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.9)"), color:isUser?"#fff":textMain, borderRadius:isUser?"18px 18px 4px 18px":"18px 18px 18px 4px", padding:"12px 16px", fontSize:14, lineHeight:1.6, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", backdropFilter:isUser?"none":"blur(12px)", border:isUser?"none":`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(27,58,107,0.08)"}` }}>
          {msg.content}
        </div>
        {msg.data && <StructuredCard data={msg.data} dark={dark} onSuggestedClick={onSuggestedClick}/>}
      </div>
      {isUser&&(
        <div style={{ width:32, height:32, borderRadius:"50%", backgroundColor:dark?"#2D3F5A":"#F4F6FA", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
          <User size={16} color={dark?"#94A3B8":"#64748B"}/>
        </div>
      )}
    </div>
  )
}

export default function Assistant() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const [searchParams] = useSearchParams()
  const bottomRef = useRef(null)

  const [messages, setMessages] = useState([{
    role:"assistant",
    content:"Hello! I'm MediMate AI. Describe your symptoms, ask about a disease, medication, or any health concern. I'll give you structured guidance with medicines, do's & don'ts, and when to see a doctor.",
    data:null
  }])
  const [input,   setInput]   = useState("")
  const [loading, setLoading] = useState(false)

  const [listening, setListening] = useState(false)

  const handleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert("Speech recognition is not supported in this browser."); return }
    if (listening) return
    const recognition = new SR()
    recognition.lang = "en-IN"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart  = () => setListening(true)
    recognition.onend    = () => setListening(false)
    recognition.onerror  = () => setListening(false)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
    }
    recognition.start()
  }

  useEffect(()=>{
    const q = searchParams.get("q")
    if(q) setTimeout(()=>send(q), 300)
  },[])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }) },[messages])

  const send = async (text) => {
    const msg = (text||input).trim()
    if(!msg||loading) return
    setInput("")
    const history = messages.map(m=>({ role:m.role, content:m.content }))
    setMessages(prev=>[...prev, { role:"user", content:msg, data:null }])
    setLoading(true)
    try {
      const r = await sendChatMessage(msg, history)
      const d = r.data
      setMessages(prev=>[...prev, { role:"assistant", content:d.reply, data:d }])
    } catch {
      setMessages(prev=>[...prev, { role:"assistant", content:"Sorry, I couldn't connect to the server. Make sure the backend is running on port 8000.", data:null }])
    } finally { setLoading(false) }
  }

  // Clickable suggested question handler — sends as follow-up
  const handleSuggested = (q) => {
    if(!loading) send(q)
  }

  const glass    = dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)"
  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.1)"
  const textMain = dark ? "#F1F5F9" : "#1A1A2E"
  const textMute = dark ? "#64748B" : "#8899B4"
  const accent   = dark ? "#60A5FA" : "#1B3A6B"

  return (
    <div style={{ maxWidth:820, margin:"0 auto", height:"calc(100vh - 60px - 56px)", display:"flex", flexDirection:"column" }}>
      {/* Page header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#1B3A6B,#2952A3)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(27,58,107,0.35)" }}>
          <Bot size={18} color="#fff"/>
        </div>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:textMain, margin:0 }}>AI Health Assistant</h1>
          <p style={{ fontSize:11.5, color:textMute, margin:0 }}>Powered by clinical data · Not a final diagnosis</p>
        </div>
      </div>
      {messages.length===1&&(
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:12, color:textMute, marginBottom:8 }}>Try asking:</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {SUGGESTIONS.map(s=>(
              <button key={s} onClick={()=>send(s)} style={{ fontSize:12, padding:"6px 14px", borderRadius:999, border:`1px solid ${border}`, backgroundColor:"transparent", color:dark?"#60A5FA":"#2952A3", cursor:"pointer", fontWeight:500, fontFamily:"DM Sans,sans-serif" }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex:1, overflowY:"auto", padding:"4px 0" }}>
        {messages.map((m,i)=><MsgBubble key={i} msg={m} dark={dark} onSuggestedClick={handleSuggested}/>)}
        {loading&&(
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", backgroundColor:dark?"#3B82F6":"#1B3A6B", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bot size={16} color="#fff"/>
            </div>
            <div style={{ backgroundColor:dark?"#1E293B":"#fff", borderRadius:"18px 18px 18px 4px", padding:"14px 18px", boxShadow:"0 2px 8px rgba(27,58,107,0.08)" }}>
              <div style={{ display:"flex", gap:5 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:7, height:7, borderRadius:"50%", backgroundColor:dark?"#60A5FA":"#1B3A6B", animation:`bounce 1s ease-in-out ${i*0.15}s infinite` }}/>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{ background:glass, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:18, boxShadow:"0 4px 24px rgba(0,0,0,0.06)", padding:"12px 16px", display:"flex", alignItems:"center", gap:10, marginTop:12, border:`1px solid ${border}` }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Describe your symptoms or ask about any disease..."
          style={{ flex:1, background:"none", border:0, outline:"none", fontSize:14, color:textMain, fontFamily:"DM Sans,sans-serif" }}/>
        <button onClick={handleMic} style={{ background:"none", border:0, cursor:"pointer", color:listening ? "#DC2626" : textMute, padding:4, display:"flex", transition:"color 0.2s" }}><Mic size={18}/></button>
        <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:38, height:38, borderRadius:"50%", background:input.trim()?"linear-gradient(135deg,#1B3A6B,#2952A3)":(dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"), border:0, display:"flex", alignItems:"center", justifyContent:"center", cursor:input.trim()?"pointer":"default", transition:"all 0.15s", boxShadow:input.trim()?"0 4px 14px rgba(27,58,107,0.3)":"none" }}>
          <Send size={15} color={input.trim()?"#fff":textMute}/>
        </button>
      </div>
      <p style={{ textAlign:"center", fontSize:10, color:textMute, marginTop:6 }}>MediMate AI leverages clinical data for empathetic health guidance. Not a final diagnosis.</p>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  )
}