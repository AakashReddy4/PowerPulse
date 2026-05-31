const mongoose = require("mongoose")

const maintenanceSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    scheduledDate: {
      type: Date,
      required: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },

    completionNotes: {
      type: String,
      default: "",
    },

    slaHours: {
      type: Number,
      default: 24,
    },

    deadline: {
      type: Date,
      default: null,
    },

    slaStatus: {
      type: String,
      enum: ["ACTIVE", "AT_RISK", "BREACHED", "MET", "BREACHED_RESOLVED", "NO_SLA"],
      default: "ACTIVE",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Maintenance", maintenanceSchema)