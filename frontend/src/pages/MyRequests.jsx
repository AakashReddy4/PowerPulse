import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import AppTopbar from "../components/AppTopbar"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ImagePlus,
  Loader2,
  Paperclip,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import GlassSelect from "../components/GlassSelect"



import { API_BASE } from "../config"
const MAX_IMAGES = 5

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

function resolveImageSrc(src) {
  if (!src) return ""
  if (typeof src !== "string") return ""

  if (src.startsWith("http")) return src
  if (src.startsWith("/")) return `${API_BASE}${src}`
  return `${API_BASE}/${src}`
}

function statusTone(status) {
  switch (String(status || "OPEN").toUpperCase()) {
    case "OPEN":
      return {
        background: "rgba(59, 130, 246, 0.16)",
        color: "#bfdbfe",
        border: "1px solid rgba(59, 130, 246, 0.22)",
      }
    case "IN_PROGRESS":
      return {
        background: "rgba(234, 179, 8, 0.16)",
        color: "#fde68a",
        border: "1px solid rgba(234, 179, 8, 0.24)",
      }
    case "RESOLVED_PENDING_CONFIRMATION":
      return {
        background: "rgba(168, 85, 247, 0.16)",
        color: "#ddd6fe",
        border: "1px solid rgba(168, 85, 247, 0.24)",
      }
    case "CLOSED":
      return {
        background: "rgba(34, 197, 94, 0.16)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.24)",
      }
    default:
      return {
        background: "rgba(255,255,255,0.10)",
        color: "#f3f3ee",
        border: "1px solid rgba(255,255,255,0.14)",
      }
  }
}

