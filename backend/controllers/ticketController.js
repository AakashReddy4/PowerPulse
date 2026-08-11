const Ticket = require('../models/Ticket')
const User = require('../models/User')
const createNotification = require("../utils/createNotification")

const getTicketSLAHours = (priority) => {
  const normalizedPriority = (priority || "medium").toLowerCase()

  const slaMap = {
    low: 48,
    medium: 24,
    high: 8
  }

  return slaMap[normalizedPriority] || 24
}

const buildTicketDeadline = (slaHours) => {
  const deadline = new Date()
  deadline.setHours(deadline.getHours() + slaHours)
  return deadline
}

const getTicketSLAState = (ticket) => {
  if (!ticket || !ticket.deadline) {
    return {
      slaState: "NO_SLA",
      slaLabel: "No SLA",
      slaRemainingMs: null,
      isOverdue: false
    }
  }

  const now = new Date()
  const deadline = new Date(ticket.deadline)

  const stoppedStatuses = [
    "RESOLVED_PENDING_CONFIRMATION",
    "CLOSED"
  ]

  if (stoppedStatuses.includes(ticket.status)) {
    const completedAt = ticket.resolvedAt || ticket.closedAt

    if (completedAt && new Date(completedAt) > deadline) {
      return {
        slaState: "BREACHED_RESOLVED",
        slaLabel: "Resolved after SLA",
        slaRemainingMs: 0,
        isOverdue: true
      }
    }

    return {
      slaState: "MET",
      slaLabel: "SLA met",
      slaRemainingMs: 0,
      isOverdue: false
    }
  }

  const remainingMs = deadline.getTime() - now.getTime()

  if (remainingMs <= 0) {
    return {
      slaState: "BREACHED",
      slaLabel: "SLA breached",
      slaRemainingMs: remainingMs,
      isOverdue: true
    }
  }

  const remainingHours = remainingMs / (1000 * 60 * 60)

  if (remainingHours <= 2) {
    return {
      slaState: "AT_RISK",
      slaLabel: "SLA at risk",
      slaRemainingMs: remainingMs,
      isOverdue: false
    }
  }

  return {
    slaState: "ACTIVE",
    slaLabel: "Within SLA",
    slaRemainingMs: remainingMs,
    isOverdue: false
  }
}

const attachSLAState = (ticket) => {
  const plainTicket =
    typeof ticket.toObject === "function"
      ? ticket.toObject()
      : ticket

  const sla = getTicketSLAState(plainTicket)

  return {
    ...plainTicket,
    ...sla
  }
}



// CREATE TICKET
const createTicket = async (req, res) => {
  try {
    if (req.files && req.files.length > 5) {
      return res.status(400).json({
        message: "Maximum 5 images allowed"
      })
    }

    const images = req.files ? req.files.map(file => file.path) : []

    const {
      title,
      description,
      priority
    } = req.body

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required"
      })
    }

    const normalizedPriority = (priority || "medium").toLowerCase()
    const slaHours = getTicketSLAHours(normalizedPriority)
    const deadline = buildTicketDeadline(slaHours)

    const ticket = await Ticket.create({
      title,
      description,
      priority: normalizedPriority,
      createdBy: req.user._id,
      organization: req.user.organization,
      images,
      slaHours,
      deadline,
      history: [
        {
          action: "created",
          performedBy: req.user._id,
          details: `Ticket created with ${normalizedPriority} priority and ${slaHours}h SLA`
        }
      ]
    })

    if (req.user.role?.toLowerCase() === "resident") {
      const admins = await User.find({
        organization: req.user.organization,
        role: "admin",
      })

      await Promise.all(
        admins.map((admin) =>
          createNotification({
            userId: admin._id,
            title: "New ticket created",
            message: `${req.user.name || "A resident"} created a new ticket: ${ticket.title}`,
            type: "ticket",
            link: `/admin/tickets?ticket=${ticket._id}`,
          })
        )
      )
    }

    res.status(201).json(attachSLAState(ticket))

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET ALL TICKETS (WITH FILTERING)
const getAllTickets = async (req, res) => {
  try {
    const user = req.user

    const filter = {
      isDeleted: false,
      organization: user.organization
    }

    if (user.role === "resident") {
      filter.createdBy = user._id
    }

    if (user.role === "technician") {
      filter.assignedTo = user._id
    }

    if (req.query.status) {
      filter.status = req.query.status
    }

    if (req.query.priority) {
      filter.priority = req.query.priority
    }

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit

    const total = await Ticket.countDocuments(filter)

    const tickets = await Ticket.find(filter)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

    let finalTickets = tickets.map(attachSLAState)

    if (req.query.overdue === "true") {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Only admin can view overdue tickets"
        })
      }

      finalTickets = finalTickets.filter(ticket => ticket.isOverdue)
    }

    res.status(200).json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: finalTickets
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET SINGLE TICKET
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization
    })
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    res.status(200).json(attachSLAState(ticket))

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// UPDATE TICKET
const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    const user = req.user
    const { status } = req.body
    const oldStatus = ticket.status

    // ================= STATUS LOGIC =================

