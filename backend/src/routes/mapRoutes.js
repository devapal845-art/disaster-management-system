const express = require("express");
const router = express.Router();
const { getNearbyAlerts } = require("../controllers/mapController");

router.get("/nearby", getNearbyAlerts);

module.exports = router;