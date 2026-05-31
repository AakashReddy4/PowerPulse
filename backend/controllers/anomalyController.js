const Ticket = require("../models/Ticket")

const detectAnomalies = async (req, res) => {
  try {

    const orgId = req.user.organization

    //Repeated asset failures
    const repeatedAssetFailures = await Ticket.aggregate([
      {
        $match: {
          organization: orgId
        }
      },
      {
        $group: {
          _id: "$asset",
          ticketCount: { $sum: 1 }
        }
      },
      {
        $match: {
          ticketCount: { $gte: 5 }
        }
      }
    ])

    //Technician overload
    const technicianLoad = await Ticket.aggregate([
      {
        $match: {
          organization: orgId,
          status: { $ne: "CLOSED" }
        }
      },
      {
        $group: {
          _id: "$assignedTo",
          activeTickets: { $sum: 1 }
        }
      },
      {
        $match: {
          activeTickets: { $gte: 10 }
        }
      }
    ])

    res.status(200).json({
      repeatedAssetFailures,
      technicianLoad
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  detectAnomalies
}