const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({

  /* ===============================
     ALERT TYPE
  =============================== */
  type: {
    type: String,
    required: true
  },

  severity: {
    type: String,
    enum: ["Low", "Moderate", "High", "Severe"],
    default: "Moderate"
  },

  riskScore: {
    type: Number,
    default: 0
  },

  message: {
    type: String
  },

  /* ===============================
     ALERT SOURCE
     (USGS / Weather / AQI / Fire)
  =============================== */
  source: {
    type: String
  },

  /* ===============================
     CITY FILTER
  =============================== */
  city: {
    type: String
  },

  /* ===============================
     EXTRA DATA
  =============================== */
  metadata: {
    type: Object
  },

  /* ===============================
     GEO LOCATION
  =============================== */
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },

    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  /* ===============================
     AUTO EXPIRY
  =============================== */
  expiresAt: {
    type: Date
  }

}, { timestamps: true });


/* ===============================
   GEO INDEX
================================= */
alertSchema.index({ location: "2dsphere" });


module.exports = mongoose.model("Alert", alertSchema);