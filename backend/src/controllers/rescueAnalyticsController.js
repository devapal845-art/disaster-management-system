const SOSRequest = require("../models/SOSRequest");
const User = require("../models/User");
const getRescueAnalytics = async (req, res) => {
  try {
    const totalSOS = await SOSRequest.countDocuments();

    const assignedSOS = await SOSRequest.find({
      assignedAt: { $ne: null }
    });

    const resolvedSOS = await SOSRequest.find({
      resolvedAt: { $ne: null }
    });

    // ⏱ Calculate Average Assignment Time
    let totalAssignTime = 0;
    assignedSOS.forEach(sos => {
      totalAssignTime += (sos.assignedAt - sos.createdAt);
    });

    const avgAssignTime = assignedSOS.length
      ? (totalAssignTime / assignedSOS.length) / 60000
      : 0;

    // ⏱ Calculate Average Resolution Time
    let totalResolveTime = 0;
    resolvedSOS.forEach(sos => {
      totalResolveTime += (sos.resolvedAt - sos.createdAt);
    });

    const avgResolveTime = resolvedSOS.length
      ? (totalResolveTime / resolvedSOS.length) / 60000
      : 0;

    const pendingCount = await SOSRequest.countDocuments({ status: "Pending" });
    const rescuedCount = await SOSRequest.countDocuments({ status: "Rescued" });

    res.json({
      totalSOS,
      pendingCount,
      rescuedCount,
      averageAssignmentTimeMinutes: avgAssignTime.toFixed(2),
      averageResolutionTimeMinutes: avgResolveTime.toFixed(2)
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rescue analytics" });
  }
};

const getCityWiseAnalytics = async (req, res) => {
  try {

    const cityData = await SOSRequest.aggregate([
      {
        $group: {
          _id: "$city",
          totalSOS: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0]
            }
          },
          rescued: {
            $sum: {
              $cond: [{ $eq: ["$status", "Rescued"] }, 1, 0]
            }
          },
          avgAssignTime: {
            $avg: {
              $cond: [
                { $ne: ["$assignedAt", null] },
                { $subtract: ["$assignedAt", "$createdAt"] },
                null
              ]
            }
          },
          avgResolveTime: {
            $avg: {
              $cond: [
                { $ne: ["$resolvedAt", null] },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                null
              ]
            }
          }
        }
      }
    ]);

    const formatted = cityData.map(city => ({
      city: city._id,
      totalSOS: city.totalSOS,
      pending: city.pending,
      rescued: city.rescued,
      averageAssignmentTimeMinutes: city.avgAssignTime
        ? (city.avgAssignTime / 60000).toFixed(2)
        : "0.00",
      averageResolutionTimeMinutes: city.avgResolveTime
        ? (city.avgResolveTime / 60000).toFixed(2)
        : "0.00"
    }));

    res.json(formatted);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch city analytics" });
  }
};

const getNGORanking = async (req, res) => {
  try {

    const ngoStats = await SOSRequest.aggregate([
      {
        $match: { assignedPartner: { $ne: null } }
      },
      {
        $lookup: {
          from: "users",              // ✅ FIXED (was partners)
          localField: "assignedPartner",
          foreignField: "_id",
          as: "ngo"
        }
      },
      { $unwind: "$ngo" },
      {
        $match: { "ngo.role": "NGO" }  // ✅ match NGO role
      },
      {
        $group: {
          _id: "$ngo._id",
          ngoName: { $first: "$ngo.name" },
          totalAssigned: { $sum: 1 },
          rescued: {
            $sum: {
              $cond: [{ $eq: ["$status", "Rescued"] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0]
            }
          },
          avgAssignTime: {
            $avg: {
              $cond: [
                { $ne: ["$assignedAt", null] },
                { $subtract: ["$assignedAt", "$createdAt"] },
                null
              ]
            }
          },
          avgResolveTime: {
            $avg: {
              $cond: [
                { $ne: ["$resolvedAt", null] },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                null
              ]
            }
          }
        }
      },
      { $sort: { rescued: -1 } }
    ]);

    const formatted = ngoStats.map(ngo => {
      const successRate = ngo.totalAssigned
        ? ((ngo.rescued / ngo.totalAssigned) * 100).toFixed(2)
        : "0.00";

      return {
        _id: ngo._id,
        name: ngo.ngoName,
        totalAssigned: ngo.totalAssigned,
        rescued: ngo.rescued,
        pending: ngo.pending,
        successRate: successRate + "%",
        averageAssignmentTimeMinutes: ngo.avgAssignTime
          ? (ngo.avgAssignTime / 60000).toFixed(2)
          : "0.00",
        averageResolutionTimeMinutes: ngo.avgResolveTime
          ? (ngo.avgResolveTime / 60000).toFixed(2)
          : "0.00"
      };
    });

    res.json(formatted);

  } catch (error) {
    console.error("NGO Ranking Error:", error.message);
    res.status(500).json({ error: "Failed to fetch NGO ranking" });
  }
};
const getMonthlyTrend = async (req, res) => {
  try {
    const monthlyData = await SOSRequest.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const formatted = monthlyData.map(m => ({
      month: m._id,
      total: m.total
    }));

    res.json(formatted);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch monthly trend" });
  }
};

module.exports = {
  getRescueAnalytics,
  getCityWiseAnalytics,
  getNGORanking,getMonthlyTrend

};
