const mongoose = require("mongoose");

const familyChecklistSchema = new mongoose.Schema({
  userId: String,
  disasterType: String,
  items: [
    {
      name: String,
      completed: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("FamilyChecklist", familyChecklistSchema);
