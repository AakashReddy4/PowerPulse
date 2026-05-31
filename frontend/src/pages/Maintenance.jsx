import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import AppTopbar from "../components/AppTopbar"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ClipboardCheck,
  Loader2,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserRoundCheck,
  Wrench,
  X,
  XCircle,
} from "lucide-react"

import { API_BASE } from "../config"

const emptyForm = {
  asset: "",
  title: "",
  description: "",
  scheduledDate: "",
  priority: "medium",
  assignedTo: "",
  notes: "",
  slaHours: "",
}

const priorityDefaults = {
  low: 48,
  medium: 24,
  high: 12,
  critical: 6,
}

const statusTabs = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

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
  if (Array.isArray(payload?.users)) return payload.users
  if (Array.isArray(payload?.assets)) return payload.assets
  return []
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

function formatDateForInput(value) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (n) => String(n).padStart(2, "0")

  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
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

function titleCase(value) {
  if (!value) return "Not set"

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

function Maintenance() {
  const currentUser = getStoredUser()
  const token = getToken()

  const [records, setRecords] = useState([])
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])

  const [selectedId, setSelectedId] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const [form, setForm] = useState(emptyForm)
  const [completionNotes, setCompletionNotes] = useState("")

  const [searchParams] = useSearchParams()
  const maintenanceIdFromUrl = searchParams.get("id")

  const canCreate = String(currentUser?.role || "").toLowerCase() === "admin"
  const canDelete = String(currentUser?.role || "").toLowerCase() === "admin"

  const technicians = useMemo(() => {
    return users.filter((user) => String(user.role || "").toLowerCase() === "technician")
  }, [users])

  const selectedRecord = useMemo(() => {
    if (!records.length) return null
    return records.find((item) => item._id === selectedId) || records[0]
  }, [records, selectedId])

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase()

    return records.filter((item) => {
      const assetLabel = getAssetLabel(item.asset).toLowerCase()
      const assignedLabel = getPersonLabel(item.assignedTo, "").toLowerCase()

      const matchesSearch =
        !search ||
        String(item.title || "").toLowerCase().includes(search) ||
        String(item.description || "").toLowerCase().includes(search) ||
        assetLabel.includes(search) ||
        assignedLabel.includes(search)

      const matchesStatus =
        statusFilter === "all" || String(item.status || "").toLowerCase() === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [records, query, statusFilter])

  const summary = useMemo(() => buildSummary(records), [records])

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

  const loadAll = useCallback(async () => {
    if (!token) {
      setError("Login token missing. Please login again.")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")

      const [maintenancePayload, assetsPayload, usersPayload] = await Promise.allSettled([
        fetchWithAuth(`${API_BASE}/api/maintenance`),
        fetchWithAuth(`${API_BASE}/api/assets`),
        fetchWithAuth(`${API_BASE}/api/users`),
      ])

if (maintenancePayload.status === "fulfilled") {
  const list = normalizeArray(maintenancePayload.value)

  setRecords(list)

  if (maintenanceIdFromUrl) {

    const matchedMaintenance = list.find(
      (item) => item._id === maintenanceIdFromUrl
    )

    if (matchedMaintenance) {
      setSelectedId(matchedMaintenance._id)
    } else {
      setSelectedId(list[0]?._id || "")
    }

  } else {

    setSelectedId((prev) => {
      if (prev && list.some((item) => item._id === prev)) return prev
      return list[0]?._id || ""
    })

  }
} else {
        throw maintenancePayload.reason
      }

      if (assetsPayload.status === "fulfilled") {
        setAssets(normalizeArray(assetsPayload.value))
      }

      if (usersPayload.status === "fulfilled") {
        setUsers(normalizeArray(usersPayload.value))
      }
    } catch (err) {
      setError(err.message || "Failed to load maintenance data")
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth, token, maintenanceIdFromUrl])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(""), 2500)
    return () => clearTimeout(timer)
  }, [success])

  const updateRecordInState = (updated) => {
    if (!updated?._id) return

    setRecords((prev) => {
      const exists = prev.some((item) => item._id === updated._id)
      if (!exists) return [updated, ...prev]
      return prev.map((item) => (item._id === updated._id ? updated : item))
    })

    setSelectedId(updated._id)
  }

  const handleCreate = async (event) => {
    event.preventDefault()

    if (!form.asset || !form.title.trim() || !form.scheduledDate) {
      setError("Asset, title and scheduled date are required.")
      return
    }

    try {
      setActionLoading("create")
      setError("")

      const payload = {
        asset: form.asset,
        title: form.title.trim(),
        description: form.description.trim(),
        scheduledDate: new Date(form.scheduledDate).toISOString(),
        priority: form.priority,
        assignedTo: form.assignedTo || null,
        notes: form.notes.trim(),
      }

      if (form.slaHours) {
        payload.slaHours = Number(form.slaHours)
      }

      const created = await fetchWithAuth(`${API_BASE}/api/maintenance`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      updateRecordInState(created)
      setCreateOpen(false)
      setForm(emptyForm)
      setSuccess("Maintenance scheduled successfully.")
      await loadAll()
    } catch (err) {
      setError(err.message || "Failed to create maintenance task")
    } finally {
      setActionLoading("")
    }
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
      setSuccess("Maintenance started.")
      await loadAll()
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
          }),
        }
      )

      updateRecordInState(updated)
      setCompleteOpen(false)
      setCompletionNotes("")
      setSuccess("Maintenance completed.")
      await loadAll()
    } catch (err) {
      setError(err.message || "Failed to complete maintenance")
    } finally {
      setActionLoading("")
    }
  }

  const handleCancel = async () => {
    if (!selectedRecord?._id) return

    try {
      setActionLoading("cancel")
      setError("")

      const updated = await fetchWithAuth(`${API_BASE}/api/maintenance/${selectedRecord._id}/cancel`, {
        method: "PUT",
        body: JSON.stringify({}),
      })

      updateRecordInState(updated)
      setCancelOpen(false)
      setSuccess("Maintenance cancelled.")
      await loadAll()
    } catch (err) {
      setError(err.message || "Failed to cancel maintenance")
    } finally {
      setActionLoading("")
    }
  }

  const handleDelete = async () => {
    if (!selectedRecord?._id) return

    try {
      setActionLoading("delete")
      setError("")

      await fetchWithAuth(`${API_BASE}/api/maintenance/${selectedRecord._id}`, {
        method: "DELETE",
      })

      setRecords((prev) => {
        const next = prev.filter((item) => item._id !== selectedRecord._id)
        setSelectedId(next[0]?._id || "")
        return next
      })

      setDeleteOpen(false)
      setSuccess("Maintenance record deleted.")
      await loadAll()
    } catch (err) {
      setError(err.message || "Failed to delete maintenance")
    } finally {
      setActionLoading("")
    }
  }

  if (loading) {
    return (
      <>
        <MaintenanceStyles />
        <div className="maintenance-page loading-page">
          <div className="loading-card">
            <Loader2 className="spin" size={22} />
            <div>
              <h3>Loading Maintenance</h3>
              <p>Preparing SLA and asset service records...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  

  return (
    <>
      <MaintenanceStyles />

      <div className="maintenance-page">
        <AppTopbar />
        <main className="maintenance-shell">
          <section className="maintenance-hero">
            <div className="hero-left">
              <div className="hero-icon">
                <Wrench size={30} />
              </div>

              <div>
                <span className="hero-chip">PowerPulse Maintenance</span>
                <h1>Maintenance Control</h1>
                <p>
                  Schedule service work, track SLA deadlines, and keep every asset ready
                  before faults turn into downtime.
                </p>
              </div>
            </div>

            <div className="hero-actions">
              <button type="button" onClick={loadAll} className="btn ghost">
                <RefreshCcw size={16} />
                Refresh
              </button>

              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...emptyForm,
                      scheduledDate: formatDateForInput(new Date()),
                    })
                    setCreateOpen(true)
                  }}
                  className="btn primary"
                >
                  <Plus size={16} />
                  Schedule Work
                </button>
              )}
            </div>
          </section>

          {(error || success) && (
            <section className="message-area">
              {error && (
                <div className="alert error">
                  <AlertTriangle size={17} />
                  <span>{error}</span>
                  <button type="button" onClick={() => setError("")}>
                    <X size={15} />
                  </button>
                </div>
              )}

              {success && (
                <div className="alert success">
                  <CheckCircle2 size={17} />
                  <span>{success}</span>
                </div>
              )}
            </section>
          )}

          <section className="summary-strip">
            <SummaryItem label="Scheduled" value={summary.scheduled} icon={CalendarClock} />
            <SummaryItem label="Active" value={summary.active} icon={PlayCircle} />
            <SummaryItem label="SLA Breached" value={summary.breached} icon={ShieldAlert} danger />
            <SummaryItem label="Completed" value={summary.completed} icon={CheckCircle2} />
          </section>

          <section className="maintenance-layout">
            <aside className="queue-section">
              <div className="section-head">
                <div>
                  <h2>Service Queue</h2>
                  <p>{filteredRecords.length} of {records.length} records</p>
                </div>
              </div>

              <div className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search asset, task, technician..."
                />
              </div>

              <div className="tab-row">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={statusFilter === tab.value ? "active" : ""}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="queue-list">
                {filteredRecords.length === 0 ? (
                  <EmptyState
                    title="No maintenance found"
                    description="Create a task or change filters."
                  />
                ) : (
                  filteredRecords.map((record) => {
                    const active = selectedRecord?._id === record._id
                    const sla = getSlaMeta(record)
                    const status = getStatusMeta(record.status)
                    const SlaIcon = sla.icon

                    return (
                      <button
                        key={record._id}
                        type="button"
                        onClick={() => setSelectedId(record._id)}
                        className={`queue-card ${active ? "active" : ""}`}
                      >
                        <div className={`status-dot ${status.className}`} />

                        <div className="queue-main">
                          <div className="queue-title-row">
                            <h3>{record.title || "Untitled task"}</h3>
                            <span className={`sla-badge ${sla.className}`}>
                              <SlaIcon size={13} />
                              {sla.label}
                            </span>
                          </div>

                          <p>{getAssetLabel(record.asset)}</p>

                          <div className="queue-meta">
                            <span>{formatDateShort(record.scheduledDate)}</span>
                            <span>{titleCase(record.priority)} priority</span>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </aside>

            <section className="details-section">
              {selectedRecord ? (
                <MaintenanceDetails
                  record={selectedRecord}
                  canDelete={canDelete}
                  actionLoading={actionLoading}
                  onOpenCancel={() => setCancelOpen(true)}
                  onOpenDelete={() => setDeleteOpen(true)}
                />
              ) : (
                <EmptyState
                  title="Select a maintenance task"
                  description="Task details and SLA actions will appear here."
                />
              )}
            </section>
          </section>
        </main>

        {createOpen && (
          <Modal
            title="Schedule Maintenance"
            subtitle="Create a preventive service task with SLA tracking."
            onClose={() => setCreateOpen(false)}
          >
            <form onSubmit={handleCreate} className="form">
              <div className="form-grid two">
                <Field label="Asset" required>
                  <div className="select-wrap">
                    <select
                      value={form.asset}
                      onChange={(e) => setForm((prev) => ({ ...prev, asset: e.target.value }))}
                    >
                      <option value="">Select asset</option>
                      {assets.map((asset) => (
                        <option key={asset._id} value={asset._id}>
                          {asset.name} {asset.assetId ? `· ${asset.assetId}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </Field>

                <Field label="Technician">
                  <div className="select-wrap">
                    <select
                      value={form.assignedTo}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, assignedTo: e.target.value }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {technicians.map((tech) => (
                        <option key={tech._id} value={tech._id}>
                          {tech.name || tech.email}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </Field>
              </div>

              <Field label="Title" required>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Transformer oil inspection"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe what should be checked..."
                  rows={3}
                />
              </Field>

              <div className="form-grid three">
                <Field label="Scheduled Date" required>
                  <input
                    type="datetime-local"
                    value={form.scheduledDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, scheduledDate: e.target.value }))
                    }
                  />
                </Field>

                <Field label="Priority">
                  <div className="select-wrap">
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, priority: e.target.value }))
                      }
                    >
                      <option value="low">Low · 48h SLA</option>
                      <option value="medium">Medium · 24h SLA</option>
                      <option value="high">High · 12h SLA</option>
                      <option value="critical">Critical · 6h SLA</option>
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </Field>

                <Field label="Custom SLA Hours">
                  <input
                    type="number"
                    min="1"
                    value={form.slaHours}
                    onChange={(e) => setForm((prev) => ({ ...prev, slaHours: e.target.value }))}
                    placeholder={priorityDefaults[form.priority]}
                  />
                </Field>
              </div>

              <Field label="Planning Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Checklist, safety notes, readings to verify..."
                  rows={3}
                />
              </Field>

              <div className="sla-note">
                SLA deadline will be calculated from scheduled date + SLA hours.
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn ghost">
                  Cancel
                </button>

                <button type="submit" disabled={actionLoading === "create"} className="btn primary">
                  {actionLoading === "create" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                  Create
                </button>
              </div>
            </form>
          </Modal>
        )}

        {completeOpen && selectedRecord && (
          <Modal
            title="Complete Maintenance"
            subtitle="Close the task and update the asset maintenance cycle."
            onClose={() => setCompleteOpen(false)}
          >
            <form onSubmit={handleComplete} className="form">
              <div className="preview-box">
                <h3>{selectedRecord.title}</h3>
                <p>{getAssetLabel(selectedRecord.asset)}</p>
              </div>

              <Field label="Completion Notes">
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="What was completed or verified?"
                  rows={5}
                />
              </Field>

              <div className="modal-actions">
                <button type="button" onClick={() => setCompleteOpen(false)} className="btn ghost">
                  Cancel
                </button>

                <button type="submit" disabled={actionLoading === "complete"} className="btn success">
                  {actionLoading === "complete" ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                  Complete
                </button>
              </div>
            </form>
          </Modal>
        )}

        {cancelOpen && selectedRecord && (
          <ConfirmModal
            title="Cancel Maintenance?"
            description={`This will cancel "${selectedRecord.title}".`}
            actionLabel="Cancel Task"
            actionClass="warning"
            loading={actionLoading === "cancel"}
            onClose={() => setCancelOpen(false)}
            onConfirm={handleCancel}
          />
        )}

        {deleteOpen && selectedRecord && (
          <ConfirmModal
            title="Delete Maintenance?"
            description={`This permanently removes "${selectedRecord.title}".`}
            actionLabel="Delete"
            actionClass="danger"
            loading={actionLoading === "delete"}
            onClose={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </>
  )
}

function SummaryItem({ label, value, icon: Icon, danger }) {
  return (
    <div className={`summary-item ${danger ? "danger" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="summary-icon">
        <Icon size={19} />
      </div>
    </div>
  )
}

function MaintenanceDetails({
  record,
  canDelete,
  actionLoading,
  onOpenCancel,
  onOpenDelete,
}) {
  const sla = getSlaMeta(record)
  const status = getStatusMeta(record.status)
  const SlaIcon = sla.icon
  const StatusIcon = status.icon
  const canCancel = record.status !== "completed" && record.status !== "cancelled"

  return (
    <div className="details-content">
      <div className="details-header">
        <div>
          <div className="detail-badges">
            <span className={`status-badge ${status.className}`}>
              <StatusIcon size={14} />
              {status.label}
            </span>

            <span className={`sla-badge ${sla.className}`}>
              <SlaIcon size={14} />
              {sla.label}
            </span>
          </div>

          <h2>{record.title || "Untitled maintenance"}</h2>
          <p>{record.description || "No description provided."}</p>
        </div>

        <div className={`sla-card ${sla.className}`}>
          <span>SLA Status</span>
          <strong>{sla.detail}</strong>
        </div>
      </div>

      <div className="action-row">

{canCancel && (
  <button type="button" onClick={onOpenCancel} className="btn warning">
    <XCircle size={16} />
    Cancel
  </button>
)}

        {canDelete && (
          <button type="button" onClick={onOpenDelete} className="btn danger">
            <Trash2 size={16} />
            Delete
          </button>
        )}


      </div>

      <div className="details-grid">
        <InfoPanel title="Asset" icon={Wrench}>
          <InfoRow label="Name" value={getAssetLabel(record.asset)} />
          <InfoRow
            label="Category"
            value={typeof record.asset === "object" ? titleCase(record.asset?.category) : "Not available"}
          />
          <InfoRow
            label="Location"
            value={typeof record.asset === "object" ? record.asset?.location || "Not set" : "Not available"}
          />
          <InfoRow
            label="Status"
            value={typeof record.asset === "object" ? record.asset?.status || "Not set" : "Not available"}
          />
        </InfoPanel>

        <InfoPanel title="Assignment" icon={UserRoundCheck}>
          <InfoRow label="Technician" value={getPersonLabel(record.assignedTo)} />
          <InfoRow label="Created By" value={getPersonLabel(record.createdBy, "Admin")} />
          <InfoRow label="Priority" value={titleCase(record.priority)} />
          <InfoRow label="SLA Hours" value={`${record.slaHours || priorityDefaults[record.priority] || 24} hours`} />
        </InfoPanel>

        <InfoPanel title="Timeline" icon={CalendarClock}>
          <InfoRow label="Scheduled" value={formatDateTime(record.scheduledDate)} />
          <InfoRow label="Deadline" value={formatDateTime(record.deadline)} />
          <InfoRow label="Started" value={formatDateTime(record.startedAt)} />
          <InfoRow label="Completed" value={formatDateTime(record.completedDate)} />
        </InfoPanel>

        <InfoPanel title="Notes" icon={ClipboardCheck}>
          <div className="note-block">
            <span>Planning</span>
            <p>{record.notes || "No planning notes added."}</p>
          </div>

          <div className="note-block">
            <span>Completion</span>
            <p>{record.completionNotes || "Not completed yet."}</p>
          </div>
        </InfoPanel>
      </div>
    </div>
  )
}

function InfoPanel({ title, icon: Icon, children }) {
  return (
    <div className="info-panel">
      <div className="info-title">
        <Icon size={16} />
        <h3>{title}</h3>
      </div>
      <div className="info-body">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <ClipboardCheck size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="field">
      <span>
        {label} {required && <b>*</b>}
      </span>
      {children}
    </label>
  )
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  description,
  actionLabel,
  actionClass,
  loading,
  onClose,
  onConfirm,
}) {
  return (
    <Modal title={title} subtitle={description} onClose={onClose}>
      <div className="modal-actions">
        <button type="button" onClick={onClose} className="btn ghost">
          Keep
        </button>

        <button type="button" onClick={onConfirm} disabled={loading} className={`btn ${actionClass}`}>
          {loading ? <Loader2 className="spin" size={16} /> : <AlertTriangle size={16} />}
          {actionLabel}
        </button>
      </div>
    </Modal>
  )
}

function MaintenanceStyles() {
  return (
    <style>{`
      .maintenance-page {
        min-height: 100vh;
        background:
          radial-gradient(circle at 18% 10%, rgba(140, 158, 104, 0.35), transparent 28rem),
          radial-gradient(circle at 90% 15%, rgba(103, 122, 74, 0.28), transparent 30rem),
          linear-gradient(135deg, #56633f 0%, #465236 42%, #38452e 100%);
        color: #f3f1e7;
        font-family: inherit;
        overflow-x: hidden;
      }

      .maintenance-shell {
        width: min(1320px, calc(100% - 44px));
        margin: 0 auto;
        padding: 22px 0;
      }

      .maintenance-hero {
        min-height: 132px;
        border-radius: 30px;
        box-shadow: 0 24px 70px rgba(25, 31, 20, 0.22);
        backdrop-filter: blur(18px);
        padding: 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 22px;
        margin-bottom: 14px;
      }

      .hero-left {
        display: flex;
        align-items: center;
        gap: 18px;
        min-width: 0;
      }

      .hero-icon {
        width: 64px;
        height: 64px;
        border-radius: 22px;
        display: grid;
        place-items: center;
        background: rgba(96, 130, 119, 0.38);
        border: 1px solid rgba(199, 221, 205, 0.18);
        color: #eef7e8;
        flex: 0 0 auto;
      }

      .hero-chip {
        display: inline-flex;
        width: fit-content;
        border-radius: 999px;
        padding: 7px 12px;
        background: rgba(243, 241, 231, 0.1);
        border: 1px solid rgba(243, 241, 231, 0.13);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(243, 241, 231, 0.8);
        margin-bottom: 9px;
      }

      .maintenance-hero h1 {
        margin: 0;
        font-size: clamp(34px, 4vw, 56px);
        line-height: 0.96;
        letter-spacing: -0.055em;
        font-weight: 950;
      }

      .maintenance-hero p {
        max-width: 720px;
        margin: 10px 0 0;
        color: rgba(243, 241, 231, 0.68);
        font-size: 14px;
        line-height: 1.65;
      }

      .hero-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 0 0 auto;
      }

      .btn {
        border: 1px solid transparent;
        border-radius: 16px;
        padding: 12px 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        color: #f3f1e7;
        transition: 180ms ease;
        white-space: nowrap;
        margin-bottom:15px;
      }

      .btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .btn.primary {
        background: linear-gradient(135deg, #2d7f79, #19b7a5);
        border-color: rgba(197, 255, 239, 0.22);
        box-shadow: 0 16px 32px rgba(13, 122, 113, 0.22);
      }

      .btn.primary:hover {
        transform: translateY(-1px);
      }

      .btn.ghost {
        background: rgba(243, 241, 231, 0.08);
        border-color: rgba(243, 241, 231, 0.13);
      }

      .btn.ghost:hover {
        background: rgba(243, 241, 231, 0.13);
      }

      .btn.success {
        background: rgba(73, 132, 82, 0.42);
        border-color: rgba(193, 231, 186, 0.22);
      }

      .btn.warning {
        background: rgba(154, 122, 49, 0.42);
        border-color: rgba(255, 226, 150, 0.22);
      }

      .btn.danger {
        background: rgba(128, 66, 55, 0.48);
        border-color: rgba(255, 180, 165, 0.22);
      }

      .message-area {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
      }

      .alert {
        border-radius: 18px;
        padding: 13px 15px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 800;
        border: 1px solid transparent;
      }

      .alert button {
        margin-left: auto;
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
      }

      .alert.error {
        background: rgba(111, 54, 48, 0.42);
        border-color: rgba(255, 180, 165, 0.2);
        color: #ffe7df;
      }

      .alert.success {
        background: rgba(61, 112, 70, 0.42);
        border-color: rgba(193, 231, 186, 0.2);
        color: #efffe8;
      }

      .summary-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }

      .summary-item {
        min-height: 92px;
        border-radius: 24px;
        border: 1px solid rgba(243, 241, 231, 0.12);
        background: rgba(243, 241, 231, 0.07);
        backdrop-filter: blur(16px);
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .summary-item.danger {
        background: rgba(112, 55, 48, 0.25);
      }

      .summary-item span {
        display: block;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: rgba(243, 241, 231, 0.58);
      }

      .summary-item strong {
        display: block;
        margin-top: 6px;
        font-size: 32px;
        line-height: 1;
        font-weight: 950;
      }

      .summary-icon {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(243, 241, 231, 0.08);
        border: 1px solid rgba(243, 241, 231, 0.12);
      }

      .maintenance-layout {
        display: grid;
        grid-template-columns: minmax(410px, 0.82fr) minmax(620px, 1.18fr);
        gap: 14px;
        align-items: stretch;
      }

      .queue-section,
      .details-section {
        height: calc(100vh - 292px);
        min-height: 610px;
        border-radius: 30px;
        border: 1px solid rgba(243, 241, 231, 0.13);
        background: rgba(243, 241, 231, 0.07);
        backdrop-filter: blur(18px);
        box-shadow: 0 24px 70px rgba(25, 31, 20, 0.2);
        overflow: hidden;
      }

      .queue-section {
        display: flex;
        flex-direction: column;
      }

      .section-head {
        padding: 18px 18px 12px;
      }

      .section-head h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 950;
        letter-spacing: -0.02em;
      }

      .section-head p {
        margin: 4px 0 0;
        color: rgba(243, 241, 231, 0.6);
        font-size: 12px;
      }

      .search-box {
        margin: 0 18px 12px;
        position: relative;
      }

      .search-box svg {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(243, 241, 231, 0.48);
      }

      .search-box input {
        width: 86%;
        border-radius: 18px;
        border: 1px solid rgba(243, 241, 231, 0.12);
        background: rgba(47, 58, 37, 0.36);
        color: #f3f1e7;
        outline: none;
        padding: 13px 14px 13px 42px;
        font-size: 13px;
      }

      .search-box input::placeholder {
        color: rgba(243, 241, 231, 0.42);
      }

      .tab-row {
        display: flex;
        gap: 8px;
        padding: 0 18px 14px;
        overflow-x: auto;
      }

      .tab-row button {
        border: 1px solid rgba(243, 241, 231, 0.12);
        background: rgba(243, 241, 231, 0.07);
        color: rgba(243, 241, 231, 0.75);
        border-radius: 999px;
        padding: 9px 12px;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        white-space: nowrap;
      }

      .tab-row button.active {
        background: rgba(96, 130, 119, 0.42);
        border-color: rgba(199, 221, 205, 0.22);
        color: #fff;
      }

      .queue-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 0 18px 18px;
        display: grid;
        align-content: start;
        gap: 10px;
      }

      .queue-list::-webkit-scrollbar,
      .details-section::-webkit-scrollbar,
      .modal-body::-webkit-scrollbar {
        width: 8px;
      }

      .queue-list::-webkit-scrollbar-thumb,
      .details-section::-webkit-scrollbar-thumb,
      .modal-body::-webkit-scrollbar-thumb {
        background: rgba(243, 241, 231, 0.22);
        border-radius: 999px;
      }

      .queue-card {
        position: relative;
        width: 100%;
        border: 1px solid rgba(243, 241, 231, 0.11);
        background: rgba(47, 58, 37, 0.28);
        color: #f3f1e7;
        border-radius: 22px;
        padding: 15px 15px 15px 17px;
        text-align: left;
        cursor: pointer;
        display: flex;
        gap: 13px;
        transition: 180ms ease;
      }

      .queue-card:hover {
        background: rgba(243, 241, 231, 0.09);
      }

      .queue-card.active {
        background: rgba(96, 130, 119, 0.38);
        border-color: rgba(199, 221, 205, 0.28);
        box-shadow: inset 0 0 0 1px rgba(243, 241, 231, 0.05);
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        margin-top: 7px;
        flex: 0 0 auto;
        background: rgba(243, 241, 231, 0.4);
      }

      .status-dot.scheduled {
        background: #b9d8ff;
      }

      .status-dot.progress {
        background: #f6d27a;
      }

      .status-dot.completed {
        background: #b9e7a7;
      }

      .status-dot.cancelled {
        background: #c8c4b8;
      }

      .queue-main {
        min-width: 0;
        flex: 1;
      }

      .queue-title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .queue-title-row h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 950;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .queue-main p {
        margin: 5px 0 0;
        color: rgba(243, 241, 231, 0.62);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .queue-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 11px;
      }

      .queue-meta span {
        border-radius: 999px;
        padding: 6px 9px;
        background: rgba(243, 241, 231, 0.07);
        border: 1px solid rgba(243, 241, 231, 0.09);
        color: rgba(243, 241, 231, 0.72);
        font-size: 11px;
        font-weight: 800;
      }

      .sla-badge,
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 999px;
        padding: 6px 9px;
        border: 1px solid rgba(243, 241, 231, 0.12);
        font-size: 11px;
        font-weight: 900;
        white-space: nowrap;
      }

      .sla-badge.success,
      .status-badge.completed {
        background: rgba(73, 132, 82, 0.32);
        color: #efffe8;
      }

      .sla-badge.info,
      .status-badge.scheduled {
        background: rgba(96, 130, 119, 0.34);
        color: #edf8f0;
      }

      .sla-badge.warning,
      .status-badge.progress {
        background: rgba(154, 122, 49, 0.34);
        color: #fff3cc;
      }

      .sla-badge.danger {
        background: rgba(128, 66, 55, 0.4);
        color: #ffe7df;
      }

      .sla-badge.muted,
      .status-badge.cancelled {
        background: rgba(243, 241, 231, 0.08);
        color: rgba(243, 241, 231, 0.72);
      }

      .details-section {
        overflow-y: auto;
      }

      .details-content {
        padding: 22px;
      }

      .details-header {
        min-height: 210px;
        border-radius: 28px;
        background:
          radial-gradient(circle at 90% 0%, rgba(243, 241, 231, 0.12), transparent 16rem),
          rgba(47, 58, 37, 0.32);
        border: 1px solid rgba(243, 241, 231, 0.12);
        padding: 22px;
        display: flex;
        justify-content: space-between;
        gap: 20px;
      }

      .detail-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }

      .details-header h2 {
        margin: 0;
        font-size: clamp(30px, 3.6vw, 52px);
        line-height: 0.98;
        letter-spacing: -0.055em;
        font-weight: 950;
      }

      .details-header p {
        max-width: 620px;
        margin: 14px 0 0;
        color: rgba(243, 241, 231, 0.68);
        font-size: 14px;
        line-height: 1.65;
      }

      .sla-card {
        width: 210px;
        min-height: 120px;
        border-radius: 24px;
        padding: 17px;
        flex: 0 0 auto;
        background: rgba(243, 241, 231, 0.08);
        border: 1px solid rgba(243, 241, 231, 0.12);
        align-self: flex-start;
      }

      .sla-card span {
        display: block;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(243, 241, 231, 0.55);
      }

      .sla-card strong {
        display: block;
        margin-top: 10px;
        font-size: 22px;
        line-height: 1.1;
        font-weight: 950;
      }

      .sla-card.danger {
        background: rgba(128, 66, 55, 0.35);
      }

      .sla-card.warning {
        background: rgba(154, 122, 49, 0.35);
      }

      .sla-card.success {
        background: rgba(73, 132, 82, 0.35);
      }

      .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 14px 0;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .info-panel {
        border-radius: 24px;
        border: 1px solid rgba(243, 241, 231, 0.12);
        background: rgba(243, 241, 231, 0.065);
        padding: 16px;
      }

      .info-title {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 14px;
      }

      .info-title h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 950;
      }

      .info-body {
        display: grid;
        gap: 8px;
      }

      .info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-radius: 15px;
        background: rgba(47, 58, 37, 0.28);
        border: 1px solid rgba(243, 241, 231, 0.08);
        padding: 11px 12px;
      }

      .info-row span {
        color: rgba(243, 241, 231, 0.55);
        font-size: 12px;
        font-weight: 800;
      }

      .info-row strong {
        max-width: 62%;
        text-align: right;
        color: #f3f1e7;
        font-size: 12px;
        font-weight: 950;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .note-block {
        border-radius: 15px;
        background: rgba(47, 58, 37, 0.28);
        border: 1px solid rgba(243, 241, 231, 0.08);
        padding: 12px;
      }

      .note-block span {
        display: block;
        color: rgba(243, 241, 231, 0.52);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .note-block p {
        margin: 8px 0 0;
        color: rgba(243, 241, 231, 0.8);
        font-size: 13px;
        line-height: 1.55;
      }

      .empty-state {
        min-height: 300px;
        display: grid;
        place-items: center;
        text-align: center;
        color: rgba(243, 241, 231, 0.72);
        padding: 30px;
      }

      .empty-state h3 {
        margin: 12px 0 0;
        font-size: 18px;
        font-weight: 950;
      }

      .empty-state p {
        margin: 7px 0 0;
        color: rgba(243, 241, 231, 0.55);
        font-size: 13px;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(24, 30, 19, 0.72);
        backdrop-filter: blur(12px);
      }

      .modal-card {
        width: min(760px, 100%);
        max-height: 92vh;
        overflow: hidden;
        border-radius: 30px;
        background: #465236;
        border: 1px solid rgba(243, 241, 231, 0.14);
        box-shadow: 0 30px 100px rgba(0, 0, 0, 0.38);
      }

      .modal-head {
        padding: 20px;
        border-bottom: 1px solid rgba(243, 241, 231, 0.12);
        display: flex;
        justify-content: space-between;
        gap: 14px;
      }

      .modal-head h2 {
        margin: 0;
        font-size: 23px;
        font-weight: 950;
      }

      .modal-head p {
        margin: 5px 0 0;
        color: rgba(243, 241, 231, 0.62);
        font-size: 13px;
      }

      .modal-head button {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        border: 1px solid rgba(243, 241, 231, 0.12);
        background: rgba(243, 241, 231, 0.08);
        color: #f3f1e7;
        cursor: pointer;
      }

      .modal-body {
        max-height: calc(92vh - 86px);
        overflow-y: auto;
        padding: 20px;
      }

      .form {
        display: grid;
        gap: 15px;
      }

      .form-grid {
        display: grid;
        gap: 15px;
      }

      .form-grid.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .form-grid.three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .field {
        display: grid;
        gap: 8px;
      }

      .field > span {
        color: rgba(243, 241, 231, 0.62);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .field b {
        color: #ffe7df;
      }

      .field input,
      .field textarea,
      .select-wrap select {
        width: 96%;
        border-radius: 16px;
        border: 1px solid rgba(243, 241, 231, 0.13);
        background: rgba(47, 58, 37, 0.36);
        color: #f3f1e7;
        outline: none;
        padding: 13px 14px;
        font-size: 14px;
      }

      .field textarea {
        resize: vertical;
      }

      .field input::placeholder,
      .field textarea::placeholder {
        color: rgba(243, 241, 231, 0.42);
      }

      .select-wrap {
        position: relative;
        width:100%;
        margin:15px;
      }

      .select-wrap select {
        appearance: none;
        padding-right: 42px;
      }

      .select-wrap option {
        background: #465236;
        color: #f3f1e7;
      }

      .select-wrap svg {
        position: absolute;
        right: 13px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: rgba(243, 241, 231, 0.62);
      }

      .sla-note {
        border-radius: 18px;
        background: rgba(96, 130, 119, 0.28);
        border: 1px solid rgba(199, 221, 205, 0.15);
        padding: 13px 15px;
        color: rgba(243, 241, 231, 0.75);
        font-size: 13px;
        font-weight: 800;
      }

      .preview-box {
        border-radius: 20px;
        background: rgba(243, 241, 231, 0.07);
        border: 1px solid rgba(243, 241, 231, 0.12);
        padding: 15px;
      }

      .preview-box h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 950;
      }

      .preview-box p {
        margin: 5px 0 0;
        color: rgba(243, 241, 231, 0.62);
        font-size: 13px;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .loading-page {
        display: grid;
        place-items: center;
      }

      .loading-card {
        border-radius: 26px;
        border: 1px solid rgba(243, 241, 231, 0.14);
        background: rgba(243, 241, 231, 0.08);
        padding: 24px 28px;
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .loading-card h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 950;
      }

      .loading-card p {
        margin: 4px 0 0;
        color: rgba(243, 241, 231, 0.62);
        font-size: 13px;
      }

      .spin {
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1180px) {
        .maintenance-layout {
          grid-template-columns: 1fr;
        }

        .queue-section,
        .details-section {
          height: auto;
          min-height: 560px;
        }

        .details-section {
          max-height: none;
        }
      }

      @media (max-width: 860px) {
        .maintenance-shell {
          width: min(100% - 22px, 1320px);
        }

        .maintenance-hero {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-left {
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-actions {
          width: 100%;
        }

        .hero-actions .btn {
          flex: 1;
        }

        .summary-strip {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .details-header {
          flex-direction: column;
        }

        .sla-card {
          width: 100%;
        }

        .details-grid {
          grid-template-columns: 1fr;
        }

        .form-grid.two,
        .form-grid.three {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 520px) {
        .summary-strip {
          grid-template-columns: 1fr;
        }

        .action-row .btn,
        .modal-actions .btn {
          flex: 1;
        }

        .modal-actions {
          flex-direction: column-reverse;
        }
      }
    `}</style>
  )
}

export default Maintenance