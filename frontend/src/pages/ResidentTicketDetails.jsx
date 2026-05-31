import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import AppTopbar from "../components/AppTopbar"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  User,
  AlertTriangle,
} from "lucide-react"

import { API_BASE } from "../config"

function normalizeStatus(status) {
  return String(status || "OPEN").replace(/\s+/g, "_").toUpperCase()
}

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTime(dateString) {
  if (!dateString) return "—"
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
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
        bg: "rgba(59, 130, 246, 0.14)",
        color: "#bfdbfe",
        border: "1px solid rgba(59, 130, 246, 0.22)",
      }
    case "ASSIGNED":
      return {
        bg: "rgba(14, 165, 233, 0.14)",
        color: "#bae6fd",
        border: "1px solid rgba(14, 165, 233, 0.24)",
      }
    case "IN_PROGRESS":
      return {
        bg: "rgba(234, 179, 8, 0.14)",
        color: "#fde68a",
        border: "1px solid rgba(234, 179, 8, 0.24)",
      }
    case "RESOLVED_PENDING_CONFIRMATION":
      return {
        bg: "rgba(168, 85, 247, 0.14)",
        color: "#ddd6fe",
        border: "1px solid rgba(168, 85, 247, 0.24)",
      }
    case "CLOSED":
      return {
        bg: "rgba(34, 197, 94, 0.14)",
        color: "#bbf7d0",
        border: "1px solid rgba(34, 197, 94, 0.24)",
      }
    case "REOPENED":
      return {
        bg: "rgba(244, 114, 182, 0.14)",
        color: "#fbcfe8",
        border: "1px solid rgba(244, 114, 182, 0.24)",
      }
    default:
      return {
        bg: "rgba(255,255,255,0.08)",
        color: "#f3f3ee",
        border: "1px solid rgba(255,255,255,0.14)",
      }
  }
}

