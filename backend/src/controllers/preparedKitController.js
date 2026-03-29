const PreparedKit = require("../models/PreparedKit");
const Alert = require("../models/Alert");

// ✅ Get specific kit by disasterType + level
const getPreparedKit = async (req, res) => {
  try {
    const { disasterType, level } = req.query;

    const kit = await PreparedKit.findOne({
      disasterType,
      level
    });

    if (!kit) {
      return res.status(404).json({ message: "Prepared kit not found" });
    }

    res.json(kit);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch kit" });
  }
};

// ✅ Auto-suggest kit based on latest alert
const suggestKit = async (req, res) => {
  try {
    const latestAlert = await Alert.findOne().sort({ createdAt: -1 });

    if (!latestAlert) {
      return res.status(404).json({ message: "No recent alerts" });
    }

    const kit = await PreparedKit.findOne({
      disasterType: latestAlert.type,
      level: "Family"
    });

    res.json({
      disasterType: latestAlert.type,
      severity: latestAlert.severity,
      kit
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to suggest kit" });
  }
};

module.exports = { getPreparedKit, suggestKit };
