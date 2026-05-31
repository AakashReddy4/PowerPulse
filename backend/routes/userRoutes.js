const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/authMiddleware')
const { otpLimiter } = require('../middlewares/rateLimiter')

const {
  createUser,
  getAllUsers,
  loginUser,
  verifyOTP,
  refreshAccessToken,
  logoutUser,
  changePassword,
  forgotPassword,
  resetPassword,
  createUserByAdmin,
  getUsers,
  getCurrentUser,
  updateProfile,
  deleteUser
} = require('../controllers/userController')

// CREATE USER
router.post('/', createUser)

// GET USERS
//router.get('/', getAllUsers)

// LOGIN
router.post('/login',otpLimiter, loginUser)

//VERIFY OTP
router.post('/verify-otp',otpLimiter, verifyOTP)

//REFRESH
router.post('/refresh', refreshAccessToken)

//LOGOUT
router.post('/logout', protect, logoutUser)

//CHANGE PASSWORD
router.put('/change-password', protect, changePassword)

//FORGOT PASSWORD
router.post('/forgot-password',otpLimiter, forgotPassword)

//RESET PASSWORD
router.post('/reset-password',otpLimiter, resetPassword)

// CREATE USER (ADMIN)
router.post('/create', protect, authorize('admin'), createUserByAdmin)

//CURRENT USER
router.get('/me', protect, getCurrentUser)

//UPDATE PROFILE
router.patch('/profile', protect, updateProfile)

// GET USERS (ADMIN)
router.get('/', protect, authorize('admin'), getUsers)

//DELETE USER
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteUser
)

module.exports = router