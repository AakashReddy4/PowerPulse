require("dotenv").config()
const mongoose = require("mongoose")

const User = require("../models/User")
const Asset = require("../models/Asset")
const Ticket = require("../models/Ticket")

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI)
  console.log("MongoDB connected for seeding")
}

const seedData = async () => {

  await connectDB()

  console.log("Resetting collections...")

  await Asset.deleteMany()
  await Ticket.deleteMany()

  const users = await User.find()

  const residents = users.filter(u => u.role === "resident")
  const technicians = users.filter(u => u.role === "technician")

  const orgId = users[0].organization

  console.log("Creating asset hierarchy...")

  const substation = await Asset.create({
    name: "Main Substation",
    type: "substation",
    organization: orgId,
    position: { x: 0, y: 0, z: -5 }
  })

const transformer = await Asset.create({
    name: "Main Transformer",
    type: "transformer",
    organization: orgId,
    parentAsset: substation._id,
    position: { x: 0, y: 0, z: 0 }
  })

  const panelA = await Asset.create({
    name: "Panel A",
    type: "panel_board",
    organization: orgId,
    parentAsset: transformer._id,
    position: { x: -5, y: 0, z: 5 }
  })

  const panelB = await Asset.create({
    name: "Panel B",
    type: "panel_board",
    organization: orgId,
    parentAsset: transformer._id,
    position: { x: 5, y: 0, z: 5 }
  })

  const meterA1 = await Asset.create({
    name: "Meter A1",
    type: "meter",
    organization: orgId,
    parentAsset: panelA._id,
    position: { x: -7, y: 0, z: 10 }
  })

  const meterA2 = await Asset.create({
    name: "Meter A2",
    type: "meter",
    organization: orgId,
    parentAsset: panelA._id,
    position: { x: -3, y: 0, z: 10 }
  })

  const meterB1 = await Asset.create({
    name: "Meter B1",
    type: "meter",
    organization: orgId,
    parentAsset: panelB._id,
    position: { x: 3, y: 0, z: 10 }
  })

  const meterB2 = await Asset.create({
    name: "Meter B2",
    type: "meter",
    organization: orgId,
    parentAsset: panelB._id,
    position: { x: 7, y: 0, z: 10 }
  })

  const generator = await Asset.create({
    name: "Backup Generator",
    type: "generator",
    organization: orgId,
    position: { x: -12, y: 0, z: 0 }
  })

  const inverter = await Asset.create({
    name: "Solar Inverter",
    type: "solar_inverter",
    organization: orgId,
    position: { x: 12, y: 0, z: 0 }
  })

  const assets = [
    substation,
    transformer,
    panelA,
    panelB,
    meterA1,
    meterA2,
    meterB1,
    meterB2,
    generator,
    inverter
  ]

  console.log("Creating demo tickets...")

  const statuses = [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED_PENDING_CONFIRMATION",
    "CLOSED"
  ]

  const priorities = ["low", "medium", "high"]

  for (let i = 0; i < 40; i++) {

    const randomResident =
      residents[Math.floor(Math.random() * residents.length)]

    const randomTechnician =
      technicians[Math.floor(Math.random() * technicians.length)]

    const randomAsset =
      assets[Math.floor(Math.random() * assets.length)]

    const status =
      statuses[Math.floor(Math.random() * statuses.length)]

    const priority =
      priorities[Math.floor(Math.random() * priorities.length)]

    const isOverdue = Math.random() < 0.25

    const deadline = isOverdue
      ? new Date(Date.now() - Math.random() * 24 * 3600000)
      : new Date(Date.now() + Math.random() * 24 * 3600000)

    await Ticket.create({
      title: `Electrical Issue #${i}`,
      description: "Auto generated ticket for analytics testing",
      status,
      priority,
      createdBy: randomResident._id,
      assignedTo: randomTechnician._id,
      organization: orgId,
      asset: randomAsset._id,
      deadline
    })
  }

  console.log("Seed data inserted successfully")

  process.exit()
}

seedData()