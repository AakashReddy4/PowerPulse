import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import AppTopbar from "../components/AppTopbar"
closed
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Trophy,
  User2,
  Users,
  Wrench,
  Zap,
  X,
  BarChart3,
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
    console.error(err)
    return null
  }
}

async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No token")
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
    localStorage.removeItem("user")

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
  if (!dateString) return "Unknown"

  const now = new Date()
  const date = new Date(dateString)

  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return "just now"

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `${minutes} mins ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours} hrs ago`

  const days = Math.floor(hours / 24)

  if (days < 30) return `${days} days ago`

  return date.toLocaleDateString()
}

function Profile() {
  const localUserRaw = localStorage.getItem("user")
  const localUser = localUserRaw ? JSON.parse(localUserRaw) : {}

  const [user, setUser] = useState(localUser)

  const [tickets, setTickets] = useState([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [showPasswordModal, setShowPasswordModal] =
    useState(false)

  const [showComingSoon, setShowComingSoon] =
    useState("")

  const [savingProfile, setSavingProfile] =
    useState(false)

  const [changingPassword, setChangingPassword] =
    useState(false)

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false)

  const [showNewPassword, setShowNewPassword] =
    useState(false)

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const openComingSoon = (feature) => {
    setShowComingSoon(feature)
  }

  const closeComingSoon = () => {
    setShowComingSoon("")
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError("")

      const [profileRes, ticketRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/users/me`),
        fetchWithAuth(`${API_BASE}/api/tickets?limit=1000`),
      ])

      const profileData = await profileRes.json()
      const ticketData = await ticketRes.json()

      if (!profileRes.ok) {
        throw new Error(
          profileData?.message || "Failed to load profile"
        )
      }

      const fetchedUser =
        profileData.user ||
        profileData.data ||
        localUser

      setUser(fetchedUser)

      localStorage.setItem(
        "user",
        JSON.stringify(fetchedUser)
      )

      setProfileForm({
        name: fetchedUser.name || "",
        email: fetchedUser.email || "",
        phone: fetchedUser.phone || "",
      })

      const allTickets = Array.isArray(ticketData.data)
        ? ticketData.data
        : []

      setTickets(allTickets)
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const roleAnalytics = useMemo(() => {
    const role = user.role

    if (role === "resident") {
      const myTickets = tickets.filter((ticket) => {
        const creator =
          typeof ticket.createdBy === "object"
            ? ticket.createdBy?._id
            : ticket.createdBy

        return creator === user._id || creator === user.id
      })

      const total = myTickets.length

      const closed = myTickets.filter(
        (t) => t.status === "CLOSED"
      ).length

      const progress = myTickets.filter((t) =>
        ["IN_PROGRESS", "ASSIGNED"].includes(t.status)
      ).length

      const pending = myTickets.filter(
        (t) =>
          t.status ===
          "RESOLVED_PENDING_CONFIRMATION"
      ).length

      const resolutionRate = total
        ? Math.round((closed / total) * 100)
        : 0

      return {
        total,
        closed,
        progress,
        pending,
        resolutionRate,
      }
    }

    if (role === "technician") {
      const assigned = tickets.filter((ticket) => {
        const tech =
          typeof ticket.assignedTo === "object"
            ? ticket.assignedTo?._id
            : ticket.assignedTo

        return tech === user._id || tech === user.id
      })

      const total = assigned.length

      const closed = assigned.filter(
        (t) => t.status === "CLOSED"
      ).length

      const active = assigned.filter((t) =>
        ["ASSIGNED", "IN_PROGRESS"].includes(t.status)
      ).length

      const pending = assigned.filter(
        (t) =>
          t.status ===
          "RESOLVED_PENDING_CONFIRMATION"
      ).length

      const efficiency = total
        ? Math.round((closed / total) * 100)
        : 0

      return {
        total,
        closed,
        active,
        pending,
        efficiency,
      }
    }

const total = tickets.length

const closed = tickets.filter(
  (t) => t.status === "CLOSED"
).length

const residents = tickets.length
  ? new Set(
      tickets
        .map((t) =>
          typeof t.createdBy === "object"
            ? t.createdBy?._id
            : t.createdBy
        )
        .filter(Boolean)
    ).size
  : 0

const technicians = tickets.length
  ? new Set(
      tickets
        .map((t) =>
          typeof t.assignedTo === "object"
            ? t.assignedTo?._id
            : t.assignedTo
        )
        .filter(Boolean)
    ).size
  : 0

return {
  total,
  closed,
  residents,
  technicians,
}
  }, [tickets, user])

  const metrics = useMemo(() => {
    if (user.role === "resident") {
      return [
        {
          label: "Requests Raised",
          value: roleAnalytics.total,
          icon: FileText,
        },
        {
          label: "Resolved Requests",
          value: roleAnalytics.closed,
          icon: CheckCircle2,
        },
        {
          label: "In Progress",
          value: roleAnalytics.progress,
          icon: Activity,
        },
        {
          label: "Pending Confirmations",
          value: roleAnalytics.pending,
          icon: TimerReset,
        },
      ]
    }

    if (user.role === "technician") {
      return [
        {
          label: "Operations Handled",
          value: roleAnalytics.total,
          icon: Wrench,
        },
        {
          label: "Successfully Closed",
          value: roleAnalytics.closed,
          icon: ShieldCheck,
        },
        {
          label: "Active Assignments",
          value: roleAnalytics.active,
          icon: Activity,
        },
        {
          label: "Pending Confirmation",
          value: roleAnalytics.pending,
          icon: Zap,
        },
      ]
    }

return [
  {
    label: "Total Operations",
    value: roleAnalytics.total,
    icon: Building2,
  },
  {
    label: "Managed Residents",
    value: roleAnalytics.residents,
    icon: Users,
  },
  {
    label: "Managed Technicians",
    value: roleAnalytics.technicians,
    icon: Wrench,
  },
  {
    label: "Closed Operations",
    value: roleAnalytics.closed,
    icon: CheckCircle2,
  },
]
  }, [roleAnalytics, user])

  const activityFeed = useMemo(() => {
    let relevant = []

    if (user.role === "resident") {
      relevant = tickets.filter((ticket) => {
        const creator =
          typeof ticket.createdBy === "object"
            ? ticket.createdBy?._id
            : ticket.createdBy

        return creator === user._id || creator === user.id
      })
    } else if (user.role === "technician") {
      relevant = tickets.filter((ticket) => {
        const tech =
          typeof ticket.assignedTo === "object"
            ? ticket.assignedTo?._id
            : ticket.assignedTo

        return tech === user._id || tech === user.id
      })
    } else {
      relevant = tickets
    }

    return relevant
      .sort(
        (a, b) =>
          new Date(b.updatedAt) -
          new Date(a.updatedAt)
      )
      .slice(0, 7)
  }, [tickets, user])

  const performanceValue = useMemo(() => {
    if (user.role === "resident") {
      return roleAnalytics.resolutionRate || 0
    }

    if (user.role === "technician") {
      return roleAnalytics.efficiency || 0
    }

    const total = roleAnalytics.total || 0
const closed = roleAnalytics.closed || 0

return total
  ? Math.round((closed / total) * 100)
  : 0
  }, [roleAnalytics, user])

  const performanceLabel = useMemo(() => {
    if (user.role === "resident") {
      return "Resolution Rate"
    }

    if (user.role === "technician") {
      return "Operational Efficiency"
    }

    return "Operational Completion"
  }, [user])

  const handleProfileSave = async () => {
    try {
      setSavingProfile(true)
      setError("")
      setSuccess("")

      const res = await fetchWithAuth(
        `${API_BASE}/api/users/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profileForm),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to update profile"
        )
      }
pf-role-card
      const updatedUser =
        data.user || data.data || user

      setUser(updatedUser)

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      )

      setSuccess("Profile updated successfully.")
    } catch (err) {
      console.error(err)
      setError(
        err.message || "Failed to update profile"
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      setChangingPassword(true)
      setError("")
      setSuccess("")

      if (
        passwordForm.newPassword !==
        passwordForm.confirmPassword
      ) {
        throw new Error(
          "Passwords do not match"
        )
      }

      const res = await fetchWithAuth(
        `${API_BASE}/api/users/change-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword:
              passwordForm.currentPassword,
            newPassword:
              passwordForm.newPassword,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.message ||
            "Failed to change password"
        )
      }

      setSuccess("Password updated successfully.")

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      setShowPasswordModal(false)
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          "Failed to update password"
      )
    } finally {
      setChangingPassword(false)
    }
  }

  const handleExportData = () => {
    const exportData = {
      profile: user,
      metrics,
      activity: activityFeed,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      {
        type: "application/json",
      }
    )

    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")

    a.href = url
    a.download = `powerpulse-profile-${Date.now()}.json`

    document.body.appendChild(a)

    a.click()

    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    try {
      await fetchWithAuth(
        `${API_BASE}/api/users/logout`,
        {
          method: "POST",
        }
      )
    } catch (err) {
      console.error(err)
    }

    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")

    window.location.href = "/login"
  }

  return (
    <div className="pf-page">
      <AppTopbar />

      {/* BLOBS */}

      <motion.div
        className="pf-blob one"
        animate={{
          y: [0, -18, 0],
          x: [0, 16, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="pf-blob two"
        animate={{
          y: [0, 18, 0],
          x: [0, -14, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <main className="pf-shell">
        {/* HERO */}

        <motion.section
          className="pf-hero"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="pf-identity">
            <div className="pf-avatar">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>

            <div className="pf-main-info">
              <div className="pf-role-pill">
                <Sparkles size={13} />
                {formatLabel(user.role)}
              </div>

              <h1>{user.name}</h1>

              <p>
                {user.role === "resident" &&
                  "Resident service workspace for issue tracking and operational interactions."}

                {user.role === "technician" &&
                  "Operational technician identity center with maintenance performance analytics."}

                {user.role === "admin" &&
                  "Administrative governance center for organization-wide electrical operations."}
              </p>

              <div className="pf-meta-row">
                <div className="pf-meta-pill">
                  <BadgeCheck size={14} />
                  Verified Member
                </div>

                <div className="pf-meta-pill">
                  <Building2 size={14} />
                  {user.organization?.name ||
                    "Organization"}
                </div>

                <div className="pf-meta-pill">
                  <Clock3 size={14} />
                  Joined{" "}
                  {formatTime(user.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="pf-performance">
            <div className="pf-ring">
              <div className="pf-ring-inner">
                <strong>
                  {performanceValue}%
                </strong>

                <span>
                  {performanceLabel}
                </span>
              </div>
            </div>

            <div className="pf-hero-actions">
              <button
                onClick={() =>
                  setShowPasswordModal(true)
                }
              >
                <Shield size={15} />
                Security
              </button>

              <button
                onClick={handleExportData}
              >
                <Download size={15} />
                Export
              </button>
            </div>
          </div>
        </motion.section>

        {/* METRICS */}

        <section className="pf-metrics">
          {metrics.map((metric, index) => {
            const Icon = metric.icon

            return (
              <motion.div
                key={metric.label}
                className="pf-metric-card"
                initial={{
                  opacity: 0,
                  y: 18,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: index * 0.05,
                }}
                whileHover={{
                  y: -4,
                }}
              >
                <div className="pf-metric-top">
                  <div className="pf-metric-icon">
                    <Icon size={18} />
                  </div>

                  <TrendingUp size={15} />
                </div>

                <strong>{metric.value}</strong>

                <span>{metric.label}</span>
              </motion.div>
            )
          })}
        </section>

        {/* MAIN */}

        <div className="pf-layout">
          {/* LEFT */}

          <motion.section
            className="pf-left"
            initial={{
              opacity: 0,
              x: -18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
          >
            {/* PROFILE */}

            <div className="pf-panel">
              <div className="pf-panel-top">
                <div>
                  <h2>
                    Identity Information
                  </h2>

                  <p>
                    Manage account identity and
                    operational profile details.
                  </p>
                </div>

                <div className="pf-panel-icon">
                  <User2 size={18} />
                </div>
              </div>

              {error && (
                <div className="pf-error">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {success && (
                <div className="pf-success">
                  <CheckCircle2 size={16} />
                  {success}
                </div>
              )}

              <div className="pf-form-grid">
                <div className="pf-field">
                  <label>Full Name</label>

                  <div className="pf-input-wrap">
                    <User2 size={15} />

                    <input
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm(
                          (prev) => ({
                            ...prev,
                            name:
                              e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                </div>

                <div className="pf-field">
                  <label>Email</label>

                  <div className="pf-input-wrap">
                    <Mail size={15} />

                    <input
                      value={
                        profileForm.email
                      }
                      onChange={(e) =>
                        setProfileForm(
                          (prev) => ({
                            ...prev,
                            email:
                              e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                </div>

                <div className="pf-field">
                  <label>Phone</label>

                  <div className="pf-input-wrap">
                    <Zap size={15} />

                    <input
                      value={
                        profileForm.phone
                      }
                      onChange={(e) =>
                        setProfileForm(
                          (prev) => ({
                            ...prev,
                            phone:
                              e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                </div>

                <div className="pf-field">
                  <label>Role</label>

                  <div className="pf-static-field">
                    {formatLabel(
                      user.role
                    )}
                  </div>
                </div>
              </div>

              <button
                className="pf-save-btn"
                onClick={
                  handleProfileSave
                }
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2
                      size={16}
                      style={{
                        animation:
                          "spin 1s linear infinite",
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>

            {/* ROLE PANELS */}

            {user.role === "resident" && (
              <div className="pf-panel">
                <div className="pf-panel-top">
                  <div>
                    <h2>
                      Resident Service
                      Analytics
                    </h2>

                    <p>
                      Request history and
                      service interaction
                      overview.
                    </p>
                  </div>

                  <div className="pf-panel-icon">
                    <BarChart3 size={18} />
                  </div>
                </div>

                <div className="pf-role-grid">
                  <div className="pf-role-card">
                    <FileText size={18} />

                    <strong>
                      {
                        roleAnalytics.total
                      }
                    </strong>

                    <span>
                      Requests Raised
                    </span>
                  </div>

                  <div className="pf-role-card">
                    <CheckCircle2 size={18} />

                    <strong>
                      {
                        roleAnalytics.closed
                      }
                    </strong>

                    <span>
                      Successfully Closed
                    </span>
                  </div>

                  <div className="pf-role-card">
                    <TimerReset size={18} />

                    <strong>
                      {
                        roleAnalytics.pending
                      }
                    </strong>

                    <span>
                      Pending Confirmation
                    </span>
                  </div>
                </div>
              </div>
            )}

            {user.role === "technician" && (
              <div className="pf-panel">
                <div className="pf-panel-top">
                  <div>
                    <h2>
                      Technician
                      Performance
                    </h2>

                    <p>
                      Operational efficiency
                      and maintenance
                      analytics.
                    </p>
                  </div>

                  <div className="pf-panel-icon">
                    <Wrench size={18} />
                  </div>
                </div>

                <div className="pf-role-grid">
                  <div className="pf-role-card">
                    <Activity size={18} />

                    <strong>
                      {
                        roleAnalytics.active
                      }
                    </strong>

                    <span>
                      Active Assignments
                    </span>
                  </div>

                  <div className="pf-role-card">
                    <ShieldCheck size={18} />

                    <strong>
                      {
                        roleAnalytics.closed
                      }
                    </strong>

                    <span>
                      Closed Operations
                    </span>
                  </div>

                  <div className="pf-role-card">
                    <TrendingUp size={18} />

                    <strong>
                      {
                        roleAnalytics.efficiency
                      }
                      %
                    </strong>

                    <span>
                      Operational Efficiency
                    </span>
                  </div>
                </div>
              </div>
            )}

            {user.role === "admin" && (
              <div className="pf-panel">
                <div className="pf-panel-top">
                  <div>
                    <h2>
                      Organization
                      Governance
                    </h2>

                    <p>
                      Organization-wide
                      operational analytics.
                    </p>
                  </div>

                  <div className="pf-panel-icon">
                    <Building2 size={18} />
                  </div>
                </div>

                <div className="pf-role-grid">
<div className="pf-role-card">
  <Users size={18} />

  <strong>
    {roleAnalytics.residents}
  </strong>

  <span>
    Managed Residents
  </span>
</div>

<div className="pf-role-card">
  <Wrench size={18} />

  <strong>
    {roleAnalytics.technicians}
  </strong>

  <span>
    Managed Technicians
  </span>
</div>

<div className="pf-role-card">
  <CheckCircle2 size={18} />

  <strong>
    {roleAnalytics.closed}
  </strong>

  <span>
    Closed Operations
  </span>
</div>
                </div>
              </div>
            )}

            {/* ACTIVITY */}

            <div className="pf-panel">
              <div className="pf-panel-top">
                <div>
                  <h2>
                    Operational Activity
                  </h2>

                  <p>
                    Recent interactions and
                    system actions.
                  </p>
                </div>

                <div className="pf-panel-icon">
                  <Activity size={18} />
                </div>
              </div>

              <div className="pf-activity-feed">
                {activityFeed.map(
                  (item, index) => (
                    <motion.div
                      key={item._id}
                      className="pf-activity-item"
                      initial={{
                        opacity: 0,
                        y: 16,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index * 0.04,
                      }}
                    >
                      <div className="pf-activity-dot"></div>

                      <div className="pf-activity-content">
                        <div className="pf-activity-top">
                          <strong>
                            {item.title}
                          </strong>

                          <span>
                            {formatTime(
                              item.updatedAt
                            )}
                          </span>
                        </div>

                        <p>
                          Status:
                          {" "}
                          {formatLabel(
                            item.status
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            </div>
          </motion.section>

          {/* RIGHT */}

          <motion.aside
            className="pf-right"
            initial={{
              opacity: 0,
              x: 18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
          >
            {/* SECURITY */}

            <div className="pf-side-card">
              <div className="pf-side-top">
                <h3>
                  Security Center
                </h3>

                <LockKeyhole size={18} />
              </div>

              <div className="pf-security-list">
                <div className="pf-security-item">
                  <Fingerprint size={17} />

                  <div>
                    <strong>
                      Session Status
                    </strong>

                    <span>
                      Current secure session
                      active
                    </span>
                  </div>
                </div>

                <div className="pf-security-item">
                  <KeyRound size={17} />

                  <div>
                    <strong>
                      Password Security
                    </strong>

                    <span>
                      Protected credentials
                    </span>
                  </div>
                </div>

                <div className="pf-security-item">
                  <ShieldCheck size={17} />

                  <div>
                    <strong>
                      Verification
                    </strong>

                    <span>
                      Verified organization
                      member
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="pf-side-btn"
                onClick={() =>
                  setShowPasswordModal(
                    true
                  )
                }
              >
                <Shield size={15} />
                Change Password
              </button>
            </div>

            {/* QUICK ACTIONS */}

            <div className="pf-side-card">
              <div className="pf-side-top">
                <h3>
                  Quick Actions
                </h3>

                <Zap size={18} />
              </div>

              <div className="pf-action-grid">
                <button
                  onClick={
                    handleExportData
                  }
                >
                  <Download size={16} />
                  Export Data
                </button>

                <button
                  onClick={() =>
                    openComingSoon(
                      "Notification Controls"
                    )
                  }
                >
                  <Bell size={16} />
                  Alerts
                </button>

                <button
                  onClick={() =>
                    openComingSoon(
                      "Appearance Customization"
                    )
                  }
                >
                  <Eye size={16} />
                  Appearance
                </button>

                <button
                  onClick={() =>
                    openComingSoon(
                      "Privacy Controls"
                    )
                  }
                >
                  <Shield size={16} />
                  Privacy
                </button>

                <button
                  onClick={() =>
                    openComingSoon(
                      "Session Management"
                    )
                  }
                >
                  <Users size={16} />
                  Sessions
                </button>

                <button
                  className="danger"
                  onClick={
                    handleLogout
                  }
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      </main>

      {/* PASSWORD MODAL */}

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            className="pf-modal-overlay"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >
            <motion.div
              className="pf-modal"
              initial={{
                opacity: 0,
                scale: 0.92,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.92,
                y: 20,
              }}
            >
              <div className="pf-modal-top">
                <div>
                  <h2>
                    Change Password
                  </h2>

                  <p>
                    Update account
                    credentials securely.
                  </p>
                </div>

                <button
                  className="pf-close-btn"
                  onClick={() =>
                    setShowPasswordModal(
                      false
                    )
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <div className="pf-modal-body">
                <div className="pf-field">
                  <label>
                    Current Password
                  </label>

                  <div className="pf-input-wrap">
                    <LockKeyhole
                      size={15}
                    />

                    <input
                      type={
                        showCurrentPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordForm.currentPassword
                      }
                      onChange={(e) =>
                        setPasswordForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            currentPassword:
                              e.target
                                .value,
                          })
                        )
                      }
                    />

                    <button
                      className="pf-eye-btn"
                      onClick={() =>
                        setShowCurrentPassword(
                          (
                            prev
                          ) => !prev
                        )
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff
                          size={16}
                        />
                      ) : (
                        <Eye
                          size={16}
                        />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pf-field">
                  <label>
                    New Password
                  </label>

                  <div className="pf-input-wrap">
                    <LockKeyhole
                      size={15}
                    />

                    <input
                      type={
                        showNewPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordForm.newPassword
                      }
                      onChange={(e) =>
                        setPasswordForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            newPassword:
                              e.target
                                .value,
                          })
                        )
                      }
                    />

                    <button
                      className="pf-eye-btn"
                      onClick={() =>
                        setShowNewPassword(
                          (
                            prev
                          ) => !prev
                        )
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff
                          size={16}
                        />
                      ) : (
                        <Eye
                          size={16}
                        />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pf-field">
                  <label>
                    Confirm Password
                  </label>

                  <div className="pf-input-wrap">
                    <ShieldCheck
                      size={15}
                    />

                    <input
                      type="password"
                      value={
                        passwordForm.confirmPassword
                      }
                      onChange={(e) =>
                        setPasswordForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            confirmPassword:
                              e.target
                                .value,
                          })
                        )
                      }
                    />
                  </div>
                </div>

                <button
                  className="pf-save-btn"
                  onClick={
                    handleChangePassword
                  }
                  disabled={
                    changingPassword
                  }
                >
                  {changingPassword ? (
                    <>
                      <Loader2
                        size={16}
                        style={{
                          animation:
                            "spin 1s linear infinite",
                        }}
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMING SOON */}

      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            className="pf-modal-overlay"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >
            <motion.div
              className="pf-coming-soon"
              initial={{
                opacity: 0,
                scale: 0.92,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.92,
                y: 20,
              }}
            >
              <div className="pf-coming-icon">
                <Sparkles size={22} />
              </div>

              <h2>
                {showComingSoon}
              </h2>

              <p>
                This advanced SaaS feature
                is planned for a future
                PowerPulse release.
              </p>

              <button
                onClick={
                  closeComingSoon
                }
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .pf-page{
          min-height:100vh;
          position:relative;
          overflow:hidden;
        }

        .pf-shell{
          max-width:1450px;
          margin:0 auto;
          padding:42px 28px 90px;
          position:relative;
          z-index:2;
        }

        .pf-blob{
          position:absolute;
          border-radius:50%;
          filter:blur(100px);
          opacity:.22;
          pointer-events:none;
          z-index:0;
        }

        .pf-blob.one{
          width:340px;
          height:340px;
          background:#8b5cf6;
          top:140px;
          left:-120px;
        }

        .pf-blob.two{
          width:320px;
          height:320px;
          background:#6f875a;
          right:-100px;
          bottom:140px;
        }

        .pf-hero{
          display:flex;
          justify-content:space-between;
          gap:40px;
          padding:34px;
          border-radius:34px;
          backdrop-filter:blur(22px);
          margin-bottom:26px;
        }

        .pf-identity{
          display:flex;
          gap:28px;
          align-items:center;
        }

        .pf-avatar{
          width:120px;
          height:120px;
          border-radius:32px;
          display:grid;
          place-items:center;
          font-size:44px;
          font-weight:700;
          background:linear-gradient(145deg,#8b5cf6,#6f875a);
          flex-shrink:0;
        }

        .pf-role-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 14px;
          border-radius:999px;
          background:rgba(139,92,246,.14);
          border:1px solid rgba(139,92,246,.24);
          color:#e9d5ff;
          font-size:12px;
          margin-bottom:16px;
        }

        .pf-main-info h1{
          margin:0;
          font-size:48px;
          line-height:1;
        }

        .pf-main-info p{
          margin:16px 0 0;
          line-height:1.8;
          opacity:.72;
          max-width:760px;
        }

        .pf-meta-row{
          display:flex;
          gap:14px;
          margin-top:22px;
          flex-wrap:wrap;
        }

        .pf-meta-pill{
          display:flex;
          align-items:center;
          gap:8px;
          padding:10px 14px;
          border-radius:14px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
          font-size:13px;
        }

        .pf-performance{
          display:flex;
          flex-direction:column;
          gap:24px;
          align-items:center;
        }

        .pf-ring{
          width:220px;
          height:220px;
          border-radius:50%;
          background:
            conic-gradient(
              #8b5cf6 0deg,
              #6f875a ${performanceValue * 3.6}deg,
              rgba(255,255,255,.08) 0deg
            );

          display:grid;
          place-items:center;
        }

        .pf-ring-inner{
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

        .pf-ring-inner strong{
          font-size:42px;
        }

        .pf-ring-inner span{
          margin-top:8px;
          opacity:.62;
          font-size:13px;
        }

        .pf-hero-actions{
          display:flex;
          gap:14px;
        }

        .pf-hero-actions button{
          height:46px;
          padding:0 18px;
          border:none;
          border-radius:14px;
          background:rgba(255,255,255,.08);
          color:white;
          display:flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
          transition:.25s ease;
        }

        .pf-hero-actions button:hover{
          transform:translateY(-2px);
          background:rgba(139,92,246,.18);
        }

        .pf-metrics{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:18px;
          margin-bottom:26px;
        }

        .pf-metric-card{
          padding:24px;
          border-radius:26px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
          backdrop-filter:blur(18px);
          transition:.25s ease;
        }

        .pf-metric-top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:22px;
        }

        .pf-metric-icon{
          width:44px;
          height:44px;
          border-radius:14px;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.08);
        }

        .pf-metric-card strong{
          display:block;
          font-size:40px;
        }

        .pf-metric-card span{
          display:block;
          margin-top:10px;
          opacity:.66;
          font-size:13px;
        }

        .pf-layout{
          display:grid;
          grid-template-columns:minmax(0,1.15fr) 420px;
          gap:24px;
        }

        .pf-left{
          display:flex;
          flex-direction:column;
          gap:24px;
        }

        .pf-panel{
          border-radius:30px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
          overflow:hidden;
        }

        .pf-panel-top{
          display:flex;
          justify-content:space-between;
          gap:16px;
          padding:24px 26px;
          border-bottom:1px solid rgba(255,255,255,.08);
        }

        .pf-panel-top h2{
          margin:0;
          font-size:24px;
        }

        .pf-panel-top p{
          margin:8px 0 0;
          opacity:.66;
          line-height:1.6;
          font-size:13px;
        }

        .pf-panel-icon{
          width:44px;
          height:44px;
          border-radius:14px;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.06);
        }

        .pf-error,
        .pf-success{
          margin:20px 24px 0;
          padding:14px 16px;
          border-radius:16px;
          display:flex;
          align-items:center;
          gap:10px;
          font-size:13px;
        }

        .pf-error{
          background:rgba(239,68,68,.12);
          border:1px solid rgba(239,68,68,.24);
          color:#fecaca;
        }

        .pf-success{
          background:rgba(34,197,94,.12);
          border:1px solid rgba(34,197,94,.24);
          color:#bbf7d0;
        }

        .pf-form-grid{
          padding:26px;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:20px;
        }

        .pf-field label{
          display:block;
          margin-bottom:10px;
          font-size:12px;
          opacity:.72;
        }

        .pf-input-wrap{
          height:52px;
          border-radius:16px;
          background:rgba(0,0,0,.18);
          border:1px solid rgba(255,255,255,.1);
          display:flex;
          align-items:center;
          gap:12px;
          padding:0 16px;
        }

        .pf-input-wrap input{
          flex:1;
          background:transparent;
          border:none;
          outline:none;
          color:white;
          font:inherit;
        }

        .pf-static-field{
          height:52px;
          border-radius:16px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.08);
          display:flex;
          align-items:center;
          padding:0 16px;
        }

        .pf-save-btn{
          margin:0 26px 26px;
          height:52px;
          border:none;
          border-radius:16px;
          background:linear-gradient(135deg,#8b5cf6,#6f875a);
          color:white;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          cursor:pointer;
          transition:.25s ease;
          font-weight:600;
        }

        .pf-save-btn:hover{
          transform:translateY(-2px);
        }

        .pf-role-grid{
          padding:26px;
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:18px;
        }

        .pf-role-card{
          padding:22px;
          border-radius:22px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
        }

        .pf-role-card strong{
          display:block;
          font-size:34px;
          margin-top:16px;
        }

        .pf-role-card span{
          display:block;
          margin-top:8px;
          opacity:.66;
          font-size:13px;
        }

        .pf-activity-feed{
          padding:26px;
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .pf-activity-item{
          display:flex;
          gap:16px;
        }

        .pf-activity-dot{
          width:14px;
          height:14px;
          border-radius:50%;
          background:linear-gradient(135deg,#8b5cf6,#6f875a);
          margin-top:6px;
          flex-shrink:0;
        }

        .pf-activity-content{
          flex:1;
          padding:18px;
          border-radius:18px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
        }

        .pf-activity-top{
          display:flex;
          justify-content:space-between;
          gap:16px;
          flex-wrap:wrap;
        }

        .pf-activity-top strong{
          font-size:15px;
        }

        .pf-activity-top span{
          opacity:.56;
          font-size:12px;
        }

        .pf-activity-content p{
          margin:10px 0 0;
          opacity:.72;
          font-size:13px;
        }

        .pf-right{
          display:flex;
          flex-direction:column;
          gap:24px;
          position:sticky;
          top:100px;
          height:fit-content;
        }

        .pf-side-card{
          padding:24px;
          border-radius:28px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
        }

        .pf-side-top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:22px;
        }

        .pf-side-top h3{
          margin:0;
          font-size:20px;
        }

        .pf-security-list{
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .pf-security-item{
          display:flex;
          gap:14px;
          padding:16px;
          border-radius:18px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
        }

        .pf-security-item strong{
          display:block;
          margin-bottom:4px;
        }

        .pf-security-item span{
          opacity:.66;
          font-size:12px;
        }

        .pf-side-btn{
          width:100%;
          margin-top:20px;
          height:48px;
          border:none;
          border-radius:16px;
          background:rgba(139,92,246,.16);
          color:#e9d5ff;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          cursor:pointer;
          transition:.25s ease;
        }

        .pf-side-btn:hover{
          background:rgba(139,92,246,.24);
        }

        .pf-action-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }

        .pf-action-grid button{
          height:54px;
          border:none;
          border-radius:16px;
          background:rgba(255,255,255,.06);
          color:white;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          cursor:pointer;
          transition:.25s ease;
        }

        .pf-action-grid button:hover{
          transform:translateY(-2px);
          background:rgba(139,92,246,.18);
        }

        .pf-action-grid button.danger{
          background:rgba(239,68,68,.14);
          color:#fecaca;
        }

        .pf-modal-overlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.6);
          backdrop-filter:blur(8px);
          display:grid;
          place-items:center;
          z-index:999;
          padding:20px;
        }

        .pf-modal,
        .pf-coming-soon{
          width:100%;
          max-width:520px;
          border-radius:32px;
          background:#171717;
          border:1px solid rgba(255,255,255,.08);
          overflow:hidden;
        }

        .pf-modal-top{
          display:flex;
          justify-content:space-between;
          gap:16px;
          padding:24px;
          border-bottom:1px solid rgba(255,255,255,.08);
        }

        .pf-modal-top h2{
          margin:0;
        }

        .pf-modal-top p{
          margin:8px 0 0;
          opacity:.66;
          font-size:13px;
        }

        .pf-close-btn{
          width:40px;
          height:40px;
          border:none;
          border-radius:12px;
          background:rgba(255,255,255,.06);
          color:white;
          cursor:pointer;
        }

        .pf-modal-body{
          padding:24px;
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .pf-eye-btn{
          background:none;
          border:none;
          color:white;
          cursor:pointer;
        }

        .pf-coming-soon{
          padding:40px;
          text-align:center;
        }

        .pf-coming-icon{
          width:70px;
          height:70px;
          border-radius:20px;
          margin:0 auto 20px;
          background:rgba(139,92,246,.16);
          display:grid;
          place-items:center;
        }

        .pf-coming-soon h2{
          margin:0;
        }

        .pf-coming-soon p{
          margin:16px 0 0;
          line-height:1.7;
          opacity:.72;
        }

        .pf-coming-soon button{
          margin-top:24px;
          width:100%;
          height:50px;
          border:none;
          border-radius:16px;
          background:linear-gradient(135deg,#8b5cf6,#6f875a);
          color:white;
          cursor:pointer;
          font-weight:600;
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
          .pf-layout{
            grid-template-columns:1fr;
          }

          .pf-right{
            position:relative;
            top:0;
          }
        }

        @media(max-width:900px){
          .pf-hero{
            flex-direction:column;
          }

          .pf-identity{
            flex-direction:column;
            align-items:flex-start;
          }

          .pf-metrics{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }

          .pf-role-grid{
            grid-template-columns:1fr;
          }
        }

        @media(max-width:700px){
          .pf-shell{
            padding:28px 16px 80px;
          }

          .pf-metrics,
          .pf-form-grid,
          .pf-action-grid{
            grid-template-columns:1fr;
          }

          .pf-main-info h1{
            font-size:38px;
          }
        }
      `}</style>
    </div>
  )
}

export default Profile