import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react"

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import AppTopbar from "../components/AppTopbar"
import { API_BASE } from "../config"

async function refreshAccessToken() {
  try {
    const refreshToken =
      localStorage.getItem(
        "refreshToken"
      )

    if (!refreshToken)
      return null

    const res = await fetch(
      `${API_BASE}/api/users/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          refreshToken,
        }),
      }
    )

    const data =
      await res.json()

    if (data?.accessToken) {
      localStorage.setItem(
        "token",
        data.accessToken
      )

      return data.accessToken
    }

    return null
  } catch (err) {
    console.error(err)
    return null
  }
}

async function fetchWithAuth(
  url,
  options = {}
) {
  let token =
    localStorage.getItem(
      "token"
    )

  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status !== 401)
    return res

  const newToken =
    await refreshAccessToken()

  if (!newToken) {
    localStorage.clear()

    window.location.href =
      "/login"

    throw new Error(
      "Session expired"
    )
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

  const diff = Math.floor(
    (now - d) / 1000
  )

  if (diff < 60)
    return "just now"

  const mins = Math.floor(
    diff / 60
  )

  if (mins < 60)
    return `${mins} mins ago`

  const hrs = Math.floor(
    mins / 60
  )

  if (hrs < 24)
    return `${hrs} hrs ago`

  return `${Math.floor(
    hrs / 24
  )} days ago`
}

function AdminDashboard() {
  const [loading, setLoading] =
    useState(true)

  const [tickets, setTickets] =
    useState([])

  const [users, setUsers] =
    useState([])

  const [
    organization,
    setOrganization,
  ] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard =
    async () => {
      try {
        setLoading(true)

        const [
          profileRes,
          ticketRes,
          usersRes,
        ] = await Promise.all([
          fetchWithAuth(
            `${API_BASE}/api/users/me`
          ),

          fetchWithAuth(
            `${API_BASE}/api/tickets?limit=1000`
          ),

          fetchWithAuth(
            `${API_BASE}/api/users`
          ),
        ])

        const profileData =
          await profileRes.json()

        const ticketData =
          await ticketRes.json()

        const usersData =
          await usersRes.json()

        setOrganization(
          profileData.user
            ?.organization
        )

        setTickets(
          Array.isArray(
            ticketData.data
          )
            ? ticketData.data
            : []
        )

        setUsers(
          Array.isArray(usersData)
            ? usersData
            : []
        )
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }


  const analytics =
    useMemo(() => {
      const total =
        tickets.length

      const open =
        tickets.filter(
          (t) =>
            t.status ===
            "OPEN"
        ).length

      const progress =
        tickets.filter((t) =>
          [
            "ASSIGNED",
            "IN_PROGRESS",
          ].includes(
            t.status
          )
        ).length

      const closed =
        tickets.filter(
          (t) =>
            t.status ===
            "CLOSED"
        ).length

      const pending =
        tickets.filter(
          (t) =>
            t.status ===
            "RESOLVED_PENDING_CONFIRMATION"
        ).length

      const reopened =
        tickets.filter(
          (t) =>
            t.status ===
            "REOPENED"
        ).length

if (!organization) {
  return {
    total: tickets.length,
    open: 0,
    progress: 0,
    closed: 0,
    pending: 0,
    reopened: 0,
    technicians: 0,
    residents: 0,
    health: 0,
  }
}

const orgId =
  organization._id

const orgUsers = users.filter((u) => {
  const userOrg =
    typeof u.organization === "object"
      ? u.organization?._id
      : u.organization

  return (
    String(userOrg) ===
    String(orgId)
  )
})

const technicians =
  orgUsers.filter(
    (u) =>
      u.role === "technician"
  ).length

const residents =
  orgUsers.filter(
    (u) =>
      u.role === "resident"
  ).length

      const health = total
        ? Math.round(
            (closed /
              total) *
              100
          )
        : 0

      return {
        total,
        open,
        progress,
        closed,
        pending,
        reopened,
        technicians,
        residents,
        health,
      }
    }, [tickets, users])

  const chartData = useMemo(() => {
  const days = [
    { name: "Mon", value: 0 },
    { name: "Tue", value: 0 },
    { name: "Wed", value: 0 },
    { name: "Thu", value: 0 },
    { name: "Fri", value: 0 },
    { name: "Sat", value: 0 },
    { name: "Sun", value: 0 },
  ]

  tickets.forEach((ticket) => {
    const date = new Date(ticket.createdAt)

    const index =
      date.getDay() === 0
        ? 6
        : date.getDay() - 1

    days[index].value += 1
  })

  return days
}, [tickets])

  const statusData = [
    {
      name: "Open",
      value: analytics.open,
    },
    {
      name: "Progress",
      value:
        analytics.progress,
    },
    {
      name: "Closed",
      value:
        analytics.closed,
    },
    {
      name: "Pending",
      value:
        analytics.pending,
    },
  ]

  const radarData = [
    {
      subject:
        "Infrastructure",
      value:
        analytics.health,
    },
    {
      subject: "SLA",
      value: 72,
    },
    {
      subject:
        "Efficiency",
      value: 84,
    },
    {
      subject:
        "Response",
      value: 77,
    },
    {
      subject:
        "Operations",
      value: 80,
    },
  ]

  const recentTickets =
    [...tickets]
      .sort(
        (a, b) =>
          new Date(
            b.updatedAt
          ) -
          new Date(
            a.updatedAt
          )
      )
      .slice(0, 6)

  if (loading) {
    return (
      <div className="adm-loading">
        <motion.div
          className="adm-loader"
          animate={{
            rotate: 360,
          }}
          transition={{
            repeat:
              Infinity,
            duration: 1,
            ease: "linear",
          }}
        />

        <h2>
          Initializing
          Admin Layer...
        </h2>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <AppTopbar />

      <motion.div
        className="adm-blob one"
        animate={{
          x: [0, 50, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 20,
          repeat:
            Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="adm-blob two"
        animate={{
          x: [0, -40, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 24,
          repeat:
            Infinity,
          ease: "easeInOut",
        }}
      />

      <main className="adm-shell">
        {/* HERO */}

        <section className="adm-hero">
          <div className="adm-hero-left">
            <div className="adm-badge">
              <Sparkles size={12} />
              Organization
              Intelligence
              Core
            </div>

            <h1>
              Electrical
              Operations
              Matrix
            </h1>

            <p>
              Monitoring
              live
              infrastructure
              operations,
              maintenance
              performance,
              technician
              coordination,
              and
              operational
              service
              health.
            </p>

            <div className="adm-pills">
              <div>
                <Building2
                  size={13}
                />
                {organization?.name ||
                  "Organization"}
              </div>

              <div>
                <Users
                  size={13}
                />
                {
                  analytics.residents
                }{" "}
                Residents
              </div>

              <div>
                <Wrench
                  size={13}
                />
                {
                  analytics.technicians
                }{" "}
                Technicians
              </div>
            </div>
          </div>

          <div className="adm-health-panel">
            <div className="adm-ring">
              <div className="adm-ring-inner">
                <strong>
                  {
                    analytics.health
                  }
                  %
                </strong>

                <span>
                  System
                  Stability
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* METRIC RAIL */}

        <section className="adm-metric-rail">
          {[
            {
              label:
                "Operations",
              value:
                analytics.total,
            },

            {
              label: "Open",
              value:
                analytics.open,
            },

            {
              label:
                "In Progress",
              value:
                analytics.progress,
            },

            {
              label:
                "Resolved",
              value:
                analytics.closed,
            },

            {
              label:
                "Pending",
              value:
                analytics.pending,
            },

            {
              label:
                "Reopened",
              value:
                analytics.reopened,
            },
          ].map(
            (
              item,
              index
            ) => (
              <div
                key={
                  item.label
                }
                className="adm-metric-item"
              >
                <div className="adm-metric-dot" />

                <div className="adm-metric-content">
                  <span>
                    {
                      item.label
                    }
                  </span>

                  <strong>
                    {
                      item.value
                    }
                  </strong>
                </div>

                {index !==
                  5 && (
                  <div className="adm-metric-divider" />
                )}
              </div>
            )
          )}
        </section>

        {/* GRID */}

        <div className="adm-grid">
          {/* LEFT */}

          <section className="adm-left">
            {/* CHART */}

            <div className="adm-panel">
              <div className="adm-panel-top">
                <div>
                  <h2>
                    Operational
                    Activity
                  </h2>

                  <p>
                    Weekly
                    operational
                    ticket
                    movement
                    and
                    service
                    activity.
                  </p>
                </div>
              </div>

              <div className="adm-chart-wrap">
                <div className="adm-fixed-chart">
                  <AreaChart
                    width={900}
                    height={260}
                    data={chartData}
                  >
                    <defs>
                      <linearGradient
                        id="grad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={
                            0.55
                          }
                        />

                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity={
                            0.04
                          }
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="rgba(255,255,255,.05)"
                      vertical={
                        false
                      }
                    />

                    <XAxis
                      dataKey="name"
                      tick={{
                        fill:
                          "rgba(255,255,255,.5)",
                        fontSize: 11,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <YAxis
                      tick={{
                        fill:
                          "rgba(255,255,255,.5)",
                        fontSize: 11,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <Tooltip
                    contentStyle={{
                        background:"rgba(18,18,18,.95)",
                        border:"1px solid rgba(255,255,255,.08)",
                        borderRadius:"14px",
                        fontSize:"12px",
                        color:"white"
                    }}
                    formatter={(value, name) => [
                        `${value} tickets`,
                        name
                    ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={
                        3
                      }
                      fill="url(#grad)"
                    />
                  </AreaChart>
                  
                </div>
              </div>
            </div>

            {/* LOWER */}

            <div className="adm-lower-grid">
              {/* PIE */}

              <div className="adm-panel small">
                <div className="adm-panel-top">
                  <div>
                    <h2>
                      Ticket
                      Distribution
                    </h2>

                    <p>
                      Status
                      allocation
                      overview.
                    </p>
                  </div>
                </div>

                <div className="adm-small-chart">
                    <div className="adm-fixed-pie">
                      <PieChart
                        width={260}
                        height={220}
                      >
                    
                        <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                        >
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#14b8a6" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#6f875a" />
                        </Pie>

                        <Tooltip
                        cursor={false}
                        formatter={(value, name) => [
                            `${value} tickets`,
                            name,
                        ]}
                        contentStyle={{
                            background:
                            "rgba(18,18,18,.96)",
                            border:
                            "1px solid rgba(255,255,255,.08)",
                            borderRadius: "14px",
                            color: "white",
                            fontSize: "12px",
                        }}
                        itemStyle={{
                            color: "white",
                        }}
                        labelStyle={{
                            display: "none",
                        }}
                        />
                    </PieChart>
                      
                    </div>
                </div>
              </div>

              <div className="adm-panel small">
                <div className="adm-panel-top">
                    <div>
                    <h2>
                        Operational Insights
                    </h2>

                    <p>
                        Real-time organizational
                        operational observations.
                    </p>
                    </div>
                </div>

                <div className="adm-insights">
                    <div className="adm-insight-card">
                    <span>
                        Resolution Efficiency
                    </span>

                    <strong>
                        {analytics.total
                        ? Math.round(
                            (analytics.closed /
                                analytics.total) *
                                100
                            )
                        : 0}
                        %
                    </strong>
                    </div>

                    <div className="adm-insight-card">
                    <span>
                        Reopen Ratio
                    </span>

                    <strong>
                        {analytics.total
                        ? Math.round(
                            (analytics.reopened /
                                analytics.total) *
                                100
                            )
                        : 0}
                        %
                    </strong>
                    </div>

                    <div className="adm-insight-card">
                    <span>
                        Pending Confirmation
                    </span>

                    <strong>
                        {
                        analytics.pending
                        }
                    </strong>
                    </div>

                    <div className="adm-insight-card">
                    <span>
                        Active Operational Load
                    </span>

                    <strong>
                        {
                        analytics.progress
                        }
                    </strong>
                    </div>
                </div>
                </div>
            </div>

            {/* LIVE FEED */}

            <div className="adm-panel">
              <div className="adm-panel-top">
                <div>
                  <h2>
                    Live
                    Incident
                    Stream
                  </h2>

                  <p>
                    Recent
                    operational
                    ticket
                    activity.
                  </p>
                </div>
              </div>

              <div className="adm-feed">
                {recentTickets.map(
                  (
                    ticket
                  ) => (
                    <div
                      key={
                        ticket._id
                      }
                      className="adm-feed-card"
                    >
                      <div className="adm-feed-left">
                        <div className="adm-feed-dot" />

                        <div>
                          <strong>
                            {
                              ticket.title
                            }
                          </strong>

                          <p>
                            Updated{" "}
                            {formatTime(
                              ticket.updatedAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`adm-status ${ticket.status}`}
                      >
                        {
                          ticket.status
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          {/* RIGHT */}

          <aside className="adm-right">
            {/* NETWORK */}

            <div className="adm-side-panel">
              <div className="adm-panel-top">
                <div>
                  <h2>
                    Workforce
                    Network
                  </h2>

                  <p>
                    Technician
                    coordination
                    and
                    operational
                    utilization.
                  </p>
                </div>
              </div>

              <div className="adm-network-matrix">
                <div>
                  <span>
                    TECHNICIANS
                  </span>

                  <strong>
                    {
                      analytics.technicians
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    ASSIGNED
                    OPS
                  </span>

                  <strong>
                    {
                      tickets.filter(
                        (
                          t
                        ) =>
                          t.assignedTo
                      ).length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    ACTIVE
                    OPS
                  </span>

                  <strong>
                    {
                      analytics.progress
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    COMPLETED
                  </span>

                  <strong>
                    {
                      analytics.closed
                    }
                  </strong>
                </div>
              </div>
            </div>

            {/* ALERTS */}

            <div className="adm-side-panel">
              <div className="adm-panel-top">
                <div>
                  <h2>
                    Priority
                    Escalation
                    Matrix
                  </h2>

                  <p>
                    Operational
                    escalation
                    overview.
                  </p>
                </div>
              </div>

              <div className="adm-alert-grid">
                <div>
                  <span>
                    CRITICAL
                  </span>

                  <strong>
                    {
                      tickets.filter(
                        (
                          t
                        ) =>
                          t.priority ===
                            "HIGH" ||
                          t.priority ===
                            "CRITICAL"
                      ).length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    PENDING
                  </span>

                  <strong>
                    {
                      analytics.pending
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    OPEN
                  </span>

                  <strong>
                    {
                      analytics.open
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    REOPENED
                  </span>

                  <strong>
                    {
                      analytics.reopened
                    }
                  </strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <style>{`
        .adm-page{
          min-height:100vh;
          position:relative;
          overflow:hidden;
        }

        .adm-shell{
          max-width:1500px;
          margin:0 auto;
          padding:28px 20px 70px;
          position:relative;
          z-index:2;
        }

        .adm-blob{
          position:absolute;
          border-radius:50%;
          filter:blur(120px);
          opacity:.15;
          pointer-events:none;
        }

        .adm-blob.one{
          width:320px;
          height:320px;
          background:#8b5cf6;
          top:100px;
          left:-100px;
        }

        .adm-blob.two{
          width:320px;
          height:320px;
          background:#6f875a;
          right:-100px;
          bottom:80px;
        }

        .adm-hero{
          display:grid;
          grid-template-columns:1.15fr 280px;
          gap:18px;
          margin-bottom:18px;
        }

        .adm-hero-left,
        .adm-health-panel{
          border-radius:26px;
          backdrop-filter:blur(18px);
        }

        .adm-hero-left{
          padding:28px;
        }

        .adm-badge{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:7px 12px;
          border-radius:999px;
          background:rgba(139,92,246,.15);
          border:1px solid rgba(139,92,246,.22);
          font-size:11px;
          color:#e9d5ff;
          margin-bottom:18px;
        }

        .adm-hero-left h1{
          margin:0;
          font-size:54px;
          line-height:1.02;
          letter-spacing:-1.6px;
        }

        .adm-hero-left p{
          margin:18px 0 0;
          max-width:760px;
          line-height:1.7;
          opacity:.68;
          font-size:14px;
        }

        .adm-pills{
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin-top:24px;
        }

        .adm-pills div{
          display:flex;
          align-items:center;
          gap:8px;
          padding:10px 14px;
          border-radius:12px;
          background:rgba(255,255,255,.045);
          border:1px solid rgba(255,255,255,.07);
          font-size:12px;
        }

        .adm-health-panel{
          display:grid;
          place-items:center;
        }

        .adm-ring{
          width:180px;
          height:180px;
          border-radius:50%;
          background:
            conic-gradient(
              #8b5cf6 0deg,
              #6f875a ${analytics.health * 3.6}deg,
              rgba(255,255,255,.08) 0deg
            );
          display:grid;
          place-items:center;
        }

        .adm-ring-inner{
          width:138px;
          height:138px;
          border-radius:50%;
          background:#0d0d0d;
          border:1px solid rgba(255,255,255,.08);

          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
        }

        .adm-ring-inner strong{
          font-size:38px;
        }

        .adm-ring-inner span{
          margin-top:8px;
          font-size:11px;
          opacity:.62;
        }

        .adm-metric-rail{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;

          padding:16px 18px;

          margin-bottom:18px;

          border-radius:18px;

          background:
            rgba(255,255,255,.045);

          border:
            1px solid rgba(255,255,255,.08);

          overflow-x:auto;
        }

        .adm-metric-item{
          display:flex;
          align-items:center;
          gap:12px;
          min-width:140px;
          flex-shrink:0;
        }

        .adm-metric-dot{
          width:10px;
          height:10px;
          border-radius:50%;

          background:
            linear-gradient(
              135deg,
              #8b5cf6,
              #6f875a
            );

          box-shadow:
            0 0 12px rgba(139,92,246,.4);
        }

        .adm-metric-content{
          display:flex;
          flex-direction:column;
          gap:3px;
        }

        .adm-metric-content span{
          font-size:10px;
          letter-spacing:.8px;
          opacity:.58;
          text-transform:uppercase;
        }

        .adm-metric-content strong{
          font-size:28px;
          line-height:1;
        }

        .adm-metric-divider{
          width:1px;
          height:38px;

          background:
            linear-gradient(
              to bottom,
              transparent,
              rgba(255,255,255,.08),
              transparent
            );
        }

        .adm-grid{
          display:grid;
          grid-template-columns:minmax(0,1.12fr) 330px;
          gap:18px;
        }

        .adm-left{
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .adm-panel,
        .adm-side-panel{
          border-radius:24px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
          overflow:hidden;
          backdrop-filter:blur(18px);
        }

        .adm-panel-top{
          padding:18px 22px;
          border-bottom:1px solid rgba(255,255,255,.05);
        }

        .adm-panel-top h2{
          margin:0;
          font-size:20px;
        }

        .adm-panel-top p{
          margin:6px 0 0;
          font-size:12px;
          line-height:1.5;
          opacity:.64;
        }

        .adm-chart-wrap{
          position:relative;
          height:260px;
          min-height:260px;
          width:100%;
          min-width:0;
        }

        .adm-lower-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:18px;
        }

        .adm-panel.small{
          min-height:280px;
        }

        .adm-small-chart{
          position:relative;
          height:220px;
          min-height:220px;
          width:100%;
          min-width:0;
        }

        .recharts-responsive-container{
          min-width:0 !important;
        }

        .adm-left,
        .adm-right,
        .adm-panel,
        .adm-panel.small{
          min-width:0;
        }

        .adm-feed{
          display:flex;
          flex-direction:column;
          gap:12px;
          padding:18px;
          max-height:360px;
          overflow-y:auto;
        }

        .adm-feed::-webkit-scrollbar{
          width:0;
          height:0;
        }

        .adm-feed-card{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;

          padding:14px 16px;

          border-radius:16px;

          background:
            rgba(255,255,255,.045);

          border:
            1px solid rgba(255,255,255,.06);
        }

        .adm-feed-left{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .adm-feed-dot{
          width:10px;
          height:10px;
          border-radius:50%;
          background:#8b5cf6;
          flex-shrink:0;
        }

        .adm-feed-left strong{
          display:block;
          font-size:13px;
        }

        .adm-feed-left p{
          margin:4px 0 0;
          font-size:11px;
          opacity:.6;
        }

        .adm-status{
          padding:8px 11px;
          border-radius:999px;
          font-size:10px;
          font-weight:600;
          white-space:nowrap;
        }

        .adm-status.OPEN{
          background:rgba(239,68,68,.14);
          color:#fecaca;
        }

        .adm-status.CLOSED{
          background:rgba(34,197,94,.14);
          color:#bbf7d0;
        }

        .adm-status.IN_PROGRESS{
          background:rgba(59,130,246,.14);
          color:#bfdbfe;
        }

        .adm-status.ASSIGNED{
          background:rgba(245,158,11,.14);
          color:#fde68a;
        }

        .adm-status.REOPENED{
          background:rgba(168,85,247,.14);
          color:#e9d5ff;
        }

        .adm-status.RESOLVED_PENDING_CONFIRMATION{
          background:rgba(20,184,166,.14);
          color:#99f6e4;
        }

        .adm-right{
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .adm-network-matrix,
        .adm-alert-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          padding:18px;
        }

        .adm-network-matrix div,
        .adm-alert-grid div{
          padding:16px;
          border-radius:16px;
          background:rgba(255,255,255,.045);
          border:1px solid rgba(255,255,255,.06);
        }

        .adm-network-matrix span,
        .adm-alert-grid span{
          display:block;
          font-size:10px;
          letter-spacing:1px;
          opacity:.58;
          margin-bottom:8px;
        }

        .adm-network-matrix strong,
        .adm-alert-grid strong{
          font-size:30px;
          line-height:1;
        }

        .adm-loading{
          min-height:100vh;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:24px;
        }

        .adm-loader{
          width:90px;
          height:90px;
          border-radius:50%;
          border:4px solid rgba(255,255,255,.08);
          border-top-color:#8b5cf6;
        }

        @media(max-width:1200px){

          .adm-grid{
            grid-template-columns:1fr;
          }

          .adm-hero{
            grid-template-columns:1fr;
          }
        }

        @media(max-width:800px){

          .adm-lower-grid{
            grid-template-columns:1fr;
          }

          .adm-hero-left h1{
            font-size:42px;
          }
        }

        @media(max-width:640px){

          .adm-network-matrix,
          .adm-alert-grid{
            grid-template-columns:1fr;
          }

          .adm-shell{
            padding:18px 12px 60px;
          }
        }
          .adm-insights{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;

  padding:18px;
}

.adm-insight-card{
  padding:18px;

  border-radius:18px;

  background:
    rgba(255,255,255,.045);

  border:
    1px solid rgba(255,255,255,.06);
}

.adm-insight-card span{
  display:block;

  font-size:11px;

  letter-spacing:.6px;

  opacity:.58;

  line-height:1.5;
}

.adm-insight-card strong{
  display:block;

  margin-top:10px;

  font-size:30px;

  line-height:1;
}
  .adm-panel,
  .adm-panel.small,
  .adm-small-chart,
  .adm-chart-wrap{
    min-width:0;
  }
  .adm-fixed-pie{
  width:100%;
  height:220px;

  display:flex;
  align-items:center;
  justify-content:center;

  overflow:hidden;
}

.adm-fixed-pie .recharts-wrapper{
  margin:0 auto !important;
}
      `}</style>
    </div>
  )
}

export default AdminDashboard