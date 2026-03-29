const User = require("../models/User");

/* ===============================
HAVERSINE DISTANCE
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
ASSIGN NEAREST MEMBER
================================= */
const assignNearestMember = async (ngoId, latitude, longitude) => {
try {

const members = await User.find({
  role: "NGO_USER",
  ngoId: ngoId
});

console.log("👨‍🚒 ALL NGO MEMBERS:", members.length);

if (!members.length) {
  console.log("❌ No NGO members found");
  return null;
}

let nearest = null;
let minDistance = Infinity;

for (let member of members) {

  if (member.availability === "Busy") continue;

  if (
    !member.currentLocation ||
    member.currentLocation.latitude == null ||
    member.currentLocation.longitude == null
  ) {
    console.log(`⚠ Skipping ${member.name} (no GPS)`);
    continue;
  }

  const distance = calculateDistance(
    Number(latitude),
    Number(longitude),
    Number(member.currentLocation.latitude),
    Number(member.currentLocation.longitude)
  );

  console.log(`📍 ${member.name} → ${distance.toFixed(2)} km`);

  if (distance < minDistance) {
    minDistance = distance;
    nearest = member;
  }
}

/* ===============================
   FALLBACK MEMBER
=============================== */
if (!nearest) {
  console.log("⚠ No GPS member → fallback assign");

  nearest = members.find(m => m.availability !== "Busy");

  if (!nearest) {
    console.log("❌ All members busy");
    return null;
  }
}

/* ===============================
   MARK BUSY
=============================== */
await User.findByIdAndUpdate(nearest._id, {
  availability: "Busy"
});

const distanceText =
  minDistance !== Infinity ? `${minDistance.toFixed(2)} km` : "N/A";

console.log(
  `✅ Assigned Member: ${nearest.name} (${distanceText})`
);

return nearest;


} catch (error) {
console.error("Member assignment error:", error.message);
return null;
}
};

module.exports = assignNearestMember;
