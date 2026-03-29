const SOSRequest = require("../models/SOSRequest");
const User = require("../models/User");
const sendSMS = require("./smsService");

const ESCALATION_TIME = 10; // 🔥 minutes (configurable)
const MAX_ESCALATION = 5;

const autoReassignSOS = async () => {
  try {
    console.log("🔄 Running Auto Reassignment Check...");

    const timeAgo = new Date(Date.now() - ESCALATION_TIME * 60 * 1000);

    /* ===============================
       FETCH STALE SOS
    =============================== */
    const staleSOS = await SOSRequest.find({
      status: "Assigned",
      escalationCount: { $lte: MAX_ESCALATION },
      assignedAt: { $lte: timeAgo },
      $or: [
        { lastEscalatedAt: { $exists: false } },
        { lastEscalatedAt: { $lte: timeAgo } }
      ]
    }).populate("assignedResponder");

    if (!staleSOS.length) {
      console.log("✅ No stale SOS found");
      return;
    }

    /* ===============================
       PROCESS EACH SOS
    =============================== */
    for (let sos of staleSOS) {

      /* 🚫 FINAL STOP CONDITION */
      if (sos.escalationCount >= MAX_ESCALATION) {

        sos.status = "Failed";
        sos.resolutionStatus = "AUTO_FAILED";
        sos.finalizedAt = new Date();

        await sos.save();

        console.log(`🚫 Finalized (Max Escalation): ${sos._id}`);
        continue;
      }

      /* ===============================
         CHECK CURRENT RESPONDER
      =============================== */
      const currentResponder = sos.assignedResponder;

      if (
        currentResponder &&
        ["GOV_EMPLOYEE", "GOV_ADMIN"].includes(currentResponder.role) &&
        sos.escalationCount >= 1
      ) {
        console.log(`⏭ Already escalated to GOV: ${sos._id}`);
        continue;
      }

      /* ===============================
         FIND AVAILABLE GOV RESPONDER
      =============================== */
      const governmentResponder = await User.findOne({
        role: "GOV_EMPLOYEE",
        city: sos.city,
        availability: "Available"
      });

      if (!governmentResponder) {
        console.log(`⚠ No GOV responder available for ${sos.city}`);
        continue;
      }

      /* ===============================
         RELEASE OLD RESPONDER (IMPORTANT FIX)
      =============================== */
      if (sos.assignedResponder) {
        await User.findByIdAndUpdate(sos.assignedResponder, {
          availability: "Available",
          activeSOS: null
        });
      }

      /* ===============================
         INIT ESCALATION HISTORY
      =============================== */
      if (!sos.escalationHistory) {
        sos.escalationHistory = [];
      }

      /* ===============================
         ESCALATE CASE
      =============================== */
      const previousResponderId = sos.assignedResponder;

      // ✅ Assign GOV
      sos.assignedResponder = governmentResponder._id;

      /* ✅ PREVENT DUPLICATE TEAM */
      const teamIds = (sos.assignedTeam || []).map(id => id.toString());

      if (!teamIds.includes(governmentResponder._id.toString())) {
        sos.assignedTeam.push(governmentResponder._id);
      }

      /* ✅ ESCALATION COUNT */
      sos.escalationCount = (sos.escalationCount || 0) + 1;

      /* ✅ HISTORY */
      sos.escalationHistory.push({
        fromPartner: previousResponderId,
        toPartner: governmentResponder._id,
        escalatedAt: new Date()
      });

      /* ✅ UPDATE TIMING */
      sos.assignedAt = new Date();
      sos.lastEscalatedAt = new Date();

      await sos.save();

      /* ===============================
         MARK GOV BUSY
      =============================== */
      governmentResponder.availability = "Busy";
      governmentResponder.activeSOS = sos._id;
      await governmentResponder.save();

      /* ===============================
         SEND SMS ALERT
      =============================== */
      if (governmentResponder.phone) {
        await sendSMS(
          governmentResponder.phone,
          `🚨 AUTO ESCALATION: ${sos.disasterType} in ${sos.city}`
        );
      }

      console.log(
        `🚨 SOS ${sos._id} → GOV ${governmentResponder.name}`
      );
    }

    console.log("✅ Auto Reassignment Cycle Completed");

  } catch (error) {
    console.error("❌ Auto Reassignment Error:", error.message);
  }
};

module.exports = autoReassignSOS;