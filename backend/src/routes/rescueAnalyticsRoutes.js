const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getRescueAnalytics,
  getCityWiseAnalytics,
  getNGORanking,
  getMonthlyTrend
} = require("../controllers/rescueAnalyticsController");

/* ===============================
   CENTRAL DASHBOARD ANALYTICS
   (GOV_ADMIN only)
================================= */
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "GOV_ADMIN"]),
  getRescueAnalytics
);

/* ===============================
   CITY ANALYTICS
   (GOV_ADMIN + GOV_EMPLOYEE)
================================= */
router.get(
  "/city",
  authMiddleware,
  roleMiddleware(["Admin", "GOV_ADMIN", "GOV_EMPLOYEE"]),
  getCityWiseAnalytics
);

/* ===============================
   NGO RANKING
   (Central only)
================================= */
router.get(
  "/ngo-ranking",
  authMiddleware,
  roleMiddleware(["Admin", "GOV_ADMIN"]),
  getNGORanking
);

/* ===============================
   MONTHLY TREND
   (Central only)
================================= */
router.get(
  "/monthly-trend",
  authMiddleware,
  roleMiddleware(["Admin", "GOV_ADMIN"]),
  getMonthlyTrend
);
router.get(
  "/city/:city",
  authMiddleware,
  roleMiddleware(["GOV_ADMIN", "GOV_EMPLOYEE"]),
  getCityWiseAnalytics
);
module.exports = router;