const express = require("express")
const router = express.Router()

const {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  performMaintenance,
  deleteAsset,
} = require("../controllers/assetController")

const {
  protect,
  authorize,
} = require("../middlewares/authMiddleware")

router.post(
  "/",
  protect,
  authorize("admin"),
  createAsset
)

router.get(
  "/",
  protect,
  getAssets
)

router.get(
  "/:id",
  protect,
  getAssetById
)

router.patch(
  "/:id",
  protect,
  authorize("admin"),
  updateAsset
)

router.put(
  "/:id/maintenance",
  protect,
  authorize("admin", "technician"),
  performMaintenance
)

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteAsset
)

module.exports = router