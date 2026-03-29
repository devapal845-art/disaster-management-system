const contactSchema = new mongoose.Schema({
  level: { type: String, enum: ["Family", "Society"] },

  // 🔥 LINK TO GROUP
  familyGroupId: {
    type: String,
    default: null
  },

  societyGroupId: {
    type: String,
    default: null
  },

  // 🔥 OPTIONAL: LINK TO USER
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  name: String,
  role: String,
  phone: String,
  disasterType: String

}, { timestamps: true });