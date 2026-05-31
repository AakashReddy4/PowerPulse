import { useState } from "react"
import { useNavigate,useLocation } from "react-router-dom"
import AuthLayout from "../layouts/AuthLayout"
import { loginUser } from "../api/auth"

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(location.state?.email || "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  

  return (
    <AuthLayout>

      <div style={{ animation: "fadeIn 0.6s ease" }}>

        <h2 style={titleStyle}>Welcome Back</h2>

        <FormInput label="Email" value={email} setValue={(val) => {
            setEmail(val)
            setError("")
        }}/>

        <FormInput
          label="Password"
          type={showPassword ? "text" : "password"}
          rightElement={
            <span
              style={toggleStyle}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          }
          value={password}
          setValue={(val) => {
                setPassword(val)
                setError("")
            }}
        />

        <button
            style={buttonStyle}
            onClick={async () => {

                if (!email.includes("@")) {
                    setError("Enter a valid email")
                    return
                }

                if (password.length < 6) {
                    setError("Password must be at least 6 characters")
                    return
                }

                try {
                    setError("")

                    const res = await loginUser({ email, password })

                    // CASE 1: Direct login (no OTP needed)
                    if (res.data.accessToken) {
                    const { accessToken, user, refreshToken } = res.data

                    localStorage.setItem("token", accessToken)
                    localStorage.setItem("refreshToken", refreshToken)
                    localStorage.setItem("user", JSON.stringify(user))

                    // redirect based on org
                    if (!user.organization) {
                        navigate("/create-organization")
                    } else {
                        navigate("/home")
                    }
                    }

                    // CASE 2: OTP required
                    else {
                    navigate("/verify-otp", { state: { email } })
                    }
                } catch (err) {
                    setError(err.response?.data?.message || "Invalid credentials")
                }

            }}
        >
          Login
        </button>
        {error && (
            <p style={{ color: "#e57373", fontSize: 13, marginTop: 10 }}>
                {error}
            </p>
        )}

        <p style={switchText}>
          Don’t have an account?{" "}
          <span style={linkStyle} onClick={() => navigate("/register")}>
            Register
          </span>
        </p>

      </div>

      <AuthStyles />

    </AuthLayout>
  )
}

function FormInput({ label, type = "text", value, setValue, rightElement }) {
  const [focus, setFocus] = useState(false)

  return (
    <div style={{ position: "relative", marginBottom: 18 }}>

      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(value !== "")}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "14px 12px",
          borderRadius: 10,
          border: focus
            ? "1px solid #a68a64"
            : "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.25)",
          color: "#fff",
          outline: "none",
          transition: "all 0.25s ease"
        }}
      />

      {/* floating label */}
      <label
        style={{
          position: "absolute",
          left: 12,
          top: focus || value ? -8 : 14,
          fontSize: focus || value ? 11 : 14,
          color: "#b6ad90",
          background: "#1f2518",
          padding: "0 4px",
          transition: "all 0.2s ease",
          pointerEvents: "none"
        }}
      >
        {label}
      </label>

      {/* right element */}
      {rightElement && (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)"
          }}
        >
          {rightElement}
        </div>
      )}

    </div>
  )
}

function AuthStyles() {
  return (
    <style>
      {`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}
    </style>
  )
}

const titleStyle = {
  marginBottom: 24,
  textAlign: "center",
  fontWeight: 600
}

const buttonStyle = {
  width: "100%",
  padding: 13,
  borderRadius: 10,
  border: "none",
  background: "#936639",
  color: "#fff",
  cursor: "pointer",
  marginTop: 10,
  transition: "all 0.25s ease"
}

const toggleStyle = {
  fontSize: 12,
  cursor: "pointer",
  color: "#b6ad90"
}

const switchText = {
  marginTop: 16,
  fontSize: 14,
  textAlign: "center",
  color: "#aaa"
}

const linkStyle = {
  color: "#a68a64",
  cursor: "pointer"
}

export default Login