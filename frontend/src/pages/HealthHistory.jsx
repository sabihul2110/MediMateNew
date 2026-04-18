// MediMate/frontend/src/pages/HealthHistory.jsx
import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/ThemeContext"
import {
  getMediScanHistory, deleteMediScan, clearMediScanHistory,
  getChatHistory, deleteChatEntry, clearChatHistory,
} from "../api/index"
import {
  Scan, MessageSquare, Search, Trash2, ChevronDown, ChevronUp,
  AlertCircle, Clock, X, ArrowRight, RotateCcw, Activity,
} from "lucide-react"

// ─── Design tokens ────────────────────────────────────────────────────────────
function useTokens(dark) {
  return {
    bg:          dark ? "#060D1A"                    : "#F0F4FF",
    surface:     dark ? "rgba(255,255,255,0.04)"     : "rgba(255,255,255,0.9)",
    surface2:    dark ? "rgba(255,255,255,0.025)"    : "rgba(27,58,107,0.035)",
    border:      dark ? "rgba(255,255,255,0.07)"     : "rgba(27,58,107,0.09)",
    borderHover: dark ? "rgba(255,255,255,0.14)"     : "rgba(27,58,107,0.18)",
    text:        dark ? "#F1F5F9"                    : "#1A1A2E",
    textMute:    dark ? "#64748B"                    : "#8899B4",
    textLight:   dark ? "#475569"                    : "#B0BEC5",
    primary:     dark ? "#3B82F6"                    : "#1B3A6B",
    primaryLt:   dark ? "#60A5FA"                    : "#2952A3",
    accent:      "#22C55E",
    danger:      dark ? "#EF4444"                    : "#DC2626",
    warning:     dark ? "#F59E0B"                    : "#D97706",
    shadow:      dark ? "0 4px 24px rgba(0,0,0,0.35)" : "0 4px 24px rgba(27,58,107,0.08)",
    shadowHover: dark ? "0 8px 32px rgba(0,0,0,0.5)"  : "0 8px 32px rgba(27,58,107,0.14)",
  }
}

// ─── Date formatting helpers ──────────────────────────────────────────────────
function groupByDate(items, dateKey = "created_at") {
  const groups = {}
  const now = new Date()

  items.forEach(item => {
    const d = new Date(item[dateKey])
    const diffDays = Math.floor((now - d) / 86400000)

    let label
    if (diffDays === 0) label = "Today"
    else if (diffDays === 1) label = "Yesterday"
    else if (diffDays < 7) label = "This Week"
    else if (diffDays < 30) label = "This Month"
    else label = "Older"

    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  })

  const ORDER = ["Today", "Yesterday", "This Week", "This Month", "Older"]
  return ORDER.filter(k => groups[k]).map(k => ({ label: k, items: groups[k] }))
}

function fmtTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}
function fmtDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "linear-gradient(90deg, rgba(148,163,184,0.08) 25%, rgba(148,163,184,0.18) 50%, rgba(148,163,184,0.08) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  )
}

