const express = require("express");
const router = express.Router();

const { getPreparedKit, suggestKit } = require("../controllers/preparedKitController");

// Get kit by disasterType & level
router.get("/", getPreparedKit);

// Suggest kit based on latest alert
router.get("/suggest", suggestKit);

module.exports = router;
