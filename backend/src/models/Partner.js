const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    enum: ["NGO", "Government"]
  },
  city: String,
  disasterTypes: [String],
  contactPerson: String,
  phone: String,
  email: String,
  availability: {
    type: String,
    enum: ["Available", "Busy"],
    default: "Available"
  }
}, { timestamps: true });

module.exports = mongoose.model("Partner", partnerSchema);
