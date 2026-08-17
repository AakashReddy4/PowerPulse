import { useEffect, useState } from "react"
import { API_BASE } from "../config"

function BackendStatus() {
  const [backendReady, setBackendReady] = useState(false)
  const [showWakeup, setShowWakeup] = useState(false)

  useEffect(() => {
    let mounted = true
    let retryTimer
    let wakeupTimer

    const checkBackend = async () => {
      const controller = new AbortController()

      const timeout = setTimeout(() => {
        controller.abort()
      }, 8000)

      try {
        const response = await fetch(`${API_BASE}/health`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        })

        clearTimeout(timeout)

        if (!response.ok) {
          throw new Error("Backend unavailable")
        }

        if (mounted) {
          setBackendReady(true)
          setShowWakeup(false)
        }

      } catch (error) {
        clearTimeout(timeout)

        if (mounted) {
          setBackendReady(false)

          retryTimer = setTimeout(checkBackend, 5000)
        }
      }
    }

    wakeupTimer = setTimeout(() => {
      if (mounted) {
        setShowWakeup(true)
      }
    }, 2000)

    checkBackend()

    return () => {
      mounted = false
      clearTimeout(wakeupTimer)
      clearTimeout(retryTimer)
    }
  }, [])

  if (backendReady || !showWakeup) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5, 10, 20, 0.88)",
        backdropFilter: "blur(8px)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "32px",
          borderRadius: "20px",
          background: "rgba(20, 28, 42, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
          textAlign: "center",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            margin: "0 auto 20px",
            border: "3px solid rgba(255, 255, 255, 0.2)",
            borderTopColor: "#ffffff",
            borderRadius: "50%",
            animation: "powerpulse-spin 1s linear infinite",
          }}
        />

        <h2
          style={{
            margin: "0 0 10px",
            fontSize: "22px",
            fontWeight: "600",
          }}
        >
          Waking up PowerPulse
        </h2>

        <p
          style={{
            margin: "0",
            lineHeight: "1.6",
            fontSize: "14px",
            opacity: 0.75,
          }}
        >
          The backend is starting after a period of inactivity.
          This may take a little longer than usual.
        </p>

        <p
          style={{
            margin: "18px 0 0",
            fontSize: "13px",
            opacity: 0.55,
          }}
        >
          Please wait while your data is being loaded...
        </p>
      </div>
    </div>
  )
}

export default BackendStatus