const Alert = require("../models/Alert");

exports.getAdvancedRiskData = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const alerts = await Alert.find({});

    let personalRiskScore = 0;

    alerts.forEach(alert => {
      const [alertLng, alertLat] = alert.location.coordinates;

      const distance = calculateDistance(
        lat,
        lng,
        alertLat,
        alertLng
      );

      if (distance < 100) {
        personalRiskScore +=
          alert.riskScore * (1 / (distance + 1));
      }
    });

    let riskLevel = "LOW";
    if (personalRiskScore > 150) riskLevel = "CRITICAL";
    else if (personalRiskScore > 80) riskLevel = "HIGH";
    else if (personalRiskScore > 40) riskLevel = "MEDIUM";

    res.json({
      alerts,
      personalRiskScore,
      riskLevel
    });

  } catch (err) {
    res.status(500).json({ error: "Risk engine failed" });
  }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLon = (lon2 - lon1) * Math.PI/180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}