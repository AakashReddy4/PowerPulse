import { Navigate } from "react-router-dom"

function ProtectedRoute({
  children,
  allowedRoles = [],
}) {

  const token = localStorage.getItem("token")

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  )

  const role = user?.role

  if (!token) {
    return <Navigate to="/" replace />
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {
    return <Navigate to="/home" replace />
  }

  return children
}

export default ProtectedRoute