import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthLayout from "../layouts/AuthLayout"
import axios from "axios"
import { API_BASE } from "../config"

function CreateOrganization() {
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [location, setLocation] = useState("")
  const [error, setError] = useState("")

  const handleCreate = async () => {
    if (!name || !type || !location) {
      setError("All fields are required")
      return
    }

    try {
      const token = localStorage.getItem("token")

      const res = await axios.post(
        `${API_BASE}/api/organizations`,
        { name, type, location },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      const organization = res.data.organization

      const user = JSON.parse(
        localStorage.getItem("user")
      )

      user.organization = organization._id
      user.organizationName = organization.name
      user.role = "admin"

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      )

      // after creation → go to home
      navigate("/home")

    } catch (err) {
      setError(err.response?.data?.message || "Failed to create organization")
    }
  }

  return (
    <AuthLayout>

      <h2 style={{ marginBottom: 20 }}>Create Organization</h2>

      <input
        placeholder="Organization Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError("")
        }}
        style={inputStyle}
      />

      <input
        placeholder="Type (hostel / apartment / industry)"
        value={type}
        onChange={(e) => {
          setType(e.target.value)
          setError("")
        }}
        style={inputStyle}
      />

      <input
        placeholder="Location"
        value={location}
        onChange={(e) => {
          setLocation(e.target.value)
          setError("")
        }}
        style={inputStyle}
      />

      <button style={buttonStyle} onClick={handleCreate}>
        Create Organization
      </button>

      {error && <p style={{ color: "#e57373" }}>{error}</p>}

    </AuthLayout>
  )
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
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

export default CreateOrganization