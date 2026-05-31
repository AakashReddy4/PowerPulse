import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Eye,
  Layers3,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  User,
  UserCog,
  Users,
  Wrench,
  X,
  Clock3,
  BadgeCheck,
  Network,
  ChevronDown
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

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "resident",
}

function UsersPage() {
  const [users, setUsers] = useState([])
  const [tickets, setTickets] = useState([])

  const [selectedUser, setSelectedUser] = useState(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")

  const [showCreate, setShowCreate] = useState(false)

  const [form, setForm] = useState(initialForm)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    text: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const openPopup = (title, text) => {
    setPopup({
      open: true,
      title,
      text,
    })
  }

  const closePopup = () => {
    setPopup({
      open: false,
      title: "",
      text: "",
    })
  }

  const loadData = async () => {
    try {
      setLoading(true)

      const [usersRes, ticketsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/users`),
        fetchWithAuth(`${API_BASE}/api/tickets?limit=1000`),
      ])

      const usersData = await usersRes.json()
      const ticketsData = await ticketsRes.json()

      const userArray = Array.isArray(usersData)
        ? usersData
        : usersData?.data || []

      const ticketArray = Array.isArray(ticketsData?.data)
        ? ticketsData.data
        : []

      const filteredUsers = userArray.filter(
        (u) => u.role !== "admin"
      )

      setUsers(filteredUsers)
      setTickets(ticketArray)

      if (filteredUsers.length > 0) {
        setSelectedUser(filteredUsers[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    try {
      setActionLoading(true)

      const res = await fetchWithAuth(
        `${API_BASE}/api/users/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to create user"
        )
      }

      setShowCreate(false)
      setForm(initialForm)

      await loadData()

      openPopup(
        "User Created",
        `${form.role} account deployed successfully.`
      )
    } catch (err) {
      console.error(err)

      openPopup(
        "Creation Failed",
        err.message || "Unable to create user."
      )
    } finally {
      setActionLoading(false)
    }
  }

const deleteUser = async (id) => {

  try {

    if (!id) return

    const confirmDelete = window.confirm(
      "Delete this user permanently?"
    )

    if (!confirmDelete) return

    const res = await fetchWithAuth(
      `${API_BASE}/api/users/${id}`,
      {
        method: "DELETE",
      }
    )

    const data = await res.json()

    if (!res.ok) {
      throw new Error(
        data?.message || "Failed to delete user"
      )
    }

    const updatedUsers = users.filter(
      (user) => user._id !== id
    )

    setUsers(updatedUsers)

    if (selectedUser?._id === id) {
      setSelectedUser(updatedUsers[0] || null)
    }

    openPopup(
      "User Removed",
      "Operational identity removed successfully."
    )

  } catch (err) {

    console.error(err)

    openPopup(
      "Deletion Failed",
      err.message || "Unable to delete user."
    )
  }
}

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {

      const matchesSearch =
        user.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        user.email
          ?.toLowerCase()
          .includes(search.toLowerCase())

      const matchesRole =
        roleFilter === "ALL"
          ? true
          : user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  const workforceDensity = useMemo(() => {

    const residents = users.filter(
      (u) => u.role === "resident"
    ).length

    const technicians = users.filter(
      (u) => u.role === "technician"
    ).length

    const total = residents + technicians

    const residentPercentage = total
      ? Math.round((residents / total) * 100)
      : 0

    const technicianPercentage = total
      ? Math.round((technicians / total) * 100)
      : 0

    return {
      residents,
      technicians,
      residentPercentage,
      technicianPercentage,
    }
  }, [users])

  const selectedUserTickets = useMemo(() => {

    if (!selectedUser) return []

    return tickets.filter((ticket) => {

      const creator =
        typeof ticket.createdBy === "object"
          ? ticket.createdBy?._id
          : ticket.createdBy

      const assigned =
        typeof ticket.assignedTo === "object"
          ? ticket.assignedTo?._id
          : ticket.assignedTo

      return (
        creator === selectedUser._id ||
        assigned === selectedUser._id
      )
    })
  }, [tickets, selectedUser])

  const userInsights = useMemo(() => {

    if (!selectedUser) return {}

    if (selectedUser.role === "resident") {

      const raised = selectedUserTickets.filter((ticket) => {

        const creator =
          typeof ticket.createdBy === "object"
            ? ticket.createdBy?._id
            : ticket.createdBy

        return creator === selectedUser._id
      })

      return {
        primary:
          raised.length > 0
            ? raised[0]?.category
            : "General",

        openRequests: raised.filter(
          (t) =>
            t.status === "OPEN" ||
            t.status === "REOPENED"
        ).length,

        activeRequests: raised.filter(
          (t) =>
            t.status === "ASSIGNED" ||
            t.status === "IN_PROGRESS"
        ).length,
      }
    }

    if (selectedUser.role === "technician") {

      const assigned = selectedUserTickets.filter((ticket) => {

        const tech =
          typeof ticket.assignedTo === "object"
            ? ticket.assignedTo?._id
            : ticket.assignedTo

        return tech === selectedUser._id
      })

      return {
        activeAssignments: assigned.filter(
          (t) =>
            t.status === "ASSIGNED" ||
            t.status === "IN_PROGRESS"
        ).length,

        resolved: assigned.filter(
          (t) =>
            t.status === "CLOSED"
        ).length,

        pendingConfirmation: assigned.filter(
          (t) =>
            t.status === "RESOLVED_PENDING_CONFIRMATION"
        ).length,
      }
    }

    return {}
  }, [selectedUser, selectedUserTickets])

  if (loading) {
    return (
      <div className="us-loading">

        <motion.div
          className="us-loader"
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          }}
        />

        <h2>Synchronizing Workforce Layer...</h2>

      </div>
    )
  }

  return (
    <div className="us-page">

      <AppTopbar />

      <motion.div
        className="us-blob us-b1"
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
        }}
      />

      <motion.div
        className="us-blob us-b2"
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
        }}
      />

      <main className="us-shell">

        {/* HERO */}

        <section className="us-hero">

          <div className="us-hero-left">

            <div className="us-badge">
              <Sparkles size={12} />
              Workforce Governance Layer
            </div>

            <h1>
              Organization Users
            </h1>

            <p>
              Centralized workforce orchestration environment for identity,
              access control, technician deployment, and operational user
              management across the organization.
            </p>

          </div>

          <div className="us-hero-right">

            <div className="us-density-card">

              <div className="us-density-head">
                <h3>Workforce Density</h3>
                <Network size={18} />
              </div>

              <div className="us-density-grid">

                <div className="us-density-circle residents">
                  <strong>
                    {workforceDensity.residentPercentage}%
                  </strong>
                  <span>Residents</span>
                </div>

                <div className="us-density-circle technicians">
                  <strong>
                    {workforceDensity.technicianPercentage}%
                  </strong>
                  <span>Technicians</span>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* MAIN */}

        <section className="us-grid">

          {/* LEFT */}

          <aside className="us-sidebar">

            <div className="us-toolbar">

              <div className="us-search">

                <Search size={16} />

                <input
                  type="text"
                  placeholder="Search workforce..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

              </div>

              <div className="us-filter-row">

                {[
                  "ALL",
                  "resident",
                  "technician",
                ].map((role) => (

                  <button
                    key={role}
                    className={
                      roleFilter === role
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setRoleFilter(role)
                    }
                  >
                    {role}
                  </button>

                ))}

              </div>

              <button
                className="us-create-btn"
                onClick={() =>
                  setShowCreate(true)
                }
              >

                <Plus size={16} />
                Deploy User

              </button>

            </div>

            <div className="us-users-scroll">

              {filteredUsers.length === 0 ? (
                <div className="empty-state">
                  <h3>No users deployed</h3>
                  <p>
                    Create residents and technicians to begin
                    organization operations.
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => {

                const isSelected =
                  selectedUser?._id === user._id

                return (

                  <motion.div
                    key={user._id}
                    whileHover={{
                      y: -4,
                    }}
                    className={`us-user-card ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() =>
                      setSelectedUser(user)
                    }
                  >

                    <div className="us-user-top">

                      <div className="us-avatar">
                        {user.name?.charAt(0)}
                      </div>

                      <div>

                        <h3>{user.name}</h3>

                        <span>
                          {user.role}
                        </span>

                      </div>

                    </div>

                    <div className="us-user-bottom">

                      <div className="us-mini-chip">
                        <Mail size={11} />
                        {user.email}
                      </div>

                      <ChevronRight size={15} />

                    </div>

                  </motion.div>

                )
              })
              )}

            </div>

          </aside>

          {/* CENTER */}

          <section className="us-center">

            {selectedUser && (

              <motion.div
                key={selectedUser._id}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="us-profile-panel"
              >

                <div className="us-profile-top">

                  <div className="us-profile-main">

                    <div className="us-profile-avatar">
                      {selectedUser.name?.charAt(0)}
                    </div>

                    <div>

                      <div className="us-role-tag">
                        <Shield size={12} />
                        {selectedUser.role}
                      </div>

                      <h2>
                        {selectedUser.name}
                      </h2>

                      <p>
                        Operational identity synchronized within organizational
                        workforce governance layer.
                      </p>

                    </div>

                  </div>

                  <button
                    className="us-inspect-btn"
                    onClick={() =>
                      openPopup(
                        "Advanced User Controls",
                        "Detailed security governance, activity auditing, suspension workflows, and advanced controls will be added in the upcoming identity management layer."
                      )
                    }
                  >

                    <Eye size={16} />
                    Inspect

                  </button>

                </div>

                <div className="us-details-grid">

                  

                  <div>
                    <span>Email Address</span>
                    <strong>{selectedUser.email}</strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>
                      {selectedUser.phone || "Not Added"}
                    </strong>
                  </div>

                  <div>
                    <span>Verification</span>
                    <strong>
                      {selectedUser.isVerified
                        ? "Verified"
                        : "Pending"}
                    </strong>
                  </div>

                  <div>
                    <span>Joined</span>
                    <strong>
                      {new Date(
                        selectedUser.createdAt
                      ).toLocaleDateString()}
                    </strong>
                  </div>

                </div>

                <div className="us-inline-actions">

  <button
    className="us-inline-btn"
    onClick={() =>
      openPopup(
        "Password Reset Layer",
        "Advanced reset workflows with OTP verification and audit tracking will be integrated in the next security phase."
      )
    }
  >
    <Shield size={16} />

    <div>
      <strong>Reset Credentials</strong>
      <span>Future security workflow</span>
    </div>
  </button>

  <button
    className="us-inline-btn"
    onClick={() =>
      openPopup(
        "User Suspension",
        "Temporary suspension and access isolation workflows will be added with audit logging."
      )
    }
  >
    <AlertTriangle size={16} />

    <div>
      <strong>Suspend Access</strong>
      <span>Future governance control</span>
    </div>
  </button>

  <button
    className="us-inline-btn danger"
    onClick={() =>
      deleteUser(selectedUser?._id)
    }
  >
    <Trash2 size={16} />

    <div>
      <strong>Remove User</strong>
      <span>Permanently remove workforce identity</span>
    </div>
  </button>

</div>

                {/* ROLE VIEW */}

                {selectedUser.role === "resident" && (

                  <div className="us-role-zone">

                    <div className="us-zone-head">

                      <div>
                        <h3>Resident Activity Layer</h3>
                        <p>
                          Community operational interaction insights.
                        </p>
                      </div>

                      <User size={18} />

                    </div>

                    <div className="us-flow-grid">

                      <div className="us-flow-card">
                        <AlertTriangle size={18} />
                        <strong>
                          {userInsights.openRequests}
                        </strong>
                        <span>Open Requests</span>
                      </div>

                      <div className="us-flow-card">
                        <Activity size={18} />
                        <strong>
                          {userInsights.activeRequests}
                        </strong>
                        <span>Active Requests</span>
                      </div>

                      <div className="us-flow-card">
                        <Layers3 size={18} />
                        <strong>
                          {userInsights.primary}
                        </strong>
                        <span>Primary Issue Category</span>
                      </div>

                    </div>

                  </div>

                )}

                {selectedUser.role === "technician" && (

                  <div className="us-role-zone">

                    <div className="us-zone-head">

                      <div>
                        <h3>Technician Operations Layer</h3>
                        <p>
                          Deployment workload and operational throughput.
                        </p>
                      </div>

                      <Wrench size={18} />

                    </div>

                    <div className="us-flow-grid">

                      <div className="us-flow-card">
                        <Clock3 size={18} />
                        <strong>
                          {userInsights.activeAssignments}
                        </strong>
                        <span>Active Assignments</span>
                      </div>

                      <div className="us-flow-card">
                        <BadgeCheck size={18} />
                        <strong>
                          {userInsights.resolved}
                        </strong>
                        <span>Resolved Operations</span>
                      </div>

                      <div className="us-flow-card">
                        <Cpu size={18} />
                        <strong>
                          {userInsights.pendingConfirmation}
                        </strong>
                        <span>Pending Confirmations</span>
                      </div>

                    </div>

                  </div>

                )}

                {/* USER TIMELINE */}

                <div className="us-activity-panel">

                  <div className="us-zone-head">

                    <div>
                      <h3>Operational Activity Stream</h3>
                      <p>
                        Related workflow interactions across platform.
                      </p>
                    </div>

                    <Activity size={18} />

                  </div>

                  <div className="us-timeline">

                    {selectedUserTickets.length === 0 && (
                      <div className="us-empty">
                        No operational activity yet.
                      </div>
                    )}

                    {selectedUserTickets.map((ticket) => (

                      <div
                        key={ticket._id}
                        className="us-timeline-item"
                      >

                        <div className="us-timeline-dot"></div>

                        <div className="us-timeline-content">

                          <div className="us-timeline-top">

                            <strong>
                              {ticket.title}
                            </strong>

                            <span
                              className={`us-status ${ticket.status}`}
                            >
                              {ticket.status.replaceAll("_", " ")}
                            </span>

                          </div>

                          <p>
                            {ticket.category}
                          </p>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              </motion.div>

            )}

          </section>

        </section>

      </main>

      {/* CREATE MODAL */}

      <AnimatePresence>

        {showCreate && (

          <motion.div
            className="us-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            <motion.div
              className="us-modal"
              initial={{
                scale: 0.92,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.92,
                opacity: 0,
              }}
            >

              <div className="us-modal-head">

                <div>
                  <h2>Deploy Workforce User</h2>
                  <p>
                    Create operational identity inside organization network.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowCreate(false)
                  }
                >
                  <X size={18} />
                </button>

              </div>

              <div className="us-form-grid">

                <input
                  type="text"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />

                <input
                  type="password"
                  placeholder="Temporary Password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                />

<div className="us-select-wrap">

  <label>User Role</label>

  <div className="us-select-shell">

    <Shield size={16} />

    <select
      value={form.role}
      onChange={(e) =>
        setForm({
          ...form,
          role: e.target.value,
        })
      }
      className="us-select"
    >
      <option value="resident">
        Resident
      </option>

      <option value="technician">
        Technician
      </option>
    </select>

    <ChevronDown size={16} />

  </div>

</div>

              </div>

              <button
                className="us-submit-btn"
                onClick={createUser}
                disabled={actionLoading}
              >

                <Plus size={18} />
                Create User

              </button>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

      {/* POPUP */}

      <AnimatePresence>

        {popup.open && (

          <motion.div
            className="us-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            <motion.div
              className="us-popup"
              initial={{
                scale: 0.92,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.92,
                opacity: 0,
              }}
            >

              <h3>{popup.title}</h3>

              <p>{popup.text}</p>

              <button onClick={closePopup}>
                Close
              </button>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

      <style>{`

        .us-page{
          min-height:100vh;
          position:relative;
          overflow:hidden;
        }

.us-shell{
  max-width:1700px;
  margin:0 auto;
  padding:20px 20px 40px;
  position:relative;
  z-index:2;

  overflow:visible;
}

        .us-blob{
          position:absolute;
          border-radius:50%;
          filter:blur(120px);
          opacity:.12;
        }

        .us-b1{
          width:320px;
          height:320px;
          background:#8b5cf6;
          top:120px;
          left:-120px;
        }

        .us-b2{
          width:320px;
          height:320px;
          background:#6f8a57;
          right:-120px;
          bottom:-80px;
        }

        .us-hero{
          display:grid;
          grid-template-columns:1fr 320px;
          gap:28px;
          align-items:center;
          margin-bottom:24px;
        }

        .us-badge{
          display:inline-flex;
          align-items:center;
          gap:8px;

          padding:10px 15px;

          border-radius:999px;

          background:rgba(139,92,246,.14);

          border:1px solid rgba(139,92,246,.24);

          font-size:11px;
        }

        .us-hero-left h1{
          font-size:56px;
          line-height:.95;
          margin:18px 0 0;
          letter-spacing:-3px;
        }

        .us-hero-left p{
          max-width:720px;
          margin-top:18px;
          opacity:.7;
          line-height:1.8;
        }

        .us-density-card{
          padding:22px;
          border-radius:28px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          backdrop-filter:blur(24px);
        }

        .us-density-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:24px;
        }

        .us-density-head h3{
          margin:0;
        }

        .us-density-grid{
          display:flex;
          gap:16px;
        }

        .us-density-circle{
          flex:1;
          aspect-ratio:1;

          border-radius:50%;

          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;

          border:1px solid rgba(255,255,255,.08);
        }

        .residents{
          background:rgba(139,92,246,.12);
        }

        .technicians{
          background:rgba(111,138,87,.12);
        }

        .us-density-circle strong{
          font-size:28px;
        }

        .us-density-circle span{
          margin-top:8px;
          font-size:11px;
          opacity:.7;
        }

.us-grid{
  display:grid;

  grid-template-columns:
    380px
    minmax(0,1fr)
    320px;

  gap:20px;

  height:calc(100vh - 290px);

  min-height:720px;

  align-items:stretch;
}

.us-sidebar,
.us-center,
.us-right{
  min-height:0;

  height:100%;

  display:flex;
  flex-direction:column;

  overflow:hidden;
}

        .us-toolbar,
        .us-users-scroll,
        .us-profile-panel,
        .us-command-card{
          background:rgba(255,255,255,.045);

          border:1px solid rgba(255,255,255,.08);

          backdrop-filter:blur(24px);
        }

        .us-toolbar{
          padding:16px;
          border-radius:26px;
          margin-bottom:16px;
        }

        .us-search{
          height:52px;

          display:flex;
          align-items:center;
          gap:12px;

          padding:0 16px;

          border-radius:16px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);
        }

        .us-search input{
          flex:1;
          background:none;
          border:none;
          outline:none;
          color:white;
        }

        .us-filter-row{
          display:flex;
          gap:10px;
          margin-top:14px;
        }

        .us-filter-row button{
          flex:1;

          height:42px;

          border:none;
          outline:none;

          border-radius:12px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          color:rgba(255,255,255,.75);

          cursor:pointer;

          transition:.25s;
        }

        .us-filter-row button.active{
          background:rgba(139,92,246,.16);
          border-color:rgba(139,92,246,.28);
          color:white;
        }

        .us-create-btn{
          width:100%;
          height:52px;

          margin-top:14px;

          border:none;
          outline:none;

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

.us-users-scroll{
  flex:1;

  min-height:0;

  overflow-y:auto;
  overflow-x:hidden;

  border-radius:28px;

  padding:14px;

  display:flex;
  flex-direction:column;
  gap:12px;

  scrollbar-width:none;

  background:rgba(255,255,255,.045);

  border:1px solid rgba(255,255,255,.08);

  backdrop-filter:blur(24px);
}

        .us-users-scroll::-webkit-scrollbar{
          width:0;
        }

        .us-user-card{
          padding:16px;

          border-radius:22px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.06);

          cursor:pointer;

          transition:.28s;

          flex-shrink:0;
        }

        .us-user-card.selected{
          background:
            linear-gradient(
              145deg,
              rgba(139,92,246,.16),
              rgba(255,255,255,.03)
            );

          border-color:rgba(139,92,246,.3);
        }

        .us-user-top{
          display:flex;
          align-items:center;
          gap:14px;
        }

        .us-avatar{
          width:52px;
          height:52px;

          border-radius:16px;

          display:flex;
          align-items:center;
          justify-content:center;

          background:rgba(139,92,246,.16);

          border:1px solid rgba(139,92,246,.26);

          font-weight:700;
        }

        .us-user-top h3{
          margin:0;
          font-size:16px;
        }

        .us-user-top span{
          display:block;
          margin-top:5px;
          opacity:.6;
          font-size:11px;
        }

        .us-user-bottom{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-top:16px;
        }

        .us-mini-chip{
          display:flex;
          align-items:center;
          gap:8px;

          padding:8px 10px;

          border-radius:12px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          font-size:10px;

          max-width:220px;

          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

.us-profile-panel{
  flex:1;

  min-height:0;

  overflow-y:auto;
  overflow-x:hidden;

  border-radius:28px;

  padding:24px;

  scrollbar-width:none;

  background:rgba(255,255,255,.045);

  border:1px solid rgba(255,255,255,.08);

  backdrop-filter:blur(24px);
}

        .us-profile-panel::-webkit-scrollbar{
          width:0;
        }

        .us-profile-top{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:18px;
        }

        .us-profile-main{
          display:flex;
          gap:18px;
        }

        .us-profile-avatar{
          width:90px;
          height:90px;

          border-radius:28px;

          display:flex;
          align-items:center;
          justify-content:center;

          background:
            linear-gradient(
              145deg,
              rgba(139,92,246,.2),
              rgba(255,255,255,.05)
            );

          border:1px solid rgba(139,92,246,.24);

          font-size:30px;
          font-weight:700;
        }

        .us-role-tag{
          display:inline-flex;
          align-items:center;
          gap:8px;

          padding:8px 13px;

          border-radius:999px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          font-size:11px;
        }

        .us-profile-main h2{
          margin:18px 0 0;
          font-size:52px;
          line-height:1;
        }

        .us-profile-main p{
          margin-top:14px;
          opacity:.7;
          max-width:650px;
          line-height:1.8;
        }

        .us-inspect-btn{
          border:none;
          outline:none;

          padding:12px 16px;

          border-radius:14px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          display:flex;
          align-items:center;
          gap:10px;

          color:white;

          cursor:pointer;
        }

        .us-details-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;

          margin-top:24px;
        }

        .us-details-grid div{
          padding:16px;

          border-radius:18px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.07);
        }

        .us-details-grid span{
          display:block;
          font-size:11px;
          opacity:.6;
        }

        .us-details-grid strong{
          display:block;
          margin-top:10px;
          font-size:15px;
          word-break:break-word;
        }

        .us-role-zone,
        .us-activity-panel{
          margin-top:24px;

          padding:20px;

          border-radius:24px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.08);
        }

        .us-zone-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        }

        .us-zone-head h3{
          margin:0;
          font-size:22px;
        }

        .us-zone-head p{
          margin:8px 0 0;
          opacity:.65;
          font-size:13px;
        }

        .us-flow-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:14px;
          margin-top:18px;
        }

        .us-flow-card{
          min-height:130px;

          padding:18px;

          border-radius:20px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.07);

          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }

        .us-flow-card strong{
          font-size:30px;
        }

        .us-flow-card span{
          font-size:12px;
          opacity:.7;
        }

        .us-timeline{
          margin-top:18px;

          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .us-timeline-item{
          display:flex;
          gap:14px;
        }

        .us-timeline-dot{
          width:10px;
          height:10px;

          margin-top:8px;

          border-radius:50%;

          background:#8b5cf6;

          box-shadow:
            0 0 12px rgba(139,92,246,.6);
        }

        .us-timeline-content{
          flex:1;

          padding:16px;

          border-radius:18px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.07);
        }

        .us-timeline-top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }

        .us-timeline-top strong{
          font-size:15px;
        }

        .us-status{
          padding:7px 10px;

          border-radius:999px;

          font-size:10px;
          font-weight:700;

          white-space:nowrap;
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

        .us-timeline-content p{
          margin:10px 0 0;
          opacity:.7;
          font-size:13px;
        }

.us-command-card{
  flex:1;

  min-height:0;

  overflow-y:auto;

  border-radius:28px;

  padding:20px;

  scrollbar-width:none;

  background:rgba(255,255,255,.045);

  border:1px solid rgba(255,255,255,.08);

  backdrop-filter:blur(24px);
}

        .us-command-grid{
          display:flex;
          flex-direction:column;
          gap:14px;

          margin-top:22px;
        }

        .us-command-grid button{
          height:58px;

          border:none;
          outline:none;

          border-radius:18px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          display:flex;
          align-items:center;
          gap:12px;

          padding:0 18px;

          color:white;

          cursor:pointer;

          transition:.25s;
        }

        .us-command-grid button:hover{
          transform:translateY(-2px);
        }

        .us-modal-overlay,
        .us-popup-overlay{
          position:fixed;
          inset:0;

          background:rgba(0,0,0,.55);

          display:flex;
          align-items:center;
          justify-content:center;

          z-index:1000;
        }

        .us-modal,
        .us-popup{
          width:min(540px,90vw);

          padding:26px;

          border-radius:28px;

          background:#0f172a;

          border:1px solid rgba(255,255,255,.08);
        }

        .us-modal-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        }

        .us-modal-head h2,
        .us-popup h3{
          margin:0;
        }

        .us-modal-head p,
        .us-popup p{
          margin-top:10px;
          opacity:.7;
          line-height:1.7;
        }

        .us-modal-head button{
          width:42px;
          height:42px;

          border:none;
          outline:none;

          border-radius:14px;

          background:rgba(255,255,255,.05);

          color:white;

          cursor:pointer;
        }

        .us-form-grid{
          display:grid;
          gap:14px;

          margin-top:22px;
        }

        .us-form-grid input,
        .us-form-grid select{
          height:56px;

          border:none;
          outline:none;

          border-radius:16px;

          background:rgba(255,255,255,.05);

          border:1px solid rgba(255,255,255,.08);

          padding:0 16px;

          color:white;
        }

        .us-select-wrap{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.us-select-wrap label{
  font-size:12px;
  font-weight:600;

  letter-spacing:.08em;

  text-transform:uppercase;

  opacity:.6;
}

.us-select-shell{
  height:64px;

  border-radius:20px;

  padding:0 18px;

  display:flex;
  align-items:center;
  gap:14px;

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.06),
      rgba(255,255,255,.03)
    );

  border:1px solid rgba(255,255,255,.08);

  transition:.28s;
}

