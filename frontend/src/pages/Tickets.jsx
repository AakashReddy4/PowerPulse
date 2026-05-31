import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import AppTopbar from "../components/AppTopbar"
import { refreshAccessToken } from "../utils/auth"
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Filter,
  Image as ImageIcon,
  Layers3,
  Pin,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react"



import { API_BASE } from "../config"

function formatStatus(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTime(dateString) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "—"

  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return "just now"
  const min = Math.floor(diff / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr${hr > 1 ? "s" : ""} ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} day${day > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

function getStatusStyle(status) {
  switch (String(status || "").toUpperCase()) {
    case "OPEN":
      return {
        bg: "rgba(59, 130, 246, 0.16)",
        color: "#bfdbfe",
        border: "1px solid rgba(59, 130, 246, 0.25)",
      }
    case "ASSIGNED":
      return {
        bg: "rgba(14, 165, 233, 0.16)",
        color: "#bae6fd",
        border: "1px solid rgba(14, 165, 233, 0.25)",
      }
    case "IN_PROGRESS":
      return {
        bg: "rgba(234, 179, 8, 0.16)",
        color: "#fde68a",
        border: "1px solid rgba(234, 179, 8, 0.25)",
      }
    case "RESOLVED_PENDING_CONFIRMATION":
      return {
        bg: "rgba(168, 85, 247, 0.16)",
        color: "#ddd6fe",
        border: "1px solid rgba(168, 85, 247, 0.25)",
      }
    case "CLOSED":
      return {
        bg: "rgba(34, 197, 94, 0.16)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.25)",
      }
    case "REOPENED":
      return {
        bg: "rgba(244, 114, 182, 0.16)",
        color: "#fbcfe8",
        border: "1px solid rgba(244, 114, 182, 0.25)",
      }
    default:
      return {
        bg: "rgba(255,255,255,0.08)",
        color: "#f3f3ee",
        border: "1px solid rgba(255,255,255,0.14)",
      }
  }
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
      style: {
        bg: "rgba(255,255,255,0.08)",
        color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,0.12)",
      },
    }
  }

  if (state === "BREACHED" || state === "BREACHED_RESOLVED") {
    return {
      text: label || "SLA breached",
      detail: label || "SLA breached",
      style: {
        bg: "rgba(239, 68, 68, 0.16)",
        color: "#fecaca",
        border: "1px solid rgba(239, 68, 68, 0.26)",
      },
    }
  }

  if (state === "AT_RISK") {
    const timeText = remainingMs ? `${formatSlaTime(remainingMs)} left` : "At risk"
    return {
      text: `SLA: ${timeText}`,
      detail: timeText,
      style: {
        bg: "rgba(234, 179, 8, 0.16)",
        color: "#fde68a",
        border: "1px solid rgba(234, 179, 8, 0.26)",
      },
    }
  }

  if (state === "MET") {
    return {
      text: "SLA met",
      detail: "Resolved within SLA",
      style: {
        bg: "rgba(34, 197, 94, 0.16)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.26)",
      },
    }
  }

  const timeText = remainingMs ? `${formatSlaTime(remainingMs)} left` : label

  return {
    text: `SLA: ${timeText}`,
    detail: timeText,
    style: {
      bg: "rgba(34, 197, 94, 0.13)",
      color: "#bbf7d0",
      border: "1px solid rgba(34, 197, 94, 0.22)",
    },
  }
}


function resolveImageSrc(src) {
  if (!src || typeof src !== "string") return ""
  if (src.startsWith("http")) return src
  if (src.startsWith("/")) return `${API_BASE}${src}`
  return `${API_BASE}/${src}`
}

