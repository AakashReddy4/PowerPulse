import { API_BASE } from "../config"


export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken")

    const res = await fetch(`${API_BASE}/api/users/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await res.json()

    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken)
      return data.accessToken
    }

    return null

  } catch (err) {
    console.error("Refresh failed", err)
    return null
  }
}