const express = require('express')
const router = express.Router()

const { createOrganization } = require('../controllers/organizationController')
const { protect, authorize } = require('../middlewares/authMiddleware')

router.post('/', protect, createOrganization)

module.exports = router