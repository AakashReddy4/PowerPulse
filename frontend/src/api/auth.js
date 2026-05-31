import axios from "axios"

import { API_BASE } from "../config"

const API = axios.create({
  baseURL: `${API_BASE}/api/users`
})

// REGISTER
export const registerUser = (data) =>
  API.post("/", data)

// LOGIN
export const loginUser = (data) =>
  API.post("/login", data)