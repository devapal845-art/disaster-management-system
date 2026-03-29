const Alert = require("../models/Alert");

/* ===============================
   CREATE ALERT
=============================== */
exports.createAlert = async (req, res) => {
  try {

    const alert = await Alert.create(req.body);

    res.status(201).json(alert);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};


/* ===============================
   GET ALL ALERTS
=============================== */
exports.getAlerts = async (req, res) => {
  try {

    const alerts = await Alert.find()
      .sort({ createdAt: -1 });

    res.json(alerts);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};


/* ===============================
   GET ALERTS BY CITY
=============================== */
exports.getAlertsByCity = async (req, res) => {
  try {
    const city = req.params.city;

    // Example city coordinates (you can expand later)
    const cityCoordinates = {
      Kanpur: [80.3319, 26.4499],
      Lucknow: [80.9462, 26.8467],
      Unnao: [80.4878, 26.5471],
      Varanasi: [82.9739, 25.3176],
      Prayagraj: [81.8463, 25.4358]
    };

    const coords = cityCoordinates[city];

    if (!coords) {
      return res.status(400).json({
        message: "City coordinates not configured"
      });
    }

    const alerts = await Alert.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coords
          },
          $maxDistance: 50000 // 50km radius
        }
      }
    }).sort({ createdAt: -1 });

    res.json(alerts);

  } catch (error) {

    console.error("City alert error:", error.message);

    res.status(500).json({
      error: "Failed to fetch city alerts"
    });

  }
};