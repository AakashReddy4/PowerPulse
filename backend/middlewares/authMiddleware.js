const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  try {
    let token

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authorized, no token"
      })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    req.user = await User.findById(
      decoded.id
    ).select("-password")

    next()

  } catch (error) {
    return res.status(401).json({
      message: "Not authorized, token failed"
    })
  }
}

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" })
    }

    const userRole = String(req.user.role || "").toLowerCase()
    const allowedRoles = roles.map((role) => String(role).toLowerCase())

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: You don't have permission" })
    }

    next()
  }
}

module.exports = { protect, authorize }

