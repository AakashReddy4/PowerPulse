const express = require("express")
const router = express.Router()

const {
  getDigitalTwin,
  updateAssetPosition,
  createConnection,
  deleteConnection,
  updateAssetTwinVisibility
} = require("../controllers/digitalTwinController")

const { protect, authorize } = require("../middlewares/authMiddleware")

router.get(
  "/",
  protect,
  authorize("admin", "technician"),
  getDigitalTwin
)

router.put(
  "/assets/:id/position",
  protect,
  authorize("admin"),
  updateAssetPosition
)

router.post(
  "/connections",
  protect,
  authorize("admin"),
  createConnection
)

router.delete(
  "/connections/:id",
  protect,
  authorize("admin"),
  deleteConnection
)

router.put(
  "/assets/:id/twin-visibility",
  protect,
  authorize("admin"),
  updateAssetTwinVisibility
)

module.exports = router