function SkeletonCard({ dark, tk }) {
  return (
    <div style={{
      background: tk.surface, border: `1px solid ${tk.border}`,
      borderRadius: 16, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="80%" height={13} />
        </div>
        <Skeleton width={60} height={24} radius={999} style={{ marginLeft: 12 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton width={72} height={22} radius={999} />
        <Skeleton width={88} height={22} radius={999} />
        <Skeleton width={56} height={22} radius={999} />
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ tab, dark, tk, onAction }) {
  const isScan = tab === "mediscan"
  return (
    <div style={{ textAlign: "center", padding: "64px 24px 48px" }}>
      <div style={{
        width: 80, height: 80, borderRadius: 22,
        background: dark
          ? "linear-gradient(135deg, rgba(27,58,107,0.4), rgba(41,82,163,0.2))"
          : "linear-gradient(135deg, rgba(27,58,107,0.08), rgba(41,82,163,0.05))",
        border: `1.5px dashed ${tk.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 24px",
      }}>
        {isScan
          ? <Scan size={32} color={tk.textMute} />
          : <MessageSquare size={32} color={tk.textMute} />}
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, color: tk.text, marginBottom: 8 }}>
        No {isScan ? "MediScan" : "chat"} history yet
      </p>
      <p style={{ fontSize: 13.5, color: tk.textMute, lineHeight: 1.7, maxWidth: 340, margin: "0 auto 28px" }}>
        {isScan
          ? "Your symptom analyses will appear here. Each scan is automatically saved so you can review your results anytime."
          : "Your AI assistant conversations will be saved here. Ask about diseases, symptoms, medicines, or any health concern."}
      </p>
      <button onClick={onAction} style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "linear-gradient(135deg, #1B3A6B, #2952A3)",
        color: "#fff", border: "none", borderRadius: 12,
        padding: "12px 24px", fontSize: 14, fontWeight: 600,
        cursor: "pointer", boxShadow: "0 4px 16px rgba(27,58,107,0.35)",
      }}>
        {isScan ? "Start a MediScan" : "Open AI Assistant"}
        <ArrowRight size={15} />
      </button>
    </div>
  )
}

// ─── Confidence bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value, dark }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 75 ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        flex: 1, height: 5, borderRadius: 999,
        background: dark ? "rgba(255,255,255,0.07)" : "rgba(27,58,107,0.08)",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 999,
          background: color,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32 }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

// ─── Severity dot ─────────────────────────────────────────────────────────────
function SeverityBadge({ value, dark, tk }) {
  const color = value >= 8 ? "#EF4444" : value >= 5 ? "#F59E0B" : "#22C55E"
  const label = value >= 8 ? "High" : value >= 5 ? "Moderate" : "Low"
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 999, padding: "3px 9px",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label} ({value}/10)</span>
    </div>
  )
}

// ─── MediScan card ────────────────────────────────────────────────────────────
function MediScanCard({ item, dark, tk, onDelete, onAskAI }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hovered, setHovered]   = useState(false)

  const topMatch     = item.top_match || item.top_conditions?.[0]?.disease
  const tags         = item.symptom_tags || []
  const conditions   = item.top_conditions || []
  const hasAI        = !!item.ai_summary?.summary

  const handleDelete = async (e) => {
    e.stopPropagation()
    setDeleting(true)
    try { await onDelete(item._id) } catch { setDeleting(false) }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: tk.surface,
        border: `1px solid ${hovered ? tk.borderHover : tk.border}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: hovered ? tk.shadowHover : tk.shadow,
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        opacity: deleting ? 0.4 : 1,
        transform: deleting ? "scale(0.98)" : "scale(1)",
      }}
    >
      {/* ── Card header ── */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: "16px 20px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          {/* Left: icon + title */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: dark
                ? "linear-gradient(135deg, rgba(27,58,107,0.6), rgba(41,82,163,0.4))"
                : "linear-gradient(135deg, #EEF2FF, #E0E8FF)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Scan size={17} color={tk.primary} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{
                  fontSize: 14.5, fontWeight: 700, color: tk.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {topMatch || "Symptom Analysis"}
                </span>
                {hasAI && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                    color: "#7C3AED", background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    borderRadius: 999, padding: "2px 7px",
                  }}>AI</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Clock size={11} color={tk.textMute} />
                <span style={{ fontSize: 11.5, color: tk.textMute }}>
                  {fmtDate(item.created_at)} · {fmtTime(item.created_at)}
                </span>
                <span style={{ color: tk.textLight, fontSize: 11 }}>·</span>
                <span style={{ fontSize: 11.5, color: tk.textMute }}>{timeAgo(item.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Right: badges + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {item.severity && <SeverityBadge value={item.severity} dark={dark} tk={tk} />}
            <button
              onClick={handleDelete}
              style={{
                background: "none", border: `1px solid transparent`,
                borderRadius: 8, padding: "5px 6px", cursor: "pointer",
                color: tk.textMute, display: "flex", alignItems: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = tk.danger; e.currentTarget.style.borderColor = `${tk.danger}40`; e.currentTarget.style.background = `${tk.danger}10` }}
              onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = tk.textMute; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "none" }}
            >
              <Trash2 size={13} />
            </button>
            <div style={{ color: tk.textMute, display: "flex", alignItems: "center", padding: "5px 4px" }}>
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </div>
        </div>

        {/* Symptom tags row */}
        {(tags.length > 0 || item.duration) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, paddingLeft: 50 }}>
            {tags.slice(0, 5).map(t => (
              <span key={t} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 999,
                background: tk.surface2, border: `1px solid ${tk.border}`,
                color: tk.textMute, fontWeight: 500,
              }}>
                {t.replace(/_/g, " ")}
              </span>
            ))}
            {tags.length > 5 && (
              <span style={{ fontSize: 11, color: tk.textMute, alignSelf: "center" }}>+{tags.length - 5} more</span>
            )}
            {item.duration && (
              <span style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 999,
                background: dark ? "rgba(245,158,11,0.12)" : "#FFFBEB",
                border: `1px solid ${dark ? "rgba(245,158,11,0.25)" : "#FDE68A"}`,
                color: tk.warning, fontWeight: 600,
              }}>
                ⏱ {item.duration}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Expanded content ── */}
      <div style={{
        maxHeight: expanded ? "800px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          borderTop: `1px solid ${tk.border}`,
          padding: "18px 20px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>

          {/* Free-text input if available */}
          {item.symptoms_text && (
            <div style={{
              background: tk.surface2, borderRadius: 10, padding: "12px 14px",
              border: `1px solid ${tk.border}`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: tk.textMute, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Your description
              </p>
              <p style={{ fontSize: 13, color: tk.text, lineHeight: 1.65 }}>
                "{item.symptoms_text}"
              </p>
            </div>
          )}

          {/* AI Summary */}
          {hasAI && (
            <div style={{
              background: dark ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.05)",
              border: `1px solid ${dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.15)"}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                ✨ AI Clinical Summary
              </p>
              <p style={{ fontSize: 12.5, color: tk.text, lineHeight: 1.65 }}>
                {item.ai_summary.summary}
              </p>
              {item.ai_summary.severity_note && (
                <p style={{ fontSize: 12, color: tk.warning, marginTop: 8, fontWeight: 600 }}>
                  ⚠️ {item.ai_summary.severity_note}
                </p>
              )}
            </div>
          )}

          {/* Matched conditions */}
          {conditions.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: tk.textMute, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Matched conditions
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {conditions.map((c, i) => (
                  <div key={c.disease} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: i === 0
                      ? (dark ? "rgba(27,58,107,0.25)" : "rgba(27,58,107,0.06)")
                      : tk.surface2,
                    border: `1px solid ${i === 0 ? (dark ? "rgba(41,82,163,0.35)" : "rgba(27,58,107,0.15)") : tk.border}`,
                    borderRadius: 10, padding: "10px 14px",
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: i === 0 ? "linear-gradient(135deg,#1B3A6B,#2952A3)" : (dark ? "rgba(255,255,255,0.06)" : "#E5E9F2"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800,
                      color: i === 0 ? "#fff" : tk.textMute,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: tk.text }}>
                          {c.disease}
                        </span>
                        <span style={{ fontSize: 11, color: tk.textMute }}>
                          {c.matched_count} symptoms matched
                        </span>
                      </div>
                      <ConfidenceBar value={c.confidence} dark={dark} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 2 }}>
            {topMatch && (
              <button onClick={() => onAskAI(topMatch)} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "linear-gradient(135deg,#1B3A6B,#2952A3)", color: "#fff",
                border: "none", borderRadius: 10, padding: "9px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 3px 12px rgba(27,58,107,0.35)",
              }}>
                <MessageSquare size={13} /> Ask AI about {topMatch}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Chat history card ────────────────────────────────────────────────────────
function ChatCard({ item, dark, tk, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hovered, setHovered]   = useState(false)

  const sections    = item.ai_data?.sections || {}
  const assessment  = item.ai_data?.preliminary_assessment
  const suggested   = item.ai_data?.suggested_questions || []
  const hasSections = Object.values(sections).some(v => Array.isArray(v) ? v.length > 0 : !!v)

  const handleDelete = async (e) => {
    e.stopPropagation()
    setDeleting(true)
    try { await onDelete(item._id) } catch { setDeleting(false) }
  }

  // Preview: truncate message to 80 chars
  const preview = item.user_message?.length > 80
    ? item.user_message.slice(0, 80) + "…"
    : item.user_message

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: tk.surface,
        border: `1px solid ${hovered ? tk.borderHover : tk.border}`,
        borderRadius: 16, overflow: "hidden",
        boxShadow: hovered ? tk.shadowHover : tk.shadow,
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        opacity: deleting ? 0.4 : 1,
        transform: deleting ? "scale(0.98)" : "scale(1)",
      }}
    >
      {/* ── Card header ── */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: "16px 20px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: dark
                ? "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,163,74,0.1))"
                : "linear-gradient(135deg, #F0FDF4, #DCFCE7)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MessageSquare size={17} color="#16A34A" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 14, fontWeight: 600, color: tk.text,
                marginBottom: 4, lineHeight: 1.4,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                "{preview}"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Clock size={11} color={tk.textMute} />
                <span style={{ fontSize: 11.5, color: tk.textMute }}>
                  {fmtDate(item.created_at)} · {fmtTime(item.created_at)}
                </span>
                <span style={{ color: tk.textLight, fontSize: 11 }}>·</span>
                <span style={{ fontSize: 11.5, color: tk.textMute }}>{timeAgo(item.created_at)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Source badges */}
            {item.detected_disease && (
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
                background: dark ? "rgba(59,130,246,0.15)" : "#EFF6FF",
                border: `1px solid ${dark ? "rgba(59,130,246,0.3)" : "#BFDBFE"}`,
                color: dark ? "#60A5FA" : "#2563EB",
              }}>
                {item.detected_disease}
              </span>
            )}
            <button
              onClick={handleDelete}
              style={{
                background: "none", border: "1px solid transparent",
                borderRadius: 8, padding: "5px 6px", cursor: "pointer",
                color: tk.textMute, display: "flex", alignItems: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = tk.danger; e.currentTarget.style.borderColor = `${tk.danger}40`; e.currentTarget.style.background = `${tk.danger}10` }}
              onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = tk.textMute; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "none" }}
            >
              <Trash2 size={13} />
            </button>
            <div style={{ color: tk.textMute, display: "flex", padding: "5px 4px" }}>
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded ── */}
      <div style={{
        maxHeight: expanded ? "1000px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          borderTop: `1px solid ${tk.border}`,
          padding: "18px 20px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>

          {/* Full user message */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <div style={{
              background: dark ? "#1B3A6B" : "#1B3A6B",
              color: "#fff", borderRadius: "18px 18px 4px 18px",
              padding: "11px 16px", fontSize: 13, lineHeight: 1.6,
              maxWidth: "85%", boxShadow: "0 2px 12px rgba(27,58,107,0.25)",
            }}>
              {item.user_message}
            </div>
          </div>

          {/* AI reply */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#1B3A6B,#2952A3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>🤖</div>
            <div style={{
              background: tk.surface2, border: `1px solid ${tk.border}`,
              borderRadius: "18px 18px 18px 4px", padding: "11px 16px",
              fontSize: 13, lineHeight: 1.65, color: tk.text, maxWidth: "85%",
            }}>
              {item.ai_reply}
            </div>
          </div>

          {/* Possible conditions */}
          {assessment?.possible_conditions?.length > 0 && (
            <div style={{
              background: dark ? "rgba(27,58,107,0.2)" : "#EEF2FF",
              borderRadius: 10, padding: "10px 14px",
              border: `1px solid ${dark ? "rgba(41,82,163,0.3)" : "#C7D2FE"}`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: dark ? "#60A5FA" : "#1B3A6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                🩺 Possible Conditions
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {assessment.possible_conditions.map((c, i) => (
                  <span key={c} style={{
                    fontSize: 12, padding: "4px 11px", borderRadius: 999,
                    background: i === 0 ? "linear-gradient(135deg,#1B3A6B,#2952A3)" : (dark ? "rgba(255,255,255,0.07)" : "#fff"),
                    color: i === 0 ? "#fff" : tk.textMute,
                    border: i === 0 ? "none" : `1px solid ${tk.border}`,
                    fontWeight: i === 0 ? 700 : 400,
                  }}>{c}</span>
                ))}
                {assessment.urgency && assessment.urgency !== "routine" && (
                  <span style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 999,
                    background: assessment.urgency === "emergency" ? "#FEF2F2" : "#FFFBEB",
                    color: assessment.urgency === "emergency" ? "#DC2626" : "#D97706",
                    border: `1px solid ${assessment.urgency === "emergency" ? "#FECACA" : "#FDE68A"}`,
                    fontWeight: 600,
                  }}>
                    {assessment.urgency === "emergency" ? "🚨 Emergency" : assessment.urgency === "urgent" ? "⚠️ Urgent" : "📅 See Doctor Soon"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sections grid */}
          {hasSections && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {sections.medicines?.length > 0 && (
                <SectionMini
                  title="💊 Medicines" items={sections.medicines.slice(0, 4)}
                  bg={dark ? "rgba(20,83,45,0.2)" : "#F0FDF4"}
                  bdr={dark ? "rgba(34,197,94,0.2)" : "#BBF7D0"}
                  color="#16A34A" tk={tk}
                />
              )}
              {sections.precautions?.length > 0 && (
                <SectionMini
                  title="🛡️ Precautions" items={sections.precautions.slice(0, 4)}
                  bg={dark ? "rgba(69,26,3,0.2)" : "#FFFBEB"}
                  bdr={dark ? "rgba(245,158,11,0.2)" : "#FDE68A"}
                  color="#D97706" tk={tk}
                />
              )}
              {sections.dos?.length > 0 && (
                <SectionMini
                  title="✅ Do's" items={sections.dos.slice(0, 3)}
                  bg={dark ? "rgba(20,83,45,0.15)" : "#F0FDF4"}
                  bdr={dark ? "rgba(34,197,94,0.15)" : "#D1FAE5"}
                  color="#16A34A" tk={tk}
                />
              )}
              {sections.donts?.length > 0 && (
                <SectionMini
                  title="❌ Don'ts" items={sections.donts.slice(0, 3)}
                  bg={dark ? "rgba(91,32,32,0.2)" : "#FEF2F2"}
                  bdr={dark ? "rgba(220,38,38,0.2)" : "#FECACA"}
                  color="#DC2626" tk={tk}
                />
              )}
            </div>
          )}

          {/* Suggested questions */}
          {suggested.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: tk.textMute, fontWeight: 600, marginBottom: 6 }}>
                Related questions:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suggested.slice(0, 3).map(q => (
                  <span key={q} style={{
                    fontSize: 11.5, padding: "5px 12px", borderRadius: 999,
                    border: `1px solid ${tk.border}`,
                    color: dark ? "#60A5FA" : "#2952A3",
                    background: "transparent", cursor: "default",
                    fontStyle: "italic",
                  }}>
                    "{q}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionMini({ title, items, bg, bdr, color, tk }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${bdr}`,
      borderRadius: 10, padding: "10px 12px",
    }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {title}
      </p>
      {items.map((item, i) => (
        <p key={i} style={{ fontSize: 11.5, color: tk.text, lineHeight: 1.5, marginBottom: 3 }}>
          · {item}
        </p>
      ))}
    </div>
  )
}

// ─── Clear-all confirmation modal ─────────────────────────────────────────────
function ClearAllModal({ tab, dark, tk, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease-out",
    }}>
      <div style={{
        background: dark ? "#1E293B" : "#fff",
        borderRadius: 20, padding: "28px 32px",
        maxWidth: 400, width: "90%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        border: `1px solid ${tk.border}`,
        animation: "scaleIn 0.2s ease-out",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <Trash2 size={22} color="#DC2626" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: tk.text, textAlign: "center", marginBottom: 8 }}>
          Clear all history?
        </h3>
        <p style={{ fontSize: 13, color: tk.textMute, textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
          This will permanently delete all your{" "}
          {tab === "mediscan" ? "MediScan analyses" : "AI chat conversations"}.
          This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "12px 0", borderRadius: 12,
            background: "none", border: `1px solid ${tk.border}`,
            color: tk.textMute, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "12px 0", borderRadius: 12,
            background: "#DC2626", border: "none",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(220,38,38,0.35)",
          }}>
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HealthHistory() {
  const { theme } = useApp()
  const dark = theme === "dark"
  const tk = useTokens(dark)
  const navigate = useNavigate()

  const [activeTab,   setActiveTab]   = useState("mediscan")
  const [scanItems,   setScanItems]   = useState([])
  const [chatItems,   setChatItems]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showClear,   setShowClear]   = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef(null)

  const isScan = activeTab === "mediscan"

  // ── Fetch both datasets on mount ──
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [scanRes, chatRes] = await Promise.all([
        getMediScanHistory(100),
        getChatHistory(100),
      ])
      setScanItems(scanRes.data.history || [])
      setChatItems(chatRes.data.history || [])
    } catch (e) {
      console.error("[HealthHistory] Fetch failed:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Delete one ──
  const handleDeleteScan = async (id) => {
    await deleteMediScan(id)
    setScanItems(prev => prev.filter(i => i._id !== id))
  }
  const handleDeleteChat = async (id) => {
    await deleteChatEntry(id)
    setChatItems(prev => prev.filter(i => i._id !== id))
  }

  // ── Clear all ──
  const handleClearAll = async () => {
    try {
      if (isScan) {
        await clearMediScanHistory()
        setScanItems([])
      } else {
        await clearChatHistory()
        setChatItems([])
      }
    } catch (e) {
      console.error("[HealthHistory] Clear failed:", e)
    }
    setShowClear(false)
  }

  // ── Navigate to AI with prefill ──
  const handleAskAI = (disease) => {
    navigate(`/assistant?q=Tell me about ${disease} — symptoms, treatment, and precautions.`)
  }

  // ── Filtered + grouped items ──
  const rawItems = isScan ? scanItems : chatItems
  const dateKey  = isScan ? "created_at" : "created_at"

  const filtered = searchQuery.trim().length < 1
    ? rawItems
    : rawItems.filter(item => {
        const q = searchQuery.toLowerCase()
        if (isScan) {
          return (
            item.top_match?.toLowerCase().includes(q) ||
            item.symptoms_text?.toLowerCase().includes(q) ||
            item.symptom_tags?.some(t => t.toLowerCase().includes(q)) ||
            item.top_conditions?.some(c => c.disease.toLowerCase().includes(q))
          )
        } else {
          return (
            item.user_message?.toLowerCase().includes(q) ||
            item.ai_reply?.toLowerCase().includes(q) ||
            item.detected_disease?.toLowerCase().includes(q)
          )
        }
      })

  const grouped = groupByDate(filtered, dateKey)

  // ── Stats ──
  const totalScan = scanItems.length
  const totalChat = chatItems.length

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: tk.text, marginBottom: 4, letterSpacing: "-0.4px" }}>
            Health History
          </h1>
          <p style={{ fontSize: 13, color: tk.textMute }}>
            {totalScan} scans · {totalChat} conversations saved
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchAll} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: tk.surface, border: `1px solid ${tk.border}`,
            borderRadius: 10, padding: "8px 14px", cursor: "pointer",
            color: tk.textMute, fontSize: 13, fontWeight: 500,
            transition: "all 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = tk.text}
            onMouseLeave={e => e.currentTarget.style.color = tk.textMute}
          >
            <RotateCcw size={13} /> Refresh
          </button>
          {rawItems.length > 0 && (
            <button onClick={() => setShowClear(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: dark ? "rgba(220,38,38,0.1)" : "#FEF2F2",
              border: `1px solid ${dark ? "rgba(220,38,38,0.25)" : "#FECACA"}`,
              borderRadius: 10, padding: "8px 14px", cursor: "pointer",
              color: tk.danger, fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
            }}>
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{
        display: "flex", gap: 4,
        background: tk.surface2, border: `1px solid ${tk.border}`,
        borderRadius: 14, padding: 5, marginBottom: 18,
        width: "fit-content",
      }}>
        {[
          { id: "mediscan", label: "MediScan", icon: Scan, count: totalScan },
          { id: "chat", label: "AI Assistant", icon: MessageSquare, count: totalChat },
        ].map(({ id, label, icon: Icon, count }) => {
          const active = activeTab === id
          return (
            <button key={id} onClick={() => { setActiveTab(id); setSearchQuery("") }} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 10, border: "none",
              background: active
                ? dark ? "linear-gradient(135deg,rgba(41,82,163,0.6),rgba(27,58,107,0.4))" : "#fff"
                : "transparent",
              color: active ? (dark ? "#F1F5F9" : "#1B3A6B") : tk.textMute,
              boxShadow: active ? (dark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(27,58,107,0.1)") : "none",
              cursor: "pointer", fontSize: 13.5, fontWeight: active ? 700 : 500,
              transition: "all 0.2s",
            }}>
              <Icon size={14} />
              {label}
              <span style={{
                minWidth: 20, height: 20, borderRadius: 999, fontSize: 10.5, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: active ? (dark ? "rgba(255,255,255,0.15)" : "#EEF2FF") : "transparent",
                color: active ? (dark ? "#93C5FD" : "#1B3A6B") : tk.textMute,
                padding: "0 5px",
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Search bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: searchFocused
          ? (dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.98)")
          : tk.surface,
        border: `1.5px solid ${searchFocused ? (dark ? "rgba(59,130,246,0.5)" : "rgba(27,58,107,0.25)") : tk.border}`,
        borderRadius: 13, padding: "10px 16px",
        marginBottom: 22,
        boxShadow: searchFocused ? `0 0 0 3px ${dark ? "rgba(59,130,246,0.15)" : "rgba(27,58,107,0.08)"}` : tk.shadow,
        transition: "all 0.2s",
      }}>
        <Search size={15} color={searchFocused ? tk.primary : tk.textMute} />
        <input
          ref={searchRef}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={
            isScan
              ? "Search by disease, symptom, or tag…"
              : "Search by question, disease, or keyword…"
          }
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 13.5, color: tk.text, fontFamily: "DM Sans, sans-serif",
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: tk.textMute, display: "flex", padding: 2,
          }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Search result count ── */}
      {searchQuery && !loading && (
        <p style={{ fontSize: 12, color: tk.textMute, marginBottom: 14, paddingLeft: 2 }}>
          {filtered.length === 0
            ? "No results found"
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${searchQuery}"`}
        </p>
      )}

      {/* ── Content ── */}
      {loading ? (
        // Skeleton state
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} dark={dark} tk={tk} />
          ))}
        </div>
      ) : rawItems.length === 0 ? (
        // Empty state
        <div style={{
          background: tk.surface, border: `1px solid ${tk.border}`,
          borderRadius: 20, overflow: "hidden",
        }}>
          <EmptyState
            tab={activeTab} dark={dark} tk={tk}
            onAction={() => navigate(isScan ? "/mediscan" : "/assistant")}
          />
        </div>
      ) : filtered.length === 0 ? (
        // Search no results
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: tk.text, marginBottom: 8 }}>No matches found</p>
          <p style={{ fontSize: 13, color: tk.textMute }}>
            Try a different search term or{" "}
            <span
              onClick={() => setSearchQuery("")}
              style={{ color: tk.primaryLt, cursor: "pointer", fontWeight: 600 }}
            >
              clear the search
            </span>.
          </p>
        </div>
      ) : (
        // Grouped list
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {grouped.map(({ label, items }) => (
            <div key={label}>
              {/* Date group label */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: tk.textMute,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: 1, background: tk.border }} />
                <span style={{ fontSize: 11, color: tk.textLight }}>
                  {items.length} {items.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map(item =>
                  isScan ? (
                    <MediScanCard
                      key={item._id}
                      item={item} dark={dark} tk={tk}
                      onDelete={handleDeleteScan}
                      onAskAI={handleAskAI}
                    />
                  ) : (
                    <ChatCard
                      key={item._id}
                      item={item} dark={dark} tk={tk}
                      onDelete={handleDeleteChat}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer count ── */}
      {!loading && filtered.length > 0 && (
        <p style={{ textAlign: "center", fontSize: 12, color: tk.textLight, marginTop: 32, paddingBottom: 8 }}>
          Showing {filtered.length} of {rawItems.length} {isScan ? "scans" : "conversations"}
        </p>
      )}

      {/* ── Clear all modal ── */}
      {showClear && (
        <ClearAllModal
          tab={activeTab} dark={dark} tk={tk}
          onConfirm={handleClearAll}
          onCancel={() => setShowClear(false)}
        />
      )}
    </div>
  )
}