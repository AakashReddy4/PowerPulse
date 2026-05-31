const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { sendOTPEmail } = require('../utils/mailer')

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// CREATE USER
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    const user = await User.create({
      name,
      email,
      password,
      role: "resident",
      organization: null   
    })

    res.status(201).json({
      message: "User created successfully"
    })

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }

    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" })
    }

    res.status(500).json({ message: error.message })
  }
}

// GET ALL USERS
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// LOGIN USER (Password check + OTP trigger if first login)
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // If user not verified -> send OTP
    if (!user.isVerified) {
      const otp = generateOTP()

      user.otp = otp
      user.otpExpires = Date.now() + 5 * 60 * 1000 // 5 minutes
      await user.save()

      await sendOTPEmail(user.email, otp)

      return res.status(200).json({
        message: "OTP sent to email",
        otpRequired: true
      })
    }

    // If already verified -> generate JWT directly
    const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  )

  user.refreshToken = refreshToken
  await user.save()

    res.status(200).json({
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization
    }
  })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// VERIFY OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "User not found" })
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" })
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" })
    }

    // Generate token FIRST
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  user.refreshToken = refreshToken
  user.isVerified = true
  user.otp = null
  user.otpExpires = null

  await user.save()

  res.status(200).json({
    message: "Verification successful",
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization
    }
  })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

//REFRESH
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" })
    }

    const user = await User.findOne({ refreshToken })
    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" })
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(200).json({ accessToken: newAccessToken })

  } catch (error) {
    res.status(403).json({ message: "Refresh token expired or invalid" })
  }
}

//LOGOUT
const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.refreshToken = null
    await user.save()

    res.status(200).json({ message: "Logged out successfully" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

//CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" })
    }

    // Prevent same password reuse
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password"
      })
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword

    // Invalidate refresh token (force re-login)
    user.refreshToken = null

    await user.save()

    res.status(200).json({
      message: "Password changed successfully. Please login again."
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

//FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.otpExpires && user.otpExpires > Date.now() - 60000) {
    return res.status(429).json({
      message: "Please wait before requesting another OTP"
    })
  }

    const otp = generateOTP()

    user.otp = otp
    user.otpExpires = Date.now() + 5 * 60 * 1000 // 5 min

    await user.save()

    await sendOTPEmail(user.email, otp)

    res.status(200).json({
      message: "OTP sent to email for password reset"
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

//RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" })
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" })
    }

    // Prevent same password reuse
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from old password"
      })
    }

    user.password = newPassword
    user.otp = null
    user.otpExpires = null
    user.refreshToken = null   // force fresh login

    await user.save()

    res.status(200).json({
      message: "Password reset successful. Please login."
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// CREATE USER BY ADMIN
const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    //Check admin has organization
    if (!req.user.organization) {
      return res.status(400).json({
        message: "Admin must belong to an organization"
      })
    }

    //Validate role
    if (!["resident", "technician"].includes(role)) {
      return res.status(400).json({
        message: "Role must be either resident or technician"
      })
    }

    //Check existing email
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists"
      })
    }

    //Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      organization: req.user.organization
    })

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET USERS IN ORGANIZATION
const getUsers = async (req, res) => {
  try {

    const users = await User.find({
      organization: req.user.organization
    }).select("-password")

    res.status(200).json(users)

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}



const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('organization')

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      user,
    })
  } catch (err) {
    console.error('Get current user error:', err)

    res.status(500).json({
      message: 'Failed to fetch current user',
    })
  }
}

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        email,
        phone,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select('-password')

    res.status(200).json({
      success: true,
      user: updatedUser,
    })
  } catch (err) {
    console.error('Update profile error:', err)

    res.status(500).json({
      message: 'Failed to update profile',
    })
  }
}

const deleteUser = async (req, res) => {
  try {

    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      })
    }

    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin cannot be deleted",
      })
    }

    await User.findByIdAndDelete(req.params.id)

    res.status(200).json({
      message: "User deleted successfully",
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({
      message: "Server error",
    })
  }
}


module.exports = {
  createUser,
  getAllUsers,
  loginUser,
  verifyOTP,
  refreshAccessToken,
  logoutUser,
  changePassword,
  forgotPassword,
  resetPassword,
  getUsers,
  createUserByAdmin,
  getCurrentUser,
  updateProfile,
  deleteUser
}