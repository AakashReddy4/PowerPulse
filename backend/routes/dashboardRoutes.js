const express = require('express')
const router = express.Router()

const { adminDashboard } = require('../controllers/dashboardController')
const { protect, authorize } = require('../middlewares/authMiddleware')

router.get('/admin', protect, authorize('admin'), adminDashboard)

module.exports = router