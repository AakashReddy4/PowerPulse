import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams,useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import AppTopbar from "../components/AppTopbar"

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Image as ImageIcon,
  Loader2,
  PlayCircle,
  Search,
  X,
  Wrench
} from "lucide-react"

import { API_BASE } from "../config"
const MAX_RESOLUTION_IMAGES = 5

function sameId(a, b) {
  return String(a ?? "") === String(b ?? "")
}

function normalizeStatus(status) {
  return String(status || "OPEN").replace(/\s+/g, "_").toUpperCase()
}

function normalizePriority(priority) {
  return String(priority || "MEDIUM").replace(/\s+/g, "_").toUpperCase()
}

function formatLabel(value) {
  return String(value || "")
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

function resolveImageSrc(src) {
  if (!src || typeof src !== "string") return ""
  if (src.startsWith("http")) return src
  if (src.startsWith("/")) return `${API_BASE}${src}`
  return `${API_BASE}/${src}`
}

function statusTone(status) {
  switch (normalizeStatus(status)) {
    case "OPEN":
      return {
        background: "rgba(59, 130, 246, 0.14)",
        color: "#bfdbfe",
        border: "1px solid rgba(59, 130, 246, 0.22)",
      }
    case "ASSIGNED":
      return {
        background: "rgba(14, 165, 233, 0.14)",
        color: "#bae6fd",
        border: "1px solid rgba(14, 165, 233, 0.24)",
      }
    case "IN_PROGRESS":
      return {
        background: "rgba(234, 179, 8, 0.14)",
        color: "#fde68a",
        border: "1px solid rgba(234, 179, 8, 0.24)",
      }
    case "RESOLVED_PENDING_CONFIRMATION":
      return {
        background: "rgba(168, 85, 247, 0.14)",
        color: "#ddd6fe",
        border: "1px solid rgba(168, 85, 247, 0.24)",
      }
    case "CLOSED":
      return {
        background: "rgba(34, 197, 94, 0.14)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.24)",
      }
    case "REOPENED":
      return {
        background: "rgba(244, 114, 182, 0.14)",
        color: "#fbcfe8",
        border: "1px solid rgba(244, 114, 182, 0.24)",
      }
    default:
      return {
        background: "rgba(255,255,255,0.08)",
        color: "#f3f3ee",
        border: "1px solid rgba(255,255,255,0.14)",
      }
  }
}

function priorityTone(priority) {
  switch (normalizePriority(priority)) {
    case "LOW":
      return {
        background: "rgba(148, 163, 184, 0.14)",
        color: "#e2e8f0",
        border: "1px solid rgba(148, 163, 184, 0.22)",
      }
    case "HIGH":
      return {
        background: "rgba(239, 68, 68, 0.16)",
        color: "#fecaca",
        border: "1px solid rgba(239, 68, 68, 0.24)",
      }
    case "URGENT":
      return {
        background: "rgba(168, 85, 247, 0.16)",
        color: "#e9d5ff",
        border: "1px solid rgba(168, 85, 247, 0.24)",
      }
    default:
      return {
        background: "rgba(166, 138, 100, 0.16)",
        color: "#f4e2c8",
        border: "1px solid rgba(166, 138, 100, 0.24)",
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

function slaTone(state) {
  switch (String(state || "").toUpperCase()) {
    case "BREACHED":
    case "BREACHED_RESOLVED":
      return {
        background: "rgba(239, 68, 68, 0.16)",
        color: "#fecaca",
        border: "1px solid rgba(239, 68, 68, 0.26)",
      }
    case "AT_RISK":
      return {
        background: "rgba(234, 179, 8, 0.16)",
        color: "#fde68a",
        border: "1px solid rgba(234, 179, 8, 0.26)",
      }
    case "MET":
      return {
        background: "rgba(34, 197, 94, 0.16)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.26)",
      }
    case "ACTIVE":
      return {
        background: "rgba(34, 197, 94, 0.13)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.22)",
      }
    default:
      return {
        background: "rgba(255,255,255,0.08)",
        color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,0.12)",
      }
  }
}

function getSlaDisplay(ticket) {
  const state = String(ticket?.slaState || "").toUpperCase()
  const label = ticket?.slaLabel || "No SLA"
  const remainingMs = ticket?.slaRemainingMs

  if (!state || state === "NO_SLA") {
    return {
      text: "No SLA",
      detail: "SLA not available",
      tone: slaTone("NO_SLA"),
    }
  }

  if (state === "BREACHED" || state === "BREACHED_RESOLVED") {
    return {
      text: label || "SLA breached",
      detail: label || "SLA breached",
      tone: slaTone(state),
    }
  }

  if (state === "AT_RISK") {
    const timeText = remainingMs ? `${formatSlaTime(remainingMs)} left` : "At risk"

    return {
      text: `SLA: ${timeText}`,
      detail: timeText,
      tone: slaTone(state),
    }
  }

  if (state === "MET") {
    return {
      text: "SLA met",
      detail: "Resolved within SLA",
      tone: slaTone(state),
    }
  }

  const timeText = remainingMs ? `${formatSlaTime(remainingMs)} left` : label

  return {
    text: `SLA: ${timeText}`,
    detail: timeText,
    tone: slaTone("ACTIVE"),
  }
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

    const data = await safeJson(res)

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

function GlassDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  const selected = options.find((opt) => opt.value === value) || options[0]

  return (
    <div className="at-dropdownRoot" ref={rootRef}>
      <button
        type="button"
        className="at-dropdownTrigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={16} className={`at-dropdownChevron ${open ? "rot" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="at-dropdownMenu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`at-dropdownItem ${value === opt.value ? "active" : ""}`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AssignedTickets() {
  const userRaw = localStorage.getItem("user")
  const user = userRaw ? JSON.parse(userRaw) : {}
  const userId = user.id || user._id

  const navigate = useNavigate()

  const [tickets, setTickets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState("")
  const [resolutionNote, setResolutionNote] = useState("")
  const [resolutionFiles, setResolutionFiles] = useState([])
  const [previewImage, setPreviewImage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const resolutionInputRef = useRef(null)
  const [searchParams] = useSearchParams()
  const ticketIdFromUrl = searchParams.get("ticket")
  

  const cleanupResolutionFiles = (items) => {
    items.forEach((item) => {
      if (item?.preview) URL.revokeObjectURL(item.preview)
    })
  }

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError("")

      const res = await fetchWithAuth(`${API_BASE}/api/tickets?limit=1000`)
      const data = await safeJson(res)

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load assigned tickets")
      }

      const allTickets = Array.isArray(data?.data) ? data.data : []

      const assigned = allTickets.filter((t) => {
        const assignedTo =
          typeof t.assignedTo === "object"
            ? t.assignedTo?._id
            : t.assignedTo

        return sameId(assignedTo, userId)
      })

      setTickets(assigned)
      if (ticketIdFromUrl) {

        const matchedTicket = assigned.find(
          (t) => t._id === ticketIdFromUrl
        )

        if (matchedTicket) {
          setSelectedId(matchedTicket._id)
        }
      }

      setSelectedId((prevId) => {
        if (prevId && assigned.some((t) => sameId(t._id, prevId))) {
          return prevId
        }
        return assigned[0]?._id || null
      })
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to load assigned tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    if (!tickets.length) return
    if (!selectedId) {
      setSelectedId(tickets[0]._id)
    }
  }, [tickets, selectedId])

  useEffect(() => {
    return () => cleanupResolutionFiles(resolutionFiles)
  }, [resolutionFiles])

  useEffect(() => {
    cleanupResolutionFiles(resolutionFiles)
    setResolutionFiles([])
    setResolutionNote("")
  }, [selectedId])

  const selectedTicket = useMemo(() => {
    return tickets.find((t) => sameId(t._id, selectedId)) || null
  }, [tickets, selectedId])

  const stats = useMemo(() => {
    const total = tickets.length
    const assigned = tickets.filter((t) => normalizeStatus(t.status) === "ASSIGNED").length
    const inProgress = tickets.filter((t) => normalizeStatus(t.status) === "IN_PROGRESS").length
    const pending = tickets.filter(
      (t) => normalizeStatus(t.status) === "RESOLVED_PENDING_CONFIRMATION"
    ).length

    return { total, assigned, inProgress, pending }
  }, [tickets])

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()

    let list = tickets.filter((t) => {
      const haystack = `${t.title || ""} ${t.description || ""} ${t.category || ""}`.toLowerCase()
      return !q || haystack.includes(q)
    })

    const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    const statusOrder = {
      ASSIGNED: 1,
      IN_PROGRESS: 2,
      RESOLVED_PENDING_CONFIRMATION: 3,
      CLOSED: 4,
      REOPENED: 5,
      OPEN: 6,
    }

    switch (sortBy) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case "priority":
        list.sort(
          (a, b) =>
            (priorityOrder[normalizePriority(b.priority)] || 2) -
            (priorityOrder[normalizePriority(a.priority)] || 2)
        )
        break
      case "status":
        list.sort(
          (a, b) =>
            (statusOrder[normalizeStatus(a.status)] || 99) -
            (statusOrder[normalizeStatus(b.status)] || 99)
        )
        break
      default:
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return list
  }, [tickets, search, sortBy])

  const workflowSteps = [
    { key: "ASSIGNED", label: "Assigned" },
    { key: "IN_PROGRESS", label: "In Progress" },
    { key: "RESOLVED_PENDING_CONFIRMATION", label: "Awaiting Confirmation" },
    { key: "CLOSED", label: "Closed" },
  ]

  const currentStepIndex = workflowSteps.findIndex(
    (step) => step.key === normalizeStatus(selectedTicket?.status)
  )

  const selectedImages = useMemo(() => {
    if (!selectedTicket) return []

    const raw = Array.isArray(selectedTicket.images)
      ? selectedTicket.images
      : Array.isArray(selectedTicket.imageUrls)
        ? selectedTicket.imageUrls
        : []

    return raw
      .map((item) => {
        if (typeof item === "string") return resolveImageSrc(item)
        return resolveImageSrc(item?.url || item?.path || item?.src || "")
      })
      .filter(Boolean)
  }, [selectedTicket])

  const addResolutionFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((file) =>
      file.type.startsWith("image/")
    )

    if (!incoming.length) return

    setResolutionFiles((prev) => {
      const remaining = Math.max(0, MAX_RESOLUTION_IMAGES - prev.length)
      const next = incoming.slice(0, remaining).map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      }))

      if (incoming.length > remaining) {
        setError(`You can attach up to ${MAX_RESOLUTION_IMAGES} images.`)
      } else {
        setError("")
      }

      return [...prev, ...next]
    })
  }

  const removeResolutionImage = (id) => {
    setResolutionFiles((prev) => {
      const item = prev.find((img) => img.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((img) => img.id !== id)
    })
  }

  const submitStatusUpdate = async (nextStatus) => {
    if (!selectedTicket) return

    try {
      setActionLoading(nextStatus)
      setError("")

      let res

      if (nextStatus === "IN_PROGRESS") {
        res = await fetchWithAuth(`${API_BASE}/api/tickets/${selectedTicket._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "IN_PROGRESS",
          }),
        })
      }

      if (nextStatus === "RESOLVED_PENDING_CONFIRMATION") {
        const formData = new FormData()
        resolutionFiles.forEach((item) => formData.append("images", item.file))
        if (resolutionNote.trim()) {
          formData.append("remarks", resolutionNote.trim())
        }

        res = await fetchWithAuth(
          `${API_BASE}/api/tickets/${selectedTicket._id}/resolve`,
          {
            method: "PATCH",
            body: formData,
          }
        )
      }

      if (!res) {
        throw new Error("Invalid action")
      }

      const payload = await safeJson(res)

      if (!res.ok) {
        throw new Error(payload?.message || payload?.error || "Update failed")
      }

      cleanupResolutionFiles(resolutionFiles)
      setResolutionFiles([])
      setResolutionNote("")
      await fetchTickets()

      const updatedId = payload?.ticket?._id || payload?._id || selectedTicket._id
      setSelectedId(updatedId)
    } catch (err) {
      console.error("Status update failed:", err)
      setError(err.message || "Failed to update ticket status")
    } finally {
      setActionLoading("")
    }
  }

  const summaryCards = [
    {
      label: "Total Assigned",
      value: stats.total,
      note: "All items in your queue",
      icon: SparkIcon,
    },
    {
      label: "Assigned",
      value: stats.assigned,
      note: "Waiting to be started",
      icon: AlertTriangle,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      note: "Currently being handled",
      icon: PlayCircle,
    },
    {
      label: "Awaiting Confirmation",
      value: stats.pending,
      note: "Resolved, awaiting resident",
      icon: CheckCircle2,
    },
  ]

  

  return (
    <div className="at-page">
      <AppTopbar />

      <motion.div
        className="at-blob at-blob-a"
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="at-blob at-blob-b"
        animate={{ y: [0, 14, 0], x: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className="at-shell">
        <motion.section
          className="at-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <div className="at-kicker">Technician workspace</div>
            <h1>Assigned Tickets</h1>
            <p>
              Pick a ticket from the list, inspect resident evidence, start work,
              and mark it resolved with completion images and notes.
            </p>
          </div>

          <button
            type="button"
            className="technician-maintenance-link"
            onClick={() => navigate("/technician/maintenance")}
          >
            <Wrench size={17} />
            Maintenance Queue
          </button>

          <div className="at-heroCard">
            <strong>{stats.total}</strong>
            <span>Assigned items</span>
          </div>
        </motion.section>

        <div className="at-stats">
          {summaryCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                className="at-stat"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
              >
                <div className="at-statTop">
                  <div className="at-statIcon">
                    <Icon size={16} />
                  </div>
                  <div className="at-statLabel">{card.label}</div>
                </div>
                <div className="at-statValue">{card.value}</div>
                <div className="at-statNote">{card.note}</div>
              </motion.div>
            )
          })}
        </div>

        {error ? <div className="at-error">{error}</div> : null}

        <div className="at-workspace">
          {/* LEFT PANEL */}
          <motion.aside
            className="at-panel at-listPanel"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <div className="at-listHead">
              <div>
                <h2>All Assigned Tickets</h2>
                <p>Search, sort, and open any ticket to work on it.</p>
              </div>

              <div className="at-tools">
                <div className="at-searchWrap">
                  <Search className="at-searchIcon" size={16} />
                  <input
                    className="at-input at-search"
                    placeholder="Search tickets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <GlassDropdown
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { label: "Newest first", value: "newest" },
                    { label: "Oldest first", value: "oldest" },
                    { label: "Priority", value: "priority" },
                    { label: "Status", value: "status" },
                  ]}
                />
              </div>
            </div>

            <div className="at-listMeta">
              Showing {filteredTickets.length} of {tickets.length}
            </div>

            {loading ? (
              <div className="at-loadingState">
                <Loader2 className="at-spin" size={34} />
                <p>Loading assigned tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="at-emptyState">
                <Search size={28} />
                <p>No tickets found for this search.</p>
              </div>
            ) : (
              <div className="at-scrollList">
                {filteredTickets.map((ticket, index) => {
                  const status = normalizeStatus(ticket.status)
                  const priority = normalizePriority(ticket.priority)
                  const slaDisplay = getSlaDisplay(ticket)
                  const ticketAccent =
                    status === "OPEN"
                      ? "#5b8def"
                      : status === "ASSIGNED"
                        ? "#38bdf8"
                        : status === "IN_PROGRESS"
                          ? "#d4a73f"
                          : status === "RESOLVED_PENDING_CONFIRMATION"
                            ? "#9b73d1"
                            : status === "CLOSED"
                              ? "#39b56f"
                              : "#f472b6"

                  const previewThumbs = Array.isArray(ticket.images)
                    ? ticket.images
                        .map((img) =>
                          typeof img === "string"
                            ? resolveImageSrc(img)
                            : resolveImageSrc(img?.url || img?.path || img?.src || "")
                        )
                        .filter(Boolean)
                    : []

                  return (
                    <motion.article
                      key={ticket._id}
                      className={`at-ticketCard ${
                        sameId(selectedId, ticket._id) ? "active" : ""
                      }`}
                      style={{ borderLeftColor: ticketAccent }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      whileHover={{
                        y: -6,
                        scale: 1.02,
                        boxShadow: "0 20px 45px rgba(0,0,0,0.34)",
                      }}
                      onClick={() => setSelectedId(ticket._id)}
                    >
                      <div className="at-ticketTop">
                        <div>
                          <div className="at-ticketTitle">{ticket.title}</div>
                          <div className="at-ticketId">
                            #{String(ticket._id).slice(-6).toUpperCase()} •{" "}
                            {formatTime(ticket.createdAt)}
                          </div>
                        </div>

                        <span className="at-chip" style={statusTone(status)}>
                          {formatLabel(status)}
                        </span>
                      </div>

                      <p className="at-ticketDesc">{ticket.description}</p>

                      {previewThumbs.length > 0 && (
                        <div className="at-thumbStrip">
                          {previewThumbs.slice(0, 3).map((src, i) => (
                            <div key={`${ticket._id}-${i}`} className="at-thumbMini">
                              <img src={src} alt={`attachment-${i + 1}`} />
                            </div>
                          ))}
                          {previewThumbs.length > 3 && (
                            <div className="at-thumbMini at-thumbMore">
                              +{previewThumbs.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="at-ticketBottom">
                        <div className="at-chipRow">
  <span
    className="at-chip"
    style={priorityTone(priority)}
  >
    {formatLabel(priority)}
  </span>

  <span className="at-chip at-chipMuted">
    {formatLabel(ticket.category || "GENERAL")}
  </span>

  <span
    className="at-chip at-chipSla"
    style={slaDisplay.tone}
  >
    <Clock3 size={12} />
    {slaDisplay.text}
  </span>
</div>

                        <button
                          type="button"
                          className="at-viewBtn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(ticket._id)
                          }}
                        >
                          <Eye size={14} />
                          View details
                        </button>
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            )}
          </motion.aside>

          {/* RIGHT PANEL */}
          <AnimatePresence mode="wait">
{selectedTicket ? (() => {
  const selectedSlaDisplay = getSlaDisplay(selectedTicket)

  return (
    <motion.section
                key={selectedTicket._id}
                className="at-panel at-detailPanel"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.35 }}
              >
                <div className="at-detailTop">
                  <div>
                    <div className="at-kicker at-kickerSmall">Ticket detail</div>
                    <h2>{selectedTicket.title}</h2>
                    <p>{selectedTicket.description}</p>
                  </div>

                  <span
                    className="at-chip"
                    style={statusTone(selectedTicket.status)}
                  >
                    {formatLabel(selectedTicket.status)}
                  </span>
                </div>

                <div className="at-metaGrid">
                  <div className="at-metaItem">
                    <span>Reported by</span>
                    <strong>
                      {typeof selectedTicket.createdBy === "object"
                        ? selectedTicket.createdBy?.name || "Resident"
                        : "Resident"}
                    </strong>
                  </div>

                  <div className="at-metaItem">
                    <span>Assigned to</span>
                    <strong>
                      {typeof selectedTicket.assignedTo === "object"
                        ? selectedTicket.assignedTo?.name || "You"
                        : "You"}
                    </strong>
                  </div>

                  <div className="at-metaItem">
                    <span>Created</span>
                    <strong>{formatTime(selectedTicket.createdAt)}</strong>
                  </div>

                  <div className="at-metaItem">
                    <span>Updated</span>
                    <strong>{formatTime(selectedTicket.updatedAt || selectedTicket.createdAt)}</strong>
                  </div>

                  <div className="at-metaItem at-metaSla">
  <span>SLA</span>
  <strong>{selectedSlaDisplay.detail}</strong>
</div>
                </div>

                <div className="at-stepper">
                  {workflowSteps.map((step, idx) => {
                    const done = idx < currentStepIndex
                    const active = idx === currentStepIndex
                    return (
                      <div
                        key={step.key}
                        className={`at-step ${done ? "done" : ""} ${active ? "active" : ""}`}
                      >
                        <span className="at-stepDot" />
                        <span>{step.label}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="at-section">
                  <div className="at-sectionHead">
                    <h3>Resident evidence</h3>
                    <span>{selectedImages.length} image(s)</span>
                  </div>

                  {selectedImages.length > 0 ? (
                    <div className="at-evidenceGrid">
                      {selectedImages.map((src, i) => (
                        <motion.div
                          key={`${selectedTicket._id}-img-${i}`}
                          className="at-evidenceThumb"
                          whileHover={{ scale: 1.04 }}
                          onClick={() => setPreviewImage(src)}
                        >
                          <img src={src} alt={`evidence-${i + 1}`} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="at-emptyInline">
                      No resident images attached.
                    </div>
                  )}
                </div>

                <div className="at-section">
                  <div className="at-sectionHead">
                    <h3>Technician workspace</h3>
                    <span>Update progress here</span>
                  </div>

                  {["ASSIGNED", "REOPENED"].includes(
                      normalizeStatus(selectedTicket.status)
                    ) && (
                    <div className="at-actionCard">
                      <div className="at-actionCardText">
                        Start the job to move this ticket into active work.
                      </div>

                      <button
                        type="button"
                        className="at-btnPrimary"
                        onClick={() => submitStatusUpdate("IN_PROGRESS")}
                        disabled={actionLoading === "IN_PROGRESS"}
                      >
                        {actionLoading === "IN_PROGRESS" ? (
                          <>
                            <Loader2 size={16} className="at-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <PlayCircle size={16} />
                            Start Work
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {normalizeStatus(selectedTicket.status) === "IN_PROGRESS" && (
                    <div className="at-workPanel">
                      <div className="at-field">
                        <label>Technician note</label>
                        <textarea
                          className="at-textarea"
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder="Add a short note before resolving..."
                          rows={3}
                        />
                      </div>

                      <div
                        className={`at-dropzone ${isDragging ? "active" : ""}`}
                        onClick={() => resolutionInputRef.current?.click()}
                        onDragEnter={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsDragging(true)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsDragging(true)
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsDragging(false)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsDragging(false)
                          addResolutionFiles(e.dataTransfer.files)
                        }}
                      >
                        <div className="at-dropIcon">
                          <ImageIcon size={18} />
                        </div>

                        <div className="at-dropText">
                          <strong>Attach completion images</strong>
                          <span>
                            Upload evidence before resolving. You can add up to{" "}
                            {MAX_RESOLUTION_IMAGES} images.
                          </span>
                        </div>

                        <input
                          ref={resolutionInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            addResolutionFiles(e.target.files)
                            e.target.value = ""
                          }}
                        />
                      </div>

                      {resolutionFiles.length > 0 && (
                        <div className="at-fileThumbs">
                          {resolutionFiles.map((item) => (
                            <div key={item.id} className="at-fileThumb">
                              <img src={item.preview} alt={item.name} />
                              <button
                                type="button"
                                onClick={() => removeResolutionImage(item.id)}
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="at-actionRow">
                        <button
                          type="button"
                          className="at-btnPrimary at-btnResolve"
                          onClick={() =>
                            submitStatusUpdate("RESOLVED_PENDING_CONFIRMATION")
                          }
                          disabled={actionLoading === "RESOLVED_PENDING_CONFIRMATION"}
                        >
                          {actionLoading === "RESOLVED_PENDING_CONFIRMATION" ? (
                            <>
                              <Loader2 size={16} className="at-spin" />
                              Resolving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={16} />
                              Mark Resolved
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {normalizeStatus(selectedTicket.status) ===
                    "RESOLVED_PENDING_CONFIRMATION" && (
                    <div className="at-infoCard">
                      <CheckCircle2 size={18} />
                      Waiting for resident confirmation. The ticket is resolved on your side.
                    </div>
                  )}

                  {normalizeStatus(selectedTicket.status) === "CLOSED" && (
                    <div className="at-infoCard at-infoClosed">
                      <CheckCircle2 size={18} />
                      This ticket is closed and archived.
                    </div>
                  )}

                  {normalizeStatus(selectedTicket.status) === "OPEN" && (
                    <div className="at-infoCard">
                      <AlertTriangle size={18} />
                      This ticket is still open. It is waiting for admin assignment.
                    </div>
                  )}
                </div>
              </motion.section>
  )
})() : (
              <motion.section
                className="at-panel at-detailPanel at-emptyPanel"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="at-emptyStateLarge">
                  <Search size={28} />
                  <h3>No ticket selected</h3>
                  <p>Select a ticket from the left to inspect details and update status.</p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            className="at-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              className="at-modalInner"
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="at-modalClose"
                onClick={() => setPreviewImage(null)}
              >
                <X size={16} />
              </button>
              <img src={previewImage} alt="preview" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      

      <style>{`
        .at-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .at-shell {
          max-width: 1400px;
          margin: 0 auto;
          padding: 42px 24px 84px;
          position: relative;
          z-index: 2;
        }

        .at-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 26px;
        }

        .at-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(166, 138, 100, 0.14);
          border: 1px solid rgba(166, 138, 100, 0.25);
          color: #f0dfcf;
          font-size: 12px;
          letter-spacing: 0.2px;
          margin-bottom: 14px;
        }

        .at-kickerSmall {
          margin-bottom: 10px;
        }

        .at-hero h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .at-hero p {
          max-width: 820px;
          margin: 12px 0 0;
          opacity: 0.78;
          line-height: 1.65;
          font-size: 15px;
        }

        .at-heroCard {
          min-width: 220px;
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(16px);
          text-align: right;
        }

        .at-heroCard strong {
          display: block;
          font-size: 30px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .at-heroCard span {
          font-size: 13px;
          opacity: 0.72;
        }

        .at-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 22px 0 22px;
        }

        .at-stat {
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(16px);
        }

        .at-statTop {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .at-statIcon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(166, 138, 100, 0.14);
          border: 1px solid rgba(166, 138, 100, 0.2);
        }

        .at-statLabel {
          font-size: 12px;
          opacity: 0.76;
        }

        .at-statValue {
          font-size: 30px;
          font-weight: 600;
          line-height: 1;
        }

        .at-statNote {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.62;
        }

        .at-error {
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.24);
          color: #fecaca;
          font-size: 13px;
        }

        .at-workspace {
          display: grid;
          grid-template-columns: minmax(380px, 42%) minmax(0, 58%);
          gap: 24px;
          align-items: start;
        }

        .at-panel {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
          
        }

        .at-listPanel {
          padding: 18px;
          position: sticky;
          top: 92px;
          height:94%;
        }

        .at-listHead {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .at-listHead h2,
        .at-detailTop h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .at-listHead p,
        .at-detailTop p {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.6;
          opacity: 0.72;
        }

        .at-tools {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }

        .at-searchWrap {
          position: relative;
          min-width: 220px;
          flex: 1;
        }

        .at-searchIcon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.7;
          pointer-events: none;
        }

        .at-input {
          width: 80%;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f3f3ee;
          outline: none;
          padding: 14px 15px;
          transition: all 0.25s ease;
          font: inherit;
        }

        .at-search {
          padding-left: 42px;
        }

        .at-input:focus {
          border-color: rgba(166, 138, 100, 0.65);
          box-shadow: 0 0 0 4px rgba(166, 138, 100, 0.12);
        }

        .at-listMeta {
          margin-top: 14px;
          margin-bottom: 14px;
          font-size: 12px;
          opacity: 0.64;
        }

        .at-dropdownRoot {
          position: relative;
          min-width: 190px;
        }

        .at-dropdownTrigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.14);
          cursor: pointer;
          color: #f3f3ee;
          transition: all 0.25s ease;
        }

        .at-dropdownTrigger:hover {
          border-color: rgba(166, 138, 100, 0.5);
          background: rgba(0, 0, 0, 0.28);
        }

        .at-dropdownChevron {
          opacity: 0.7;
          transition: transform 0.25s ease, opacity 0.2s ease;
        }

        .at-dropdownChevron.rot {
          transform: rotate(180deg);
        }

        .at-dropdownMenu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          z-index: 80;
          overflow: hidden;
          border-radius: 16px;
          background: rgba(15, 15, 15, 0.66);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.42);
        }

        .at-dropdownItem {
          width: 100%;
          text-align: left;
          padding: 12px 14px;
          background: transparent;
          border: none;
          color: #f3f3ee;
          cursor: pointer;
          transition: all 0.2s ease;
          font: inherit;
        }

        .at-dropdownItem:hover {
          background: rgba(166, 138, 100, 0.18);
        }

        .at-dropdownItem.active {
          background: rgba(166, 138, 100, 0.26);
        }

        .at-scrollList {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: calc(100vh - 310px);
          overflow-y: auto;
          padding-right: 6px;
          padding:14px;
        }

        .at-scrollList::-webkit-scrollbar {
          width: 6px;
        }

        .at-scrollList::-webkit-scrollbar-thumb {
          background: rgba(166, 138, 100, 0.4);
          border-radius: 999px;
        }

        .at-ticketCard {
          position: relative;
          padding: 18px 18px 16px 18px;
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.075),
            rgba(255, 255, 255, 0.05)
          );
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-left-width: 5px;
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.18);
          overflow: auto;
           &::-webkit-scrollbar {
            display: none;
          }
          -ms-overflow-style: none;  
          scrollbar-width: none;  
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          min-height: 155px;
          height:auto;
        }

        .at-ticketCard:hover {
          border-color: rgba(166, 138, 100, 0.38);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.28);
        }

        .at-ticketCard.active {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.06)
          );
          border-color: rgba(166, 138, 100, 0.34);
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.3);
        }

        .at-ticketTop {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .at-ticketTitle {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }

        .at-ticketId {
          font-size: 11px;
          opacity: 0.58;
          letter-spacing: 0.12em;
        }

        .at-ticketDesc {
          font-size: 14px;
          line-height: 1.65;
          opacity: 0.82;
          margin: 12px 0 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .at-thumbStrip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .at-thumbMini {
          width: 54px;
          height: 54px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          flex: none;
        }

        .at-thumbMini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
   
        }

        .at-thumbMore {
          display: grid;
          place-items: center;
          color: #fff;
          font-weight: 600;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.08);
        }

        .at-ticketBottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .at-chipRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .at-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .at-chipMuted {
          background: rgba(255, 255, 255, 0.08);
          color: #f2f2eb;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .at-chipSla {
  text-transform: none;
  letter-spacing: 0;
}

        .at-viewBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #f3f3ee;
          cursor: pointer;
          transition: all 0.25s ease;
          font-size: 12px;
        }

        .at-viewBtn:hover {
          border-color: rgba(166, 138, 100, 0.6);
          background: rgba(166, 138, 100, 0.14);
        }

        .at-detailPanel {
          padding: 22px;
          position: sticky;
          top: 92px;
          min-height: calc(100vh - 180px);
        }

        .at-detailTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }

        .at-metaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 18px;
        }

        .at-metaItem {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .at-metaItem span {
          display: block;
          font-size: 11px;
          opacity: 0.65;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .at-metaItem strong {
          font-size: 14px;
          font-weight: 600;
        }

        .at-metaSla {
  background: rgba(166, 138, 100, 0.1);
  border-color: rgba(166, 138, 100, 0.2);
}

        .at-stepper {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 6px 0 18px;
        }

        .at-step {
          padding: 12px 12px 11px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          opacity: 0.68;
          transition: all 0.25s ease;
        }

        .at-stepDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.24);
          flex: none;
        }

        .at-step.done {
          background: rgba(166, 138, 100, 0.12);
          border-color: rgba(166, 138, 100, 0.2);
          opacity: 0.88;
        }

        .at-step.done .at-stepDot {
          background: #a68a64;
        }

        .at-step.active {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(166, 138, 100, 0.4);
          opacity: 1;
          transform: translateY(-1px);
        }

        .at-step.active .at-stepDot {
          background: #f0dfcf;
          box-shadow: 0 0 0 4px rgba(166, 138, 100, 0.14);
        }

        .at-section {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .at-sectionHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 14px;
        }

        .at-sectionHead h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .at-sectionHead span {
          font-size: 12px;
          opacity: 0.64;
        }

        .at-evidenceGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .at-evidenceThumb {
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: zoom-in;
          background: rgba(0, 0, 0, 0.2);
        }

        .at-evidenceThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .at-emptyInline {
          padding: 18px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px dashed rgba(255, 255, 255, 0.14);
          opacity: 0.72;
          font-size: 13px;
        }

        .at-actionCard,
        .at-workPanel,
        .at-infoCard {
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
        }

        .at-actionCard {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px;
        }

        .at-actionCardText {
          font-size: 14px;
          line-height: 1.65;
          opacity: 0.8;
        }

        .at-workPanel {
          padding: 16px;
        }

        .at-field {
          margin-bottom: 14px;
        }

        .at-field label {
          display: block;
          margin-bottom: 8px;
          font-size: 12px;
          opacity: 0.7;
        }

        .at-textarea {
          width: 95%;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f3f3ee;
          outline: none;
          padding: 14px 15px;
          transition: all 0.25s ease;
          resize: vertical;
          font: inherit;
          min-height: 120px;
        }

        .at-textarea:focus {
          border-color: rgba(166, 138, 100, 0.65);
          box-shadow: 0 0 0 4px rgba(166, 138, 100, 0.12);
        }

        .at-dropzone {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-radius: 18px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.14);
          cursor: pointer;
          transition: all 0.25s ease;
          margin-top: 4px;
        }

        .at-dropzone:hover {
          border-color: rgba(166, 138, 100, 0.7);
          background: rgba(0, 0, 0, 0.18);
        }

        .at-dropzone.active {
          transform: scale(1.01);
          border-color: rgba(166, 138, 100, 0.85);
          background: rgba(166, 138, 100, 0.12);
        }

        .at-dropIcon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(166, 138, 100, 0.16);
          border: 1px solid rgba(166, 138, 100, 0.24);
          flex: none;
        }

        .at-dropText strong {
          display: block;
          font-size: 14px;
          margin-bottom: 3px;
        }

        .at-dropText span {
          font-size: 12px;
          opacity: 0.7;
          line-height: 1.45;
        }

        .at-fileThumbs {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .at-fileThumb {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
        }

        .at-fileThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .at-fileThumb button {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: none;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .at-actionRow {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }

        .at-btnPrimary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #a68a64, #7d6546);
          color: #fff;
          font-weight: 600;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 26px rgba(166, 138, 100, 0.24);
          transition: all 0.25s ease;
        }

        .at-btnPrimary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(166, 138, 100, 0.3);
        }

        .at-btnPrimary:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
        }

        .at-btnResolve {
          min-width: 180px;
        }

        .at-infoCard {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          line-height: 1.6;
        }

        .at-infoClosed {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.18);
        }

        .at-loadingState,
        .at-emptyState,
        .at-emptyStateLarge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 30px 20px;
          text-align: center;
          opacity: 0.9;
        }

        .at-emptyStateLarge {
          min-height: 100%;
        }

        .at-emptyStateLarge h3 {
          margin: 0;
          font-size: 18px;
        }

        .at-emptyStateLarge p {
          max-width: 320px;
          margin: 0;
          opacity: 0.72;
          line-height: 1.6;
        }

        .at-spin {
          animation: atspin 0.9s linear infinite;
        }

        .at-modal {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .at-modalInner {
          position: relative;
          max-width: min(92vw, 1100px);
          max-height: 86vh;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .at-modalInner img {
          display: block;
          max-width: 100%;
          max-height: 86vh;
          object-fit: contain;
          background: #111;
        }

        .at-modalClose {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: none;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          cursor: pointer;
          display: grid;
          place-items: center;
          z-index: 2;
        }

        .at-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.28;
          pointer-events: none;
          z-index: 0;
        }

        .at-blob-a {
          width: 300px;
          height: 300px;
          top: 120px;
          right: -80px;
          background: #a68a64;
        }

        .at-blob-b {
          width: 240px;
          height: 240px;
          bottom: 140px;
          left: -80px;
          background: #6f875a;
        }

        .technician-maintenance-link {
  border: 1px solid rgba(243, 241, 231, 0.16);
  background: linear-gradient(135deg, rgba(91, 125, 113, 0.45), rgba(35, 129, 118, 0.45));
  color: #f4f1e8;
  border-radius: 18px;
  padding: 13px 17px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 18px 42px rgba(20, 30, 18, 0.22);
  transition: 180ms ease;
}

.technician-maintenance-link:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(105, 145, 130, 0.55), rgba(24, 154, 138, 0.5));
}

        @keyframes atspin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1180px) {
          .at-workspace {
            grid-template-columns: 1fr;
          }

          .at-listPanel,
          .at-detailPanel {
            position: relative;
            top: auto;
            min-height: unset;
          }
        }

        @media (max-width: 760px) {
          .at-shell {
            padding: 30px 16px 68px;
          }

          .at-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .at-heroCard {
            min-width: 100%;
            text-align: left;
          }

          .at-stats {
            grid-template-columns: 1fr 1fr;
          }

          .at-tools {
            flex-direction: column;
            align-items: stretch;
          }

          .at-dropdownRoot {
            min-width: 100%;
          }

          .at-metaGrid {
            grid-template-columns: 1fr;
          }

          .at-stepper {
            grid-template-columns: 1fr 1fr;
          }

          .at-evidenceGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .at-fileThumbs {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .at-actionCard {
            flex-direction: column;
            align-items: stretch;
          }

          .at-btnResolve {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

function SparkIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l1.9 5.7L20 9.6l-5.1 1.8L12 17l-2.9-5.6L4 9.6l6.1-1.9L12 2z" />
      <path d="M5 16l1 2.5L8.5 19l-2.5 1L5 22l-1-2.5L1.5 18l2.5-1L5 16z" />
      <path d="M19 14l.8 2.1L22 17l-2.2.9L19 20l-.8-2.1L16 17l2.2-.9L19 14z" />
    </svg>
  )
}

export default AssignedTickets