const express = require("express");
const router = express.Router();

const {
  getPreparednessIntelligence,
  updatePsychologicalCheck,createPreparedKit,togglePreparedItem
} = require("../controllers/preparednessController");

const authMiddleware = require("../middleware/authMiddleware");

// Intelligence Dashboard
router.get(
  "/intelligence",
  authMiddleware,
  getPreparednessIntelligence
);

// Psychological Update
router.patch(
  "/psychological",
  authMiddleware,
  updatePsychologicalCheck
);
router.post(
  "/kit",
  authMiddleware,
  createPreparedKit
);
router.patch("/kit-item", authMiddleware, togglePreparedItem);
router.get("/test", (req, res) => {
  res.send("Preparedness route working");
});
module.exports = router;