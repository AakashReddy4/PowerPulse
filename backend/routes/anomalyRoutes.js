const express = require("express")
const router = express.Router()

const { detectAnomalies } = require("../controllers/anomalyController")
const { protect, authorize } = require("../middlewares/authMiddleware")

router.get(
  "/",
  protect,
  authorize("admin"),
  detectAnomalies
)

module.exports = router