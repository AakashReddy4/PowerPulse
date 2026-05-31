import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import AuthLayout from "../layouts/AuthLayout"
import axios from "axios"
import { API_BASE } from "../config"

function VerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()

  const email = location.state?.email || ""

  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter valid 6-digit OTP")
      return
    }

    try {
      const res = await axios.post(
        `${API_BASE}/api/users/verify-otp`,
        { email, otp }
      )

      const { accessToken, user } = res.data

      // store token + user
      localStorage.setItem("token", accessToken)
      localStorage.setItem("user", JSON.stringify(user))

      // redirect logic
      if (!user.organization) {
        navigate("/create-organization")
      } else {
        navigate("/home")
      }

    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP")
    }
  }

  return (
    <AuthLayout>

      <h2 style={{ marginBottom: 20 }}>Verify OTP</h2>

      <input
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => {
          setOtp(e.target.value)
          setError("")
        }}
        style={inputStyle}
      />

      <button style={buttonStyle} onClick={handleVerify}>
        Verify
      </button>

      {error && <p style={{ color: "#e57373" }}>{error}</p>}

    </AuthLayout>
  )
}

const inputStyle = {
  width: "100%",
  boxSizing:"border-box",
  padding: "12px",
  borderRadius: 8,
  marginBottom: 12,
  background: "rgba(0,0,0,0.2)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.1)"
}

const buttonStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#936639",
  color: "#fff",
  cursor: "pointer"
}

export default VerifyOTP