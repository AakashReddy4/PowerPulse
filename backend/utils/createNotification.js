const Notification = require("../models/Notification")

const createNotification = async ({
  userId,
  title,
  message,
  type = "system",
  link = "",
}) => {
  try {
    if (!userId || !title || !message) {
      return null
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      link,
    })

    if (global.io) {
      global.io.to(userId.toString()).emit("notification", notification)
    }

    return notification
  } catch (error) {
    console.error("Create notification error:", error.message)
    return null
  }
}

module.exports = createNotification