if (status) {

  if (status === oldStatus) {
    return res.status(400).json({
      message: "Ticket is already in this status"
    })
  }

  const validTransitions = {
    ASSIGNED: ["IN_PROGRESS"],
    REOPENED: ["IN_PROGRESS"],
    CLOSED: ["REOPENED"],
  }

  const allowedTransitions =
    validTransitions[oldStatus] || []

  if (!allowedTransitions.includes(status)) {
    return res.status(400).json({
      message: "Invalid status transition"
    })
  }

  if (
    ["ASSIGNED", "REOPENED"].includes(oldStatus) &&
    status === "IN_PROGRESS"
  ) {
    if (
      user.role.toLowerCase() !== "technician" ||
      !ticket.assignedTo ||
      ticket.assignedTo.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        message: "Only assigned technician can start work"
      })
    }
  }

  ticket.status = status

  ticket.history.push({
    action: "status_change",
    performedBy: user._id,
    details: `Status changed from ${oldStatus} to ${status}`
  })

  await createNotification({
    userId: ticket.createdBy,
    title: "Ticket status updated",
    message: `Your ticket "${ticket.title}" status changed to ${ticket.status}`,
    type: "ticket",
    link: `/ticket/${ticket._id}`,
  })
}

    // ================= PRIORITY LOGIC =================
    if (req.body.priority) {
      const newPriority = req.body.priority.toLowerCase()

      if (user.role.toLowerCase() !== "admin") {
        return res.status(403).json({
          message: "Only admin can change priority",
        })
      }

      if (!["low", "medium", "high"].includes(newPriority)) {
        return res.status(400).json({
          message: "Invalid priority",
        })
      }

      if (newPriority === ticket.priority) {
        return res.status(400).json({
          message: "Ticket already has this priority",
        })
      }

      const oldPriority = ticket.priority

      const newSlaHours = getTicketSLAHours(newPriority)
      const newDeadline = buildTicketDeadline(newSlaHours)

      ticket.priority = newPriority
      ticket.slaHours = newSlaHours
      ticket.deadline = newDeadline

      ticket.history.push({
        action: "priority_change",
        performedBy: user._id,
        details: `Priority changed from ${oldPriority} to ${newPriority}. SLA recalculated to ${newSlaHours}h.`,
      })
    }

    await ticket.save()

    res.status(200).json(attachSLAState(ticket))

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// DELETE TICKET
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization
    })

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    ticket.isDeleted = true
    ticket.deletedAt = new Date()

    ticket.history.push({
      action: "deleted",
      performedBy: req.user._id,
      details: "Ticket soft deleted"
    })

    await ticket.save()

    res.status(200).json({ message: "Ticket soft deleted successfully" })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ASSIGN TICKET TO TECHNICIAN
const assignTicket = async (req, res) => {
  try {
    const { technicianId } = req.body

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

const technician = await User.findOne({
  _id: technicianId,
  organization: req.user.organization,
  role: "technician",
})

if (!technician) {
  return res.status(400).json({
    message: "Invalid technician"
  })
}

    ticket.assignedTo = technicianId
    ticket.status = "ASSIGNED"

    ticket.history.push({
      action: "assigned",
      performedBy: req.user._id,
      details: `Assigned to technician ${technician.name}`,
    })

    await ticket.save()

await createNotification({
  userId: technicianId,
  title: "New ticket assigned",
  message: `You have been assigned a new ticket: ${ticket.title}`,
  type: "ticket",
  link: `/assigned-tickets?ticket=${ticket._id}`,
})

    res.status(200).json(attachSLAState(ticket))

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ADD COMMENT
const addComment = async (req, res) => {
  try {
    const { message } = req.body

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization
    })

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    const comment = {
      user: req.user._id,
      role: req.user.role,
      message
    }

    ticket.comments.push(comment)

    await ticket.save()

    if (req.user._id.toString() !== ticket.createdBy.toString()) {
await createNotification({
  userId: ticket.createdBy,
  title: "New ticket comment",
  message: `New comment on your ticket: ${ticket.title}`,
  type: "ticket",
  link: `/ticket/${ticket._id}`,
})
    }

    await ticket.populate({
      path: "comments.user",
      select: "name role email"
    })

    res.status(200).json({
      message: "Comment added successfully",
      comments: ticket.comments
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET COMMENTS
const getComments = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization
    })
      .populate({
        path: "comments.user",
        select: "name role email"
      })

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    res.status(200).json({
      comments: ticket.comments
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// RESOLVE TICKET
const resolveTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      })
    }

    if (
      req.user.role.toLowerCase() !== "technician" ||
      !ticket.assignedTo ||
      ticket.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "Only assigned technician can resolve this ticket",
      })
    }

    if (ticket.status !== "IN_PROGRESS") {
      return res.status(400).json({
        message: "Ticket must be in progress to resolve",
      })
    }

    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map((file) => file.path)
      ticket.images = [...(ticket.images || []), ...imagePaths]
    }

    ticket.status = "RESOLVED_PENDING_CONFIRMATION"
    ticket.resolvedAt = new Date()

    ticket.history.push({
      action: "resolved",
      performedBy: req.user._id,
      details: "Ticket resolved by technician",
    })

    await ticket.save()

