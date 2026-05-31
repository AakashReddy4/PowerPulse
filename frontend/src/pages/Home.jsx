import AppTopbar from "../components/AppTopbar"
import { Users, Cpu, Ticket, Wrench, Bell, Clock, FileText, Workflow } from "lucide-react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useState,useEffect } from "react"
import { refreshAccessToken } from "../utils/auth"
import { API_BASE } from "../config"


function Home() {
  const storedUser = localStorage.getItem("user")
  const user = storedUser ? JSON.parse(storedUser) : null
  const role = user?.role
  const navigate=useNavigate()

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    extra: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
    try {
      let token = localStorage.getItem("token")

      if (!token) {
        console.error("No token found")
        return
      }

      let res = await fetch(`${API_BASE}/api/tickets?limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.status === 401) {
        const newToken = await refreshAccessToken()

        if (!newToken) {
          localStorage.clear()
          window.location.href = "/login"
          return
        }

        // retry request
        res = await fetch(`${API_BASE}/api/tickets?limit=1000`, {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        })
      }

      const resData = await res.json()

      const tickets = resData.data || []

      const user = JSON.parse(localStorage.getItem("user"))

      let filtered = tickets

      if (user.role === "resident") {
        filtered = tickets.filter(t => {
          const creator =
            typeof t.createdBy === "object"
              ? t.createdBy?._id
              : t.createdBy

          return (
  creator === user.id ||
  creator === user._id
)
        })
      }

      if (user.role === "technician") {
        filtered = tickets.filter(t => {
          const assigned =
            typeof t.assignedTo === "object"
              ? t.assignedTo?._id
              : t.assignedTo

          return (
  assigned === user.id ||
  assigned === user._id
)
        })
      }

const total = filtered.length

const open = filtered.filter(
  t =>
    t.status === "OPEN" ||
    t.status === "REOPENED"
).length

const active = filtered.filter(
  t =>
    t.status === "ASSIGNED" ||
    t.status === "IN_PROGRESS" ||
    t.status === "RESOLVED_PENDING_CONFIRMATION"
).length

const closed = filtered.filter(
  t => t.status === "CLOSED"
).length

setStats({
  total,
  open,
  closed,
  extra: active,
})

    } catch (err) {
      console.error("Stats error:", err)
    }
    }

    fetchStats()
  }, [])

const labels = {
  admin: [
    "Total Operations",
    "Open Queue",
    "Closed Operations",
    "Active Operations",
  ],

  resident: [
    "My Tickets",
    "Open Requests",
    "Closed Requests",
    "Active Requests",
  ],

  technician: [
    "Assigned Tickets",
    "Open Queue",
    "Completed Tasks",
    "Active Tasks",
  ],
}

  return (
    <div className="min-h-screen">
      <AppTopbar />

      <main
        style={{
          minHeight: "calc(100vh - 64px)",
          paddingTop: "24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1120px",
            paddingLeft: "60px",
            paddingRight: "30px",
            display: "grid",
            gridTemplateColumns: "48% 52%",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {/* LEFT SIDE */}
          <div className="w-full flex justify-start -mt-10">

            <div className="w-full max-w-[480px] space-y-5">

              {/* HEADER (OUTSIDE CARD) */}
              <div className="pl-1">
                <h2 className="text-xl font-semibold">
                  Hi, {user?.name || "User"} 👋
                </h2>

                <p className="text-sm text-khaki_beige/70 mt-1">
                  Here’s what’s happening today
                </p>
              </div>

              {/* MAIN CARD */}
              <div className="pp-left-panel">

                {/* STATS */}
                <div className="pp-left-stats">

                  <div className="pp-stat-card">
                    <span>{labels[role][0]}</span>
                    <h3>{stats.total}</h3>
                  </div>

                  <div className="pp-stat-card">
                    <span>{labels[role][1]}</span>
                    <h3>{stats.open}</h3>
                  </div>

                  <div className="pp-stat-card">
                    <span>{labels[role][2]}</span>
                    <h3>{stats.closed}</h3>
                  </div>

                  <div className="pp-stat-card">
                    <span>{labels[role][3]}</span>
                    <h3>{stats.extra}</h3>
                  </div>

                </div>

                {/* CTA */}
                <div className="pp-left-cta">
                  <p>
                    {role === "admin" &&
                      `${stats.extra} active operational workflows`
                    }

                    {role === "resident" &&
                      `${stats.extra} requests currently in progress`
                    }

                    {role === "technician" &&
                      `${stats.extra} operational tasks underway`
                    }
                  </p>

                  <button onClick={() => navigate("/notifications")} className="cursor-pointer">
                    View Details →
                  </button>
                </div>

              </div>

            </div>

          </div>

          {/* RIGHT SIDE */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop:"40px" }} >
            <div className="pp-system scale-[0.88]">
              {/* CENTER */}
              <div className="pp-core flex flex-col items-center justify-center">
                <div className="hub-center-content">
                <span>
                  {user?.organizationName || "Organization"}
                </span>
                <br/>
                <span className="text-xs opacity-70 mt-1">
                  Control Hub
                </span>
                <br/>
                {
                  role==="admin" && (
                    <motion.div
                  className="hub-dashboard-link cursor-pointer "
                  whileHover={{
                    scale: 1.04,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={() => navigate("/admin/dashboard")}
                >
                  <span>Open Dashboard</span>

                  <motion.div
                    className="hub-dashboard-arrow"
                    animate={{
                      x: [0, 4, 0],
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    →
                  </motion.div>
                </motion.div>
                  )
                }
              </div>

              </div>

              {/* ADMIN */}
              {role === "admin" && (
                <>
                  <svg viewBox="0 0 720 560" className="pp-svg">
                    <line x1="360" y1="280" x2="360" y2="70" className="pp-line" />
                    <line x1="360" y1="280" x2="205" y2="180" className="pp-line" />
                    <line x1="360" y1="280" x2="515" y2="180" className="pp-line" />
                    <line x1="360" y1="280" x2="255" y2="450" className="pp-line" />
                    <line x1="360" y1="280" x2="465" y2="450" className="pp-line" />
                  </svg>

                  <Node title="Users" onClick={()=>navigate("/users")} icon={<Users size={20} />} top="12%" left="50%" size="x-lg"/>
                  <Node title="Assets" onClick={()=>navigate("/assets")} icon={<Cpu size={20} />} top="32%" left="24%" size="x-lg"/>
                  <Node title="Tickets" onClick={()=>navigate("/admin/tickets")} icon={<Ticket size={20} />} top="32%" left="76%" size="x-lg"/>
                  <Node title="Maintenance" onClick={()=>navigate("/maintenance")} icon={<Wrench size={20} />} top="80%" left="34%" size="x-lg" />
                  <Node title="Digital Twin" onClick={()=>navigate("/digital-twin")} icon={<Workflow size={20} />} top="80%" left="66%" size="x-lg" />
                </>
              )}

              {/* RESIDENT */}
              {role === "resident" && (
                <>
                  <svg viewBox="0 0 720 560" className="pp-svg">
                    <line x1="360" y1="280" x2="360" y2="84" className="pp-line" />
                    <line x1="360" y1="280" x2="216" y2="436" className="pp-line" />
                    <line x1="360" y1="280" x2="504" y2="436" className="pp-line" />
                  </svg>

                  <Node title="Tickets" onClick={()=>navigate("/tickets")} icon={<Ticket size={20} />} top="15%" left="50%" size="x-lg"/>
                  <Node title="My Requests" onClick={()=>navigate("/my-requests")} icon={<FileText size={20} />} top="78%" left="30%" size="x-lg"/>
                  <Node title="Notifications" onClick={()=>navigate("/notifications")} icon={<Bell size={20} />} top="78%" left="70%" size="x-lg" />
                </>
              )}

              {/* TECHNICIAN */}
              {role === "technician" && (
                <>
                  <svg viewBox="0 0 720 560" className="pp-svg">
                    <line x1="360" y1="280" x2="360" y2="84" className="pp-line" />
                    <line x1="360" y1="280" x2="216" y2="436" className="pp-line" />
                    <line x1="360" y1="280" x2="504" y2="436" className="pp-line" />
                  </svg>

                  <Node
                    title={"Assigned\nTickets"}
                    icon={<Ticket size={20} />}
                    top="15%"
                    left="50%"
                    size="x-lg"
                    onClick={() => navigate("/assigned-tickets")}
                  />

                  <Node
                    title="Notifications"
                    icon={<Bell size={20} />}
                    top="78%"
                    left="30%"
                    size="x-lg"
                    onClick={() => navigate("/notifications")}
                  />

                  <Node
                    title={"Work\nHistory"}
                    icon={<Clock size={20} />}
                    top="78%"
                    left="70%"
                    size="x-lg"
                    onClick={() => navigate("/work-history")}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Node({ title, icon, top, left, size = "sm", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`pp-node ${size === "lg" ? "pp-node--lg" : ""}`}
      style={{ top, left }}
    >
      <div className="pp-node-inner">
        <div className="pp-node-icon">{icon}</div>
        <span className="pp-node-title">{title}</span>
      </div>
    </div>
  )
}
<style>{`
.hub-center-content{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;

  height:100%;
  width:100%;
}

.hub-center-content h3{
  margin:0;

  line-height:1.4;
  text-align:center;

  font-size:30px;
  font-weight:600;

  color:white;
}

.hub-dashboard-link{
  margin-top:28px;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:10px;

  padding:10px 16px;

  border-radius:999px;

  background:
    rgba(255,255,255,0.04);

  border:
    1px solid rgba(255,255,255,0.08);

  backdrop-filter:blur(10px);

  color:rgba(255,255,255,0.82);

  font-size:12px;
  font-weight:500;
  letter-spacing:.3px;

  cursor:pointer;

  transition:.3s ease;

  position:relative;

  overflow:hidden;
}

.hub-dashboard-link::before{
  content:"";

  position:absolute;
  inset:0;

  background:
    linear-gradient(
      120deg,
      transparent,
      rgba(255,255,255,0.06),
      transparent
    );

  transform:translateX(-120%);
  transition:.7s ease;
}

.hub-dashboard-link:hover::before{
  transform:translateX(120%);
}

.hub-dashboard-link:hover{
  background:
    rgba(139,92,246,0.12);

  border-color:
    rgba(139,92,246,0.22);

  color:white;

  box-shadow:
    0 0 20px rgba(139,92,246,0.12);
}

.hub-dashboard-arrow{
  width:18px;
  height:18px;

  border-radius:50%;

  display:grid;
  place-items:center;

  background:
    rgba(255,255,255,0.06);

  font-size:11px;
}
`}</style>

export default Home