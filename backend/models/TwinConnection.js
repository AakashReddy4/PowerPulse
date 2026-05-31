const mongoose = require("mongoose")

const twinConnectionSchema = new mongoose.Schema(
  {
    fromAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },

    toAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },

    connectionType: {
      type: String,
      enum: ["power_line", "backup_line", "control_line", "data_line"],
      default: "power_line",
    },

    label: {
      type: String,
      default: "",
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
)

twinConnectionSchema.index(
  { fromAsset: 1, toAsset: 1, organization: 1 },
  { unique: true }
)

module.exports = mongoose.model("TwinConnection", twinConnectionSchema)