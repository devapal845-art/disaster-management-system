const SOSRequest = require("../models/SOSRequest");
const User = require("../models/User");

const monitorMovement = async () => {
try {


const sosList = await SOSRequest.find({
  status: "OnTheWay"
});

for (let sos of sosList) {

  // ✅ FIX: use assignedResponder
  const user = await User.findById(sos.assignedResponder);

  if (!user || !user.lastMovementAt) continue;

  const minutes =
    (Date.now() - new Date(user.lastMovementAt)) / 60000;

  if (minutes > 5) {

    console.log("🚨 Responder not moving → Escalating:", sos._id);

    // ✅ update SOS safely
    sos.status = "Pending";
    sos.escalationCount = (sos.escalationCount || 0) + 1;

    await sos.save();

    // ✅ free responder
    user.availability = "Available";
    await user.save();
  }
}


} catch (error) {
console.error("Movement Monitor Error:", error.message);
}
};

module.exports = monitorMovement;
