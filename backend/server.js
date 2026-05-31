const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')

dotenv.config()

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://powerpulse-five.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
})

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // Join a room using userId
  socket.on("join", (userId) => {
    socket.join(userId)
    console.log(`User joined room: ${userId}`)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

global.io=io

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://powerpulse-five.vercel.app",
    ],
    credentials: true,
  })
)
app.use(express.json())

const ticketRoutes = require('./routes/ticketRoutes')
app.use('/api/tickets', ticketRoutes)

const userRoutes = require('./routes/userRoutes')
app.use('/api/users', userRoutes)

const dashboardRoutes = require('./routes/dashboardRoutes')
app.use('/api/dashboard', dashboardRoutes)

const notificationRoutes = require('./routes/notificationRoutes')
app.use('/api/notifications', notificationRoutes)

const assetRoutes = require('./routes/assetRoutes')
app.use('/api/assets', assetRoutes)

const maintenanceRoutes = require("./routes/maintenanceRoutes")
app.use("/api/maintenance", maintenanceRoutes)

const organizationRoutes = require('./routes/organizationRoutes')
app.use('/api/organizations', organizationRoutes)

const anomalyRoutes = require("./routes/anomalyRoutes")
app.use("/api/anomalies", anomalyRoutes)

const digitalTwinRoutes = require("./routes/digitalTwinRoutes")
app.use("/api/digital-twin", digitalTwinRoutes)

app.get('/', (req, res) => {
  res.send("API Running...")
})

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("MongoDB Connected")

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })

  } catch (error) {
    console.error("Database connection failed:", error)
  }
}

startServer()
