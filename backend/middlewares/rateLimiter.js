const rateLimit = require('express-rate-limit')

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per window per IP
  message: {
    message: "Too many OTP requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = { otpLimiter }