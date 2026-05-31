import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "react-router-dom"

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  Layers3,
  PlayCircle,
  RotateCcw,
  Sparkles,
  UserCog,
  Users,
  Wrench,
  ChevronRight,
  ShieldAlert,
  Zap,
} from "lucide-react"

import AppTopbar from "../components/AppTopbar"

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
      body: JSON.stringify({
        refreshToken,
      }),
    })

    const data = await res.json()

    if (data?.accessToken) {
      localStorage.setItem("token", data.accessToken)
      return data.accessToken
    }

    return null
  } catch (err) {
    console.error(err)
    return null
  }
}

async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem("token")

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
    localStorage.clear()
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

function formatTime(date) {
  if (!date) return "Unknown"

  const now = new Date()
  const d = new Date(date)

  const diff = Math.floor((now - d) / 1000)

  if (diff < 60) return "just now"

  const mins = Math.floor(diff / 60)

  if (mins < 60) return `${mins}m ago`

  const hrs = Math.floor(mins / 60)

  if (hrs < 24) return `${hrs}h ago`

  return `${Math.floor(hrs / 24)}d ago`
}

function formatSlaTime(ms) {
  if (ms === null || ms === undefined) return ""

  const absMs = Math.abs(ms)
  const totalMinutes = Math.ceil(absMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function getSlaDisplay(ticket) {
  const state = String(ticket?.slaState || "").toUpperCase()
  const label = ticket?.slaLabel || "No SLA"
  const remainingMs = ticket?.slaRemainingMs

  if (!state || state === "NO_SLA") {
    return {
      text: "No SLA",
      detail: "SLA not available",
      className: "neutral",
    }
  }

  if (state === "BREACHED" || state === "BREACHED_RESOLVED") {
    return {
      text: label || "SLA breached",
      detail: label || "SLA breached",
      className: "breached",
    }
  }

  if (state === "AT_RISK") {
    const timeText = remainingMs ? `${formatSlaTime(remainingMs)} left` : "At risk"

    return {
      text: `SLA: ${timeText}`,
      detail: timeText,
      className: "risk",
    }
  }

  if (state === "MET") {
    return {
      text: "SLA met",
      detail: "Resolved within SLA",
      className: "met",
    }
  }

  const timeText = remainingMs ? `${formatSlaTime(remainingMs)} left` : label

  return {
    text: `SLA: ${timeText}`,
    detail: timeText,
    className: "ok",
  }
}

function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])

  const [selectedTicket, setSelectedTicket] = useState(null)

  const [selectedTech, setSelectedTech] = useState("")

  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("ALL")

  const [actionLoading, setActionLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const ticketIdFromUrl = searchParams.get("ticket")

useEffect(() => {
  loadData()
}, [ticketIdFromUrl])

  const loadData = async () => {
    try {
      setLoading(true)

      const [ticketRes, usersRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/tickets?limit=1000`),
        fetchWithAuth(`${API_BASE}/api/users`),
      ])

      const ticketData = await ticketRes.json()
      const usersData = await usersRes.json()

      const ticketArray = Array.isArray(ticketData.data)
        ? ticketData.data
        : []

      const userArray = Array.isArray(usersData)
        ? usersData
        : []

      setTickets(ticketArray)
      setUsers(userArray)

if (ticketIdFromUrl) {

  const matchedTicket = ticketArray.find(
    (ticket) => ticket._id === ticketIdFromUrl
  )

  if (matchedTicket) {

    setSelectedTicket(matchedTicket)

    setSelectedTech(
      matchedTicket?.assignedTo?._id || ""
    )

  } else if (ticketArray.length > 0) {

    const first = ticketArray[0]

    setSelectedTicket(first)

    setSelectedTech(first?.assignedTo?._id || "")
  }

} else if (ticketArray.length > 0) {

  const first = ticketArray[0]

  setSelectedTicket(first)

  setSelectedTech(first?.assignedTo?._id || "")
}
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const technicians = useMemo(() => {
    return users.filter((u) => u.role === "technician")
  }, [users])

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = ticket.title
        ?.toLowerCase()
        .includes(search.toLowerCase())

      const matchesFilter =
        filter === "ALL"
          ? true
          : ticket.status === filter

      return matchesSearch && matchesFilter
    })
  }, [tickets, search, filter])

  const analytics = useMemo(() => {
    return {
      open: tickets.filter((t) => t.status === "OPEN").length,

      active: tickets.filter((t) =>
        ["ASSIGNED", "IN_PROGRESS"].includes(t.status)
      ).length,

      closed: tickets.filter((t) => t.status === "CLOSED").length,
    }
  }, [tickets])

  const assignTechnician = async () => {
    if (!selectedTicket || !selectedTech) return

    try {
      setActionLoading(true)

      const res = await fetchWithAuth(
        `${API_BASE}/api/tickets/${selectedTicket._id}/assign`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            technicianId: selectedTech,
          }),
        }
      )

      if (!res.ok) {
        throw new Error("Assignment failed")
      }

      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const reopenTicket = async () => {
    try {
      await fetchWithAuth(
        `${API_BASE}/api/tickets/${selectedTicket._id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: "REOPENED",
          }),
        }
      )

      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="at-loading">
        <motion.div
          className="at-loader"
          animate={{
            rotate: 360,
          }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          }}
        />

        <h2>Synchronizing Operational Grid...</h2>
      </div>
    )
  }

  

  return (
    <div className="at-page">
      <AppTopbar />

      <motion.div
        className="at-blob at-b1"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
        }}
      />

      <motion.div
        className="at-blob at-b2"
        animate={{
          x: [0, -40, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
        }}
      />

      <main className="at-shell">

        {/* HERO */}

        <section className="at-hero">

          <div className="at-hero-left">

            <div className="at-tag">
              <Sparkles size={12} />
              Live Operational Grid
            </div>

            <h1>
              Ticket Command Layer
            </h1>

            <p>
              Intelligent orchestration environment for technician deployment,
              escalation flow, and operational response management.
            </p>

            <div className="at-mini-stats">

              <div>
                <span>OPEN</span>
                <strong>{analytics.open}</strong>
              </div>

              <div>
                <span>ACTIVE</span>
                <strong>{analytics.active}</strong>
              </div>

              <div>
                <span>CLOSED</span>
                <strong>{analytics.closed}</strong>
              </div>

            </div>

          </div>

<div className="at-hero-right">

  <div className="at-grid-core">

    <div className="at-grid-ring ring1"></div>
    <div className="at-grid-ring ring2"></div>

    <motion.div
      className="at-orbit-wrapper"
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 30,
        repeat: Infinity,
        ease: "linear",
      }}
    >

      {/* TOP */}
      <motion.div
        className="at-grid-node n1"
        animate={{ rotate: -360 }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <Zap size={16} />
      </motion.div>

      {/* RIGHT */}
      <motion.div
        className="at-grid-node n2"
        animate={{ rotate: -360 }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <Users size={16} />
      </motion.div>

      {/* BOTTOM */}
      <motion.div
        className="at-grid-node n3"
        animate={{ rotate: -360 }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <Wrench size={16} />
      </motion.div>

      {/* LEFT */}
      <motion.div
        className="at-grid-node n4"
        animate={{ rotate: -360 }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <ShieldAlert size={16} />
      </motion.div>

    </motion.div>

    <motion.div
      className="at-core-center"
      animate={{
        boxShadow: [
          "0 0 20px rgba(139,92,246,0.25)",
          "0 0 45px rgba(139,92,246,0.5)",
          "0 0 20px rgba(139,92,246,0.25)",
        ],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
      }}
    >
      <Cpu size={28} />
    </motion.div>

  </div>

</div>

        </section>

        {/* MAIN */}

        <section className="at-grid">

          {/* LEFT */}

          <aside className="at-sidebar">

            <div className="at-search-panel">

              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

              <div className="at-filter-wrap">

                {[
                  "ALL",
                  "OPEN",
                  "ASSIGNED",
                  "IN_PROGRESS",
                  "RESOLVED_PENDING_CONFIRMATION",
                  "REOPENED",
                  "CLOSED",
                ].map((item) => (

                  <button
                    key={item}
                    onClick={() =>
                      setFilter(item)
                    }
                    className={
                      filter === item
                        ? "active"
                        : ""
                    }
                  >
                    {item
                      .replaceAll("_", " ")
                      .toLowerCase()}
                  </button>

                ))}

              </div>

            </div>

            <div className="at-ticket-scroll">

              {filteredTickets.length === 0 ? (
                <div className="empty-state">
                  <h3>No tickets available</h3>
                  <p>
                    Reported issues and operational
                    requests will appear here.
                  </p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                const slaDisplay = getSlaDisplay(ticket)

                return (
                  <motion.div
                                key={ticket._id}
                                whileHover={{
                                  y: -3,
                                }}
                                className={`at-ticket-card ${
                                  selectedTicket?._id === ticket._id
                                    ? "selected"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectedTicket(ticket)

                                  setSelectedTech(
                                    ticket.assignedTo?._id || ""
                                  )
                                }}
                              >

                                <div className="at-ticket-head">

                                  <h3>{ticket.title}</h3>

                                  <div
                                    className={`at-status ${ticket.status}`}
                                  >
                                    {ticket.status.replaceAll("_", " ")}
                                  </div>

                                </div>

              <div className="at-ticket-tags">

                <span>{ticket.priority}</span>

                <span>
                  {formatTime(ticket.updatedAt)}
                </span>

                <span className={`at-sla-chip ${slaDisplay.className}`}>
                  <Clock3 size={12} />
                  {slaDisplay.text}
                </span>

              </div>

                                <div className="at-ticket-bottom">

                                  <span>
                                    {ticket.createdBy?.name}
                                  </span>

                                  <ChevronRight size={16} />

                                </div>

                              </motion.div>
                )
              })
              )}

            </div>

          </aside>

          {/* CENTER */}

          <section className="at-center">

{selectedTicket && (() => {
  const selectedSlaDisplay = getSlaDisplay(selectedTicket)

  return (
    <AnimatePresence mode="wait">

                <motion.div
                  key={selectedTicket._id}
                  initial={{
                    opacity: 0,
                    y: 18,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="at-main-card"
                >

                  <div className="at-main-top">

                    <div>

                      <div className="at-node-tag">
                        <Layers3 size={12} />
                        Operational Node
                      </div>

                      <h2>
                        {selectedTicket.title}
                      </h2>

                      <p>
                        {selectedTicket.description}
                      </p>

                    </div>

                    <div
                      className={`at-priority ${selectedTicket.priority}`}
                    >
                      {selectedTicket.priority}
                    </div>

                  </div>

                  <div className="at-info-grid">

                    <div>
                      <span>Resident</span>
                      <strong>
                        {selectedTicket.createdBy?.name}
                      </strong>
                    </div>

                    <div>
                      <span>Category</span>
                      <strong>
                        {selectedTicket.category}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {selectedTicket.status}
                      </strong>
                    </div>

                    <div className={`at-sla-info ${selectedSlaDisplay.className}`}>
  <span>SLA</span>
  <strong>
    {selectedSlaDisplay.detail}
  </strong>
</div>

                    <div>
                      <span>Assigned To</span>

                      <strong>
                        {selectedTicket.status === "OPEN" ||
                        !selectedTicket.assignedTo
                          ? "Awaiting Assignment"
                          : selectedTicket.assignedTo?.name}
                      </strong>

                    </div>

                  </div>

                  <div className="at-actions">

                    <div className="at-actions-top">

                      <div>
                        <h3>Action Layer</h3>
                        <p>
                          Context-aware operational workflow.
                        </p>
                      </div>

                      <UserCog size={18} />

                    </div>

                    {selectedTicket.status === "OPEN" && (

                      <>

                        <div className="at-tech-scroll">

                          {technicians.map((tech) => (

                            <button
                              key={tech._id}
                              className={`at-tech-card ${
                                selectedTech === tech._id
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() =>
                                setSelectedTech(tech._id)
                              }
                            >

                              <div>
                                <strong>{tech.name}</strong>
                                <span>Technician</span>
                              </div>

                              <Wrench size={15} />

                            </button>

                          ))}

                        </div>

                        <button
                          className="at-deploy-btn"
                          disabled={actionLoading}
                          onClick={assignTechnician}
                        >

                          <PlayCircle size={18} />
                          Deploy Technician

                        </button>

                      </>

                    )}

                    {selectedTicket.status === "ASSIGNED" && (

                      <div className="at-state assigned">

                        <CheckCircle2 size={20} />

                        <div>
                          <strong>
                            Technician Assigned
                          </strong>

                          <p>
                            Awaiting technician response.
                          </p>
                        </div>

                      </div>

                    )}

                    {selectedTicket.status === "IN_PROGRESS" && (

                      <div className="at-state progress">

                        <Activity size={20} />

                        <div>
                          <strong>
                            Work In Progress
                          </strong>

                          <p>
                            Technician actively working.
                          </p>
                        </div>

                      </div>

                    )}

                    {selectedTicket.status ===
                      "RESOLVED_PENDING_CONFIRMATION" && (

                      <div className="at-state pending">

                        <Clock3 size={20} />

                        <div>
                          <strong>
                            Pending Confirmation
                          </strong>

                          <p>
                            Awaiting resident confirmation.
                          </p>
                        </div>

                      </div>

                    )}

                    {selectedTicket.status === "CLOSED" && (

                      <div className="at-state closed">

                        <CheckCircle2 size={20} />

                        <div>
                          <strong>
                            Closed Successfully
                          </strong>

                          <p>
                            Operational lifecycle completed.
                          </p>
                        </div>

                        <button
                          className="at-reopen-btn"
                          onClick={reopenTicket}
                        >

                          <RotateCcw size={14} />
                          Reopen

                        </button>

                      </div>

                    )}

                  </div>

                </motion.div>

              </AnimatePresence>
  )
})()}

          </section>

          {/* RIGHT */}

          <aside className="at-right">

            <div className="at-side-card">

              <div className="at-side-head">
                <h3>Technician Load</h3>
                <Users size={16} />
              </div>

              <div className="at-tech-network">

                {technicians.map((tech) => {

                  const active = tickets.filter(
                    (t) =>
                      t.assignedTo?._id === tech._id
                  ).length

                  return (

                    <div
                      key={tech._id}
                      className="at-network-card"
                    >

                      <div className="at-network-ring">
                        {active}
                      </div>

                      <div>
                        <strong>{tech.name}</strong>

                        <span>
                          Active Operations: {active}
                        </span>
                      </div>

                    </div>

                  )
                })}

              </div>

            </div>

          </aside>

        </section>

      </main>

      <style>{`

        .at-page{
          min-height:100vh;
          position:relative;
          overflow:hidden;
        }

        .at-shell{
          max-width:1650px;
          margin:0 auto;
          padding:20px 20px 40px;
          position:relative;
          z-index:2;
        }

        .at-blob{
          position:absolute;
          border-radius:50%;
          filter:blur(120px);
          opacity:.12;
        }

        .at-b1{
          width:300px;
          height:300px;
          background:#8b5cf6;
          top:100px;
          left:-120px;
        }

        .at-b2{
          width:320px;
          height:320px;
          background:#6f8a57;
          bottom:-50px;
          right:-100px;
        }

        .at-hero{
          display:grid;
          grid-template-columns:1fr 320px;
          gap:24px;
          align-items:center;
          margin-bottom:24px;
        }

        .at-hero-left h1{
          font-size:56px;
          line-height:.95;
          margin:18px 0 0;
          letter-spacing:-3px;
          max-width:700px;
        }

        .at-hero-left p{
          margin:18px 0 0;
          max-width:720px;
          line-height:1.8;
          opacity:.72;
          font-size:15px;
        }

        .at-tag{
          display:inline-flex;
          align-items:center;
          gap:8px;

          padding:9px 15px;

          border-radius:999px;

          background:rgba(139,92,246,.14);

          border:1px solid rgba(139,92,246,.24);

          font-size:11px;
        }

        .at-mini-stats{
          display:flex;
          gap:16px;
          margin-top:28px;
        }

        .at-mini-stats div{
          min-width:120px;

          padding:16px;

          border-radius:20px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.07);
        }

        .at-mini-stats span{
          display:block;
          font-size:10px;
          opacity:.6;
        }

        .at-mini-stats strong{
          display:block;
          margin-top:8px;
          font-size:28px;
        }

        .at-hero-right{
          height:320px;
          position:relative;
        }

        .at-grid-core{
          width:100%;
          height:100%;

          position:relative;

          display:flex;
          align-items:center;
          justify-content:center;
        }

        .at-grid-ring{
          position:absolute;
          border-radius:50%;
          border:1px dashed rgba(255,255,255,.08);
        }

        .ring1{
          width:230px;
          height:230px;
        }

        .ring2{
          width:170px;
          height:170px;
        }

        .at-core-center{
          width:120px;
          height:120px;

          border-radius:50%;

          display:flex;
          align-items:center;
          justify-content:center;

          background:
            radial-gradient(
              circle at top,
              rgba(139,92,246,.22),
              rgba(255,255,255,.03)
            );

          border:1px solid rgba(139,92,246,.26);

          box-shadow:
            0 0 60px rgba(139,92,246,.16);
        }

.at-orbit-wrapper{
  position:absolute;
  inset:0px;
}        

.at-grid-node{
  position:absolute;
  width:72px;
  height:72px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(18px);
  color:#fff;
}

/* TOP */
.n1{
  left:50%;
  top:0;
  margin-left:-36px;
}

/* RIGHT */
.n2{
  right:0;
  top:50%;
  margin-top:-36px;
}

/* BOTTOM */
.n3{
  left:50%;
  bottom:0;
  margin-left:-36px;
}

/* LEFT */
.n4{
  left:0;
  top:50%;
  margin-top:-36px;
}

        .at-grid{
          display:grid;
          grid-template-columns:40% 60%;
          gap:20px;

          height:calc(100vh - 300px);
          min-height:760px;
        }

        .at-sidebar,
        .at-center{
          display:flex;
          flex-direction:column;
          min-height:0;
          overflow:hidden;
        }

        .at-search-panel,
        .at-ticket-scroll,
        .at-main-card,
        .at-side-card{
          background:rgba(255,255,255,.045);
          border:1px solid rgba(255,255,255,.08);
          backdrop-filter:blur(24px);
        }

        .at-search-panel{
          padding:16px;
          border-radius:26px;
          margin-bottom:16px;
          flex-shrink:0;
        }

        .at-search-panel input{
          width:90%;
          height:42px;

          border:none;
          outline:none;

          border-radius:16px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.08);

          padding:0 16px;

          color:white;
        }

        .at-filter-wrap{
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin-top:16px;
        }

        .at-filter-wrap button{
          border:none;
          outline:none;

          padding:9px 14px;

          border-radius:12px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          color:rgba(255,255,255,.72);

          cursor:pointer;

          font-size:11px;
          font-weight:600;

          transition:.25s;
        }

        .at-filter-wrap button.active{
          background:rgba(139,92,246,.18);
          border-color:rgba(139,92,246,.3);
          color:white;
        }

        .at-ticket-scroll{
          flex:1;
          min-height:0;

          overflow-y:auto;

          border-radius:28px;

          padding:14px;

          display:flex;
          flex-direction:column;
          gap:12px;

          scrollbar-width:none;
        }

        .at-ticket-scroll::-webkit-scrollbar{
          width:0;
        }

        .at-ticket-card{
          padding:16px;

          border-radius:22px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.06);

          cursor:pointer;

          transition:.28s;

          flex-shrink:0;
        }

        .at-ticket-card.selected{
          background:
            linear-gradient(
              145deg,
              rgba(139,92,246,.16),
              rgba(255,255,255,.03)
            );

          border-color:rgba(139,92,246,.3);
        }

        .at-ticket-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
        }

        .at-ticket-head h3{
          margin:0;
          font-size:20px;
          line-height:1.2;
          max-width:58%;
        }

        .at-status{
          padding:8px 12px;

          border-radius:999px;

          font-size:10px;
          font-weight:700;

          white-space:nowrap;

          max-width:150px;

          overflow:hidden;
          text-overflow:ellipsis;

          flex-shrink:0;
        }

        .OPEN{
          background:rgba(239,68,68,.14);
          color:#fecaca;
        }

        .ASSIGNED{
          background:rgba(59,130,246,.14);
          color:#bfdbfe;
        }

        .IN_PROGRESS{
          background:rgba(245,158,11,.14);
          color:#fde68a;
        }

        .RESOLVED_PENDING_CONFIRMATION{
          background:rgba(20,184,166,.14);
          color:#99f6e4;
        }

        .REOPENED{
          background:rgba(168,85,247,.14);
          color:#e9d5ff;
        }

        .CLOSED{
          background:rgba(34,197,94,.14);
          color:#bbf7d0;
        }

        .at-ticket-tags{
          display:flex;
          gap:8px;
          margin-top:14px;
        }

        .at-ticket-tags span{
          padding:6px 10px;

          border-radius:10px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          font-size:10px;
        }

        .at-sla-chip{
  display:inline-flex;
  align-items:center;
  gap:6px;
  text-transform:none;
  letter-spacing:0;
}

.at-sla-chip.ok,
.at-sla-info.ok{
  background:rgba(34,197,94,.13);
  color:#bbf7d0;
  border-color:rgba(34,197,94,.22);
}

.at-sla-chip.met,
.at-sla-info.met{
  background:rgba(34,197,94,.16);
  color:#bbf7d0;
  border-color:rgba(34,197,94,.26);
}

.at-sla-chip.risk,
.at-sla-info.risk{
  background:rgba(234,179,8,.16);
  color:#fde68a;
  border-color:rgba(234,179,8,.26);
}

.at-sla-chip.breached,
.at-sla-info.breached{
  background:rgba(239,68,68,.16);
  color:#fecaca;
  border-color:rgba(239,68,68,.26);
}

.at-sla-chip.neutral,
.at-sla-info.neutral{
  background:rgba(255,255,255,.08);
  color:#e5e7eb;
  border-color:rgba(255,255,255,.12);
}

        .at-ticket-bottom{
          display:flex;
          justify-content:space-between;
          align-items:center;

          margin-top:16px;

          font-size:12px;
          opacity:.7;
        }

        .at-center{
          display:grid;
          grid-template-columns:minmax(0,1fr) 260px;
          gap:18px;
        }

        .at-main-card{
          min-height:0;

          overflow-y:auto;

          border-radius:28px;

          padding:24px;

          scrollbar-width:none;
        }

        .at-main-card::-webkit-scrollbar{
          width:0;
        }

        .at-node-tag{
          display:inline-flex;
          align-items:center;
          gap:8px;

          padding:8px 13px;

          border-radius:999px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          font-size:11px;
        }

        .at-main-top{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:16px;
        }

        .at-main-top h2{
          margin:18px 0 0;
          font-size:52px;
          line-height:1;
          max-width:720px;
        }

        .at-main-top p{
          margin:14px 0 0;
          opacity:.72;
          line-height:1.8;
          max-width:760px;
        }

        .at-priority{
          padding:10px 14px;

          border-radius:14px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          font-size:11px;
          font-weight:700;
        }

        .at-info-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;

          margin-top:24px;
        }

        .at-info-grid div{
          padding:16px;

          border-radius:18px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.07);
        }

        .at-info-grid span{
          display:block;
          font-size:11px;
          opacity:.6;
        }

        .at-info-grid strong{
          display:block;
          margin-top:10px;
          font-size:17px;
        }

        .at-actions{
          margin-top:24px;

          padding:22px;

          border-radius:24px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.08);
        }

        .at-actions-top{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        }

        .at-actions-top h3{
          margin:0;
          font-size:26px;
        }

        .at-actions-top p{
          margin:8px 0 0;
          opacity:.65;
          font-size:13px;
        }

        .at-tech-scroll{
          display:flex;
          flex-direction:column;
          gap:10px;

          max-height:240px;

          overflow-y:auto;

          margin-top:18px;

          scrollbar-width:none;
        }

        .at-tech-scroll::-webkit-scrollbar{
          width:0;
        }

        .at-tech-card{
          border:none;
          outline:none;

          padding:14px 16px;

          border-radius:16px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          display:flex;
          justify-content:space-between;
          align-items:center;

          color:white;

          cursor:pointer;

          transition:.25s;
        }

        .at-tech-card.selected{
          background:rgba(139,92,246,.16);
          border-color:rgba(139,92,246,.3);
        }

        .at-tech-card strong{
          display:block;
          font-size:14px;
        }

        .at-tech-card span{
          display:block;
          margin-top:5px;
          font-size:10px;
          opacity:.6;
        }

        .at-deploy-btn{
          width:100%;
          height:54px;

          border:none;
          outline:none;

          margin-top:16px;

          border-radius:16px;

          background:
            linear-gradient(
              135deg,
              #8b5cf6,
              #69824e
            );

          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;

          color:white;

          font-weight:600;

          cursor:pointer;
        }

        .at-state{
          display:flex;
          align-items:center;
          gap:16px;

          margin-top:18px;

          padding:18px;

          border-radius:18px;
        }

        .assigned{
          background:rgba(59,130,246,.12);
          border:1px solid rgba(59,130,246,.22);
        }

        .progress{
          background:rgba(245,158,11,.12);
          border:1px solid rgba(245,158,11,.22);
        }

        .pending{
          background:rgba(20,184,166,.12);
          border:1px solid rgba(20,184,166,.22);
        }

        .closed{
          background:rgba(34,197,94,.12);
          border:1px solid rgba(34,197,94,.22);
        }

        .at-state strong{
          display:block;
        }

        .at-state p{
          margin:6px 0 0;
          font-size:12px;
          opacity:.72;
        }

        .at-reopen-btn{
          margin-left:auto;

          border:none;
          outline:none;

          padding:10px 13px;

          border-radius:12px;

          display:flex;
          align-items:center;
          gap:8px;

          background:rgba(255,255,255,.08);

          color:white;

          cursor:pointer;
        }

        .at-right{
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .at-side-card{
          border-radius:24px;
          padding:18px;
          min-height:0;
        }

        .at-side-head{
          display:flex;
          justify-content:space-between;
          align-items:center;

          margin-bottom:18px;
        }

        .at-side-head h3{
          margin:0;
          font-size:18px;
        }

        .at-tech-network{
          display:flex;
          flex-direction:column;
          gap:12px;

          max-height:600px;

          overflow-y:auto;

          scrollbar-width:none;
        }

        .at-tech-network::-webkit-scrollbar{
          width:0;
        }

        .at-network-card{
          display:flex;
          align-items:center;
          gap:14px;

          padding:14px;

          border-radius:16px;

          background:rgba(255,255,255,.045);

          border:1px solid rgba(255,255,255,.08);
        }

        .at-network-ring{
          width:46px;
          height:46px;

          border-radius:50%;

          display:grid;
          place-items:center;

          background:rgba(139,92,246,.16);

          border:1px solid rgba(139,92,246,.24);

          font-size:13px;
          font-weight:700;
        }

        .at-network-card strong{
          display:block;
          font-size:14px;
        }

        .at-network-card span{
          display:block;
          margin-top:5px;
          font-size:11px;
          opacity:.65;
        }

        .at-loading{
          min-height:100vh;

          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;

          gap:24px;
        }

        .at-loader{
          width:90px;
          height:90px;

          border-radius:50%;

          border:4px solid rgba(255,255,255,.08);

          border-top-color:#8b5cf6;
        }

        .empty-state {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  opacity: 0.8;
}

.empty-state h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.empty-state p {
  max-width: 320px;
  line-height: 1.6;
}

        @media(max-width:1400px){

          .at-center{
            grid-template-columns:1fr;
          }

          .at-right{
            display:none;
          }
        }

        @media(max-width:1150px){

          .at-grid{
            grid-template-columns:1fr;
            height:auto;
          }

          .at-sidebar,
          .at-center{
            height:auto;
          }

          .at-ticket-scroll{
            max-height:500px;
          }

          .at-main-card{
            max-height:none;
          }

          .at-hero{
            grid-template-columns:1fr;
          }
        }

      `}</style>
    </div>
  )
}

export default AdminTickets