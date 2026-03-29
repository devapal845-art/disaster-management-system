const User = require("../models/User");

/* ===============================
HAVERSINE DISTANCE FUNCTION
================================= */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
const R = 6371;

const dLat = (lat2 - lat1) * Math.PI / 180;
const dLon = (lon2 - lon1) * Math.PI / 180;

const a =
Math.sin(dLat / 2) ** 2 +
Math.cos(lat1 * Math.PI / 180) *
Math.cos(lat2 * Math.PI / 180) *
Math.sin(dLon / 2) ** 2;

const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

return R * c;
};

/* ===============================
SMART RESCUE ASSIGNMENT ENGINE
================================= */
const assignPartner = async (disasterType, city, latitude, longitude) => {
try {


if (latitude == null || longitude == null) {
  console.log("❌ Missing SOS coordinates");
  return null;
}

console.log(`🚨 New SOS: ${disasterType} | ${city}`);
console.log(`📍 Location: ${latitude}, ${longitude}`);

const responders = await User.find({
  role: "NGO_USER",
  availability: "Available",
  lastLocation: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)]
      },
      $maxDistance: 50000
    }
  }
});

if (!responders.length) {
  console.log("⚠ No responders available nearby");
  return null;
}

let bestResponder = null;
let bestScore = Infinity;

for (let responder of responders) {

  if (!responder.lastLocation || !responder.lastLocation.coordinates) {
    console.log("⚠ Missing location for:", responder.name);
    continue;
  }

  const [resLng, resLat] = responder.lastLocation.coordinates;

  const distance = calculateDistance(
    latitude,
    longitude,
    resLat,
    resLng
  );

  const avgResponseTime = responder.avgResponseTime || 30;
  const performanceScore = responder.performanceScore || 50;

  const score =
    (distance * 0.5) +
    (avgResponseTime * 0.3) -
    (performanceScore * 0.2);

  console.log(
    `📏 ${responder.name} | distance: ${distance.toFixed(2)} km | score: ${score.toFixed(2)}`
  );

  if (score < bestScore) {
    bestScore = score;
    bestResponder = responder;
  }
}

if (!bestResponder) {
  console.log("❌ No valid responder found");
  return null;
}

bestResponder.availability = "Busy";
await bestResponder.save();

const scoreText =
  bestScore !== Infinity ? bestScore.toFixed(2) : "N/A";

console.log(
  `🚑 Assigned: ${bestResponder.name} | score: ${scoreText}`
);

return bestResponder;


} catch (error) {
console.error("Assignment Error:", error.message);
return null;
}
};

module.exports = assignPartner;
