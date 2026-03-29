
const express = require("express");
const router = express.Router();

const SOSRequest = require("../models/SOSRequest");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

/* ===============================
CONTROLLERS
================================= */
const {
  createSOS,
  updateSOSStatus,
  getActiveSOS,
  cancelSOS,
  rateSOS,
  adminOverrideAssign,
  assignMember,
} = require("../controllers/sosController");

/* ===============================
ADMIN OVERRIDE ASSIGN
================================= */
router.patch(
  "/:id/override",
  authMiddleware,
  roleMiddleware(["Admin", "GOV_ADMIN"]),
  adminOverrideAssign
);

/* ===============================
ASSIGN MEMBER
================================= */
router.patch(
  "/:id/assign",
  authMiddleware,
  roleMiddleware(["NGO_ADMIN", "GOV_ADMIN"]),
  assignMember
);

/* ===============================
CREATE SOS
================================= */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Citizen"]),
  createSOS
);

/* ===============================
UPDATE STATUS
================================= */
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware([
    "NGO_USER",
    "NGO_ADMIN",
    "GOV_ADMIN",
    "GOV_EMPLOYEE"
  ]),
  updateSOSStatus
);

/* ===============================
GET ACTIVE SOS
================================= */
router.get(
  "/active",
  authMiddleware,
  roleMiddleware([
    "Admin",
    "GOV_ADMIN",
    "GOV_EMPLOYEE",
    "NGO_ADMIN",
    "NGO_USER",
    "Citizen"
  ]),
  getActiveSOS
);

/* ===============================
CANCEL SOS
================================= */
router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware(["Citizen"]),
  cancelSOS
);

/* ===============================
RATE SOS
================================= */
router.patch(
  "/:id/rate",
  authMiddleware,
  roleMiddleware(["Citizen"]),
  rateSOS
);

/* ===============================
CITY BASED SOS
================================= */
router.get(
  "/city/:city",
  authMiddleware,
  roleMiddleware(["GOV_ADMIN", "GOV_EMPLOYEE"]),
  async (req, res) => {
    try {
      const city = req.params.city;

      const sosList = await SOSRequest.find({
        city,
        status: { $ne: "Closed" }
      }).sort({ createdAt: -1 });

      res.json(sosList);

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/* ===============================
NGO MISSIONS (FIXED)
================================= */
router.get(
  "/ngo/missions",
  authMiddleware,
  roleMiddleware(["NGO_ADMIN", "NGO_USER"]),
  async (req, res) => {
    try {

      const sosList = await SOSRequest.find({
        $or: [
          { assignedResponder: req.user._id }, // NGO USER
          { assignedTeam: { $in: [req.user._id] } } // NGO ADMIN
        ],
        status: { $ne: "Closed" }
      })
      .populate("assignedResponder", "name role") // 🔥 IMPORTANT
      .sort({ createdAt: -1 });

      res.json(sosList);

    } catch (error) {
      console.error("NGO SOS fetch error:", error.message);

      res.status(500).json({
        message: "Failed to fetch NGO missions"
      });
    }
  }
);
router.patch(
  "/:id/critical",
  authMiddleware,
  roleMiddleware([
    "Admin",
    "GOV_ADMIN",
    "GOV_EMPLOYEE",
    "NGO_ADMIN",
    "NGO_USER"   // ✅ ADD THIS
  ]),
  async (req, res) => {
    try {
      const sos = await SOSRequest.findByIdAndUpdate(
        req.params.id,
        { criticalFlag: true },
        { new: true }
      );

      res.json(sos);

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
module.exports = router;

