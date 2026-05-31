import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import AppTopbar from "../components/AppTopbar"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react"

import { API_BASE } from "../config"

async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem("refreshToken")

    if (!refreshToken) return null

    const res = await fetch(`${API_BASE}/api/users/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await res.json()

    if (data?.accessToken) {
      localStorage.setItem("token", data.accessToken)
      return data.accessToken
    }

    return null
  } catch (err) {
    console.error("Refresh token failed:", err)
    return null
  }
}

async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No access token found")
  }

  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status !== 401) return res

  const newToken = await refreshAccessToken()

  if (!newToken) {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    window.location.href = "/login"
    throw new Error("Session expired")
  }

  res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${newToken}`,
    },
  })

  return res
}

function formatLabel(value) {
  if (!value) return "General"

  return value
    .toString()
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTime(dateString) {
  const now = new Date()
  const date = new Date(dateString)

  const seconds = Math.floor((now - date) / 1000)

  if (Number.isNaN(seconds)) return "unknown"

  if (seconds < 60) return "just now"

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`

  const days = Math.floor(hours / 24)

  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`

  const months = Math.floor(days / 30)

  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`

  const years = Math.floor(months / 12)

  return `${years} year${years > 1 ? "s" : ""} ago`
}

function priorityTone(priority) {
  switch (String(priority || "").toUpperCase()) {
    case "HIGH":
      return {
        background: "rgba(239,68,68,0.16)",
        color: "#fecaca",
        border: "1px solid rgba(239,68,68,0.24)",
      }

    case "URGENT":
      return {
        background: "rgba(168,85,247,0.16)",
        color: "#e9d5ff",
        border: "1px solid rgba(168,85,247,0.24)",
      }

    case "LOW":
      return {
        background: "rgba(34,197,94,0.14)",
        color: "#bbf7d0",
        border: "1px solid rgba(34,197,94,0.22)",
      }

    default:
      return {
        background: "rgba(245,158,11,0.14)",
        color: "#fde68a",
        border: "1px solid rgba(245,158,11,0.22)",
      }
  }
}

function WorkHistory() {
  const navigate = useNavigate()

  const userRaw = localStorage.getItem("user")
  const user = userRaw ? JSON.parse(userRaw) : {}

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedTicket, setSelectedTicket] = useState(null)

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError("")

      const res = await fetchWithAuth(`${API_BASE}/api/tickets?limit=1000`)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load work history")
      }

      const allTickets = Array.isArray(data.data) ? data.data : []

      const technicianTickets = allTickets.filter((ticket) => {
        const assigned =
          typeof ticket.assignedTo === "object"
            ? ticket.assignedTo?._id
            : ticket.assignedTo

        return (
          assigned === user.id ||
          assigned === user._id
        )
      })

      const completed = technicianTickets.filter((ticket) =>
        ["CLOSED", "RESOLVED_PENDING_CONFIRMATION"].includes(ticket.status)
      )

      completed.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      )

      setTickets(completed)

      if (completed.length > 0) {
        setSelectedTicket(completed[0])
      }
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to load history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const analytics = useMemo(() => {
    const total = tickets.length

    const closed = tickets.filter((t) => t.status === "CLOSED").length

    const pending = tickets.filter(
      (t) => t.status === "RESOLVED_PENDING_CONFIRMATION"
    ).length

    const urgent = tickets.filter(
      (t) => String(t.priority).toUpperCase() === "URGENT"
    ).length

    const high = tickets.filter(
      (t) => String(t.priority).toUpperCase() === "HIGH"
    ).length

    const categories = {}

    tickets.forEach((ticket) => {
      const category = ticket.category || "OTHER"

      categories[category] = (categories[category] || 0) + 1
    })

    const categoryEntries = Object.entries(categories).sort(
      (a, b) => b[1] - a[1]
    )

    const topCategory = categoryEntries[0]?.[0] || "Electrical"

    return {
      total,
      closed,
      pending,
      urgent,
      high,
      topCategory,
    }
  }, [tickets])

  const summaryCards = [
    {
      label: "Completed Operations",
      value: analytics.total,
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Successfully Closed",
      value: analytics.closed,
      icon: ShieldCheck,
      tone: "blue",
    },
    {
      label: "Pending Confirmation",
      value: analytics.pending,
      icon: Clock3,
      tone: "purple",
    },
    {
      label: "High Priority Resolved",
      value: analytics.high + analytics.urgent,
      icon: Zap,
      tone: "orange",
    },
  ]

  return (
    <div className="wh-page">
      <AppTopbar />

      <motion.div
        className="wh-blob wh-blob-1"
        animate={{
          y: [0, -20, 0],
          x: [0, 15, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="wh-blob wh-blob-2"
        animate={{
          y: [0, 18, 0],
          x: [0, -15, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <main className="wh-shell">
        {/* HERO */}

        <motion.section
          className="wh-hero"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="wh-hero-left">
            <div className="wh-kicker">
              <Sparkles size={14} />
              Technician Operational Archive
            </div>

            <h1>
              Work
              <span> History</span>
            </h1>

            <p>
              Analyze your completed maintenance operations, resolution
              consistency, and long-term performance across organizational
              electrical infrastructure workflows.
            </p>

            <div className="wh-hero-badges">
              <div className="wh-hero-badge">
                <Trophy size={15} />
                {analytics.closed} Successfully Closed
              </div>

              <div className="wh-hero-badge">
                <Activity size={15} />
                {analytics.topCategory} Specialist
              </div>
            </div>
          </div>

          <div className="wh-hero-right">
            <div className="wh-ring">
              <div className="wh-ring-inner">
                <strong>
                  {analytics.total
                    ? Math.round(
                        (analytics.closed / analytics.total) * 100
                      )
                    : 0}
                  %
                </strong>

                <span>Closure Accuracy</span>
              </div>
            </div>

            <div className="wh-floating-card">
              <BadgeCheck size={18} />
              <div>
                <strong>Operational Stability</strong>
                <span>Excellent technician consistency detected</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* STATS */}

        <section className="wh-stats">
          {summaryCards.map((card, index) => {
            const Icon = card.icon

            return (
              <motion.div
                key={card.label}
                className={`wh-stat ${card.tone}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.06,
                }}
                whileHover={{
                  y: -4,
                }}
              >
                <div className="wh-stat-top">
                  <div className="wh-stat-icon">
                    <Icon size={18} />
                  </div>

                  <TrendingUp size={16} className="wh-stat-trend" />
                </div>

                <div className="wh-stat-value">{card.value}</div>

                <div className="wh-stat-label">{card.label}</div>
              </motion.div>
            )
          })}
        </section>

        {/* MAIN */}

        <div className="wh-layout">
          {/* LEFT */}

          <motion.section
            className="wh-history-panel"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="wh-panel-top">
              <div>
                <h2>Resolution Timeline</h2>
                <p>
                  Historical maintenance activities and completed operations.
                </p>
              </div>

              <div className="wh-panel-icon">
                <BarChart3 size={18} />
              </div>
            </div>

            {loading ? (
              <div className="wh-empty">
                <Loader2
                  size={34}
                  style={{
                    animation: "spin 1s linear infinite",
                  }}
                />

                <p>Loading operational history...</p>
              </div>
            ) : error ? (
              <div className="wh-empty">
                <AlertTriangle size={30} />
                <p>{error}</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="wh-empty">
                <Wrench size={30} />
                <p>No completed technician history yet.</p>
              </div>
            ) : (
              <div className="wh-timeline">
                {tickets.map((ticket, index) => (
                  <motion.article
                    key={ticket._id}
                    className={`wh-ticket ${
                      selectedTicket?._id === ticket._id ? "active" : ""
                    }`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.03,
                    }}
                    whileHover={{
                      y: -3,
                    }}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="wh-line"></div>

                    <div className="wh-dot"></div>

                    <div className="wh-ticket-content">
                      <div className="wh-ticket-top">
                        <div>
                          <h3>{ticket.title}</h3>

                          <div className="wh-ticket-id">
                            #{String(ticket._id).slice(-6).toUpperCase()}
                          </div>
                        </div>

                        <div
                          className="wh-priority"
                          style={priorityTone(ticket.priority)}
                        >
                          {formatLabel(ticket.priority)}
                        </div>
                      </div>

                      <p>{ticket.description}</p>

                      <div className="wh-ticket-footer">
                        <div className="wh-ticket-meta">
                          <span>
                            <Clock3 size={13} />
                            {formatTime(ticket.updatedAt)}
                          </span>

                          <span>
                            <ShieldCheck size={13} />
                            {formatLabel(ticket.status)}
                          </span>
                        </div>

                        <button>
                          Open
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </motion.section>

          {/* RIGHT */}

          <motion.aside
            className="wh-insights"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="wh-panel-top">
              <div>
                <h2>Performance Intelligence</h2>
                <p>Advanced operational technician insights.</p>
              </div>

              <div className="wh-panel-icon">
                <TrendingUp size={18} />
              </div>
            </div>

            {selectedTicket ? (
              <>
                <div className="wh-feature-card">
                  <div className="wh-feature-top">
                    <div className="wh-feature-icon">
                      <Zap size={18} />
                    </div>

                    <div className="wh-feature-tag">
                      Selected Operation
                    </div>
                  </div>

                  <h3>{selectedTicket.title}</h3>

                  <p>{selectedTicket.description}</p>

                  <div className="wh-feature-grid">
                    <div className="wh-feature-box">
                      <span>Status</span>
                      <strong>
                        {formatLabel(selectedTicket.status)}
                      </strong>
                    </div>

                    <div className="wh-feature-box">
                      <span>Priority</span>
                      <strong>
                        {formatLabel(selectedTicket.priority)}
                      </strong>
                    </div>

                    <div className="wh-feature-box">
                      <span>Category</span>
                      <strong>
                        {formatLabel(selectedTicket.category)}
                      </strong>
                    </div>

                    <div className="wh-feature-box">
                      <span>Updated</span>
                      <strong>
                        {formatTime(selectedTicket.updatedAt)}
                      </strong>
                    </div>
                  </div>

                  <button
                    className="wh-view-btn"
                    onClick={() =>
                      navigate(`/ticket/${selectedTicket._id}`)
                    }
                  >
                    Open Full Ticket
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="wh-insight-grid">
                  <div className="wh-mini-card">
                    <TimerReset size={18} />
                    <strong>{analytics.pending}</strong>
                    <span>Pending Resident Confirmations</span>
                  </div>

                  <div className="wh-mini-card">
                    <ShieldCheck size={18} />
                    <strong>
                      {analytics.total
                        ? Math.round(
                            (analytics.closed / analytics.total) * 100
                          )
                        : 0}
                      %
                    </strong>
                    <span>Resolution Accuracy</span>
                  </div>
                </div>

                <div className="wh-category-card">
                  <div className="wh-category-top">
                    <span>Most Active Category</span>

                    <strong>{analytics.topCategory}</strong>
                  </div>

                  <div className="wh-progress">
                    <div className="wh-progress-fill"></div>
                  </div>

                  <p>
                    Your technician profile shows strongest activity within{" "}
                    {formatLabel(analytics.topCategory)} operational tasks.
                  </p>
                </div>
              </>
            ) : (
              <div className="wh-empty">
                <Activity size={30} />
                <p>Select a ticket to inspect details.</p>
              </div>
            )}
          </motion.aside>
        </div>
      </main>

      <style>{`
        .wh-page{
          min-height:100vh;
          position:relative;
          overflow:hidden;
        }

        .wh-shell{
          max-width:1450px;
          margin:0 auto;
          padding:42px 28px 80px;
          position:relative;
          z-index:2;
        }

        .wh-blob{
          position:absolute;
          border-radius:50%;
          filter:blur(90px);
          opacity:.22;
          pointer-events:none;
          z-index:0;
        }

        .wh-blob-1{
          width:340px;
          height:340px;
          background:#6f875a;
          top:120px;
          left:-120px;
        }

        .wh-blob-2{
          width:320px;
          height:320px;
          background:#8a67d4;
          bottom:120px;
          right:-100px;
        }

        .wh-hero{
          display:flex;
          justify-content:space-between;
          gap:40px;
          margin-bottom:28px;
          align-items:flex-end;
        }

        .wh-kicker{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:7px 14px;
          border-radius:999px;
          background:rgba(139,92,246,.14);
          border:1px solid rgba(139,92,246,.24);
          color:#e9d5ff;
          font-size:12px;
          margin-bottom:18px;
        }

        .wh-hero h1{
          margin:0;
          font-size:clamp(40px,5vw,64px);
          line-height:1;
          letter-spacing:-0.05em;
        }

        .wh-hero h1 span{
          background:linear-gradient(135deg,#a68a64,#8b5cf6);
          -webkit-background-clip:text;
          color:transparent;
        }

        .wh-hero p{
          max-width:760px;
          margin-top:18px;
          line-height:1.8;
          opacity:.72;
          font-size:15px;
        }

        .wh-hero-badges{
          display:flex;
          gap:14px;
          margin-top:22px;
          flex-wrap:wrap;
        }

        .wh-hero-badge{
          display:flex;
          align-items:center;
          gap:8px;
          padding:10px 14px;
          border-radius:14px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.12);
          font-size:13px;
        }

        .wh-hero-right{
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:22px;
        }

        .wh-ring{
          width:220px;
          height:220px;
          border-radius:50%;
          background:
            conic-gradient(
              #8b5cf6 0deg,
              #6f875a 220deg,
              rgba(255,255,255,.08) 220deg
            );

          display:grid;
          place-items:center;
          box-shadow:0 25px 60px rgba(0,0,0,.3);
        }

        .wh-ring-inner{
          width:170px;
          height:170px;
          border-radius:50%;
          background:#121212;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(255,255,255,.08);
        }

        .wh-ring-inner strong{
          font-size:42px;
          line-height:1;
        }

        .wh-ring-inner span{
          margin-top:8px;
          opacity:.6;
          font-size:13px;
        }

        .wh-floating-card{
          display:flex;
          gap:12px;
          align-items:flex-start;
          padding:16px;
          border-radius:18px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
          backdrop-filter:blur(18px);
          width:280px;
        }

        .wh-floating-card strong{
          display:block;
          margin-bottom:4px;
          font-size:14px;
        }

        .wh-floating-card span{
          opacity:.68;
          font-size:12px;
          line-height:1.5;
        }

        .wh-stats{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:18px;
          margin-bottom:26px;
        }

        .wh-stat{
          padding:22px;
          border-radius:24px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
          backdrop-filter:blur(18px);
          box-shadow:0 16px 36px rgba(0,0,0,.22);
          transition:.25s ease;
        }

        .wh-stat-top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:20px;
        }

        .wh-stat-icon{
          width:42px;
          height:42px;
          border-radius:14px;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.08);
        }

        .wh-stat-value{
          font-size:40px;
          font-weight:700;
          line-height:1;
        }

        .wh-stat-label{
          margin-top:10px;
          font-size:13px;
          opacity:.68;
        }

        .wh-layout{
          display:grid;
          grid-template-columns:minmax(0,1.15fr) 420px;
          gap:24px;
          height:calc(100vh - 360px);
          min-height:700px;
        }

        .wh-history-panel,
        .wh-insights{
          border-radius:28px;
          background:rgba(255,255,255,.075);
          border:1px solid rgba(255,255,255,.12);
          backdrop-filter:blur(18px);
          overflow:hidden;
          display:flex;
          flex-direction:column;
          min-height:0;
        }

        .wh-panel-top{
          padding:24px 24px 20px;
          border-bottom:1px solid rgba(255,255,255,.08);
          display:flex;
          justify-content:space-between;
          gap:16px;
          flex-shrink:0;
        }

        .wh-panel-top h2{
          margin:0;
          font-size:22px;
        }

        .wh-panel-top p{
          margin:8px 0 0;
          opacity:.66;
          line-height:1.6;
          font-size:13px;
        }

        .wh-panel-icon{
          width:42px;
          height:42px;
          border-radius:14px;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
          flex-shrink:0;
        }

        .wh-timeline{
          overflow-y:auto;
          flex:1;
          min-height:0;
          padding:26px;
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .wh-ticket{
          position:relative;
          padding-left:42px;
          cursor:pointer;
          flex-shrink:0;
        }

        .wh-line{
          position:absolute;
          left:11px;
          top:30px;
          bottom:-24px;
          width:2px;
          background:linear-gradient(
            to bottom,
            rgba(139,92,246,.6),
            transparent
          );
        }

        .wh-dot{
          position:absolute;
          width:22px;
          height:22px;
          border-radius:50%;
          left:0;
          top:10px;
          background:linear-gradient(135deg,#8b5cf6,#6f875a);
          box-shadow:0 0 20px rgba(139,92,246,.5);
        }

        .wh-ticket-content{
          border-radius:24px;
          padding:22px;
          background:rgba(255,255,255,.055);
          border:1px solid rgba(255,255,255,.1);
          transition:.25s ease;
        }

        .wh-ticket.active .wh-ticket-content{
          border-color:rgba(139,92,246,.45);
          box-shadow:0 20px 45px rgba(0,0,0,.24);
        }

        .wh-ticket-top{
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:flex-start;
        }

        .wh-ticket-top h3{
          margin:0;
          font-size:19px;
        }

        .wh-ticket-id{
          margin-top:6px;
          font-size:11px;
          letter-spacing:.12em;
          opacity:.48;
        }

        .wh-ticket-content p{
          margin:16px 0 0;
          line-height:1.75;
          opacity:.74;
          font-size:14px;
        }

        .wh-priority{
          padding:7px 12px;
          border-radius:999px;
          font-size:11px;
          font-weight:600;
          white-space:nowrap;
        }

        .wh-ticket-footer{
          margin-top:18px;
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:center;
          flex-wrap:wrap;
        }

        .wh-ticket-meta{
          display:flex;
          gap:14px;
          flex-wrap:wrap;
        }

        .wh-ticket-meta span{
          display:flex;
          align-items:center;
          gap:6px;
          font-size:12px;
          opacity:.66;
        }

        .wh-ticket-footer button{
          height:40px;
          padding:0 16px;
          border:none;
          border-radius:12px;
          background:rgba(139,92,246,.16);
          color:#e9d5ff;
          display:flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
          transition:.25s ease;
        }

        .wh-ticket-footer button:hover{
          background:rgba(139,92,246,.24);
        }

        .wh-insights{
          overflow-y:auto;

          scrollbar-width:none;    
          -ms-overflow-style:none; 
        }

        .wh-insights::-webkit-scrollbar{
          display:none;   
        }

        .wh-feature-card{
          margin:22px;
          padding:22px;
          border-radius:24px;
          background:
            linear-gradient(
              145deg,
              rgba(139,92,246,.18),
              rgba(255,255,255,.05)
            );

          border:1px solid rgba(255,255,255,.12);
        }

        .wh-feature-top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:20px;
        }

        .wh-feature-icon{
          width:44px;
          height:44px;
          border-radius:14px;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.08);
        }

        .wh-feature-tag{
          padding:8px 12px;
          border-radius:999px;
          background:rgba(255,255,255,.08);
          font-size:11px;
        }

        .wh-feature-card h3{
          margin:0;
          font-size:24px;
          line-height:1.3;
        }

        .wh-feature-card p{
          margin:16px 0 0;
          line-height:1.75;
          opacity:.72;
          font-size:14px;
        }

        .wh-feature-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
          margin-top:22px;
        }

        .wh-feature-box{
          padding:16px;
          border-radius:18px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
        }

        .wh-feature-box span{
          display:block;
          font-size:11px;
          opacity:.6;
          margin-bottom:10px;
        }

        .wh-feature-box strong{
          font-size:14px;
        }

        .wh-view-btn{
          width:100%;
          margin-top:20px;
          height:48px;
          border:none;
          border-radius:16px;
          background:linear-gradient(
            135deg,
            #8b5cf6,
            #6f875a
          );

          color:white;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          cursor:pointer;
          font-weight:600;
          transition:.25s ease;
        }

        .wh-view-btn:hover{
          transform:translateY(-2px);
        }

        .wh-insight-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
          padding:0 22px;
        }

        .wh-mini-card{
          padding:20px;
          border-radius:22px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
        }

        .wh-mini-card strong{
          display:block;
          font-size:28px;
          margin-top:14px;
        }

        .wh-mini-card span{
          display:block;
          margin-top:8px;
          opacity:.66;
          line-height:1.5;
          font-size:12px;
        }

        .wh-category-card{
          margin:22px;
          padding:22px;
          border-radius:24px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
        }

        .wh-category-top{
          display:flex;
          justify-content:space-between;
          gap:12px;
          margin-bottom:16px;
        }

        .wh-category-top span{
          opacity:.68;
          font-size:13px;
        }

        .wh-progress{
          height:10px;
          border-radius:999px;
          overflow:hidden;
          background:rgba(255,255,255,.06);
        }

        .wh-progress-fill{
          width:82%;
          height:100%;
          background:linear-gradient(
            90deg,
            #8b5cf6,
            #6f875a
          );
        }

        .wh-category-card p{
          margin:16px 0 0;
          line-height:1.7;
          opacity:.68;
          font-size:13px;
        }

        .wh-empty{
          flex:1;
          min-height:0;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:16px;
          opacity:.82;
          text-align:center;
          padding:30px;
        }

        .wh-timeline::-webkit-scrollbar{
          width:6px;
        }

        .wh-timeline::-webkit-scrollbar-thumb{
          background:rgba(139,92,246,.45);
          border-radius:999px;
        }

        @keyframes spin{
          from{
            transform:rotate(0deg);
          }
          to{
            transform:rotate(360deg);
          }
        }

        @media(max-width:1200px){
          .wh-layout{
            grid-template-columns:1fr;
            height:auto;
          }

          .wh-history-panel,
          .wh-insights{
            min-height:700px;
          }
        }

        @media(max-width:900px){
          .wh-stats{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }

          .wh-hero{
            flex-direction:column;
            align-items:flex-start;
          }
        }

        @media(max-width:680px){
          .wh-shell{
            padding:30px 16px 70px;
          }

          .wh-stats{
            grid-template-columns:1fr;
          }

          .wh-feature-grid,
          .wh-insight-grid{
            grid-template-columns:1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default WorkHistory