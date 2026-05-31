const Ticket = require('../models/Ticket')

const adminDashboard = async (req, res) => {
  try {

    const stats = await Ticket.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    const technicianWorkload = await Ticket.aggregate([
    {
        $match: {
        assignedTo: { $ne: null },
        isDeleted: false
        }
    },
    {
        $group: {
        _id: "$assignedTo",
        assignedTickets: { $sum: 1 }
        }
    },
    {
        $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "technician"
        }
    },
    {
        $unwind: "$technician"
    },
    {
        $project: {
        _id: 0,
        technicianName: "$technician.name",
        assignedTickets: 1
        }
    }
    ])

    const priorityStatsRaw = await Ticket.aggregate([
    {
        $match: { isDeleted: false }
    },
    {
        $group: {
        _id: "$priority",
        count: { $sum: 1 }
        }
    }
    ])

    const ticketsTrend = await Ticket.aggregate([
    {
        $match: { isDeleted: false }
    },
    {
        $group: {
        _id: {
            $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
            }
        },
        count: { $sum: 1 }
        }
    },
    {
        $sort: { _id: 1 }
    },
    {
        $project: {
        _id: 0,
        date: "$_id",
        count: 1
        }
    }
    ])

    let high = 0
    let medium = 0
    let low = 0

    priorityStatsRaw.forEach(item => {
    if (item._id === "high") high = item.count
    if (item._id === "medium") medium = item.count
    if (item._id === "low") low = item.count
    })

    let open = 0
    let inProgress = 0
    let awaitingConfirmation = 0
    let closed = 0
    let reopened = 0

    stats.forEach(item => {
      if (item._id === "OPEN") open = item.count
      if (item._id === "IN_PROGRESS") inProgress = item.count
      if (item._id === "RESOLVED_PENDING_CONFIRMATION") awaitingConfirmation = item.count
      if (item._id === "CLOSED") closed = item.count
      if (item._id === "REOPENED") reopened = item.count
    })

    const totalTickets = open + inProgress + closed

    const overdueTickets = await Ticket.countDocuments({
      deadline: { $lt: new Date() },
      status: { $ne: "closed" },
      isDeleted: false
    })

   res.status(200).json({
    totalTickets,
    open,
    inProgress,
    awaitingConfirmation,
    reopened,
    closed,
    overdue: overdueTickets,
    technicianWorkload,
    priorityStats: { high, medium, low },
    ticketsTrend
  })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}



module.exports = {
  adminDashboard
}