const Asset = require("../models/Asset")
const Ticket = require("../models/Ticket")
const Maintenance = require("../models/Maintenance")
const TwinConnection = require("../models/TwinConnection")

const getDigitalTwin = async (req, res) => {
  try {
    const organization = req.user.organization

    const assets = await Asset.find({ organization })
      .populate("parentAsset", "name assetId category status location position")
      .sort({ createdAt: -1 })

    const tickets = await Ticket.find({
      organization,
      isDeleted: { $ne: true },
    })
      .select("title status priority deadline asset createdBy assignedTo createdAt")
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })

    const maintenance = await Maintenance.find({ organization })
      .populate("asset", "name assetId category status location position")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })

    const connections = await TwinConnection.find({ organization })
      .populate("fromAsset", "name assetId category status location position")
      .populate("toAsset", "name assetId category status location position")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })

    res.status(200).json({
      assets,
      tickets,
      maintenance,
      connections,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: error.message,
    })
  }
}

const updateAssetPosition = async (req, res) => {
  try {
    const { position } = req.body

    if (
      !position ||
      typeof position.x !== "number" ||
      typeof position.y !== "number" ||
      typeof position.z !== "number"
    ) {
      return res.status(400).json({
        message: "Valid position { x, y, z } is required",
      })
    }

    const asset = await Asset.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      })
    }

    asset.position = {
      x: position.x,
      y: position.y,
      z: position.z,
    }

    await asset.save()

    res.status(200).json(asset)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: error.message,
    })
  }
}

const createConnection = async (req, res) => {
  try {
    const { fromAsset, toAsset, connectionType, label } = req.body

    if (!fromAsset || !toAsset) {
      return res.status(400).json({
        message: "fromAsset and toAsset are required",
      })
    }

    if (fromAsset === toAsset) {
      return res.status(400).json({
        message: "Cannot connect an asset to itself",
      })
    }

    const organization = req.user.organization

    const assets = await Asset.find({
      _id: { $in: [fromAsset, toAsset] },
      organization,
    })

    if (assets.length !== 2) {
      return res.status(404).json({
        message: "One or both assets not found in your organization",
      })
    }

    const existingConnection = await TwinConnection.findOne({
      fromAsset,
      toAsset,
      organization,
    })

    const reverseConnection = await TwinConnection.findOne({
      fromAsset: toAsset,
      toAsset: fromAsset,
      organization,
    })

    if (existingConnection || reverseConnection) {
      return res.status(400).json({
        message: "Connection already exists between these assets",
      })
    }

    const connection = await TwinConnection.create({
      fromAsset,
      toAsset,
      connectionType: connectionType || "power_line",
      label: label || "",
      organization,
      createdBy: req.user._id,
    })

    const populatedConnection = await TwinConnection.findById(connection._id)
      .populate("fromAsset", "name assetId category status location position")
      .populate("toAsset", "name assetId category status location position")
      .populate("createdBy", "name email role")

    res.status(201).json(populatedConnection)
  } catch (error) {
    console.error(error)

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Connection already exists",
      })
    }

    res.status(500).json({
      message: error.message,
    })
  }
}

const deleteConnection = async (req, res) => {
  try {
    const connection = await TwinConnection.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!connection) {
      return res.status(404).json({
        message: "Connection not found",
      })
    }

    await connection.deleteOne()

    res.status(200).json({
      message: "Connection removed",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: error.message,
    })
  }
}

const updateAssetTwinVisibility = async (req, res) => {
  try {
    const { isInTwin } = req.body

    if (typeof isInTwin !== "boolean") {
      return res.status(400).json({
        message: "isInTwin boolean is required",
      })
    }

    const asset = await Asset.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      })
    }

    asset.isInTwin = isInTwin

    await asset.save()

    res.status(200).json(asset)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: error.message,
    })
  }
}

module.exports = {
  getDigitalTwin,
  updateAssetPosition,
  createConnection,
  deleteConnection,
  updateAssetTwinVisibility
}