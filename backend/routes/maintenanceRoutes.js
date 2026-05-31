const express = require("express")
const router = express.Router()

const {
  createMaintenance,
  getMaintenance,
  getMaintenanceById,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
  deleteMaintenance,
  getMaintenanceSummary,
} = require("../controllers/maintenanceController")

const { protect, authorize } = require("../middlewares/authMiddleware")

router.post(
  "/",
  protect,
  authorize("admin"),
  createMaintenance
)

router.get(
  "/",
  protect,
  authorize("admin", "technician"),
  getMaintenance
)

router.get(
  "/summary",
  protect,
  authorize("admin", "technician"),
  getMaintenanceSummary
)

router.get(
  "/:id",
  protect,
  authorize("admin", "technician"),
  getMaintenanceById
)

router.put(
  "/:id/start",
  protect,
  authorize("admin", "technician"),
  startMaintenance
)

router.put(
  "/:id/complete",
  protect,
  authorize("admin", "technician"),
  completeMaintenance
)

router.put(
  "/:id/cancel",
  protect,
  authorize("admin"),
  cancelMaintenance
)

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteMaintenance
)

module.exports = router