await createNotification({
  userId: ticket.createdBy,
  title: "Ticket resolved",
  message: `Your ticket "${ticket.title}" has been resolved. Please confirm.`,
  type: "ticket",
  link: `/ticket/${ticket._id}`,
})

const admins = await User.find({
  organization: ticket.organization,
  role: "admin",
})

await Promise.all(
  admins.map((admin) =>
    createNotification({
      userId: admin._id,
      title: "Ticket resolved",
      message: `Ticket "${ticket.title}" was resolved by technician and is waiting for resident confirmation.`,
      type: "ticket",
      link: `/admin/tickets?ticket=${ticket._id}`,
    })
  )
)

    res.json({
      message: "Ticket resolved. Waiting for confirmation.",
      ticket: attachSLAState(ticket),
    })

  } catch (error) {
    res.status(500).json({
      error: error.message,
    })
  }
}

// CONFIRM BY RESIDENT
const confirmTicketResolution = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization
    })

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found"
      })
    }

    if (ticket.status !== "RESOLVED_PENDING_CONFIRMATION") {
      return res.status(400).json({
        message: "Ticket is not awaiting confirmation"
      })
    }

    if (ticket.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Not authorized"
      })
    }

    ticket.status = "CLOSED"
    ticket.closedAt = new Date()
    ticket.confirmedBy = req.user.id

    ticket.history.push({
      action: "closed",
      performedBy: req.user._id,
      details: "Ticket closure confirmed by resident"
    })

    await ticket.save()
    if (ticket.assignedTo) {
  await createNotification({
    userId: ticket.assignedTo,
    title: "Ticket closed",
    message: `Resident confirmed and closed ticket: ${ticket.title}`,
    type: "ticket",
    link: `/assigned-tickets?ticket=${ticket._id}`,
  })
}

const admins = await User.find({
  organization: ticket.organization,
  role: "admin",
})

await Promise.all(
  admins.map((admin) =>
    createNotification({
      userId: admin._id,
      title: "Ticket closed",
      message: `Ticket "${ticket.title}" was confirmed and closed by resident.`,
      type: "ticket",
      link: `/admin/tickets?ticket=${ticket._id}`,
    })
  )
)

    res.json({
      message: "Ticket successfully closed",
      ticket: attachSLAState(ticket)
    })

  } catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
}

// REOPEN TICKET
const reopenTicket = async (req, res) => {

  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization
    })

    if (ticket.status !== "RESOLVED_PENDING_CONFIRMATION") {
      return res.status(400).json({
        message: "Only resolved tickets can be reopened"
      })
    }

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found"
      })
    }

    if (ticket.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Not authorized"
      })
    }

    ticket.status = "REOPENED"

    ticket.history.push({
      action: "reopened",
      performedBy: req.user._id,
      details: "Ticket reopened by resident"
    })

    await ticket.save()
    if (ticket.assignedTo) {
  await createNotification({
    userId: ticket.assignedTo,
    title: "Ticket reopened",
    message: `Resident reopened ticket: ${ticket.title}`,
    type: "ticket",
    link: `/assigned-tickets?ticket=${ticket._id}`,
  })
}

const admins = await User.find({
  organization: ticket.organization,
  role: "admin",
})

await Promise.all(
  admins.map((admin) =>
    createNotification({
      userId: admin._id,
      title: "Ticket reopened",
      message: `Ticket "${ticket.title}" was reopened by resident.`,
      type: "ticket",
      link: `/admin/tickets?ticket=${ticket._id}`,
    })
  )
)

    res.json({
      message: "Ticket reopened",
      ticket: attachSLAState(ticket)
    })

  } catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
}

// TOTAL ORG. TICKETS
const getOrganizationTickets = async (req, res) => {
  try {
    const organizationId =
      typeof req.user.organization === "object"
        ? req.user.organization._id.toString()
        : req.user.organization.toString()

    const tickets = await Ticket.find({
      isDeleted: false
    })
      .populate(
        "createdBy",
        "name email organization role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .sort({ createdAt: -1 })

    const organizationTickets = tickets.filter((ticket) => {
      if (!ticket.createdBy) return false

      const creatorOrg =
        typeof ticket.createdBy.organization === "object"
          ? ticket.createdBy.organization?._id?.toString()
          : ticket.createdBy.organization?.toString()

      return creatorOrg === organizationId
    })

    res.status(200).json({
      success: true,
      count: organizationTickets.length,
      data: organizationTickets.map(attachSLAState),
    })

  } catch (error) {
    console.error("ORG TICKETS ERROR:", error)

    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  assignTicket,
  addComment,
  getComments,
  resolveTicket,
  confirmTicketResolution,
  reopenTicket,
  getOrganizationTickets
}