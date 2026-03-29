const User = require("../models/User");

const findNearestResponder = async (lat, lng) => {
try {


const responder = await User.findOne({
  role: "NGO_ADMIN",
  availability: "Available",
  lastLocation: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)] // [lng, lat]
      },
      $maxDistance: 10000 // 10 km
    }
  }
});

if (!responder) {
  console.log("⚠ No NGO found nearby");
  return null;
}

console.log("🏢 Nearest NGO found:", responder._id);

return responder;


} catch (error) {


console.error("❌ findNearestResponder error:", error.message);
return null;


}
};

module.exports = findNearestResponder;
