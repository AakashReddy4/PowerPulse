const Maintenance = require("../models/Maintenance")
const Asset = require("../models/Asset")
const User = require("../models/User")
const createNotification = require("../utils/createNotification")

const getMaintenanceSLAHours = (priority) => {
  const normalizedPriority = (priority || "medium").toLowerCase()

  const slaMap = {
    low: 48,
    medium: 24,
    high: 12,
    critical: 6,
  }

  return slaMap[normalizedPriority] || 24
}

const buildMaintenanceDeadline = (scheduledDate, slaHours) => {
  const baseDate = scheduledDate ? new Date(scheduledDate) : new Date()

  const deadline = new Date(baseDate)
  deadline.setHours(deadline.getHours() + Number(slaHours || 24))

  return deadline
}

const getMaintenanceSLAState = (maintenance) => {
  if (!maintenance || !maintenance.deadline) {
    return {
      slaState: "NO_SLA",
      slaLabel: "No SLA",
      slaRemainingMs: null,
      isSlaBreached: false,
    }
  }

  const now = new Date()
  const deadline = new Date(maintenance.deadline)
  const remainingMs = deadline.getTime() - now.getTime()

  if (maintenance.status === "completed") {
    const completedAt = maintenance.completedDate
      ? new Date(maintenance.completedDate)
      : null

    if (completedAt && completedAt <= deadline) {
      return {
        slaState: "MET",
        slaLabel: "SLA met",
        slaRemainingMs: 0,
        isSlaBreached: false,
      }
    }

    return {
      slaState: "BREACHED_RESOLVED",
      slaLabel: "Completed after SLA breach",
      slaRemainingMs: 0,
      isSlaBreached: true,
    }
  }

  if (maintenance.status === "cancelled") {
    return {
      slaState: "NO_SLA",
      slaLabel: "Cancelled",
      slaRemainingMs: null,
      isSlaBreached: false,
    }
  }

  if (remainingMs <= 0) {
    return {
      slaState: "BREACHED",
      slaLabel: "SLA breached",
      slaRemainingMs: remainingMs,
      isSlaBreached: true,
    }
  }

  const fourHours = 4 * 60 * 60 * 1000

  if (remainingMs <= fourHours) {
    return {
      slaState: "AT_RISK",
      slaLabel: "SLA at risk",
      slaRemainingMs: remainingMs,
      isSlaBreached: false,
    }
  }

  return {
    slaState: "ACTIVE",
    slaLabel: "SLA active",
    slaRemainingMs: remainingMs,
    isSlaBreached: false,
  }
}

const attachSLAState = (maintenance) => {
  const plainMaintenance =
    typeof maintenance.toObject === "function"
      ? maintenance.toObject()
      : maintenance

  const sla = getMaintenanceSLAState(plainMaintenance)

  return {
    ...plainMaintenance,
    ...sla,
  }
}

// CREATE MAINTENANCE
const createMaintenance = async (req, res) => {
  try {
    const {
      asset,
      title,
      description,
      scheduledDate,
      priority,
      assignedTo,
      notes,
      slaHours,
    } = req.body

    if (!asset || !title || !scheduledDate) {
      return res.status(400).json({
        message: "Asset, title and scheduled date are required",
      })
    }

    const assetExists = await Asset.findOne({
      _id: asset,
      organization: req.user.organization,
    })

    if (!assetExists) {
      return res.status(404).json({
        message: "Asset not found in your organization",
      })
    }

    if (assignedTo) {
      const technician = await User.findOne({
        _id: assignedTo,
        organization: req.user.organization,
        role: "technician",
      })

      if (!technician) {
        return res.status(400).json({
          message: "Assigned user must be a technician in your organization",
        })
      }
    }

    const normalizedPriority = (priority || "medium").toLowerCase()

    if (!["low", "medium", "high", "critical"].includes(normalizedPriority)) {
      return res.status(400).json({
        message: "Invalid priority",
      })
    }

    const finalSlaHours = slaHours
      ? Number(slaHours)
      : getMaintenanceSLAHours(normalizedPriority)

    const deadline = buildMaintenanceDeadline(scheduledDate, finalSlaHours)

    const maintenance = await Maintenance.create({
      asset,
      organization: req.user.organization,
      title,
      description,
      scheduledDate,
      priority: normalizedPriority,
      assignedTo: assignedTo || null,
      notes,
      slaHours: finalSlaHours,
      deadline,
      slaStatus: "ACTIVE",
      createdBy: req.user._id,
    })

const populatedMaintenance = await Maintenance.findById(maintenance._id)
  .populate("asset", "name assetId category location status maintenanceIntervalDays")
  .populate("assignedTo", "name email role")
  .populate("createdBy", "name email role")

  if (maintenance.assignedTo) {
  await createNotification({
    userId: maintenance.assignedTo,
    title: "New maintenance assigned",
    message: `You have been assigned maintenance work: ${maintenance.title}`,
    type: "maintenance",
    link: `/technician/maintenance?id=${maintenance._id}`,
  })
}
      

    res.status(201).json(attachSLAState(populatedMaintenance))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message })
  }
}

// GET ALL MAINTENANCE
const getMaintenance = async (req, res) => {
  try {
    const query = {
      organization: req.user.organization
    }

    if (req.user.role === "technician") {
      query.assignedTo = req.user._id
    }

    const maintenance = await Maintenance.find(query)
      .populate("asset", "name assetId category location status")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .sort({ scheduledDate: 1 })

    res.status(200).json(maintenance)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET SINGLE MAINTENANCE
const getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })
      .populate("asset", "name assetId category location status maintenanceIntervalDays")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")

    if (!maintenance) {
      return res.status(404).json({
        message: "Maintenance record not found",
      })
    }

    res.status(200).json(attachSLAState(maintenance))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// START MAINTENANCE
const startMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    

    if (!maintenance) {
      return res.status(404).json({
        message: "Maintenance record not found",
      })
    }

    if (maintenance.status === "completed") {
      return res.status(400).json({
        message: "Completed maintenance cannot be started again",
      })
    }

    if (maintenance.status === "cancelled") {
      return res.status(400).json({
        message: "Cancelled maintenance cannot be started",
      })
    }

    maintenance.status = "in_progress"
    maintenance.startedAt = new Date()

    const sla = getMaintenanceSLAState(maintenance)
    maintenance.slaStatus = sla.slaState

    await maintenance.save()

    await Asset.findOneAndUpdate(
      {
        _id: maintenance.asset,
        organization: req.user.organization,
      },
      {
        status: "Under Maintenance",
      }
    )
    const admins = await User.find({
  organization: maintenance.organization,
  role: "admin",
})

await Promise.all(
  admins.map((admin) =>
    createNotification({
      userId: admin._id,
      title: "Maintenance started",
      message: `${req.user.name || "Technician"} started maintenance: ${maintenance.title}`,
      type: "maintenance",
      link: `/maintenance?id=${maintenance._id}`,
    })
  )
)

    const populatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate("asset", "name assetId category location status maintenanceIntervalDays")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")

    res.status(200).json(attachSLAState(populatedMaintenance))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message })
  }
}

// COMPLETE MAINTENANCE
const completeMaintenance = async (req, res) => {
  try {
    const { completionNotes } = req.body

    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!maintenance) {
      return res.status(404).json({
        message: "Maintenance record not found",
      })
    }

    if (maintenance.status === "completed") {
      return res.status(400).json({
        message: "Maintenance already completed",
      })
    }

    if (maintenance.status === "cancelled") {
      return res.status(400).json({
        message: "Cancelled maintenance cannot be completed",
      })
    }

    const completedDate = new Date()

    maintenance.status = "completed"
    maintenance.completedDate = completedDate
    maintenance.completionNotes = completionNotes || ""

    if (maintenance.deadline && completedDate <= new Date(maintenance.deadline)) {
      maintenance.slaStatus = "MET"
    } else {
      maintenance.slaStatus = "BREACHED_RESOLVED"
    }

    await maintenance.save()


    const asset = await Asset.findOne({
      _id: maintenance.asset,
      organization: req.user.organization,
    })

    if (asset) {
      const interval = asset.maintenanceIntervalDays || 30

      const nextMaintenanceDate = new Date(completedDate)
      nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + interval)

      asset.lastMaintenanceDate = completedDate
      asset.nextMaintenanceDate = nextMaintenanceDate
      asset.status = "Operational"

      await asset.save()
    }
        const admins = await User.find({
  organization: maintenance.organization,
  role: "admin",
})

await Promise.all(
  admins.map((admin) =>
    createNotification({
      userId: admin._id,
      title: "Maintenance completed",
      message: `${req.user.name || "Technician"} completed maintenance: ${maintenance.title}`,
      type: "maintenance",
      link: `/maintenance?id=${maintenance._id}`,
    })
  )
)

    const populatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate("asset", "name assetId category location status maintenanceIntervalDays lastMaintenanceDate nextMaintenanceDate")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")

    res.status(200).json(attachSLAState(populatedMaintenance))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message })
  }
}

// CANCEL MAINTENANCE
const cancelMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!maintenance) {
      return res.status(404).json({
        message: "Maintenance record not found",
      })
    }

    if (maintenance.status === "completed") {
      return res.status(400).json({
        message: "Completed maintenance cannot be cancelled",
      })
    }

    maintenance.status = "cancelled"
    maintenance.slaStatus = "NO_SLA"

    await maintenance.save()

    const populatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate("asset", "name assetId category location status maintenanceIntervalDays")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")

    res.status(200).json(attachSLAState(populatedMaintenance))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// DELETE MAINTENANCE
const deleteMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!maintenance) {
      return res.status(404).json({
        message: "Maintenance record not found",
      })
    }

    await maintenance.deleteOne()

    res.status(200).json({
      message: "Maintenance record deleted successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message })
  }
}

// GET MAINTENANCE SUMMARY
const getMaintenanceSummary = async (req, res) => {
  try {
    const records = await Maintenance.find({
      organization: req.user.organization,
    })

    const withSla = records.map(attachSLAState)

    const summary = {
      total: withSla.length,
      scheduled: withSla.filter((item) => item.status === "scheduled").length,
      inProgress: withSla.filter((item) => item.status === "in_progress").length,
      completed: withSla.filter((item) => item.status === "completed").length,
      cancelled: withSla.filter((item) => item.status === "cancelled").length,
      slaBreached: withSla.filter((item) =>
        ["BREACHED", "BREACHED_RESOLVED"].includes(item.slaState)
      ).length,
      atRisk: withSla.filter((item) => item.slaState === "AT_RISK").length,
      active: withSla.filter((item) => item.slaState === "ACTIVE").length,
      met: withSla.filter((item) => item.slaState === "MET").length,
    }

    res.status(200).json(summary)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  createMaintenance,
  getMaintenance,
  getMaintenanceById,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
  deleteMaintenance,
  getMaintenanceSummary,
}