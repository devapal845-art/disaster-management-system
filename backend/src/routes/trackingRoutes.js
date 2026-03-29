const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  updateResponderLocation
} = require("../controllers/trackingController");

router.patch(
  "/:id/location",
  authMiddleware,
  roleMiddleware(["NGO_USER", "GOV_EMPLOYEE"]),
  updateResponderLocation
);

module.exports = router;