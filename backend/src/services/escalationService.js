const SOSRequest = require("../models/SOSRequest");
const User = require("../models/User");
const sendSMS = require("./smsService");

const ESCALATION_TIME = 10; // 🔥 configurable (minutes)
const MAX_ESCALATION = 5;

const escalateSOS = async (io) => {
  try {
    const timeAgo = new Date(Date.now() - ESCALATION_TIME * 60 * 1000);

    /* =================================================
       1️⃣ ESCALATE PENDING SOS → ASSIGN GOV RESPONDER
    ================================================== */
    const pendingSOS = await SOSRequest.find({
      status: "Pending",
      escalationCount: { $lte: MAX_ESCALATION }, // ✅ FIX
      createdAt: { $lte: timeAgo },
      $or: [
        { lastEscalatedAt: { $exists: false } },
        { lastEscalatedAt: { $lte: timeAgo } }
      ]
    });

    for (let sos of pendingSOS) {

      /* 🚫 STOP IF MAX REACHED */
      if (sos.escalationCount > MAX_ESCALATION) {
        sos.status = "Failed";
        sos.resolutionStatus = "MAX_ESCALATION_REACHED";
        sos.finalizedAt = new Date();
        await sos.save();
        continue;
      }

      const governmentResponder = await User.findOne({
        role: "GOV_EMPLOYEE",
        city: sos.city,
        availability: "Available"
      });

      if (governmentResponder) {

        sos.status = "Assigned";
        sos.assignedResponder = governmentResponder._id;

        /* ✅ PREVENT DUPLICATE TEAM */
        const teamIds = (sos.assignedTeam || []).map(id => id.toString());

        if (!teamIds.includes(governmentResponder._id.toString())) {
          sos.assignedTeam.push(governmentResponder._id);
        }

        sos.assignedAt = new Date();
        sos.lastEscalatedAt = new Date();
        sos.escalationCount = (sos.escalationCount || 0) + 1;

        await sos.save();

        governmentResponder.availability = "Busy";
        await governmentResponder.save();

        if (governmentResponder.phone) {
          await sendSMS(
            governmentResponder.phone,
            `🚨 ESCALATED SOS: ${sos.disasterType} in ${sos.city}`
          );
        }

        console.log("🚨 Escalated → GOV:", sos._id);

        if (io) io.emit("sosUpdated", sos);
      }
    }

    /* =================================================
       2️⃣ ESCALATE ASSIGNED BUT NOT ACCEPTED
    ================================================== */
    const unacceptedSOS = await SOSRequest.find({
      status: "Assigned",
      escalationCount: { $lte: MAX_ESCALATION }, // ✅ FIX
      assignedAt: { $lte: timeAgo },
      $or: [
        { lastEscalatedAt: { $exists: false } },
        { lastEscalatedAt: { $lte: timeAgo } }
      ]
    });

    for (let sos of unacceptedSOS) {

      if (sos.assignedResponder) {
        await User.findByIdAndUpdate(sos.assignedResponder, {
          availability: "Available"
        });
      }

      sos.status = "Pending";
      sos.lastEscalatedAt = new Date();
      sos.escalationCount = (sos.escalationCount || 0) + 1;

      await sos.save();

      console.log("⚠ Reverted to Pending:", sos._id);

      if (io) io.emit("sosUpdated", sos);
    }

    /* =================================================
       3️⃣ ESCALATE IF RESPONDER NOT MOVING
    ================================================== */
    const onTheWaySOS = await SOSRequest.find({
      status: "OnTheWay",
      escalationCount: { $lte: MAX_ESCALATION } // ✅ FIX
    });

    for (let sos of onTheWaySOS) {

      const responder = await User.findById(sos.assignedResponder);

      if (!responder || !responder.lastMovementAt) continue;

      const minutesSinceMove =
        (new Date() - new Date(responder.lastMovementAt)) / 60000;

      if (minutesSinceMove > ESCALATION_TIME) {

        console.log("🚨 Not Moving → Escalating:", sos._id);

        responder.availability = "Available";
        await responder.save();

        sos.status = "Pending";
        sos.lastEscalatedAt = new Date();
        sos.escalationCount = (sos.escalationCount || 0) + 1;

        await sos.save();

        if (io) io.emit("sosUpdated", sos);
      }
    }

  } catch (error) {
    console.error("Escalation Error:", error.message);
  }
};

module.exports = escalateSOS;