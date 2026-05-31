import { Bell, Info, User } from "lucide-react"
import logo from "../assets/logo.svg"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import { API_BASE } from "../config"

function AppTopbar() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const dropdownRef = useRef()
  const navigate = useNavigate()

  const user = JSON.parse(localStorage.getItem("user"))

  const userId = user?._id || user?.id

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/"
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token")

        if (!token) return

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

          const unread = data.data.filter(
            (n) => !n.isRead
          ).length

          setUnreadCount(unread)
        }

      } catch (error) {
        console.error("Notification fetch error:", error)
      }
    }

    fetchNotifications()
  }, [])

  useEffect(() => {
    if (!userId) return

    const socket = io(API_BASE)

    socket.emit("join", userId)

    socket.on("notification", (newNotification) => {

      setNotifications((prev) => [
        newNotification,
        ...prev,
      ])

      setUnreadCount((prev) => prev + 1)
    })

    return () => {
      socket.disconnect()
    }
  }, [userId])

  useEffect(() => {

  const handleSingleRead = () => {

    setUnreadCount((prev) =>
      prev > 0 ? prev - 1 : 0
    )
  }

  window.addEventListener(
    "notification-read",
    handleSingleRead
  )

  return () => {
    window.removeEventListener(
      "notification-read",
      handleSingleRead
    )
  }

}, [])

  useEffect(() => {

  const syncUnread = () => {

    const unread = notifications.filter(
      (n) => !n.isRead
    ).length

    setUnreadCount(unread)
  }

  syncUnread()

}, [notifications])

useEffect(() => {

  const handleAllRead = () => {

    setUnreadCount(0)

    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        isRead: true,
      }))
    )
  }

  window.addEventListener(
    "notifications-read",
    handleAllRead
  )

  return () => {
    window.removeEventListener(
      "notifications-read",
      handleAllRead
    )
  }

}, [])

  return (
    <header className="w-full sticky top-0 z-50 bg-charcoal_brown/20 backdrop-blur-md">

      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 h-16">

        {/* Logo */}
        <div
          onClick={() => navigate("/home")}
          className="flex items-center gap-1 cursor-pointer"
        >
          <img
            src={logo}
            alt="PowerPulse"
            className="w-auto"
          />

          <span className="text-[25px] font-semibold tracking-wide leading-none">
            PowerPulse
          </span>
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-6 text-khaki_beige">

          {/* Notification Bell */}
          <button
            onClick={() => navigate("/notifications")}
            className="relative cursor-pointer bg-transparent border-none p-2 rounded-md hover:bg-charcoal_brown/60 hover:text-dry_sage_light transition-colors duration-200"
          >
            <Bell size={20} strokeWidth={1.8} />

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -top-1
                  -right-1
                  min-w-[18px]
                  h-[18px]
                  px-1
                  flex
                  items-center
                  justify-center
                  rounded-full
                  text-[10px]
                  font-semibold
                  bg-red-500
                  text-white
                "
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* About */}
          <button
            onClick={() => navigate("/about")}
            className="cursor-pointer bg-transparent border-none p-2 rounded-md hover:bg-charcoal_brown/60 hover:text-dry_sage_light transition-colors duration-200"
          >
            <Info size={20} strokeWidth={1.8} />
          </button>

          {/* Profile */}
          <div className="relative" ref={dropdownRef}>

            <button
              onClick={() => setOpen(!open)}
              className="cursor-pointer bg-transparent border-none p-2 rounded-md hover:bg-charcoal_brown/60 hover:text-dry_sage_light transition-colors duration-200"
            >
              <User size={20} strokeWidth={1.8} />
            </button>

            <div
              className={`
                absolute right-0 mt-3 w-44 rounded-xl
                border border-white/10
                backdrop-blur-xl
                bg-white/5
                shadow-[0_8px_30px_rgba(0,0,0,0.25)]
                transition-all duration-200 origin-top-right
                ${
                  open
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                }
              `}
            >

              <button
                onClick={() => navigate("/profile")}
                className="
                  cursor-pointer w-full text-left px-4 py-2.5
                  text-sm text-khaki_beige rounded-t-xl
                  transition-all duration-200
                  hover:bg-white/10 hover:pl-5
                "
              >
                Profile
              </button>

              <div className="h-px bg-white/10 mx-2" />

              <button
                onClick={handleLogout}
                className="
                  cursor-pointer w-full text-left px-4 py-2.5
                  text-sm text-red-400 rounded-b-xl
                  transition-all duration-200
                  hover:bg-red-500/10 hover:pl-5
                "
              >
                Logout
              </button>

            </div>
          </div>

        </div>
      </div>
    </header>
  )
}

export default AppTopbar