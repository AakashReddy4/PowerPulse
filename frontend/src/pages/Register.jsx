import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthLayout from "../layouts/AuthLayout"
import { registerUser } from "../api/auth"

function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  return (
    <AuthLayout>

      <div style={{ animation: "fadeIn 0.6s ease" }}>

        <h2 style={titleStyle}>Create Account</h2>

        <FormInput label="Name" value={name} setValue={(val) => {
            setName(val)
            setError("")
        }} />
        <FormInput label="Email" value={email} setValue={(val) => {
            setEmail(val)
            setError("")
        }}  />

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

            if (name.trim().length < 3) {
              setError("Name must be at least 3 characters")
              return
            }

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

              await registerUser({
                name,
                email,
                password
              })

              navigate("/login", { state: { email } })

            } catch (err) {
              setError(err.response?.data?.message || "Something went wrong")
            }

          }}
            >
            Register
        </button>
        {error && (
            <p style={{ color: "#e57373", fontSize: 13, marginTop: 10 }}>
                {error}
            </p>
        )}

        <p style={switchText}>
          Already have an account?{" "}
          <span style={linkStyle} onClick={() => navigate("/login")}>
            Login
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

export default Register