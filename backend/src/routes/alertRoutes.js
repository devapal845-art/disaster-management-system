const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  createAlert,
  getAlerts,
  getAlertsByCity
} = require("../controllers/alertController");

router.post("/", createAlert);

router.get("/", getAlerts);

router.get(
  "/city/:city",
  authMiddleware,
  roleMiddleware(["Admin","GOV_ADMIN","GOV_EMPLOYEE"]),
  getAlertsByCity
);

module.exports = router;