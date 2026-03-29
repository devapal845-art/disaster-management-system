const mongoose = require("mongoose");

const preparedKitSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ["Family", "Society"],
    required: true
  },
  disasterType: {
    type: String,
    required: true
  },
  items: [
    {
      name: String,
      description: String,
      required: Boolean
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("PreparedKit", preparedKitSchema);
