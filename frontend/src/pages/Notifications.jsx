import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AppTopbar from "../components/AppTopbar"
import { io } from "socket.io-client"
import { API_BASE } from "../config"

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
  localStorage.setItem("notificationsOpened", Date.now())
}, [])

  const navigate = useNavigate()

  const token = localStorage.getItem("token")

  const user = JSON.parse(localStorage.getItem("user") || "{}")

const userId = user._id || user.id

  const formatTime = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)

    const seconds = Math.floor((now - date) / 1000)

    if (seconds < 60) return "Just now"

    const minutes = Math.floor(seconds / 60)

    if (minutes < 60) {
      return `${minutes} min ago`
    }

    const hours = Math.floor(minutes / 60)

    if (hours < 24) {
      return `${hours} hr${hours > 1 ? "s" : ""} ago`
    }

    const days = Math.floor(hours / 24)

    return `${days} day${days > 1 ? "s" : ""} ago`
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)

      const res = await fetch(
        `${API_BASE}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await res.json()

      if (data.success) {
        setNotifications(data.data)
      }

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await fetch(
        `${API_BASE}/api/notifications/${id}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? { ...n, isRead: true }
            : n
        )
      )

      window.dispatchEvent(
  new CustomEvent("notification-read")
)

    } catch (error) {
      console.error(error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch(
        `${API_BASE}/api/notifications/read-all`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
        }))
      )

      window.dispatchEvent(
  new Event("notifications-read")
)

    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {

  if (!userId) return

  const socket = io(API_BASE)

  socket.emit("join", userId)

  socket.on("notification", (newNotification) => {

    setNotifications((prev) => {

      const alreadyExists = prev.some(
        (item) => item._id === newNotification._id
      )

      if (alreadyExists) return prev

      return [newNotification, ...prev]
    })
  })

  return () => {
    socket.disconnect()
  }

}, [userId])

  return (
    <div style={{ minHeight: "100vh" }}>

      <AppTopbar />

      <div
        style={{
          maxWidth: "950px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >

          <div>
            <h1
              style={{
                fontSize: "30px",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              Notifications
            </h1>

            <p style={{ opacity: 0.65 }}>
              Real-time system activity and updates
            </p>
          </div>

          <button
            onClick={markAllAsRead}
            style={{
              padding: "10px 18px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.06)",
              color: "#d6c2a8",
              cursor: "pointer",
            }}
          >
            Mark all as read
          </button>

        </div>

        {loading ? (
          <div style={{ opacity: 0.6 }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ opacity: 0.6 }}>
            No notifications yet
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >

            {notifications.map((item) => (

              <div
                key={item._id}
                onClick={() => {
                  markAsRead(item._id)

                  if (item.link) {
                    navigate(item.link)
                  }
                }}
                style={{
                  background: item.isRead
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(166,138,100,0.12)",

                  border: item.isRead
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(214,194,168,0.2)",

                  borderRadius: "18px",
                  padding: "18px",
                  cursor: "pointer",
                  transition: "0.25s ease",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                  }}
                >

                  <div>

                    <h3
                      style={{
                        fontSize: "16px",
                        marginBottom: "6px",
                        color: item.isRead
                          ? "#f5f1eb"
                          : "#e6d2b5",
                      }}
                    >
                      {item.title || "Notification"}
                    </h3>

                    <p
                      style={{
                        opacity: 0.78,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.message}
                    </p>

                  </div>

                  <span
                    style={{
                      fontSize: "12px",
                      opacity: 0.55,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatTime(item.createdAt)}
                  </span>

                </div>

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "5px 10px",
                      borderRadius: "999px",
                      background: "rgba(214,194,168,0.12)",
                      color: "#d6c2a8",
                      textTransform: "capitalize",
                    }}
                  >
                    {item.type || "system"}
                  </span>

                  {!item.isRead && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#d6c2a8",
                      }}
                    />
                  )}

                </div>

              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications