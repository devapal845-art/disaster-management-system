const mongoose = require("mongoose");

const userPreparednessSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    disasterType: {
      type: String,
      required: true
    },

    selectedItems: [
      {
        name: String,
        completed: { type: Boolean, default: false }
      }
    ],

    preparednessScore: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "UserPreparedness",
  userPreparednessSchema
);