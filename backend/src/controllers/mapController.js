const Alert = require("../models/Alert");

exports.getNearbyAlerts = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    const alerts = await Alert.find({
      location: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            parseFloat(radius) / 6378.1 // Earth radius in KM
          ]
        }
      }
    });

    res.json(alerts);

  } catch (error) {
    res.status(500).json({ error: "Geo query failed" });
  }
};