.us-select-shell:focus-within{
  border-color:rgba(139,92,246,.42);

  box-shadow:
    0 0 0 4px rgba(139,92,246,.08);
}

.us-select{
  flex:1;

  height:100%;

  border:none;
  outline:none;

  background:transparent;

  color:white;

  font-size:15px;
  font-weight:600;

  appearance:none;

  cursor:pointer;
}

.us-select option{
  background:#1d2433;
  color:white;
}

        .us-submit-btn,
        .us-popup button{
          width:100%;
          height:56px;

          margin-top:20px;

          border:none;
          outline:none;

          border-radius:16px;

          background:
            linear-gradient(
              135deg,
              #8b5cf6,
              #69824e
            );

          color:white;

          font-weight:600;

          cursor:pointer;
        }

        .us-workspace{
  min-height:calc(100vh - 120px);
}

        .us-loading{
          min-height:100vh;

          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;

          gap:24px;
        }

        .us-loader{
          width:90px;
          height:90px;

          border-radius:50%;

          border:4px solid rgba(255,255,255,.08);

          border-top-color:#8b5cf6;
        }

        .us-inline-actions{
  display:grid;

  grid-template-columns:
    repeat(3,minmax(0,1fr));

  gap:14px;

  margin-top:18px;
}

.us-inline-btn{
  min-height:110px;

  border:none;
  outline:none;

  border-radius:20px;

  background:rgba(255,255,255,.04);

  border:1px solid rgba(255,255,255,.08);

  padding:18px;

  display:flex;
  flex-direction:column;

  justify-content:space-between;

  align-items:flex-start;

  gap:16px;

  color:white;

  cursor:pointer;

  transition:.28s;

  text-align:left;
}

        .us-empty{
          padding:18px;

          border-radius:18px;

          background:rgba(255,255,255,.04);

          border:1px solid rgba(255,255,255,.07);

          opacity:.7;
        }

        .us-inline-btn div{
  display:flex;
  flex-direction:column;
}

.us-inline-btn strong{
  font-size:15px;
  line-height:1.2;
}

.us-inline-btn span{
  margin-top:8px;

  font-size:11px;

  opacity:.65;

  line-height:1.4;
}

.us-inline-btn.danger{
  border-color:rgba(239,68,68,.22);

  background:rgba(239,68,68,.08);
}

.us-inline-btn.danger:hover{
  background:rgba(239,68,68,.14);
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

        @media(max-width:1500px){

          .us-grid{
            grid-template-columns:340px minmax(0,1fr);
          }

          .us-right{
            display:none;
          }
        }

        @media(max-width:1200px){

          .us-grid{
            grid-template-columns:1fr;
            height:auto;
          }

          .us-users-scroll{
            max-height:420px;
          }

          .us-hero{
            grid-template-columns:1fr;
          }
        }

      `}</style>

    </div>
  )
}

export default UsersPage

