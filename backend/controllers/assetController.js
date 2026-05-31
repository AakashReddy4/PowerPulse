const Asset = require("../models/Asset")

const createAsset = async (req, res) => {
  try {
    const {
      name,
      assetId,
      category,
      location,
      installationDate,
      maintenanceIntervalDays,
      manufacturer,
      capacity,
      status,
      parentAsset,
      position,
    } = req.body

    if (!name || !assetId) {
      return res.status(400).json({
        message: "Name and Asset ID required",
      })
    }

    if (!req.user.organization) {
      return res.status(400).json({
        message: "User is not linked to an organization",
      })
    }

    const existingAsset = await Asset.findOne({
      assetId,
      organization: req.user.organization,
    })

    if (existingAsset) {
      return res.status(400).json({
        message: "Asset ID already exists in this organization",
      })
    }

    const interval = Number(maintenanceIntervalDays) || 30

    let nextMaintenanceDate = null

    if (installationDate) {
      nextMaintenanceDate = new Date(installationDate)
      nextMaintenanceDate.setDate(
        nextMaintenanceDate.getDate() + interval
      )
    }

    const asset = await Asset.create({
      name,
      assetId,
      category: category || "Other",
      location,
      installationDate: installationDate || null,
      maintenanceIntervalDays: interval,
      lastMaintenanceDate: null,
      nextMaintenanceDate,
      manufacturer,
      capacity,
      status: status || "Operational",
      parentAsset: parentAsset || null,
      position: position || {
        x: 0,
        y: 0,
        z: 0,
      },
      organization: req.user.organization,
    })

    res.status(201).json(asset)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

const getAssets = async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.status(400).json({
        message: "User is not linked to an organization",
      })
    }

    const assets = await Asset.find({
      organization: req.user.organization,
      isActive: { $ne: false },
    })
      .populate("parentAsset", "name assetId category status")
      .sort({ createdAt: -1 })

    const now = new Date()

    const assetsWithMaintenanceStatus = assets.map((asset) => {
      const assetObject = asset.toObject()

      const isMaintenanceOverdue =
        asset.nextMaintenanceDate &&
        new Date(asset.nextMaintenanceDate) < now

      const daysUntilMaintenance =
        asset.nextMaintenanceDate
          ? Math.ceil(
              (new Date(asset.nextMaintenanceDate) - now) /
                (1000 * 60 * 60 * 24)
            )
          : null

      return {
        ...assetObject,
        isMaintenanceOverdue,
        daysUntilMaintenance,
      }
    })

    res.status(200).json(assetsWithMaintenanceStatus)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      isActive: { $ne: false },
    }).populate("parentAsset", "name assetId category status")

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      })
    }

    res.status(200).json(asset)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

const updateAsset = async (req, res) => {
  try {
    const {
      name,
      category,
      location,
      installationDate,
      maintenanceIntervalDays,
      manufacturer,
      capacity,
      status,
      parentAsset,
      position,
    } = req.body

    const asset = await Asset.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      isActive: { $ne: false },
    })

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      })
    }

    if (name !== undefined) asset.name = name
    if (category !== undefined) asset.category = category
    if (location !== undefined) asset.location = location
    if (installationDate !== undefined) {
      asset.installationDate = installationDate || null
    }
    if (maintenanceIntervalDays !== undefined) {
      asset.maintenanceIntervalDays =
        Number(maintenanceIntervalDays) || 30
    }
    if (manufacturer !== undefined) asset.manufacturer = manufacturer
    if (capacity !== undefined) asset.capacity = capacity
    if (status !== undefined) asset.status = status
    if (parentAsset !== undefined) asset.parentAsset = parentAsset || null
    if (position !== undefined) asset.position = position

    await asset.save()

    res.status(200).json(asset)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

const performMaintenance = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      isActive: { $ne: false },
    })

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      })
    }

    const interval = asset.maintenanceIntervalDays || 30

    const nextMaintenanceDate = new Date()
    nextMaintenanceDate.setDate(
      nextMaintenanceDate.getDate() + interval
    )

    asset.lastMaintenanceDate = new Date()
    asset.nextMaintenanceDate = nextMaintenanceDate
    asset.status = "Operational"

    await asset.save()

    res.status(200).json(asset)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      })
    }

    asset.isActive = false
    await asset.save()

    res.status(200).json({
      message: "Asset removed",
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

module.exports = {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  performMaintenance,
  deleteAsset,
}