async function safeJson(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token")

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

function Tickets() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user"))

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("newest")
  const [selectedId, setSelectedId] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

const fetchTickets = async () => {
  try {
    setLoading(true)
    setError("")

    const res = await fetchWithAuth(
      `${API_BASE}/api/tickets/organization`
    )

    const data = await safeJson(res)

    if (!res.ok) {
      throw new Error(
        data?.message || "Failed to load tickets"
      )
    }

    const allTickets = Array.isArray(data?.data)
      ? data.data
      : []

    // CURRENT USER ORG
    const userOrg =
      typeof user?.organization === "object"
        ? user.organization?._id
        : user?.organization

    // FILTER ONLY SAME ORGANIZATION TICKETS
    const organizationTickets = allTickets.filter(
      (ticket) => {

        const creatorOrg =
          typeof ticket.createdBy === "object"
            ? typeof ticket.createdBy?.organization === "object"
              ? ticket.createdBy.organization?._id
              : ticket.createdBy?.organization
            : null

        return creatorOrg === userOrg
      }
    )

    setTickets(organizationTickets)

    setSelectedId((prev) => {

      if (
        prev &&
        organizationTickets.some(
          (t) => t._id === prev
        )
      ) {
        return prev
      }

      return organizationTickets[0]?._id || null
    })

  } catch (err) {
    console.error(err)

    setError(
      err.message || "Failed to load tickets"
    )
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    fetchTickets()
  }, [])

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()

    let list = tickets.filter((t) => {
      const haystack = `${t.title || ""} ${t.description || ""} ${t.category || ""} ${t.status || ""}`.toLowerCase()
      const matchesSearch = !q || haystack.includes(q)
      const matchesStatus =
        statusFilter === "ALL" ||
        String(t.status || "").toUpperCase() === statusFilter
      return matchesSearch && matchesStatus
    })

    const priorityRank = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

    switch (sortBy) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case "priority":
        list.sort(
          (a, b) =>
            (priorityRank[String(b.priority || "").toUpperCase()] || 2) -
            (priorityRank[String(a.priority || "").toUpperCase()] || 2)
        )
        break
      case "status":
        list.sort((a, b) =>
          String(a.status || "").localeCompare(String(b.status || ""))
        )
        break
      default:
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return list
  }, [tickets, search, statusFilter, sortBy])

  useEffect(() => {
    if (!filteredTickets.length) return

    const stillVisible = filteredTickets.some((t) => t._id === selectedId)
    if (!stillVisible) {
      setSelectedId(filteredTickets[0]._id)
    }
  }, [filteredTickets, selectedId])

  const selectedTicket = useMemo(
    () => tickets.find((t) => t._id === selectedId) || null,
    [tickets, selectedId]
  )
  const statusStyle = getStatusStyle(selectedTicket?.status)
  const selectedSlaDisplay = getSlaDisplay(selectedTicket)

  const selectedImages = useMemo(() => {
    if (!selectedTicket) return []
    const raw = Array.isArray(selectedTicket.images) ? selectedTicket.images : []

    return raw
      .map((img) => {
        if (typeof img === "string") return resolveImageSrc(img)
        return resolveImageSrc(img?.url || img?.path || img?.src || "")
      })
      .filter(Boolean)
  }, [selectedTicket])

  const selectedHistory = useMemo(() => {
    const raw = Array.isArray(selectedTicket?.history) ? [...selectedTicket.history] : []
    return raw.reverse().slice(0, 5)
  }, [selectedTicket])

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "OPEN").length,
      assigned: tickets.filter((t) => t.status === "ASSIGNED").length,
      progress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      pending: tickets.filter((t) => t.status === "RESOLVED_PENDING_CONFIRMATION").length,
    }
  }, [tickets])

  const openDetail = (ticketId) => {
    navigate(`/ticket/${ticketId}`)
  }

  const currentStatus = String(selectedTicket?.status || "").toUpperCase()
  const currentIndex = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED_PENDING_CONFIRMATION", "CLOSED"].indexOf(currentStatus)

  const timeline = [
    {
      key: "OPEN",
      title: "Open",
      desc: "Waiting for assignment",
    },
    {
      key: "ASSIGNED",
      title: "Assigned",
      desc: "Technician selected",
    },
    {
      key: "IN_PROGRESS",
      title: "In Progress",
      desc: "Work has started",
    },
    {
      key: "RESOLVED_PENDING_CONFIRMATION",
      title: "Pending Confirm",
      desc: "Waiting for resident action",
    },
    {
      key: "CLOSED",
      title: "Closed",
      desc: "Archived after confirmation",
    },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AppTopbar />

      <motion.div
        className="tt-blob tt-blob-a"
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="tt-blob tt-blob-b"
        animate={{ y: [0, 14, 0], x: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className="tt-shell">
        <motion.section
          className="tt-hero"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="tt-hero-left">
            <div className="tt-kicker">
              <Sparkles size={14} />
              Organization view
            </div>

            <h1>Tickets</h1>
            <p>
              A live window into every request inside your organization. Search, filter,
              inspect status changes, and open the full ticket view whenever needed.
            </p>
          </div>

          <div className="tt-hero-card">
            <div className="tt-hero-badge">
              <Layers3 size={16} />
              {user?.role ? formatStatus(user.role) : "Resident"}
            </div>
            <strong>{stats.total}</strong>
            <span>Total visible tickets</span>
          </div>
        </motion.section>

        <div className="tt-stats">
          {[
            { label: "Total", value: stats.total, note: "All tickets returned" },
            { label: "Open", value: stats.open, note: "Waiting for assignment" },
            { label: "Active", value: stats.assigned + stats.progress, note: "Being handled now" },
            { label: "Pending", value: stats.pending, note: "Need resident confirmation" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              className="tt-stat-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <div className="tt-stat-label">{item.label}</div>
              <div className="tt-stat-value">{item.value}</div>
              <div className="tt-stat-note">{item.note}</div>
            </motion.div>
          ))}
        </div>

        {error ? <div className="tt-error">{error}</div> : null}

        <div className="tt-layout">
          <section className="tt-panel tt-list-panel">
            <div className="tt-toolbar">
              <div className="tt-search-wrap">
                <Search size={16} className="tt-search-icon" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="tt-input tt-search"
                  placeholder="Search title, status, category..."
                />
              </div>

              <div className="tt-controls">
                <div className="tt-select-wrap">
                  <Filter size={16} className="tt-select-icon" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="tt-select"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="RESOLVED_PENDING_CONFIRMATION">Pending confirm</option>
                    <option value="CLOSED">Closed</option>
                    <option value="REOPENED">Reopened</option>
                  </select>
                  <ChevronDown size={16} className="tt-chevron" />
                </div>

                <div className="tt-select-wrap">
                  <Clock3 size={16} className="tt-select-icon" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="tt-select"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                  <ChevronDown size={16} className="tt-chevron" />
                </div>
              </div>
            </div>

            <div className="tt-list-meta">
              Showing {filteredTickets.length} of {tickets.length} tickets
            </div>

            {loading ? (
              <div className="tt-loading">
                <div className="tt-spinner" />
                <p>Loading organization tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="tt-empty">
                <Pin size={18} />
                <p>No tickets match the current filters.</p>
              </div>
            ) : (
              <div className="tt-scroll">
                <AnimatePresence>
                  {filteredTickets.map((ticket, index) => {
                    const active = selectedTicket?._id === ticket._id
                    const ticketStyle = getStatusStyle(ticket.status)
                    const images = Array.isArray(ticket.images) ? ticket.images : []
                    const slaDisplay = getSlaDisplay(ticket)

                    return (
                      <motion.article
                        key={ticket._id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25, delay: index * 0.015 }}
                        className={`tt-ticket-card ${active ? "active" : ""}`}
                        style={{
                          borderLeftColor:
                            ticket.status === "OPEN"
                              ? "#5b8def"
                              : ticket.status === "ASSIGNED"
                                ? "#38bdf8"
                                : ticket.status === "IN_PROGRESS"
                                  ? "#facc15"
                                  : ticket.status === "RESOLVED_PENDING_CONFIRMATION"
                                    ? "#c084fc"
                                    : "#4ade80",
                        }}
                        onClick={() => setSelectedId(ticket._id)}
                        whileHover={{ y: -2 }}
                      >
                        <div className="tt-ticket-top">
                          <div>
                            <h3>{ticket.title}</h3>
                            <p>{ticket.description}</p>
                          </div>

                          <span
                            className="tt-pill"
                            style={{
                              background: ticketStyle.bg,
                              color: ticketStyle.color,
                              border: ticketStyle.border,
                            }}
                          >
                            {formatStatus(ticket.status)}
                          </span>
                        </div>

                        <div className="tt-meta-row">
                          <span className="tt-mini">
                            <UserRound size={12} />
                            {typeof ticket.createdBy === "object"
                              ? ticket.createdBy?.name || "User"
                              : "User"}
                          </span>

                          <span className="tt-mini">
                            <Clock3 size={12} />
                            {formatTime(ticket.createdAt)}
                          </span>

                          <span className="tt-mini">
                            Priority: {formatStatus(ticket.priority || "medium")}
                          </span>

                          <span
                            className="tt-mini tt-sla-mini"
                            style={{
                              background: slaDisplay.style.bg,
                              color: slaDisplay.style.color,
                              border: slaDisplay.style.border,
                            }}
                          >
                            <Clock3 size={12} />
                            {slaDisplay.text}
                          </span>
                        </div>

                        {images.length > 0 && (
                          <div className="tt-thumbs">
                            {images.slice(0, 3).map((img, i) => {
                              const src = resolveImageSrc(
                                typeof img === "string" ? img : img?.url || img?.path || ""
                              )
                              return src ? (
                                <div key={`${ticket._id}-${i}`} className="tt-thumb">
                                  <img src={src} alt={`thumb-${i + 1}`} />
                                </div>
                              ) : null
                            })}
                            {images.length > 3 && (
                              <div className="tt-thumb tt-thumb-more">
                                +{images.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="tt-actions">
                          <button
                            type="button"
                            className="tt-link"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedId(ticket._id)
                            }}
                          >
                            Preview
                          </button>

                          <button
                            type="button"
                            className="tt-open"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail(ticket._id)
                            }}
                          >
                            Open full page
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </motion.article>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.aside
                key={selectedTicket._id}
                className="tt-panel tt-preview-panel"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.3 }}
              >
                <div className="tt-preview-scroll">
                  <div className="tt-preview-head">
                    <div>
                      <div className="tt-preview-kicker">
                        <Pin size={14} />
                        Focus panel
                      </div>
                      <h2>{selectedTicket.title}</h2>
                      <p>{selectedTicket.description}</p>
                    </div>

                    <span
                      className="tt-pill"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: statusStyle.border,
                      }}
                    >
                      {formatStatus(selectedTicket.status)}
                    </span>
                  </div>

                  <div className="tt-preview-grid">
                    <div className="tt-info-card">
                      <span>Created by</span>
                      <strong>
                        {typeof selectedTicket.createdBy === "object"
                          ? selectedTicket.createdBy?.name || "Resident"
                          : "Resident"}
                      </strong>
                    </div>
                    <div className="tt-info-card">
                      <span>Assigned to</span>
                      <strong>
                        {typeof selectedTicket.assignedTo === "object"
                          ? selectedTicket.assignedTo?.name || "Not assigned"
                          : selectedTicket.assignedTo
                            ? "Assigned"
                            : "Not assigned"}
                      </strong>
                    </div>
                    <div className="tt-info-card">
                      <span>Priority</span>
                      <strong>{formatStatus(selectedTicket.priority || "medium")}</strong>
                    </div>
                    <div className="tt-info-card tt-sla-card">
                      <span>SLA</span>
                      <strong>{selectedSlaDisplay.detail}</strong>
                    </div>
                    <div className="tt-info-card">
                      <span>Created</span>
                      <strong>{formatTime(selectedTicket.createdAt)}</strong>
                    </div>
                  </div>

                  <div className="tt-section">
                    <div className="tt-section-head">
                      <h3>Timeline</h3>
                      <span>Current ticket journey</span>
                    </div>

                    <div className="tt-timeline">
                      {timeline.map((step, idx) => {
                        const done = currentIndex > idx
                        const active = currentStatus === step.key
                        return (
                          <div
                            key={step.key}
                            className={`tt-step ${done ? "done" : ""} ${active ? "active" : ""}`}
                          >
                            <div className="tt-step-icon">
                              <span className="tt-step-dot" />
                            </div>

                            <div className="tt-step-text">
                              <strong>{step.title}</strong>
                              <span>{step.desc}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="tt-section">
                    <div className="tt-section-head">
                      <h3>Images</h3>
                      <span>{selectedImages.length} attachment(s)</span>
                    </div>

                    {selectedImages.length > 0 ? (
                      <div className="tt-image-grid">
                        {selectedImages.map((img, i) => {
                          const src = resolveImageSrc(
                            typeof img === "string" ? img : img?.url || img?.path || ""
                          )
                          return src ? (
                            <button
                              key={`${selectedTicket._id}-img-${i}`}
                              className="tt-image-card"
                              onClick={() => setPreviewImage(src)}
                              type="button"
                            >
                              <img src={src} alt={`attachment-${i + 1}`} />
                              <span>Open</span>
                            </button>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <div className="tt-empty-inline">
                        <ImageIcon size={16} />
                        No images attached.
                      </div>
                    )}
                  </div>

                  <div className="tt-section">
                    <div className="tt-section-head">
                      <h3>Recent activity</h3>
                      <span>Latest changes</span>
                    </div>

                    {selectedHistory.length > 0 ? (
                      <div className="tt-activity">
                        {selectedHistory.map((item, idx) => (
                          <div key={`${item.action}-${idx}`} className="tt-activity-item">
                            <div className="tt-activity-icon">
                              <Clock3 size={13} />
                            </div>
                            <div>
                              <strong>{formatStatus(item.action)}</strong>
                              <p>{item.details || "No details available"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="tt-empty-inline">
                        <Clock3 size={16} />
                        No activity yet.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="tt-open-wide"
                    onClick={() => openDetail(selectedTicket._id)}
                  >
                    View full ticket
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.aside>
            ) : (
              <motion.aside
                className="tt-panel tt-preview-panel"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="tt-preview-scroll">
                  <div className="tt-empty-focus">
                    <Pin size={22} />
                    <h3>No ticket selected</h3>
                    <p>Choose a ticket on the left to inspect its summary here.</p>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            className="tt-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              className="tt-modal-inner"
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="tt-modal-close" onClick={() => setPreviewImage(null)}>
                ×
              </button>
              <img src={previewImage} alt="preview" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .tt-shell {
          max-width: 1500px;
          margin: 0 auto;
          padding: 40px 24px 84px;
          position: relative;
          z-index: 2;
        }

        .tt-hero {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-end;
          margin-bottom: 24px;
        }

        .tt-hero-left {
          max-width: 840px;
        }

        .tt-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(166, 138, 100, 0.14);
          border: 1px solid rgba(166, 138, 100, 0.24);
          color: #f0dfcf;
          font-size: 12px;
          margin-bottom: 14px;
        }

        .tt-hero h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .tt-hero p {
          margin: 12px 0 0;
          max-width: 820px;
          opacity: 0.78;
          line-height: 1.65;
          font-size: 15px;
        }

        .tt-hero-card {
          min-width: 220px;
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 12px 32px rgba(0,0,0,0.22);
          backdrop-filter: blur(16px);
          text-align: right;
        }

        .tt-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 12px;
          opacity: 0.86;
        }

        .tt-hero-card strong {
          display: block;
          font-size: 30px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .tt-hero-card span {
          font-size: 13px;
          opacity: 0.72;
        }

        .tt-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .tt-stat-card {
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 28px rgba(0,0,0,0.18);
          backdrop-filter: blur(16px);
        }

        .tt-stat-label {
          font-size: 12px;
          opacity: 0.72;
          margin-bottom: 10px;
        }

        .tt-stat-value {
          font-size: 30px;
          font-weight: 700;
          line-height: 1;
        }

        .tt-stat-note {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.62;
        }

        .tt-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(430px, 1.05fr);
          gap: 24px;

          height: calc(100vh - 260px); 
          min-height: 600px;
        }

        .tt-panel {
          border-radius: 24px;
          background: rgba(255,255,255,0.075);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 14px 36px rgba(0,0,0,0.22);
          backdrop-filter: blur(18px);
        }

        .tt-list-panel,
        .tt-preview-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: auto; 
        }

        .tt-list-panel {
          padding: 18px;
        }

        .tt-preview-panel {
          padding: 20px;
        }

        .tt-toolbar {
          display: flex;
          gap: 14px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .tt-search-wrap {
          position: relative;
          min-width: 240px;
          flex: 1;
        }

        .tt-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.7;
          pointer-events: none;
        }

        .tt-input {
          width: 80%;
          border-radius: 14px;
          background: rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.12);
          color: #f3f3ee;
          outline: none;
          padding: 14px 15px;
          transition: all 0.22s ease;
          font: inherit;
        }

        .tt-input:focus {
          border-color: rgba(166,138,100,0.55);
          box-shadow: 0 0 0 4px rgba(166,138,100,0.12);
        }

        .tt-search {
          padding-left: 42px;
        }

        .tt-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tt-select-wrap {
          position: relative;
          min-width: 180px;
        }

        .tt-select-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.65;
          pointer-events: none;
          z-index: 2;
        }

        .tt-select {
          appearance: none;
          width: 100%;
          border-radius: 14px;
          background: rgba(0,0,0,0.22);
          border: 1px solid rgba(255,255,255,0.14);
          color: #f3f3ee;
          padding: 14px 42px 14px 40px;
          cursor: pointer;
          transition: all 0.22s ease;
        }

        .tt-select:hover {
          border-color: rgba(166,138,100,0.5);
        }

        .tt-chevron {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.65;
          pointer-events: none;
        }

        .tt-list-meta {
          margin: 14px 0 14px;
          font-size: 12px;
          opacity: 0.65;
        }

.tt-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  display: flex;
  flex-direction: column;
  gap: 14px;
}

        .tt-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .tt-scroll::-webkit-scrollbar-thumb {
          background: rgba(166,138,100,0.42);
          border-radius: 999px;
        }

        .tt-ticket-card {
          position: relative;
          padding: 14px 14px 12px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.05));
          border: 1px solid rgba(255,255,255,0.12);
          border-left-width: 5px;
          box-shadow: 0 8px 26px rgba(0,0,0,0.18);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          min-height: auto;
          flex-shrink: 0;
        }

        .tt-ticket-card:hover {
          box-shadow: 0 12px 32px rgba(0,0,0,0.24);
          border-color: rgba(166,138,100,0.34);
        }

        .tt-ticket-card.active {
          border-color: rgba(166,138,100,0.4);
          box-shadow: 0 16px 42px rgba(0,0,0,0.28);
          background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.06));
        }

        .tt-ticket-top {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }

        .tt-ticket-top h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .tt-ticket-top p {
          margin: 7px 0 0;
          font-size: 13px;
          line-height: 1.55;
          opacity: 0.82;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tt-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }

        .tt-meta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .tt-mini {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.7;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .tt-sla-mini {
  opacity: 1;
  font-weight: 600;
}

        .tt-thumbs {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .tt-thumb {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.18);
        }

        .tt-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .tt-thumb-more {
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 600;
        }

        .tt-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .tt-link {
          background: transparent;
          border: none;
          color: #d6c2a8;
          cursor: pointer;
          font-weight: 600;
          padding: 0;
        }

        .tt-open {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border-radius: 12px;
          background: rgba(166,138,100,0.14);
          border: 1px solid rgba(166,138,100,0.22);
          color: #f3e8d8;
          cursor: pointer;
          transition: all 0.22s ease;
        }

        .tt-open:hover {
          transform: translateY(-1px);
        }

        .tt-preview-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 2px;
        }

        .tt-preview-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .tt-preview-scroll::-webkit-scrollbar-thumb {
          background: rgba(166,138,100,0.38);
          border-radius: 999px;
        }

        .tt-preview-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .tt-preview-head h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .tt-preview-head p {
          margin: 12px 0 0;
          line-height: 1.65;
          opacity: 0.78;
          font-size: 14px;
        }

        .tt-preview-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(166,138,100,0.14);
          border: 1px solid rgba(166,138,100,0.24);
          color: #f0dfcf;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .tt-preview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 6px;
        }

        .tt-info-card {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(0,0,0,0.14);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .tt-info-card span {
          display: block;
          font-size: 11px;
          opacity: 0.65;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .tt-info-card strong {
          font-size: 14px;
          font-weight: 600;
        }

        .tt-sla-card {
  background: rgba(166,138,100,0.10);
  border-color: rgba(166,138,100,0.20);
}

        .tt-section {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .tt-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 10px;
          margin-bottom: 14px;
        }

        .tt-section-head h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .tt-section-head span {
          font-size: 12px;
          opacity: 0.62;
        }

        .tt-timeline {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tt-step {
          padding: 13px 14px;
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          opacity: 0.72;
          transition: all 0.22s ease;
        }

        .tt-step-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .tt-step-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.25);
          display: block;
        }

        .tt-step-text strong {
          display: block;
          font-size: 13px;
          margin-bottom: 3px;
        }

        .tt-step-text span {
          display: block;
          font-size: 12px;
          opacity: 0.66;
          line-height: 1.45;
        }

        .tt-step.done {
          background: rgba(166,138,100,0.12);
          border-color: rgba(166,138,100,0.2);
          opacity: 0.92;
        }

        .tt-step.done .tt-step-dot {
          background: #a68a64;
        }

        .tt-step.active {
          background: rgba(255,255,255,0.1);
          border-color: rgba(166,138,100,0.42);
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.16);
        }

        .tt-step.active .tt-step-icon {
          background: rgba(166,138,100,0.16);
          border-color: rgba(166,138,100,0.24);
        }

        .tt-step.active .tt-step-dot {
          background: #f0dfcf;
          box-shadow: 0 0 0 4px rgba(166,138,100,0.14);
        }

        .tt-step.active .tt-step-text strong {
          color: #fff;
        }

        .tt-step.active .tt-step-text span {
          opacity: 0.8;
        }

        .tt-image-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .tt-image-card {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.18);
          padding: 0;
          cursor: pointer;
        }

        .tt-image-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .tt-image-card span {
          position: absolute;
          inset: auto 10px 10px 10px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(0,0,0,0.58);
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 11px;
          font-weight: 600;
        }

        .tt-empty-inline {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(0,0,0,0.14);
          border: 1px dashed rgba(255,255,255,0.14);
          opacity: 0.74;
          font-size: 13px;
        }

        .tt-activity {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tt-activity-item {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 12px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(0,0,0,0.12);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .tt-activity-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(166,138,100,0.14);
          border: 1px solid rgba(166,138,100,0.2);
        }

        .tt-activity-item strong {
          display: block;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .tt-activity-item p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          opacity: 0.78;
        }

        .tt-open-wide {
          width: 100%;
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #a68a64, #7d6546);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 10px 26px rgba(166,138,100,0.24);
        }

        .tt-empty {
          padding: 28px 18px;
          text-align: center;
          border-radius: 18px;
          background: rgba(255,255,255,0.05);
          border: 1px dashed rgba(255,255,255,0.12);
          opacity: 0.8;
        }

        .tt-loading {
          padding: 38px 20px;
          text-align: center;
          border-radius: 18px;
          background: rgba(255,255,255,0.05);
          border: 1px dashed rgba(255,255,255,0.12);
        }

        .tt-spinner {
          width: 34px;
          height: 34px;
          margin: 0 auto 14px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.14);
          border-top-color: #a68a64;
          animation: ttspin 0.9s linear infinite;
        }

        .tt-error {
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.24);
          color: #fecaca;
          font-size: 13px;
        }

        .tt-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.28;
          pointer-events: none;
          z-index: 0;
        }

        .tt-blob-a {
          width: 300px;
          height: 300px;
          top: 120px;
          right: -80px;
          background: #a68a64;
        }

        .tt-blob-b {
          width: 240px;
          height: 240px;
          bottom: 140px;
          left: -80px;
          background: #6f875a;
        }

        .tt-modal {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0,0,0,0.74);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .tt-modal-inner {
          position: relative;
          max-width: min(92vw, 1100px);
          max-height: 86vh;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.48);
          border: 1px solid rgba(255,255,255,0.15);
        }

        .tt-modal-inner img {
          display: block;
          max-width: 100%;
          max-height: 86vh;
          object-fit: contain;
          background: #111;
        }

        .tt-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: none;
          background: rgba(0,0,0,0.7);
          color: #fff;
          cursor: pointer;
          display: grid;
          place-items: center;
          z-index: 2;
          font-size: 20px;
        }

        .tt-empty-focus {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
          opacity: 0.82;
        }

        .tt-empty-focus h3 {
          margin: 0;
          font-size: 18px;
        }

        .tt-empty-focus p {
          margin: 0;
          max-width: 260px;
          line-height: 1.6;
          opacity: 0.72;
        }

        @keyframes ttspin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1180px) {
          .tt-layout {
            grid-template-columns: 1fr;
          }

          .tt-list-panel,
          .tt-preview-panel {
            min-height: 680px;
          }
        }

        @media (max-width: 760px) {
          .tt-shell {
            padding: 30px 16px 68px;
          }

          .tt-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .tt-hero-card {
            min-width: 100%;
            text-align: left;
          }

          .tt-stats {
            grid-template-columns: 1fr 1fr;
          }

          .tt-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .tt-controls {
            width: 100%;
          }

          .tt-select-wrap {
            min-width: 100%;
          }

          .tt-preview-grid {
            grid-template-columns: 1fr;
          }

          .tt-image-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  )
}

export default Tickets
