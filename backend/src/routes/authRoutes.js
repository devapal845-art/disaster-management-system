const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User"); // ✅🔥 IMPORTANT FIX
const roleMiddleware = require("../middleware/roleMiddleware");
// ===============================
// AUTH
// ===============================
router.post("/register", authController.register);
router.post("/login", authController.login);

// ===============================
// LIVE LOCATION
// ===============================
router.patch("/location", authMiddleware, authController.updateLocation);

// ===============================
// GROUP MEMBERS
// ===============================
router.get("/group/members", authMiddleware, authController.getGroupMembers);

// ===============================
// GET NGO ADMINS
// ===============================
router.get("/ngo-admins", async (req, res) => {
  try {
    const ngos = await User.find({ role: "NGO_ADMIN" })
      .select("_id organizationName");

    res.json(ngos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// GET GOV ADMINS
// ===============================
router.get("/gov-admins", async (req, res) => {
  try {
    const govs = await User.find({ role: "GOV_ADMIN" })
      .select("_id department city");

    res.json(govs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get(
  "/responders",
  authMiddleware,
  roleMiddleware(["Admin", "GOV_ADMIN"]),
  async (req, res) => {
    try {

      const responders = await User.find({
        role: "GOV_EMPLOYEE"
      }).select("name role city availability isOnline activeSOS");

      res.json(responders);

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
module.exports = router;