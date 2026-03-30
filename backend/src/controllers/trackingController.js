const SOSRequest = require("../models/SOSRequest");
const User = require("../models/User");

const updateResponderLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude & Longitude required"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    /* ===============================
       ✅ UPDATE USER LOCATION
    =============================== */

    user.currentLocation = {
      latitude,
      longitude,
      updatedAt: new Date()
    };

    // ✅ VERY IMPORTANT (for geo queries)
    user.lastLocation = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)] // [lng, lat]
    };

    user.lastMovementAt = new Date();

    await user.save();

    /* ===============================
       ✅ UPDATE SOS TRACKING
    =============================== */

    await SOSRequest.updateMany(
      {
        assignedResponder: user._id // ✅ FIXED
      },
      {
        $push: {
          responderLocations: {
            $each: [
              {
                responder: user._id, // ✅ FIXED
                latitude,
                longitude,
                updatedAt: new Date()
              }
            ],
            $slice: -10 // ✅ LIMIT STORAGE
          }
        }
      }
    );

    /* ===============================
       ✅ SOCKET LIVE UPDATE
    =============================== */

    const io = req.app.get("io");

   if (io) {
  console.log("📡 EMITTING NGO LOCATION:", {
    userId: user._id.toString(),
    latitude,
    longitude
  });

  io.emit("ngoLocationBroadcast", {
    userId: user._id.toString(), // 🔥 VERY IMPORTANT
    latitude,
    longitude,
    updatedAt: new Date()
  });
}

    /* ===============================
       RESPONSE
    =============================== */

    res.json({
      message: "Location updated successfully"
    });

  } catch (error) {
    console.error("Tracking Error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
};

module.exports = { updateResponderLocation };