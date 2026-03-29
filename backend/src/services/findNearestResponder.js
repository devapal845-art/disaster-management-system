const User = require("../models/User");

const findNearestResponder = async (lat, lng) => {
  try {
    // ✅ VALIDATION
    if (
      lat === undefined ||
      lng === undefined ||
      isNaN(Number(lat)) ||
      isNaN(Number(lng))
    ) {
      console.log("❌ Invalid coordinates received:", lat, lng);
      return null;
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    console.log("🔍 Searching NGO near:", latitude, longitude);

    const responders = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude] // ✅ CORRECT
          },
          distanceField: "distance",
          maxDistance: 50000,
          spherical: true
        }
      },
      {
        $match: {
          role: "NGO_ADMIN",
          availability: "Available"
        }
      },
      {
        $limit: 1
      }
    ]);

    console.log("👉 Geo result:", responders);

    const responder = responders[0] || null;

    if (!responder) {
      console.log("⚠ No NGO found nearby");
      return null;
    }

    console.log("🏢 Nearest NGO:", responder._id);

    return responder;

  } catch (error) {
    console.error("❌ findNearestResponder error:", error.message);
    return null;
  }
};

module.exports = findNearestResponder;