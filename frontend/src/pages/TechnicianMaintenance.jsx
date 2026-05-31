import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import AppTopbar from "../components/AppTopbar"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ClipboardCheck,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  TimerReset,
  UserRoundCheck,
  Wrench,
  X,
  XCircle,
} from "lucide-react"

import { API_BASE } from "../config"

const statusTabs = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const priorityDefaults = {
  low: 48,
  medium: 24,
  high: 12,
  critical: 6,
}

function getToken() {
  return localStorage.getItem("token")
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")
  } catch {
    return {}
  }
}

async function safeJson(res) {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text || "Invalid server response")
  }
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.maintenance)) return payload.maintenance
  if (Array.isArray(payload?.records)) return payload.records
  return []
}

function titleCase(value) {
  if (!value) return "Not set"

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDateTime(value) {
  if (!value) return "Not set"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Invalid date"

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateShort(value) {
  if (!value) return "Not set"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Invalid date"

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDuration(ms) {
  if (ms === null || ms === undefined) return "Not available"

  const absMs = Math.abs(Number(ms))
  if (Number.isNaN(absMs)) return "Not available"

  const totalMinutes = Math.ceil(absMs / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  return `${minutes}m`
}

function getAssetLabel(asset) {
  if (!asset) return "Unknown asset"
  if (typeof asset === "string") return asset

  const idPart = asset.assetId ? ` · ${asset.assetId}` : ""
  return `${asset.name || "Unnamed asset"}${idPart}`
}

function getPersonLabel(person, fallback = "Unassigned") {
  if (!person) return fallback
  if (typeof person === "string") return "Assigned"
  return person.name || person.email || fallback
}

function getSlaMeta(record) {
  const state = String(record?.slaState || record?.slaStatus || "NO_SLA").toUpperCase()
  const remainingMs = record?.slaRemainingMs

  if (state === "BREACHED" || state === "BREACHED_RESOLVED") {
    return {
      state,
      label: state === "BREACHED_RESOLVED" ? "Completed Late" : "SLA Breached",
      detail:
        state === "BREACHED_RESOLVED"
          ? "Closed after SLA"
          : `Overdue by ${formatDuration(remainingMs)}`,
      className: "danger",
      icon: ShieldAlert,
    }
  }

  if (state === "AT_RISK") {
    return {
      state,
      label: "At Risk",
      detail: `${formatDuration(remainingMs)} left`,
      className: "warning",
      icon: AlertTriangle,
    }
  }

  if (state === "MET") {
    return {
      state,
      label: "SLA Met",
      detail: "Completed within SLA",
      className: "success",
      icon: CheckCircle2,
    }
  }

  if (state === "ACTIVE") {
    return {
      state,
      label: "SLA Active",
      detail: `${formatDuration(remainingMs)} left`,
      className: "info",
      icon: Clock3,
    }
  }

  return {
    state,
    label: "No SLA",
    detail: "SLA not available",
    className: "muted",
    icon: Clock3,
  }
}

function getStatusMeta(status) {
  const value = String(status || "scheduled").toLowerCase()

  const map = {
    scheduled: {
      label: "Scheduled",
      className: "scheduled",
      icon: CalendarClock,
    },
    in_progress: {
      label: "In Progress",
      className: "progress",
      icon: PlayCircle,
    },
    completed: {
      label: "Completed",
      className: "completed",
      icon: CheckCircle2,
    },
    cancelled: {
      label: "Cancelled",
      className: "cancelled",
      icon: XCircle,
    },
  }

  return map[value] || map.scheduled
}

function buildSummary(records) {
  const list = Array.isArray(records) ? records : []

  return {
    total: list.length,
    scheduled: list.filter((item) => item.status === "scheduled").length,
    active: list.filter((item) => item.status === "in_progress").length,
    completed: list.filter((item) => item.status === "completed").length,
    breached: list.filter((item) =>
      ["BREACHED", "BREACHED_RESOLVED"].includes(
        String(item.slaState || item.slaStatus).toUpperCase()
      )
    ).length,
  }
}

function TechnicianMaintenance() {
  const navigate = useNavigate()
  const token = getToken()
  const currentUser = getStoredUser()

  const [records, setRecords] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completionNotes, setCompletionNotes] = useState("")

  const [searchParams] = useSearchParams()
  const maintenanceIdFromUrl = searchParams.get("id")

  const fetchWithAuth = useCallback(
    async (url, options = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...(options.headers || {}),
        },
      })

      const data = await safeJson(res)

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Request failed")
      }

      return data
    },
    [token]
  )

  const loadMaintenance = useCallback(async () => {
    if (!token) {
      setError("Login token missing. Please login again.")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")

      const payload = await fetchWithAuth(`${API_BASE}/api/maintenance`)
      const list = normalizeArray(payload)

      const userId = currentUser?.id || currentUser?._id

      const assignedOnly = list.filter((item) => {
        const assigned = item.assignedTo

        if (!assigned) return false
        if (typeof assigned === "string") return assigned === userId

        return assigned._id === userId || assigned.id === userId
      })

      setRecords(assignedOnly)

if (maintenanceIdFromUrl) {

  const matchedMaintenance = assignedOnly.find(
    (item) => item._id === maintenanceIdFromUrl
  )

  if (matchedMaintenance) {
    setSelectedId(matchedMaintenance._id)
  } else {
    setSelectedId(assignedOnly[0]?._id || "")
  }

} else {

  setSelectedId((prev) => {
    if (prev && assignedOnly.some((item) => item._id === prev)) return prev
    return assignedOnly[0]?._id || ""
  })

}
    } catch (err) {
      setError(err.message || "Failed to load maintenance tasks")
    } finally {
      setLoading(false)
    }
  }, [
  fetchWithAuth,
  token,
  currentUser?.id,
  currentUser?._id,
  maintenanceIdFromUrl,
])

  useEffect(() => {
    loadMaintenance()
  }, [loadMaintenance])

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(() => setSuccess(""), 2600)
    return () => clearTimeout(timer)
  }, [success])

  const selectedRecord = useMemo(() => {
    if (!records.length) return null
    return records.find((item) => item._id === selectedId) || records[0]
  }, [records, selectedId])

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase()

    return records.filter((item) => {
      const assetLabel = getAssetLabel(item.asset).toLowerCase()

      const matchesSearch =
        !search ||
        String(item.title || "").toLowerCase().includes(search) ||
        String(item.description || "").toLowerCase().includes(search) ||
        assetLabel.includes(search)

      const matchesStatus =
        statusFilter === "all" || String(item.status || "").toLowerCase() === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [records, query, statusFilter])

  const summary = useMemo(() => buildSummary(records), [records])

  const updateRecordInState = (updated) => {
    if (!updated?._id) return

    setRecords((prev) => {
      const exists = prev.some((item) => item._id === updated._id)
      if (!exists) return [updated, ...prev]
      return prev.map((item) => (item._id === updated._id ? updated : item))
    })

    setSelectedId(updated._id)
  }

  const handleStart = async (record) => {
    if (!record?._id) return

    try {
      setActionLoading(`start-${record._id}`)
      setError("")

      const updated = await fetchWithAuth(`${API_BASE}/api/maintenance/${record._id}/start`, {
        method: "PUT",
        body: JSON.stringify({}),
      })

      updateRecordInState(updated)
      setSuccess("Maintenance work started.")
      await loadMaintenance()
    } catch (err) {
      setError(err.message || "Failed to start maintenance")
    } finally {
      setActionLoading("")
    }
  }

  const handleComplete = async (event) => {
    event.preventDefault()

    if (!selectedRecord?._id) return

    try {
      setActionLoading("complete")
      setError("")

      const updated = await fetchWithAuth(
        `${API_BASE}/api/maintenance/${selectedRecord._id}/complete`,
        {
          method: "PUT",
        body: JSON.stringify({
        completionNotes: completionNotes.trim(),
        completionNote: completionNotes.trim(),
        notes: completionNotes.trim(),
        }),
        }
      )

      updateRecordInState(updated)
      setCompleteOpen(false)
      setCompletionNotes("")
      setSuccess("Maintenance completed successfully.")
      await loadMaintenance()
    } catch (err) {
      setError(err.message || "Failed to complete maintenance")
    } finally {
      setActionLoading("")
    }
  }

  if (loading) {
    return (
      <>
        <TechnicianMaintenanceStyles />
        <div className="tm-page tm-loading-page">
          <div className="tm-loading-card">
            <Loader2 className="tm-spin" size={22} />
            <div>
              <h3>Loading Maintenance Queue</h3>
              <p>Fetching assigned service work and SLA status...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  

  return (
    <>
      <TechnicianMaintenanceStyles />

      <div className="tm-page">
        <AppTopbar />

        <main className="tm-shell">
          <section className="tm-hero">
            <div className="tm-hero-left">
              <button type="button" className="tm-back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
              </button>

              <div>
                <span className="tm-chip">Technician Maintenance</span>
                <h1>Service Workbench</h1>
                <p>
                  Start assigned maintenance, track SLA pressure, and close completed
                  work with clear execution notes.
                </p>
              </div>
            </div>

            <div className="tm-hero-right">
              <button type="button" className="tm-refresh-btn" onClick={loadMaintenance}>
                <RefreshCcw size={16} />
                Refresh
              </button>

              <div className="tm-hero-stat">
                <span>Assigned</span>
                <strong>{summary.total}</strong>
              </div>
            </div>
          </section>

          {(error || success) && (
            <section className="tm-message-area">
              {error && (
                <div className="tm-alert error">
                  <AlertTriangle size={17} />
                  <span>{error}</span>
                  <button type="button" onClick={() => setError("")}>
                    <X size={15} />
                  </button>
                </div>
              )}

              {success && (
                <div className="tm-alert success">
                  <CheckCircle2 size={17} />
                  <span>{success}</span>
                </div>
              )}
            </section>
          )}

          <section className="tm-summary-grid">
            <SummaryCard label="Scheduled" value={summary.scheduled} icon={CalendarClock} />
            <SummaryCard label="In Progress" value={summary.active} icon={PlayCircle} />
            <SummaryCard label="SLA Breached" value={summary.breached} icon={ShieldAlert} danger />
            <SummaryCard label="Completed" value={summary.completed} icon={CheckCircle2} />
          </section>

          <section className="tm-board">
            <div className="tm-left-panel">
              <div className="tm-panel-head">
                <div>
                  <h2>Assigned Maintenance</h2>
                  <p>{filteredRecords.length} visible from {records.length} assigned tasks</p>
                </div>
              </div>

              <div className="tm-tools">
                <div className="tm-search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search task or asset..."
                  />
                </div>

                <div className="tm-select-wrap">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {statusTabs.map((tab) => (
                      <option key={tab.value} value={tab.value}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="tm-task-list">
                {filteredRecords.length === 0 ? (
                  <EmptyState
                    title="No assigned maintenance"
                    description="Assigned maintenance tasks will appear here."
                  />
                ) : (
                  filteredRecords.map((record) => {
                    const active = selectedRecord?._id === record._id
                    const sla = getSlaMeta(record)
                    const status = getStatusMeta(record.status)
                    const SlaIcon = sla.icon
                    const StatusIcon = status.icon

                    return (
                      <button
                        key={record._id}
                        type="button"
                        onClick={() => setSelectedId(record._id)}
                        className={`tm-task-card ${active ? "active" : ""} ${sla.className}`}
                      >
                        <div className="tm-task-top">
                          <span className={`tm-status-pill ${status.className}`}>
                            <StatusIcon size={13} />
                            {status.label}
                          </span>

                          <span className={`tm-sla-pill ${sla.className}`}>
                            <SlaIcon size={13} />
                            {sla.label}
                          </span>
                        </div>

                        <h3>{record.title || "Untitled maintenance"}</h3>
                        <p>{getAssetLabel(record.asset)}</p>

                        <div className="tm-task-meta">
                          <span>{formatDateShort(record.scheduledDate)}</span>
                          <span>{titleCase(record.priority)}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="tm-right-panel">
              {selectedRecord ? (
                <MaintenanceExecutionPanel
                  record={selectedRecord}
                  actionLoading={actionLoading}
                  onStart={handleStart}
                  onOpenComplete={() => {
                    setCompletionNotes("")
                    setCompleteOpen(true)
                  }}
                />
              ) : (
                <EmptyState
                  title="Select a task"
                  description="Execution controls and SLA details will appear here."
                />
              )}
            </div>
          </section>
        </main>

        {completeOpen && selectedRecord && (
          <Modal
            title="Complete Maintenance"
            subtitle="Add completion notes before closing this assigned task."
            onClose={() => setCompleteOpen(false)}
          >
            <form onSubmit={handleComplete} className="tm-form">
              <div className="tm-preview-box">
                <h3>{selectedRecord.title}</h3>
                <p>{getAssetLabel(selectedRecord.asset)}</p>
              </div>

              <label className="tm-field">
                <span>Completion Notes</span>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Mention readings checked, parts inspected, safety observations, and final condition..."
                  rows={6}
                />
              </label>

              <div className="tm-modal-actions">
                <button type="button" onClick={() => setCompleteOpen(false)} className="tm-btn ghost">
                  Cancel
                </button>

                <button
                    type="submit"
                    disabled={actionLoading === "complete" || !completionNotes.trim()}
                    className="tm-btn success"
                >
                  {actionLoading === "complete" ? (
                    <Loader2 className="tm-spin" size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Complete Work
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  )
}

function SummaryCard({ label, value, icon: Icon, danger }) {
  return (
    <div className={`tm-summary-card ${danger ? "danger" : ""}`}>
      <div className="tm-summary-icon">
        <Icon size={18} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function MaintenanceExecutionPanel({ record, actionLoading, onStart, onOpenComplete }) {
  const sla = getSlaMeta(record)
  const status = getStatusMeta(record.status)
  const SlaIcon = sla.icon
  const StatusIcon = status.icon

  const canStart = record.status === "scheduled"
  const canComplete = record.status === "in_progress"

  return (
    <div className="tm-execution">
      <div className="tm-execution-hero">
        <div>
          <div className="tm-detail-badges">
            <span className={`tm-status-pill ${status.className}`}>
              <StatusIcon size={14} />
              {status.label}
            </span>

            <span className={`tm-sla-pill ${sla.className}`}>
              <SlaIcon size={14} />
              {sla.label}
            </span>
          </div>

          <h2>{record.title || "Untitled maintenance"}</h2>
          <p>{record.description || "No description provided."}</p>
        </div>

        <div className={`tm-sla-window ${sla.className}`}>
          <span>SLA Window</span>
          <strong>{sla.detail}</strong>
        </div>
      </div>

      <div className="tm-action-zone">
        {canStart && (
          <button
            type="button"
            disabled={actionLoading === `start-${record._id}`}
            onClick={() => onStart(record)}
            className="tm-big-action start"
          >
            {actionLoading === `start-${record._id}` ? (
              <Loader2 className="tm-spin" size={20} />
            ) : (
              <PlayCircle size={22} />
            )}
            Start Maintenance
          </button>
        )}

        {canComplete && (
          <button type="button" onClick={onOpenComplete} className="tm-big-action complete">
            <CheckCircle2 size={22} />
            Complete Maintenance
          </button>
        )}

        {!canStart && !canComplete && (
          <div className="tm-locked-state">
            <ClipboardCheck size={22} />
            <div>
              <strong>{status.label}</strong>
              <span>
                {record.status === "completed"
                  ? "This maintenance task is already completed."
                  : record.status === "cancelled"
                  ? "This maintenance task was cancelled by admin."
                  : "No technician action is available."}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="tm-detail-grid">
        <InfoPanel title="Asset Context" icon={Wrench}>
          <InfoRow label="Asset" value={getAssetLabel(record.asset)} />
          <InfoRow
            label="Category"
            value={typeof record.asset === "object" ? titleCase(record.asset?.category) : "Not available"}
          />
          <InfoRow
            label="Location"
            value={typeof record.asset === "object" ? record.asset?.location || "Not set" : "Not available"}
          />
          <InfoRow
            label="Asset Status"
            value={typeof record.asset === "object" ? record.asset?.status || "Not set" : "Not available"}
          />
        </InfoPanel>

        <InfoPanel title="SLA & Priority" icon={TimerReset}>
          <InfoRow label="Priority" value={titleCase(record.priority)} />
          <InfoRow label="SLA Hours" value={`${record.slaHours || priorityDefaults[record.priority] || 24} hours`} />
          <InfoRow label="Deadline" value={formatDateTime(record.deadline)} />
          <InfoRow label="SLA State" value={sla.label} />
        </InfoPanel>

        <InfoPanel title="Timeline" icon={CalendarClock}>
          <InfoRow label="Scheduled" value={formatDateTime(record.scheduledDate)} />
          <InfoRow label="Started" value={formatDateTime(record.startedAt)} />
          <InfoRow label="Completed" value={formatDateTime(record.completedDate)} />
          <InfoRow label="Created" value={formatDateTime(record.createdAt)} />
        </InfoPanel>

        <InfoPanel title="Ownership" icon={UserRoundCheck}>
          <InfoRow label="Assigned To" value={getPersonLabel(record.assignedTo)} />
          <InfoRow label="Created By" value={getPersonLabel(record.createdBy, "Admin")} />
          <InfoRow label="Current Status" value={status.label} />
          <InfoRow label="Record ID" value={record._id} />
        </InfoPanel>
      </div>

      <div className="tm-notes-grid">
        <div className="tm-note-card">
          <span>Planning Notes</span>
          <p>{record.notes || "No planning notes added."}</p>
        </div>

        <div className="tm-note-card">
          <span>Completion Notes</span>
          <p>{record.completionNotes || "Not completed yet."}</p>
        </div>
      </div>
    </div>
  )
}

function InfoPanel({ title, icon: Icon, children }) {
  return (
    <div className="tm-info-panel">
      <div className="tm-info-title">
        <Icon size={16} />
        <h3>{title}</h3>
      </div>

      <div className="tm-info-body">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="tm-info-row">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="tm-empty">
      <ClipboardCheck size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="tm-modal-backdrop">
      <div className="tm-modal-card">
        <div className="tm-modal-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tm-modal-body">{children}</div>
      </div>
    </div>
  )
}

function TechnicianMaintenanceStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      .tm-page {
        min-height: 100vh;
        background:
          radial-gradient(circle at 14% 8%, rgba(137, 154, 99, 0.28), transparent 28rem),
          radial-gradient(circle at 88% 18%, rgba(62, 84, 56, 0.34), transparent 30rem),
          linear-gradient(135deg, #586641 0%, #4b5739 46%, #39462f 100%);
        color: #f4f1e8;
        overflow-x: hidden;
      }

      .tm-shell {
        width: min(1320px, calc(100% - 56px));
        margin: 0 auto;
        padding: 18px 0 24px;
      }


      .tm-hero {
        min-height: 128px;
        border-radius: 30px;
        box-shadow: 0 22px 60px rgba(25, 31, 20, 0.2);
        backdrop-filter: blur(18px);
        padding: 20px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 22px;
        margin-bottom: 12px;
      }

      .tm-hero-left {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
      }

      .tm-back-btn {
        width: 48px;
        height: 48px;
        border-radius: 18px;
        border: 1px solid rgba(244, 241, 232, 0.13);
        background: rgba(244, 241, 232, 0.08);
        color: #f4f1e8;
        display: grid;
        place-items: center;
        cursor: pointer;
        flex: 0 0 auto;
        transition: 180ms ease;
      }

      .tm-back-btn:hover {
        background: rgba(244, 241, 232, 0.14);
        transform: translateY(-1px);
      }

      .tm-chip {
        display: inline-flex;
        width: fit-content;
        border-radius: 999px;
        padding: 6px 11px;
        background: rgba(244, 241, 232, 0.1);
        border: 1px solid rgba(244, 241, 232, 0.13);
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(244, 241, 232, 0.78);
        margin-bottom: 8px;
      }

      .tm-hero h1 {
        margin: 0;
        font-size: clamp(34px, 4.2vw, 58px);
        line-height: 0.92;
        letter-spacing: -0.055em;
        font-weight: 950;
      }

      .tm-hero p {
        max-width: 700px;
        margin: 9px 0 0;
        color: rgba(244, 241, 232, 0.66);
        font-size: 13px;
        line-height: 1.55;
      }

      .tm-hero-right {
        display: flex;
        align-items: stretch;
        gap: 10px;
        flex: 0 0 auto;
      }

      .tm-refresh-btn {
        min-height: 58px;
        border: 1px solid rgba(244, 241, 232, 0.14);
        background: rgba(244, 241, 232, 0.08);
        color: #f4f1e8;
        border-radius: 18px;
        padding: 0 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        transition: 180ms ease;
      }

      .tm-refresh-btn:hover {
        background: rgba(244, 241, 232, 0.13);
        transform: translateY(-1px);
      }

      .tm-hero-stat {
        min-width: 150px;
        border-radius: 22px;
        border: 1px solid rgba(244, 241, 232, 0.14);
        background: rgba(244, 241, 232, 0.07);
        padding: 14px 16px;
        display: grid;
        align-content: center;
        text-align: right;
      }

      .tm-hero-stat span {
        color: rgba(244, 241, 232, 0.58);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .tm-hero-stat strong {
        margin-top: 4px;
        font-size: 30px;
        line-height: 1;
        font-weight: 950;
      }

      /* =========================
         MESSAGES
      ========================= */

      .tm-message-area {
        display: grid;
        gap: 8px;
        margin-bottom: 12px;
      }

      .tm-alert {
        border-radius: 17px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        font-weight: 850;
        border: 1px solid transparent;
      }

      .tm-alert button {
        margin-left: auto;
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
      }

      .tm-alert.error {
        background: rgba(111, 54, 48, 0.42);
        border-color: rgba(255, 180, 165, 0.2);
        color: #ffe7df;
      }

      .tm-alert.success {
        background: rgba(61, 112, 70, 0.42);
        border-color: rgba(193, 231, 186, 0.2);
        color: #efffe8;
      }

      /* =========================
         SUMMARY
      ========================= */

      .tm-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 11px;
        margin-bottom: 12px;
      }

      .tm-summary-card {
        min-height: 82px;
        border-radius: 23px;
        border: 1px solid rgba(244, 241, 232, 0.12);
        background: rgba(244, 241, 232, 0.065);
        backdrop-filter: blur(16px);
        padding: 14px;
        display: flex;
        align-items: center;
        gap: 13px;
      }

      .tm-summary-card.danger {
        background: rgba(112, 72, 42, 0.25);
      }

      .tm-summary-icon {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(244, 241, 232, 0.08);
        border: 1px solid rgba(244, 241, 232, 0.12);
        flex: 0 0 auto;
      }

      .tm-summary-card span {
        display: block;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: rgba(244, 241, 232, 0.58);
      }

      .tm-summary-card strong {
        display: block;
        margin-top: 5px;
        font-size: 29px;
        line-height: 1;
        font-weight: 950;
      }

      /* =========================
         BOARD
      ========================= */

      .tm-board {
        display: grid;
        grid-template-columns: minmax(390px, 0.78fr) minmax(620px, 1.22fr);
        gap: 13px;
        align-items: stretch;
        height: calc(100vh - 356px);
        min-height: 500px;
      }

      .tm-left-panel,
      .tm-right-panel {
        min-height: 0;
        border-radius: 30px;
        border: 1px solid rgba(244, 241, 232, 0.13);
        background: rgba(244, 241, 232, 0.065);
        backdrop-filter: blur(18px);
        box-shadow: 0 22px 60px rgba(25, 31, 20, 0.18);
        overflow: hidden;
      }

      .tm-left-panel {
        display: flex;
        flex-direction: column;
      }

      .tm-right-panel {
        overflow-y: auto;
      }

      .tm-panel-head {
        padding: 18px 18px 10px;
      }

      .tm-panel-head h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 950;
        letter-spacing: -0.025em;
      }

      .tm-panel-head p {
        margin: 4px 0 0;
        color: rgba(244, 241, 232, 0.6);
        font-size: 12px;
      }

      .tm-tools {
        display: grid;
        grid-template-columns: 1fr 150px;
        gap: 9px;
        padding: 0 18px 12px;
      }

      .tm-search,
      .tm-select-wrap {
        position: relative;
      }

      .tm-search svg {
        position: absolute;
        left: 13px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(244, 241, 232, 0.48);
      }

      .tm-search input,
      .tm-select-wrap select {
        width: 100%;
        height: 44px;
        box-sizing: border-box;
        border-radius: 16px;
        border: 1px solid rgba(244, 241, 232, 0.12);
        background: rgba(47, 58, 37, 0.36);
        color: #f4f1e8;
        outline: none;
        padding: 0 13px;
        font-size: 12px;
      }

      .tm-search input {
        padding-left: 39px;
      }

      .tm-search input::placeholder {
        color: rgba(244, 241, 232, 0.42);
      }

      .tm-select-wrap select {
        appearance: none;
        padding-right: 38px;
        font-weight: 850;
      }

      .tm-select-wrap option {
        background: #465236;
        color: #f4f1e8;
      }

      .tm-select-wrap svg {
        position: absolute;
        right: 13px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: rgba(244, 241, 232, 0.62);
      }

      .tm-task-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 0 18px 18px;
        display: grid;
        align-content: start;
        gap: 10px;
      }

      .tm-task-card {
        width: 100%;
        border: 1px solid rgba(244, 241, 232, 0.11);
        background: rgba(47, 58, 37, 0.25);
        color: #f4f1e8;
        border-radius: 22px;
        padding: 14px;
        text-align: left;
        cursor: pointer;
        transition: 180ms ease;
      }

      .tm-task-card:hover {
        background: rgba(244, 241, 232, 0.09);
        transform: translateY(-1px);
      }

      .tm-task-card.active {
        background:
          linear-gradient(135deg, rgba(96, 130, 119, 0.36), rgba(48, 67, 47, 0.28));
        border-color: rgba(199, 221, 205, 0.3);
        box-shadow: inset 0 0 0 1px rgba(244, 241, 232, 0.05);
      }

      .tm-task-card.danger.active {
        background: linear-gradient(135deg, rgba(128, 66, 55, 0.4), rgba(96, 130, 119, 0.2));
      }

      .tm-task-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 11px;
      }

      .tm-task-card h3 {
        margin: 0;
        font-size: 17px;
        font-weight: 950;
        line-height: 1.12;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tm-task-card p {
        margin: 5px 0 0;
        color: rgba(244, 241, 232, 0.62);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tm-task-meta {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        margin-top: 11px;
      }

      .tm-task-meta span {
        border-radius: 999px;
        padding: 5px 8px;
        background: rgba(244, 241, 232, 0.07);
        border: 1px solid rgba(244, 241, 232, 0.09);
        color: rgba(244, 241, 232, 0.72);
        font-size: 10px;
        font-weight: 850;
      }

      /* =========================
         PILLS
      ========================= */

      .tm-status-pill,
      .tm-sla-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 999px;
        padding: 5px 8px;
        border: 1px solid rgba(244, 241, 232, 0.12);
        font-size: 10px;
        font-weight: 950;
        white-space: nowrap;
      }

      .tm-sla-pill.success,
      .tm-status-pill.completed {
        background: rgba(73, 132, 82, 0.32);
        color: #efffe8;
      }

      .tm-sla-pill.info,
      .tm-status-pill.scheduled {
        background: rgba(96, 130, 119, 0.34);
        color: #edf8f0;
      }

      .tm-sla-pill.warning,
      .tm-status-pill.progress {
        background: rgba(154, 122, 49, 0.34);
        color: #fff3cc;
      }

      .tm-sla-pill.danger {
        background: rgba(128, 66, 55, 0.4);
        color: #ffe7df;
      }

      .tm-sla-pill.muted,
      .tm-status-pill.cancelled {
        background: rgba(244, 241, 232, 0.08);
        color: rgba(244, 241, 232, 0.72);
      }

      /* =========================
         EXECUTION PANEL
      ========================= */

      .tm-execution {
        padding: 18px;
      }

      .tm-execution-hero {
        min-height: 158px;
        border-radius: 27px;
        background:
          radial-gradient(circle at 92% 0%, rgba(244, 241, 232, 0.11), transparent 14rem),
          rgba(47, 58, 37, 0.3);
        border: 1px solid rgba(244, 241, 232, 0.12);
        padding: 18px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 220px;
        gap: 16px;
        align-items: stretch;
      }

      .tm-detail-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 12px;
      }

      .tm-execution-hero h2 {
        margin: 0;
        font-size: clamp(28px, 3vw, 44px);
        line-height: 0.98;
        letter-spacing: -0.05em;
        font-weight: 950;
      }

      .tm-execution-hero p {
        max-width: 620px;
        margin: 11px 0 0;
        color: rgba(244, 241, 232, 0.68);
        font-size: 13px;
        line-height: 1.55;
      }

      .tm-sla-window {
        width: 100%;
        min-height: 118px;
        border-radius: 23px;
        padding: 16px;
        background: rgba(244, 241, 232, 0.08);
        border: 1px solid rgba(244, 241, 232, 0.12);
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .tm-sla-window span {
        display: block;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(244, 241, 232, 0.55);
      }

      .tm-sla-window strong {
        display: block;
        margin-top: 8px;
        font-size: 22px;
        line-height: 1.1;
        font-weight: 950;
      }

      .tm-sla-window.danger {
        background: rgba(128, 66, 55, 0.35);
      }

      .tm-sla-window.warning {
        background: rgba(154, 122, 49, 0.35);
      }

      .tm-sla-window.success {
        background: rgba(73, 132, 82, 0.35);
      }

      .tm-action-zone {
        margin: 12px 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .tm-big-action {
        min-height: 62px;
        border-radius: 21px;
        border: 1px solid rgba(244, 241, 232, 0.14);
        color: #f4f1e8;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        font-size: 14px;
        font-weight: 950;
        cursor: pointer;
        transition: 180ms ease;
      }

      .tm-big-action:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }

      .tm-big-action:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .tm-big-action.start {
        background: linear-gradient(135deg, rgba(154, 122, 49, 0.48), rgba(96, 130, 119, 0.34));
      }

      .tm-big-action.complete {
        background: linear-gradient(135deg, rgba(73, 132, 82, 0.5), rgba(25, 183, 165, 0.32));
      }

      .tm-locked-state {
        grid-column: 1 / -1;
        min-height: 66px;
        border-radius: 21px;
        border: 1px solid rgba(244, 241, 232, 0.12);
        background: rgba(244, 241, 232, 0.07);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
      }

      .tm-locked-state strong {
        display: block;
        font-size: 14px;
        font-weight: 950;
      }

      .tm-locked-state span {
        display: block;
        margin-top: 3px;
        color: rgba(244, 241, 232, 0.62);
        font-size: 12px;
      }

      /* =========================
         INFO CARDS
      ========================= */

      .tm-detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px;
      }

      .tm-info-panel {
        border-radius: 22px;
        border: 1px solid rgba(244, 241, 232, 0.12);
        background: rgba(244, 241, 232, 0.058);
        padding: 14px;
      }

      .tm-info-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 11px;
      }

      .tm-info-title h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 950;
      }

      .tm-info-body {
        display: grid;
        gap: 7px;
      }

      .tm-info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 37px;
        border-radius: 14px;
        background: rgba(47, 58, 37, 0.27);
        border: 1px solid rgba(244, 241, 232, 0.08);
        padding: 8px 10px;
      }

      .tm-info-row span {
        color: rgba(244, 241, 232, 0.55);
        font-size: 11px;
        font-weight: 850;
      }

      .tm-info-row strong {
        max-width: 62%;
        text-align: right;
        color: #f4f1e8;
        font-size: 11px;
        font-weight: 950;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tm-notes-grid {
        margin-top: 11px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px;
      }

      .tm-note-card {
        min-height: 104px;
        border-radius: 22px;
        border: 1px solid rgba(244, 241, 232, 0.12);
        background: rgba(244, 241, 232, 0.058);
        padding: 14px;
      }

      .tm-note-card span {
        display: block;
        color: rgba(244, 241, 232, 0.52);
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .tm-note-card p {
        margin: 8px 0 0;
        color: rgba(244, 241, 232, 0.8);
        font-size: 12px;
        line-height: 1.55;
      }

      /* =========================
         EMPTY / MODAL / LOADING
      ========================= */

      .tm-empty {
        min-height: 260px;
        display: grid;
        place-items: center;
        text-align: center;
        color: rgba(244, 241, 232, 0.72);
        padding: 28px;
      }

      .tm-empty h3 {
        margin: 11px 0 0;
        font-size: 17px;
        font-weight: 950;
      }

      .tm-empty p {
        margin: 6px 0 0;
        color: rgba(244, 241, 232, 0.55);
        font-size: 12px;
      }

      .tm-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(24, 30, 19, 0.72);
        backdrop-filter: blur(12px);
      }

      .tm-modal-card {
        width: min(680px, 100%);
        max-height: 92vh;
        overflow: hidden;
        border-radius: 28px;
        background: #465236;
        border: 1px solid rgba(244, 241, 232, 0.14);
        box-shadow: 0 30px 100px rgba(0, 0, 0, 0.38);
      }

      .tm-modal-head {
        padding: 18px;
        border-bottom: 1px solid rgba(244, 241, 232, 0.12);
        display: flex;
        justify-content: space-between;
        gap: 14px;
      }

      .tm-modal-head h2 {
        margin: 0;
        font-size: 21px;
        font-weight: 950;
      }

      .tm-modal-head p {
        margin: 5px 0 0;
        color: rgba(244, 241, 232, 0.62);
        font-size: 12px;
      }

      .tm-modal-head button {
        width: 40px;
        height: 40px;
        border-radius: 15px;
        border: 1px solid rgba(244, 241, 232, 0.12);
        background: rgba(244, 241, 232, 0.08);
        color: #f4f1e8;
        cursor: pointer;
      }

      .tm-modal-body {
        max-height: calc(92vh - 80px);
        overflow-y: auto;
        padding: 18px;
      }

      .tm-form {
        display: grid;
        gap: 14px;
      }

      .tm-preview-box {
        border-radius: 19px;
        background: rgba(244, 241, 232, 0.07);
        border: 1px solid rgba(244, 241, 232, 0.12);
        padding: 14px;
      }

      .tm-preview-box h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 950;
      }

      .tm-preview-box p {
        margin: 5px 0 0;
        color: rgba(244, 241, 232, 0.62);
        font-size: 12px;
      }

      .tm-field {
        display: grid;
        gap: 8px;
      }

      .tm-field span {
        color: rgba(244, 241, 232, 0.62);
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .tm-field textarea {
        width: 100%;
        box-sizing: border-box;
        border-radius: 17px;
        border: 1px solid rgba(244, 241, 232, 0.13);
        background: rgba(47, 58, 37, 0.36);
        color: #f4f1e8;
        outline: none;
        padding: 13px;
        font-size: 13px;
        resize: vertical;
      }

      .tm-field textarea::placeholder {
        color: rgba(244, 241, 232, 0.42);
      }

      .tm-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .tm-btn {
        border: 1px solid transparent;
        border-radius: 15px;
        padding: 11px 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 950;
        cursor: pointer;
        color: #f4f1e8;
        transition: 180ms ease;
        white-space: nowrap;
      }

      .tm-btn.ghost {
        background: rgba(244, 241, 232, 0.08);
        border-color: rgba(244, 241, 232, 0.13);
      }

      .tm-btn.success {
        background: rgba(73, 132, 82, 0.42);
        border-color: rgba(193, 231, 186, 0.22);
      }

      .tm-btn:disabled {
        opacity: 0.58;
        cursor: not-allowed;
      }

      .tm-loading-page {
        display: grid;
        place-items: center;
      }

      .tm-loading-card {
        border-radius: 24px;
        border: 1px solid rgba(244, 241, 232, 0.14);
        background: rgba(244, 241, 232, 0.08);
        padding: 22px 26px;
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .tm-loading-card h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 950;
      }

      .tm-loading-card p {
        margin: 4px 0 0;
        color: rgba(244, 241, 232, 0.62);
        font-size: 12px;
      }

      .tm-spin {
        animation: tmSpin 0.8s linear infinite;
      }

      @keyframes tmSpin {
        to {
          transform: rotate(360deg);
        }
      }

      /* =========================
         SCROLLBARS
      ========================= */

      .tm-task-list::-webkit-scrollbar,
      .tm-right-panel::-webkit-scrollbar,
      .tm-modal-body::-webkit-scrollbar {
        width: 8px;
      }

      .tm-task-list::-webkit-scrollbar-track,
      .tm-right-panel::-webkit-scrollbar-track,
      .tm-modal-body::-webkit-scrollbar-track {
        background: transparent;
      }

      .tm-task-list::-webkit-scrollbar-thumb,
      .tm-right-panel::-webkit-scrollbar-thumb,
      .tm-modal-body::-webkit-scrollbar-thumb {
        background: rgba(244, 241, 232, 0.22);
        border-radius: 999px;
      }

      .tm-task-list::-webkit-scrollbar-thumb:hover,
      .tm-right-panel::-webkit-scrollbar-thumb:hover,
      .tm-modal-body::-webkit-scrollbar-thumb:hover {
        background: rgba(244, 241, 232, 0.34);
      }

      /* =========================
         RESPONSIVE
      ========================= */

      @media (max-width: 1180px) {
        .tm-board {
          grid-template-columns: 1fr;
          height: auto;
          min-height: 0;
        }

        .tm-left-panel,
        .tm-right-panel {
          min-height: 520px;
        }

        .tm-left-panel {
          max-height: 620px;
        }
      }

      @media (max-width: 900px) {
        .tm-shell {
          width: min(100% - 24px, 1320px);
        }

        .tm-hero {
          flex-direction: column;
          align-items: stretch;
        }

        .tm-hero-left {
          align-items: flex-start;
        }

        .tm-hero-right {
          width: 100%;
        }

        .tm-refresh-btn,
        .tm-hero-stat {
          flex: 1;
        }

        .tm-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .tm-tools {
          grid-template-columns: 1fr;
        }

        .tm-execution-hero {
          grid-template-columns: 1fr;
        }

        .tm-action-zone,
        .tm-detail-grid,
        .tm-notes-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 560px) {
        .tm-shell {
          width: min(100% - 18px, 1320px);
          padding-top: 14px;
        }

        .tm-hero {
          padding: 18px;
          border-radius: 24px;
        }

        .tm-hero-left {
          gap: 12px;
        }

        .tm-back-btn {
          width: 44px;
          height: 44px;
          border-radius: 16px;
        }

        .tm-hero h1 {
          font-size: 38px;
        }

        .tm-summary-grid {
          grid-template-columns: 1fr;
        }

        .tm-left-panel,
        .tm-right-panel {
          border-radius: 24px;
          min-height: 480px;
        }

        .tm-execution {
          padding: 14px;
        }

        .tm-execution-hero h2 {
          font-size: 32px;
        }

        .tm-hero-right,
        .tm-modal-actions {
          flex-direction: column;
        }

        .tm-btn {
          width: 100%;
        }
      }
    `}</style>
  )
}

export default TechnicianMaintenance