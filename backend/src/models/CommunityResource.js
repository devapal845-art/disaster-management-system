const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  societyName: String,
  disasterType: String,
  resources: [
    {
      name: String,
      quantity: Number
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("CommunityResource", resourceSchema);

