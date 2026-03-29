const express = require("express");
const router = express.Router();
const disasterController = require("../controllers/disasterController");
const authMiddleware = require("../middleware/authMiddleware"); // ✅ ADD THIS

router.get(
  "/current",
  authMiddleware,   // ✅ ADD THIS
  disasterController.getCurrentDisasters
);

module.exports = router;