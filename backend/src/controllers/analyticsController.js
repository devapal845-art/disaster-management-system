const Alert = require("../models/Alert");

const getAnalytics = async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments();

    // Alerts by type
    const byTypeAggregation = await Alert.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    const byType = {};
    byTypeAggregation.forEach(item => {
      byType[item._id] = item.count;
    });

    // Alerts by city
    const alertsByCityAggregation = await Alert.aggregate([
      { $group: { _id: "$location", count: { $sum: 1 } } }
    ]);

    const alertsByCity = {};
    alertsByCityAggregation.forEach(item => {
      alertsByCity[item._id] = item.count;
    });

    // Severe alerts
    const severeAlerts = await Alert.countDocuments({
      severity: "Severe"
    });

    // Today alerts
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayAlerts = await Alert.countDocuments({
      createdAt: { $gte: startOfDay }
    });

    // Weekly trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyTrend = await Alert.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    res.json({
      totalAlerts,
      byType,
      alertsByCity,
      severeAlerts,
      todayAlerts,
      weeklyTrend
    });

  } catch (error) {
    console.error("Analytics Error:", error.message);
    res.status(500).json({ error: "Analytics failed" });
  }
};

module.exports = { getAnalytics };
