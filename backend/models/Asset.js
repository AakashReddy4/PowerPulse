const mongoose = require("mongoose")

const assetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    assetId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Transformer",
        "Generator",
        "Electrical Panel",
        "Motor",
        "Pump",
        "Street Light",
        "Battery Bank",
        "Solar Inverter",
        "UPS",
        "Substation",
        "Other",
      ],
      default: "Other",
    },

    status: {
      type: String,
      enum: [
        "Operational",
        "Under Maintenance",
        "Fault Detected",
        "Critical",
        "Inactive",
      ],
      default: "Operational",
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    manufacturer: {
      type: String,
      default: "",
      trim: true,
    },

    capacity: {
      type: String,
      default: "",
      trim: true,
    },

    installationDate: {
      type: Date,
      default: null,
    },

    maintenanceIntervalDays: {
      type: Number,
      default: 30,
    },

    lastMaintenanceDate: {
      type: Date,
      default: null,
    },

    nextMaintenanceDate: {
      type: Date,
      default: null,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    parentAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      default: null,
    },

    position: {
      x: {
        type: Number,
        default: 0,
      },

      y: {
        type: Number,
        default: 0,
      },

      z: {
        type: Number,
        default: 0,
      },
    },

    isInTwin: {
  type: Boolean,
  default: false
},

    isActive: {
      type: Boolean,
      default: true,
    },

    linkedTickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ticket",
      },
    ],

    maintenanceHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Maintenance",
      },
    ],
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model("Asset", assetSchema)