async function readJsonSafe(res) {
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

    const data = await readJsonSafe(res)
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

function ResidentTicketDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const fetchTicket = async () => {
    try {
      setLoading(true)
      setError("")

      const res = await fetchWithAuth(`${API_BASE}/api/tickets/${id}`)
      const data = await readJsonSafe(res)

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load ticket")
      }

      setTicket(data)
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to load ticket")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id])

  const confirmTicket = async () => {
    try {
      setBusy(true)
      const res = await fetchWithAuth(`${API_BASE}/api/tickets/${id}/confirm`, {
        method: "PATCH",
      })
      const data = await readJsonSafe(res)

      if (!res.ok) {
        throw new Error(data?.message || "Confirm failed")
      }

      await fetchTicket()
    } catch (err) {
      alert(err.message || "Confirm failed")
    } finally {
      setBusy(false)
    }
  }

  const reopenTicket = async () => {
    try {
      setBusy(true)
      const res = await fetchWithAuth(`${API_BASE}/api/tickets/${id}/reopen`, {
        method: "PATCH",
      })
      const data = await readJsonSafe(res)

      if (!res.ok) {
        throw new Error(data?.message || "Reopen failed")
      }

      await fetchTicket()
    } catch (err) {
      alert(err.message || "Reopen failed")
    } finally {
      setBusy(false)
    }
  }

  const images = useMemo(() => {
    const raw = Array.isArray(ticket?.images)
      ? ticket.images
      : Array.isArray(ticket?.imageUrls)
        ? ticket.imageUrls
        : []

    return raw
      .map((item) => {
        if (typeof item === "string") return resolveImageSrc(item)
        return resolveImageSrc(item?.url || item?.path || item?.src || "")
      })
      .filter(Boolean)
  }, [ticket])

  const historyEntries = useMemo(() => {
    const raw = Array.isArray(ticket?.history) ? [...ticket.history] : []
    return raw.reverse()
  }, [ticket])

  const timelineSteps = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED_PENDING_CONFIRMATION",
    "CLOSED",
  ]

  const currentStatus = normalizeStatus(ticket?.status)
  const currentIndex = timelineSteps.findIndex((s) => s === currentStatus)

  if (loading) {
    return (
      <div className="rt-page">
        <AppTopbar />
        <div className="rt-shell rt-loadingWrap">
          <div className="rt-loadingCard">
            <motion.div
              className="rt-spinner"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
            />
            <p>Loading ticket details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rt-page">
        <AppTopbar />
        <div className="rt-shell">
          <div className="rt-errorCard">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) return null

  const statusStyle = statusTone(ticket.status)

  return (
    <div className="rt-page">
      <AppTopbar />

      <motion.div
        className="rt-blob rt-blob-a"
        animate={{ y: [0, -18, 0], x: [0, 8, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="rt-blob rt-blob-b"
        animate={{ y: [0, 16, 0], x: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className="rt-shell">
        <motion.section
          className="rt-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="rt-heroLeft">
            <div className="rt-kicker">
              <Sparkles size={14} />
              Ticket overview
            </div>

            <h1>{ticket.title}</h1>
            <p>{ticket.description}</p>
          </div>

          <div className="rt-heroCard">
            <strong>#{String(ticket._id).slice(-6).toUpperCase()}</strong>
            <span>{formatLabel(ticket.status)}</span>
          </div>
        </motion.section>

        <div className="rt-layout">
          {/* MAIN COLUMN */}
          <div className="rt-mainCol">
            <motion.section
              className="rt-panel rt-summaryPanel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="rt-panelHead">
                <h2>Ticket summary</h2>
                <span>Current state and key details</span>
              </div>

              <div className="rt-chipRow">
                <span
                  className="rt-chip"
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    border: statusStyle.border,
                  }}
                >
                  {formatLabel(ticket.status)}
                </span>

                <span className="rt-chip rt-chipAlt">
                  {formatLabel(ticket.priority || "medium")}
                </span>

                <span className="rt-chip rt-chipAlt">
                  {formatLabel(ticket.category || "general")}
                </span>
              </div>

              <div className="rt-metaGrid">
                <div className="rt-metaCard">
                  <span>Created</span>
                  <strong>{formatTime(ticket.createdAt)}</strong>
                </div>

                <div className="rt-metaCard">
                  <span>Updated</span>
                  <strong>{formatTime(ticket.updatedAt || ticket.createdAt)}</strong>
                </div>

                <div className="rt-metaCard">
                  <span>Technician</span>
                  <strong>
                    {typeof ticket.assignedTo === "object"
                      ? ticket.assignedTo?.name || "Not assigned"
                      : ticket.assignedTo
                        ? "Assigned"
                        : "Not assigned"}
                  </strong>
                </div>

                <div className="rt-metaCard">
                  <span>Reference</span>
                  <strong>#{String(ticket._id).slice(-8).toUpperCase()}</strong>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="rt-panel rt-timelinePanel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <div className="rt-panelHead">
                <h2>Progress timeline</h2>
                <span>Track the ticket through its lifecycle</span>
              </div>

              <div className="rt-timeline">
                {timelineSteps.map((step, index) => {
                  const done = index < currentIndex
                  const active = index === currentIndex
                  return (
                    <div
                      key={step}
                      className={`rt-step ${done ? "done" : ""} ${active ? "active" : ""}`}
                    >
                      <span className="rt-dot" />
                      <strong>{formatLabel(step)}</strong>
                    </div>
                  )
                })}
              </div>
            </motion.section>

            <motion.section
              className="rt-panel rt-imagesPanel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
            >
              <div className="rt-panelHead">
                <h2>Images</h2>
                <span>{images.length} attachment(s)</span>
              </div>

              {images.length > 0 ? (
                <div className="rt-imageGrid">
                  {images.map((src, index) => (
                    <motion.button
                      type="button"
                      key={`${src}-${index}`}
                      className="rt-imageCard"
                      whileHover={{ scale: 1.03, y: -2 }}
                      onClick={() => setPreview(src)}
                    >
                      <img src={src} alt={`attachment-${index + 1}`} />
                      <div className="rt-imageOverlay">Open</div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="rt-emptyBox">
                  <ImageIcon size={18} />
                  <span>No images uploaded for this ticket.</span>
                </div>
              )}
            </motion.section>
          </div>

          {/* SIDEBAR */}
          <motion.aside
            className="rt-panel rt-sidePanel"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <div className="rt-panelHead">
              <h2>People & actions</h2>
              <span>Who is handling this ticket</span>
            </div>

            <div className="rt-personCard">
              <div className="rt-personIcon">
                <User size={16} />
              </div>
              <div>
                <span>Assigned technician</span>
                <strong>
                  {typeof ticket.assignedTo === "object"
                    ? ticket.assignedTo?.name || "Not assigned yet"
                    : ticket.assignedTo
                      ? "Assigned"
                      : "Not assigned yet"}
                </strong>
              </div>
            </div>

            <div className="rt-personCard">
              <div className="rt-personIcon">
                <Clock3 size={16} />
              </div>
              <div>
                <span>Current status</span>
                <strong>{formatLabel(ticket.status)}</strong>
              </div>
            </div>

            <div className="rt-actionBlock">
              {currentStatus === "RESOLVED_PENDING_CONFIRMATION" && (
                <>
                  <button
                    className="rt-primaryBtn"
                    onClick={confirmTicket}
                    disabled={busy}
                  >
                    <CheckCircle2 size={16} />
                    {busy ? "Confirming..." : "Confirm Resolution"}
                  </button>

                  <button
                    className="rt-secondaryBtn"
                    onClick={reopenTicket}
                    disabled={busy}
                  >
                    <RotateCcw size={16} />
                    {busy ? "Reopening..." : "Reopen Ticket"}
                  </button>
                </>
              )}

              {currentStatus === "CLOSED" && (
                <button
                  className="rt-secondaryBtn"
                  onClick={reopenTicket}
                  disabled={busy}
                >
                  <RotateCcw size={16} />
                  {busy ? "Reopening..." : "Reopen Ticket"}
                </button>
              )}

              {currentStatus === "IN_PROGRESS" && (
                <div className="rt-infoNote">
                  The technician is working on this ticket now.
                </div>
              )}

              {currentStatus === "ASSIGNED" && (
                <div className="rt-infoNote">
                  The ticket is assigned and waiting for work to start.
                </div>
              )}

              {currentStatus === "OPEN" && (
                <div className="rt-infoNote">
                  The ticket is waiting for admin assignment.
                </div>
              )}
            </div>

            <div className="rt-activityBlock">
              <div className="rt-panelHead rt-activityHead">
                <h2>Activity</h2>
                <span>Latest ticket actions</span>
              </div>

              {historyEntries.length > 0 ? (
                <div className="rt-historyList">
                  {historyEntries.map((entry, index) => (
                    <div key={`${entry.action}-${index}`} className="rt-historyItem">
                      <div className="rt-historyIcon">
                        <Clock3 size={14} />
                      </div>
                      <div className="rt-historyBody">
                        <strong>{formatLabel(entry.action)}</strong>
                        <p>{entry.details || "No details available"}</p>
                        <span>
                          {entry.performedBy?.name
                            ? `By ${entry.performedBy.name}`
                            : entry.performedBy
                              ? "By staff"
                              : "System"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rt-emptyBox">
                  <Clock3 size={18} />
                  <span>No activity recorded yet.</span>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      </main>

      <AnimatePresence>
        {preview && (
          <motion.div
            className="rt-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.div
              className="rt-modalInner"
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="rt-closeBtn" onClick={() => setPreview(null)}>
                ×
              </button>
              <img src={preview} alt="preview" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .rt-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .rt-shell {
          max-width: 1380px;
          margin: 0 auto;
          padding: 40px 24px 84px;
          position: relative;
          z-index: 2;
        }

        .rt-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 24px;
        }

        .rt-heroLeft {
          max-width: 860px;
          margin: 20px;
        }

        .rt-backBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f3f3ee;
          cursor: pointer;
          transition: all 0.25s ease;
          font-size: 13px;
        }

        .rt-backBtn:hover {
          transform: translateY(-1px);
          border-color: rgba(166, 138, 100, 0.45);
          background: rgba(166, 138, 100, 0.12);
        }

        .rt-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(166, 138, 100, 0.14);
          border: 1px solid rgba(166, 138, 100, 0.25);
          color: #f0dfcf;
          font-size: 12px;
          margin-bottom: 14px;
          margin-left: 14px;
        }

        .rt-hero h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .rt-hero p {
          margin: 12px 0 0;
          max-width: 800px;
          opacity: 0.78;
          line-height: 1.65;
          font-size: 15px;
        }

        .rt-heroCard {
          min-width: 220px;
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(16px);
          text-align: right;
        }

        .rt-heroCard strong {
          display: block;
          font-size: 28px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .rt-heroCard span {
          font-size: 13px;
          opacity: 0.72;
        }

        .rt-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
          gap: 24px;
          align-items: start;
        }

        .rt-mainCol {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .rt-panel {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
        }

        .rt-summaryPanel,
        .rt-timelinePanel,
        .rt-imagesPanel,
        .rt-historyPanel,
        .rt-sidePanel {
          padding: 20px;
        }

        .rt-panelHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 16px;
        }

        .rt-panelHead h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .rt-panelHead span {
          font-size: 12px;
          opacity: 0.64;
        }

        .rt-chipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }

        .rt-chip {
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }

        .rt-chipAlt {
          background: rgba(255, 255, 255, 0.08);
          color: #f3f3ee;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .rt-metaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .rt-metaCard {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rt-metaCard span {
          display: block;
          font-size: 11px;
          opacity: 0.65;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rt-metaCard strong {
          font-size: 14px;
          font-weight: 600;
        }

        .rt-timeline {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .rt-step {
          padding: 12px 12px 11px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          opacity: 0.7;
          transition: all 0.25s ease;
          min-height: 56px;
        }

        .rt-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.24);
          flex: none;
        }

        .rt-step.done {
          background: rgba(166, 138, 100, 0.12);
          border-color: rgba(166, 138, 100, 0.2);
          opacity: 0.92;
        }

        .rt-step.done .rt-dot {
          background: #a68a64;
        }

        .rt-step.active {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(166, 138, 100, 0.42);
          opacity: 1;
          transform: translateY(-1px);
        }

        .rt-step.active .rt-dot {
          background: #f0dfcf;
          box-shadow: 0 0 0 4px rgba(166, 138, 100, 0.14);
        }

        .rt-imageGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .rt-imageCard {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          cursor: pointer;
          padding: 0;
        }

        .rt-imageCard img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .rt-imageOverlay {
          position: absolute;
          inset: auto 10px 10px 10px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .rt-emptyBox {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px dashed rgba(255, 255, 255, 0.14);
          opacity: 0.76;
          font-size: 13px;
        }

        .rt-historyList {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 340px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .rt-historyItem {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 12px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rt-historyIcon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(166, 138, 100, 0.14);
          border: 1px solid rgba(166, 138, 100, 0.2);
          margin-top: 2px;
        }

        .rt-historyBody strong {
          display: block;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .rt-historyBody p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          opacity: 0.78;
        }

        .rt-historyBody span {
          display: inline-block;
          margin-top: 6px;
          font-size: 11px;
          opacity: 0.6;
        }

        .rt-sidePanel {
          position: sticky;
          top: 92px;
        }

        .rt-personCard {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 12px;
          padding: 14px 14px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 12px;
        }

        .rt-personIcon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(166, 138, 100, 0.14);
          border: 1px solid rgba(166, 138, 100, 0.2);
        }

        .rt-personCard span {
          display: block;
          font-size: 11px;
          opacity: 0.65;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rt-personCard strong {
          font-size: 14px;
          font-weight: 600;
        }

        .rt-actionBlock {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rt-primaryBtn,
        .rt-secondaryBtn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.25s ease;
        }

        .rt-primaryBtn {
          background: linear-gradient(135deg, #a68a64, #7d6546);
          color: #fff;
          box-shadow: 0 10px 26px rgba(166, 138, 100, 0.24);
        }

        .rt-secondaryBtn {
          background: rgba(255, 255, 255, 0.07);
          color: #f3f3ee;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .rt-primaryBtn:hover,
        .rt-secondaryBtn:hover,
        .rt-backBtn:hover {
          transform: translateY(-2px);
        }

        .rt-primaryBtn:disabled,
        .rt-secondaryBtn:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
        }

        .rt-infoNote {
          padding: 14px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
          line-height: 1.6;
          opacity: 0.82;
        }

        .rt-activityBlock {
          margin-top: 18px;
        }

        .rt-activityHead {
          margin-bottom: 12px;
        }

        .rt-modal {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0, 0, 0, 0.74);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .rt-modalInner {
          position: relative;
          max-width: min(92vw, 1100px);
          max-height: 86vh;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .rt-modalInner img {
          display: block;
          max-width: 100%;
          max-height: 86vh;
          object-fit: contain;
          background: #111;
        }

        .rt-closeBtn {
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
          font-size: 20px;
        }

        .rt-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.28;
          pointer-events: none;
          z-index: 0;
        }

        .rt-blob-a {
          width: 300px;
          height: 300px;
          top: 120px;
          right: -80px;
          background: #a68a64;
        }

        .rt-blob-b {
          width: 240px;
          height: 240px;
          bottom: 140px;
          left: -80px;
          background: #6f875a;
        }

        .rt-loadingWrap {
          padding-top: 80px;
        }

        .rt-loadingCard {
          margin: 0 auto;
          width: min(420px, 100%);
          padding: 24px;
          text-align: center;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
        }

        .rt-spinner {
          width: 34px;
          height: 34px;
          margin: 0 auto 14px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.14);
          border-top-color: #a68a64;
        }

        .rt-errorCard {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.24);
          color: #fecaca;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        @media (max-width: 1180px) {
          .rt-layout {
            grid-template-columns: 1fr;
          }

          .rt-sidePanel {
            position: relative;
            top: auto;
          }
        }

        @media (max-width: 760px) {
          .rt-shell {
            padding: 30px 16px 68px;
          }

          .rt-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .rt-heroCard {
            min-width: 100%;
            text-align: left;
          }

          .rt-metaGrid {
            grid-template-columns: 1fr;
          }

          .rt-timeline {
            grid-template-columns: 1fr;
          }

          .rt-imageGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  )
}

export default ResidentTicketDetails