function priorityTone(priority) {
  switch (String(priority || "MEDIUM").toUpperCase()) {
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

function getSlaDisplay(ticket) {
  const state = String(ticket?.slaState || "").toUpperCase()
  const label = ticket?.slaLabel || "No SLA"
  const remainingMs = ticket?.slaRemainingMs

  if (!state || state === "NO_SLA") {
    return {
      text: "No SLA",
      tone: {
        background: "rgba(255,255,255,0.08)",
        color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,0.12)",
      },
    }
  }

  if (state === "BREACHED" || state === "BREACHED_RESOLVED") {
    return {
      text: label || "SLA breached",
      tone: {
        background: "rgba(239, 68, 68, 0.16)",
        color: "#fecaca",
        border: "1px solid rgba(239, 68, 68, 0.26)",
      },
    }
  }

  if (state === "AT_RISK") {
    return {
      text: remainingMs ? `SLA: ${formatSlaTime(remainingMs)} left` : "SLA at risk",
      tone: {
        background: "rgba(234, 179, 8, 0.16)",
        color: "#fde68a",
        border: "1px solid rgba(234, 179, 8, 0.26)",
      },
    }
  }

  if (state === "MET") {
    return {
      text: "SLA met",
      tone: {
        background: "rgba(34, 197, 94, 0.16)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.26)",
      },
    }
  }

  return {
    text: remainingMs ? `SLA: ${formatSlaTime(remainingMs)} left` : label,
    tone: {
      background: "rgba(34, 197, 94, 0.13)",
      color: "#bbf7d0",
      border: "1px solid rgba(34, 197, 94, 0.22)",
    },
  }
}

function MyRequests() {
  const navigate = useNavigate()
  const userRaw = localStorage.getItem("user")
  const user = userRaw ? JSON.parse(userRaw) : {}
  const userId = user.id || user._id

  const [tickets, setTickets] = useState([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [category, setCategory] = useState("ELECTRICAL")
  const [selectedImages, setSelectedImages] = useState([])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)
  const previewRef = useRef([])
  const [searchParams] = useSearchParams()
  const ticketIdFromUrl = searchParams.get("ticket")

  useEffect(() => {
    previewRef.current = selectedImages
  }, [selectedImages])

  const loadTickets = async () => {
    try {
      setLoadingTickets(true)
      setError("")

      if (!userId) {
        setTickets([])
        return
      }

      const res = await fetchWithAuth(`${API_BASE}/api/tickets?limit=1000`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load tickets")
      }

      const allTickets = Array.isArray(data.data) ? data.data : []

      const myTickets = allTickets.filter((t) => {
        const creator =
          typeof t.createdBy === "object" ? t.createdBy?._id : t.createdBy
        return creator === userId
      })

      setTickets(myTickets)

      if (ticketIdFromUrl) {

  const matchedTicket = myTickets.find(
    (ticket) => ticket._id === ticketIdFromUrl
  )

  if (matchedTicket) {
    setSelectedTicket(matchedTicket)
  }
}
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to load tickets")
    } finally {
      setLoadingTickets(false)
    }
  }

  useEffect(() => {
    loadTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

const stats = useMemo(() => {

  const total = tickets.length

  const open = tickets.filter(
    (t) =>
      t.status === "OPEN" ||
      t.status === "REOPENED"
  ).length

  const active = tickets.filter(
    (t) =>
      t.status === "ASSIGNED" ||
      t.status === "IN_PROGRESS"
  ).length

  const pending = tickets.filter(
    (t) =>
      t.status === "RESOLVED_PENDING_CONFIRMATION"
  ).length

  const closed = tickets.filter(
    (t) =>
      t.status === "CLOSED"
  ).length

  return {
    total,
    open,
    active,
    pending,
    closed,
  }

}, [tickets])

  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase()

    let list = [...tickets].filter((t) => {
      const haystack = `${t.title || ""} ${t.description || ""} ${t.category || ""}`.toLowerCase()
      return !q || haystack.includes(q)
    })

    const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    const statusOrder = {
      OPEN: 1,
      IN_PROGRESS: 2,
      RESOLVED_PENDING_CONFIRMATION: 3,
      CLOSED: 4,
    }

    switch (sortBy) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case "priority":
        list.sort(
          (a, b) =>
            (priorityOrder[String(b.priority || "").toUpperCase()] || 2) -
            (priorityOrder[String(a.priority || "").toUpperCase()] || 2)
        )
        break
      case "status":
        list.sort(
          (a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
        )
        break
      default:
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return list
  }, [tickets, search, sortBy])

  const revokePreview = (item) => {
    if (item?.preview) URL.revokeObjectURL(item.preview)
  }

  const handleFiles = (fileList) => {
    const currentCount = selectedImages.length
    const files = Array.from(fileList || []).filter((file) =>
      file.type.startsWith("image/")
    )

    if (!files.length) return

    const allowed = Math.max(0, MAX_IMAGES - currentCount)
    const next = files.slice(0, allowed).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }))

    if (files.length > allowed) {
      setError(`You can attach up to ${MAX_IMAGES} images.`)
    } else {
      setError("")
    }

    setSelectedImages((prev) => [...prev, ...next])
  }

  const handleImageChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ""
  }

  const removeImage = (id) => {
    setSelectedImages((prev) => {
      const item = prev.find((img) => img.id === id)
      revokePreview(item)
      return prev.filter((img) => img.id !== id)
    })
  }

  const fetchTicketsAgain = async () => {
    const res = await fetchWithAuth(`${API_BASE}/api/tickets?limit=1000`)
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.message || "Failed to load tickets")
    }

    const allTickets = Array.isArray(data.data) ? data.data : []
    const myTickets = allTickets.filter((t) => {
      const creator =
        typeof t.createdBy === "object" ? t.createdBy?._id : t.createdBy
      return creator === userId
    })

    setTickets(myTickets)
    if (ticketIdFromUrl) {

  const matchedTicket = data.find(
    (ticket) => ticket._id === ticketIdFromUrl
  )

  if (matchedTicket) {
    setSelectedTicket(matchedTicket)
  }
}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError("")

    if (!title.trim() || !description.trim()) {
      setError("Please fill both title and description.")
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()
      formData.append("title", title.trim())
      formData.append("description", description.trim())
      formData.append("priority", priority)
      formData.append("category", category)

      selectedImages.forEach((img) => {
        formData.append("images", img.file)
      })

      const res = await fetchWithAuth(`${API_BASE}/api/tickets`, {
        method: "POST",
        body: formData,
      })

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.message || "Failed to create ticket")
      }

      previewRef.current.forEach((img) => revokePreview(img))
      setSelectedImages([])
      setTitle("")
      setDescription("")
      setPriority("medium")
      setCategory("ELECTRICAL")

      await fetchTicketsAgain()
    } catch (err) {
      console.error("Create ticket failed:", err)
      setError(err.message || "Could not create ticket")
    } finally {
      setSubmitting(false)
    }
  }

  const summaryCards = [
    {
      label: "Total Requests",
      value: stats.total,
      note: "Everything you raised",
      icon: Sparkles,
    },
    {
      label: "Open",
      value: stats.open,
      note: "Waiting to be picked up",
      icon: AlertTriangle,
    },
    {
      label: "Active Requests",
      value: stats.active,
      note: "Operations currently underway",
      icon: Loader2,
    },
    {
      label: "Pending Confirmation",
      value: stats.pending,
      note: "Needs your check",
      icon: CheckCircle2,
    },
  ]

  

  
  return (
    <div className="myreq-page">
      <AppTopbar />

      <motion.div
        className="myreq-blob a"
        animate={{ y: [0, -16, 0], x: [0, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="myreq-blob b"
        animate={{ y: [0, 14, 0], x: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className="myreq-shell">
        <motion.section
          className="myreq-hero"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div>
            <div className="myreq-kicker">Resident workspace</div>
            <h1>My Requests</h1>
            <p>
              Create tickets, attach photo evidence, and track every update from
              open to closed — all in one place.
            </p>
          </div>

          <div className="myreq-hero-cta">
            <strong>{stats.total}</strong>
            <span>Total requests raised</span>
          </div>
        </motion.section>

        <div className="myreq-stats">
          {summaryCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                className="myreq-stat"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
              >
                <div className="myreq-stat-top">
                  <div className="myreq-stat-icon">
                    <Icon size={16} />
                  </div>
                  <div className="label">{card.label}</div>
                </div>
                <div className="value">{card.value}</div>
                <div className="sub">{card.note}</div>
              </motion.div>
            )
          })}
        </div>

        <div className="myreq-layout">
          {/* CREATE PANEL */}
          <motion.aside
            className="pp-panel pp-formPanel"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <div className="pp-panelTop">
              <h2 className="pp-panelTitle">Create Ticket</h2>
              <p className="pp-panelSub">
                Give it a clear title, explain what is wrong, set priority and
                category, then attach images for faster resolution.
              </p>
            </div>

            {error ? <div className="pp-error">{error}</div> : null}

            <form onSubmit={handleCreate} className="pp-formBody">
              <div className="pp-field">
                <label className="pp-fieldLabel">Title</label>
                <input
                  className="pp-input"
                  placeholder="e.g. Fan not working in room 203"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="pp-field">
                <label className="pp-fieldLabel">Description</label>
                <textarea
                  className="pp-textarea"
                  placeholder="Describe the issue in a few lines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="pp-fieldGroup">
                <div className="pp-field">
                  <label className="pp-fieldLabel">Priority</label>
                  <div className="pp-selectWrap">
                    <GlassSelect
                      value={priority}
                      onChange={setPriority}
                      options={[
                        { label: "Low", value: "low" },
                        { label: "Medium", value: "medium" },
                        { label: "High", value: "high" },
                      ]}
                    />
                    <ChevronDown className="pp-chevron" size={16} />
                  </div>
                </div>

                <div className="pp-field">
                  <label className="pp-fieldLabel">Category</label>
                  <div className="pp-selectWrap">
                    <GlassSelect
                      value={category}
                      onChange={setCategory}
                      options={[
                        { label: "Electrical", value: "ELECTRICAL" },
                        { label: "Appliance", value: "APPLIANCE" },
                        { label: "Infrastructure", value: "INFRASTRUCTURE" },
                        { label: "Other", value: "OTHER" },
                      ]}
                    />
                    <ChevronDown className="pp-chevron" size={16} />
                  </div>
                </div>
              </div>

              <div
                className={`pp-dropzone ${isDragging ? "active" : ""}`}
                onClick={() => fileInputRef.current?.click()}
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
                  handleFiles(e.dataTransfer.files)
                }}
              >
                <div className="pp-dropIcon">
                  <ImagePlus size={18} />
                </div>

                <div className="pp-dropText">
                  <strong>Attach evidence images</strong>
                  <span>
                    Upload up to {MAX_IMAGES} images. Multiple images help the
                    technician understand the issue faster.
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleImageChange}
                />
              </div>

              {selectedImages.length > 0 && (
                <div className="pp-previewGrid">
                  {selectedImages.map((img) => (
                    <div key={img.id} className="pp-previewItem">
                      <img src={img.preview} alt={img.name} />
                      <button
                        type="button"
                        className="pp-removeImg"
                        onClick={() => removeImage(img.id)}
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button className="pp-createBtn" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 0.9s linear infinite" }}
                    />
                    Creating...
                  </>
                ) : (
                  "Create Ticket"
                )}
              </button>

              <p className="pp-panelSub pp-footnote">
                Status is managed by the system. Priority, category, and
                attachments are set now; assignment happens later.
              </p>
            </form>
          </motion.aside>

{/* LIST PANEL */}
          <motion.section
            className="pp-panel pp-listPanel"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <div className="pp-listTop">
              <div>
                <h2 className="pp-panelTitle">Your Requests</h2>
                <p className="pp-panelSub">
                  Search, sort, and follow every request from this workspace.
                </p>
              </div>

              <div className="pp-listTools">
                <div className="pp-searchWrap">
                  <Search className="pp-searchIcon" size={16} />
                  <input
                    className="pp-input pp-search"
                    placeholder="Search tickets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="pp-selectWrap pp-miniSelect">
                  <GlassSelect
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { label: "Newest first", value: "newest" },
                      { label: "Oldest first", value: "oldest" },
                      { label: "Priority", value: "priority" },
                      { label: "Status", value: "status" },
                    ]}
                  />
                  <ChevronDown className="pp-chevron" size={16} />
                </div>
              </div>
            </div>

            {loadingTickets ? (
              <div className="pp-empty">
                <Loader2
                  size={36}
                  style={{ animation: "spin 0.9s linear infinite" }}
                />
                <p>Loading your requests...</p>
              </div>
            ) : visibleTickets.length === 0 ? (
              <div className="pp-empty">
                <Paperclip size={28} />
                <p>No tickets yet. Create your first request on the left.</p>
              </div>
            ) : (
              <div className="pp-ticketList">
                {visibleTickets.map((ticket, index) => {
                  const ticketImages = Array.isArray(ticket.images)
                    ? ticket.images
                    : Array.isArray(ticket.imageUrls)
                      ? ticket.imageUrls
                      : []

                  const status = ticket.status || "OPEN"
                  const priorityValue = ticket.priority || "MEDIUM"
                  const categoryValue = ticket.category || "GENERAL"
                  const slaDisplay = getSlaDisplay(ticket)

                  return (
                    <motion.article
                      key={ticket._id}
                      className="pp-ticketCard cursor-pointer"
                      style={{
                        borderLeft: `5px solid ${
                          status === "OPEN"
                            ? "#5b8def"
                            : status === "IN_PROGRESS"
                              ? "#d4a73f"
                              : status === "RESOLVED_PENDING_CONFIRMATION"
                                ? "#9b73d1"
                                : "#39b56f"
                        }`,
                      }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.025 }}
                      whileHover={{ y: -3 }}
                      onClick={() => navigate(`/ticket/${ticket._id}`)}
                    >
                      <div className="pp-ticketTop">
                        <div>
                          <div className="pp-ticketTitle">{ticket.title}</div>
                          <div className="pp-ticketId">
                            #{String(ticket._id).slice(-6).toUpperCase()}
                          </div>
                        </div>

                        <span
                          className="pp-chip pp-chipStatus"
                          style={statusTone(status)}
                        >
                          {formatLabel(status)}
                        </span>
                      </div>

                      <p className="pp-ticketDesc">{ticket.description}</p>

                      {ticketImages.length > 0 && (
                        <div className="pp-thumbRow">
                          {ticketImages.slice(0, 4).map((img, idx) => {
                            const src = resolveImageSrc(
                              typeof img === "string" ? img : img?.url || img?.path || ""
                            )

                            return src ? (
                              <div key={`${ticket._id}-${idx}`} className="pp-thumb">
                                <img src={src} alt={`attachment-${idx + 1}`} />
                              </div>
                            ) : null
                          })}

                          {ticketImages.length > 4 && (
                            <div className="pp-thumb pp-thumbMore">
                              +{ticketImages.length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pp-ticketMeta">
                        <div className="pp-chipRow">
                          <span
                            className="pp-chip pp-chipPriority"
                            style={priorityTone(priorityValue)}
                          >
                            {formatLabel(priorityValue)}
                          </span>

                          <span className="pp-chip pp-chipNeutral">
                            {formatLabel(categoryValue)}
                          </span>

                          <span
                            className="pp-chip pp-chipSla"
                            style={slaDisplay.tone}
                          >
                            <Clock3 size={12} />
                            {slaDisplay.text}
                          </span>
                        </div>

                        <div className="pp-ticketTime">
                          <Clock3 size={13} />
                          <span>{formatTime(ticket.createdAt)}</span>
                        </div>
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            )}
          </motion.section>
        </div>
      </main>

      <style>{`
        .myreq-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .myreq-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 44px 28px 80px;
          position: relative;
          z-index: 2;
        }

        .myreq-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 26px;
        }

        .myreq-kicker {
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

        .myreq-hero h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .myreq-hero p {
          max-width: 760px;
          margin: 12px 0 0;
          opacity: 0.78;
          line-height: 1.65;
          font-size: 15px;
        }

        .myreq-hero-cta {
          min-width: 210px;
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(16px);
          text-align: right;
        }

        .myreq-hero-cta strong {
          display: block;
          font-size: 30px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .myreq-hero-cta span {
          font-size: 13px;
          opacity: 0.72;
        }

        .myreq-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 22px 0 22px;
        }

        .myreq-stat {
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(16px);
        }

        .myreq-stat-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .myreq-stat-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(166, 138, 100, 0.14);
          border: 1px solid rgba(166, 138, 100, 0.2);
        }

        .myreq-stat .label {
          font-size: 12px;
          opacity: 0.74;
        }

        .myreq-stat .value {
          font-size: 30px;
          font-weight: 600;
          line-height: 1;
        }

        .myreq-stat .sub {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.62;
        }

        .myreq-layout {
          display: grid;
          grid-template-columns: 430px minmax(0, 1fr);
          gap: 24px;
          align-items: stretch;
          height: calc(100vh - 300px);
          min-height: 680px;
        }

        .pp-panel {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
        }

        .pp-formPanel {
          padding: 30px;
          display: flex;
          flex-direction: column;
          height: 102%;
          overflow: auto;
          -ms-overflow-style: none;
          scrollbar-width: none; 
        }
          .pp-formPanel::-webkit-scrollbar {
            display: none;
          }

        .pp-formBody {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          padding-bottom:10px;
        }

        .pp-field {
          margin-bottom: 16px;
        }

        .pp-fieldLabel {
          display: block;
          margin-bottom: 10px;
          font-size: 12px;
          opacity: 0.75;
        }

        .pp-fieldGroup {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 6px;
        }

        .pp-panelTop {
          margin-bottom: 18px;
          flex-shrink: 0;
        }

        .pp-panelTitle {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .pp-panelSub {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.65;
          opacity: 0.72;
          margin-bottom:5px;
        }

        .pp-footnote {
          margin-top: 14px;
          
        }

        .pp-error {
          margin: 0 0 14px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.24);
          color: #fecaca;
          font-size: 13px;
        }

        .pp-input,
        .pp-textarea,
        .pp-select {
          width: 87%;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f3f3ee;
          outline: none;
          padding: 14px 15px;
          transition: all 0.25s ease;
          font: inherit;
          margin: 0;
        }

        .pp-input::placeholder,
        .pp-textarea::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }

        .pp-input:focus,
        .pp-textarea:focus,
        .pp-select:focus {
          border-color: rgba(166, 138, 100, 0.65);
          box-shadow: 0 0 0 4px rgba(166, 138, 100, 0.12);
        }

        .pp-textarea {
          min-height: 118px;
          resize: vertical;
        }

        .pp-selectWrap {
          position: relative;
        }

        .pp-select {
          appearance: none;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f3f3ee;
          padding: 14px 42px 14px 14px;
          font-size: 14px;
          cursor: pointer;
        }

        .pp-select:hover {
          border-color: rgba(166, 138, 100, 0.5);
        }

        .pp-chevron {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.6;
          transition: 0.2s;
          pointer-events: none;
        }

        .pp-selectWrap:hover .pp-chevron {
          opacity: 1;
        }

        .pp-dropzone {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 18px;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.14);
          cursor: pointer;
          transition: all 0.25s ease;
          margin-top: 10px;
        }

        .pp-dropzone:hover {
          border-color: rgba(166, 138, 100, 0.7);
          background: rgba(0, 0, 0, 0.18);
        }

        .pp-dropzone.active {
          transform: scale(1.01);
          border-color: rgba(166, 138, 100, 0.85);
          background: rgba(166, 138, 100, 0.12);
        }

        .pp-dropIcon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(166, 138, 100, 0.16);
          border: 1px solid rgba(166, 138, 100, 0.24);
          flex: none;
        }

        .pp-dropText strong {
          display: block;
          font-size: 14px;
          margin-bottom: 3px;
        }

        .pp-dropText span {
          font-size: 12px;
          opacity: 0.7;
          line-height: 1.4;
        }

        .pp-previewGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .pp-previewItem {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.22);
        }

        .pp-previewItem img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pp-removeImg {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(0, 0, 0, 0.62);
          border: none;
          color: #fff;
          cursor: pointer;
        }

        .pp-createBtn {
          width: 100%;
          margin-top: 18px;
          height: 46px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #a68a64, #7d6546);
          color: #fff;
          font-weight: 600;
          letter-spacing: 0.3px;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(166, 138, 100, 0.22);
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          padding:10px;
        }

        .pp-createBtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(166, 138, 100, 0.28);
        }

        .pp-createBtn:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
        }

        .pp-listPanel {
          padding: 22px;
          display: flex;
          flex-direction: column;
          height: 104%;
          min-height: 0;
          overflow: hidden;
        }

        .pp-listTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .pp-listTools {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .pp-searchWrap {
          position: relative;
          min-width: 260px;
          flex: 1;
        }

        .pp-miniSelect {
          min-width: 180px;
        }

        .pp-search {
          padding-left: 42px;
          margin-right:13px;
        }

        .pp-searchIcon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.7;
          pointer-events: none;
        }

        .pp-ticketList {
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
          padding-right: 4px;
        }

        .pp-ticketList::-webkit-scrollbar {
          width: 6px;
        }

        .pp-ticketList::-webkit-scrollbar-thumb {
          background: rgba(166, 138, 100, 0.42);
          border-radius: 999px;
        }

        .pp-ticketCard {
          position: relative;
          padding: 18px 18px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.065);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.18);
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          flex-shrink: 0;
        }

        .pp-ticketCard:hover {
          border-color: rgba(166, 138, 100, 0.42);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.28);
        }

        .pp-ticketTop {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .pp-ticketTitle {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }

        .pp-ticketId {
          font-size: 11px;
          opacity: 0.58;
          letter-spacing: 0.12em;
        }

        .pp-ticketDesc {
          font-size: 14px;
          line-height: 1.65;
          opacity: 0.78;
          margin: 12px 0 0;
        }

        .pp-chipRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pp-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }

        .pp-chipStatus {
          white-space: nowrap;
        }

        .pp-chipNeutral {
          background: rgba(255, 255, 255, 0.08);
          color: #f2f2eb;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .pp-chipSla {
          text-transform: none;
          letter-spacing: 0;
        }

        .pp-ticketMeta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .pp-ticketTime {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.65;
          white-space: nowrap;
        }

        .pp-thumbRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .pp-thumb {
          width: 72px;
          height: 72px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
        }

        .pp-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pp-thumbMore {
          display: grid;
          place-items: center;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          background: rgba(255, 255, 255, 0.08);
        }

        .pp-empty {
          flex: 1;
          min-height: 0;
          padding: 32px 22px;
          text-align: center;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.12);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          opacity: 0.9;
        }

        .myreq-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.28;
          pointer-events: none;
          z-index: 0;
        }

        .myreq-blob.a {
          width: 280px;
          height: 280px;
          top: 110px;
          right: -80px;
          background: #a68a64;
        }

        .myreq-blob.b {
          width: 240px;
          height: 240px;
          bottom: 160px;
          left: -70px;
          background: #6f875a;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .myreq-layout {
            grid-template-columns: 1fr;
            height: auto;
            min-height: auto;
          }

          .pp-formPanel,
          .pp-listPanel {
            height: auto;
            min-height: auto;
          }

          .myreq-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pp-listTools {
            min-width: 100%;
          }
        }

        @media (max-width: 720px) {
          .myreq-shell {
            padding: 30px 16px 64px;
          }

          .myreq-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .myreq-hero-cta {
            min-width: 100%;
            text-align: left;
          }

          .pp-fieldGroup {
            grid-template-columns: 1fr;
          }

          .pp-listTop {
            flex-direction: column;
            align-items: stretch;
          }

          .pp-listTools {
            flex-direction: column;
            align-items: stretch;
          }

          .myreq-stats {
            grid-template-columns: 1fr;
          }

          .pp-previewGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  )
}

export default MyRequests

        

