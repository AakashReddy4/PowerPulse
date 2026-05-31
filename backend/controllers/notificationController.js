const Notification = require("../models/Notification")

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)

    res.status(200).json({
      success: true,
      data: notifications,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const markAsRead = async (req, res) => {
  try {

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      {
        isRead: true,
      },
      {
        new: true,
      }
    )

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    res.status(200).json({
      success: true,
      data: notification,
    })

  } catch (error) {

    console.error("markAsRead error:", error)

    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    )

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    })

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      })
    }

    await notification.deleteOne()

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
}