const SOSRequest = require("../models/SOSRequest");
const assignPartner = require("../services/rescueAssignmentService");
const assignNearestMember = require("../services/memberAssignmentService");
const { sendBulkSMS, sendSMS } = require("../services/smsService"); // ✅ FIXED
const User = require("../models/User");
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
   CREATE SOS
================================= */

const findNearestResponder = require("../services/findNearestResponder");



const createSOS = async (req, res) => {
  try {
    const {
      name,
      phone,
      disasterType,
      city,
      message,
      location
    } = req.body;

    const userId = req.user._id;

    console.log("🚨 NEW SOS REQUEST");

    /* ===============================
       ✅ VALIDATE LOCATION
    =============================== */
    if (
      !location ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        message: "Invalid location format"
      });
    }

    const lng = Number(location.coordinates[0]);
    const lat = Number(location.coordinates[1]);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({
        message: "Invalid coordinates values"
      });
    }

    console.log("📍 Clean Coordinates:", lng, lat);

    /* ===============================
       GET CURRENT USER (IMPORTANT FIX)
    =============================== */
    const currentUser = await User.findById(userId);

    /* ===============================
       SMART SOS CHECK
    =============================== */
    const existingSOS = await SOSRequest.findOne({
      userId,
      status: { $in: ["Pending", "Assigned", "OnTheWay"] }
    });

    if (existingSOS) {
      const [oldLng, oldLat] = existingSOS.location.coordinates;

      const distance = calculateDistance(
        oldLat,
        oldLng,
        lat,
        lng
      );

      const timeDiff =
        (Date.now() - new Date(existingSOS.createdAt)) / 60000;

      if (distance < 0.5 && timeDiff < 10) {
        return res.status(400).json({
          message: "SOS already active at this location",
          sos: existingSOS
        });
      }

      await SOSRequest.findByIdAndUpdate(existingSOS._id, {
        status: "Closed"
      });
    }

    /* ===============================
       CREATE SOS
    =============================== */
    const sos = new SOSRequest({
      userId,
      name,
      phone,
      disasterType,
      city,
      message,
      location: {
        type: "Point",
        coordinates: [lng, lat]
      }
    });

    /* ===============================
       FIND NEAREST NGO
    =============================== */
    console.log("📍 SOS location received:", lat, lng);

    const partner = await findNearestResponder(lat, lng);
    console.log("👉 Partner result:", partner);

    let member = null;

    if (partner) {
      member = await assignNearestMember(
        partner._id,
        lat,
        lng
      );

      sos.assignedResponder = member ? member._id : null;
      sos.assignedTeam = member
        ? [partner._id, member._id]
        : [partner._id];

      if (member) {
        sos.status = "Assigned";
        sos.assignedAt = new Date();
      } else {
        sos.status = "Pending";
      }
    } else {
      sos.status = "Pending";
    }

    /* ===============================
       SAVE SOS
    =============================== */
    await sos.save();

    /* ===============================
       🔴 UPDATE USER RISK + LOCATION
    =============================== */
    const riskLevel =
      disasterType === "Earthquake" ? "Critical" :
      disasterType === "Flood" ? "High" :
      "Moderate";

    await User.findByIdAndUpdate(userId, {
      lastRiskLevel: riskLevel,
      lastLocation: {
        type: "Point",
        coordinates: [lng, lat]
      }
    });

    /* ===============================
       🔴 GROUP ALERT (NEW)
    =============================== */
    await User.updateMany(
      {
        $or: [
          ...(currentUser.familyGroupId ? [{ familyGroupId: currentUser.familyGroupId }] : []),
          ...(currentUser.societyGroupId ? [{ societyGroupId: currentUser.societyGroupId }] : [])
        ]
      },
      {
        $set: { groupAlert: true }
      }
    );

    /* ===============================
       📡 SOCKET REAL-TIME (NEW)
    =============================== */
    if (req.app.get("io")) {
      req.app.get("io").emit("newSOS", sos);
    }

    /* ===============================
       🚨 SMS ALERT SYSTEM
    =============================== */
    try {
      const baseMessage = `🚨 EMERGENCY ALERT!

Type: ${sos.disasterType}
City: ${sos.city}

📍 https://maps.google.com/?q=${lat},${lng}

Stay safe & follow instructions.`;

      /* 1️⃣ FAMILY */
      if (currentUser.familyGroupId) {
        const family = await User.find({
          familyGroupId: currentUser.familyGroupId,
          _id: { $ne: userId }
        }).select("phone");

        const numbers = family.map(u => u.phone).filter(Boolean);

        await sendBulkSMS(numbers, `👨‍👩‍👧 FAMILY ALERT\n${baseMessage}`);
      }

      /* 2️⃣ SOCIETY */
      if (currentUser.societyGroupId) {
        const society = await User.find({
          societyGroupId: currentUser.societyGroupId,
          _id: { $ne: userId }
        }).select("phone");

        const numbers = society.map(u => u.phone).filter(Boolean);

        await sendBulkSMS(numbers, `🏢 SOCIETY ALERT\n${baseMessage}`);
      }

      /* 3️⃣ NEARBY USERS (SMART RADIUS) */
      const radius =
        disasterType === "Earthquake" ? 10000 :
        disasterType === "Flood" ? 7000 :
        3000;

      const nearbyUsers = await User.find({
        _id: { $ne: userId },
        lastLocation: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat]
            },
            $maxDistance: radius
          }
        }
      }).select("phone");

      const nearbyNumbers = nearbyUsers.map(u => u.phone).filter(Boolean);

      await sendBulkSMS(
        nearbyNumbers,
        `⚠️ DANGER ZONE ALERT\n${baseMessage}`
      );

      /* 4️⃣ NGO / GOV */
      const responders = await User.find({
        role: { $in: ["NGO_ADMIN", "GOV_ADMIN"] },
        city: sos.city
      }).select("phone");

      const responderNumbers = responders.map(u => u.phone).filter(Boolean);

      await sendBulkSMS(
        responderNumbers,
        `🚑 RESCUE REQUIRED\n${baseMessage}`
      );

      console.log("✅ SMS alerts sent");

    } catch (err) {
      console.error("❌ SMS Error:", err.message);
    }

    /* ===============================
       UPDATE RESPONDER
    =============================== */
    if (member) {
      await User.findByIdAndUpdate(member._id, {
        availability: "Busy",
        activeSOS: sos._id,
        activeMissionsCount: (member.activeMissionsCount || 0) + 1
      });
    }

    res.json({
      message: "SOS Created Successfully",
      sos
    });

  } catch (error) {
    console.error("❌ Create SOS Error:", error);

    res.status(500).json({
      error: error.message
    });
  }
};








/* ===============================
   UPDATE SOS STATUS
================================= */
const updateSOSStatus = async (req, res) => {
try {
const { status } = req.body;


const sos = await SOSRequest.findById(req.params.id);

if (!sos) {
  return res.status(404).json({
    message: "SOS not found"
  });
}

sos.status = status;

/* ===============================
   ON THE WAY
================================= */
if (status === "OnTheWay") {
  sos.assignedAt = new Date();
}

/* ===============================
   RESCUED
================================= */
if (status === "Rescued") {

  sos.resolvedAt = new Date();

  // ✅ Notify citizen
  if (sos.phone) {
    await sendSMS(
      sos.phone,
      "You have been rescued safely. Stay safe."
    );
  }

  /* ===============================
     ✅ FIX: USE assignedResponder
  ================================= */
  if (sos.assignedResponder) {

    const responder = await User.findById(sos.assignedResponder);

    if (responder) {

      // ✅ Make responder available again
     responder.availability = "Available";
responder.activeSOS = null;
responder.activeMissionsCount = Math.max(
  (responder.activeMissionsCount || 1) - 1,
  0
);
      // ✅ Increase rescue count
      responder.totalRescues =
        (responder.totalRescues || 0) + 1;

      /* ===============================
         RESPONSE TIME CALCULATION
      ================================= */
      if (sos.assignedAt) {

        const responseTime =
          (new Date(sos.resolvedAt) -
            new Date(sos.assignedAt)) / 60000;

        sos.responseTime = responseTime;

        responder.avgResponseTime =
          ((responder.avgResponseTime || 0) *
            (responder.totalRescues - 1) +
            responseTime) /
          responder.totalRescues;

        responder.performanceScore =
          (responder.totalRescues * 10) -
          (responder.avgResponseTime * 0.5) -
          ((sos.escalationCount || 0) * 5);
      }

      await responder.save();
    }
  }
}

/* ===============================
   CLOSED (CANCEL / FORCE CLOSE)
================================= */
if (status === "Closed") {
  if (sos.assignedResponder) {
    await User.findByIdAndUpdate(
      sos.assignedResponder,
      {
        availability: "Available",
        activeSOS: null,
        $inc: { activeMissionsCount: -1 }
      }
    );
  }

  sos.resolvedAt = new Date();
}

/* ===============================
   SAVE SOS
================================= */
await sos.save();

/* ===============================
   SOCKET UPDATE
================================= */
if (req.app.get("io")) {
  req.app.get("io").emit("sosUpdated", sos);
}

/* ===============================
   RESPONSE
================================= */
res.json({
  message: "Status Updated",
  sos
});


} catch (error) {


console.error("Update Status Error:", error.message);

res.status(500).json({
  error: "Failed to update status"
});


}
};







/* ===============================
   ADMIN MANUAL REASSIGNMENT
================================= */
const adminOverrideAssign = async (req, res) => {
try {


const { partnerId } = req.body;

const sos = await SOSRequest.findById(req.params.id);

if (!sos) {
  return res.status(404).json({
    message: "SOS not found"
  });
}

const newResponder = await User.findById(partnerId);

if (!newResponder) {
  return res.status(404).json({
    message: "Responder not found"
  });
}

/* ===============================
   RELEASE OLD RESPONDER
================================= */
await User.findByIdAndUpdate(sos.assignedResponder, {
  availability: "Available",
  activeSOS: null,
  $inc: { activeMissionsCount: -1 }
});

/* ===============================
   ASSIGN NEW RESPONDER
================================= */

sos.assignedResponder = newResponder._id;

// ✅ team support (reset or update)
sos.assignedTeam = [newResponder._id];

sos.assignedAt = new Date();
sos.status = "Assigned";

await sos.save();

/* ===============================
   MARK NEW RESPONDER BUSY
================================= */

await User.findByIdAndUpdate(newResponder._id, {
  availability: "Busy",
  activeSOS: sos._id,
  $inc: { activeMissionsCount: 1 }
});
/* ===============================
   SOCKET UPDATE
================================= */

if (req.app.get("io")) {
  req.app.get("io").emit("sosUpdated", {
    _id: sos._id,
    assignedResponder: newResponder._id,
    status: "Assigned"
  });
}

res.json({
  message: "Responder reassigned successfully",
  sos
});


} catch (error) {


console.error("Admin Override Error:", error.message);

res.status(500).json({
  error: "Override failed"
});


}
};



/* ===============================
   GET ACTIVE SOS
================================= */
const getActiveSOS = async (req, res) => {
  try {

    let query = {
      status: { $in: ["Pending", "Assigned", "OnTheWay", "Rescued"] }
    };

    /* ===============================
       ROLE-BASED FILTER
    =============================== */

    if (req.user.role === "NGO_ADMIN") {
      query.assignedTeam = { $in: [req.user._id] };
    }

    if (req.user.role === "NGO_USER") {
      query.assignedResponder = req.user._id;
    }

    if (req.user.role === "GOV_EMPLOYEE") {
      query.assignedResponder = req.user._id; // 🔥 FIX
    }

    if (req.user.role === "Citizen") {
      query.userId = req.user._id;
    }

    /* ===============================
       FETCH DATA
    =============================== */

    const sosList = await SOSRequest.find(query)
      .populate("assignedResponder", "name role isOnline city availability activeSOS")
      .sort({ criticalFlag: -1, createdAt: -1 });

    res.json(sosList);

  } catch (error) {

    console.error("Active SOS Error:", error.message);

    res.status(500).json({
      error: "Failed to fetch SOS"
    });

  }
};




/* ===============================
   CANCEL SOS
================================= */
const cancelSOS = async (req, res) => {

  try {

    const sos = await SOSRequest.findById(req.params.id);

    if (!sos) {
      return res.status(404).json({
        message: "SOS not found"
      });
    }

    if (
      req.user.role !== "Citizen" ||
      String(sos.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "Unauthorized action"
      });
    }

    if (["Rescued", "Closed"].includes(sos.status)) {
      return res.status(400).json({
        message: "Cannot cancel resolved SOS"
      });
    }

    /* ===============================
       🔥 RELEASE RESPONDER (ADD THIS)
    =============================== */
    if (sos.assignedResponder) {
      await User.findByIdAndUpdate(sos.assignedResponder, {
        availability: "Available",
        activeSOS: null,
        $inc: { activeMissionsCount: -1 }
      });
    }

    /* ===============================
       CLOSE SOS
    =============================== */
    sos.status = "Closed";
    sos.resolvedAt = new Date();

    await SOSRequest.findByIdAndUpdate(sos._id, {
      status: "Closed",
      resolvedAt: new Date()
    });

    res.json({
      message: "SOS cancelled successfully",
      sos
    });

  } catch (error) {

    res.status(500).json({
      error: "Failed to cancel SOS"
    });

  }

};



/* ===============================
   RATE SOS
================================= */
const rateSOS = async (req, res) => {

  try {

    const { rating, feedback } = req.body;

    const sos = await SOSRequest.findById(req.params.id);

    if (!sos) {
      return res.status(404).json({
        message: "SOS not found"
      });
    }

    if (
      req.user.role !== "Citizen" ||
      String(sos.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    if (sos.status !== "Rescued") {
      return res.status(400).json({
        message: "Cannot rate before rescue"
      });
    }

    sos.rating = rating;
    sos.feedback = feedback;

    await SOSRequest.findByIdAndUpdate(sos._id, {
  rating,
  feedback
});

    res.json({
      message: "Thank you for your feedback!"
    });

  } catch (error) {

    res.status(500).json({
      error: "Rating failed"
    });

  }

};



/* ===============================
   GET CITY SOS
================================= */
const getCitySOS = async (req, res) => {
try {


const city = req.params.city;

const sosList = await SOSRequest.find({
  city,
  status: { $ne: "Closed" }
}).populate("assignedResponder");

res.json(sosList);

} catch (error) {

res.status(500).json({
  error: "Failed to fetch city SOS"
});


}
};




const assignMember = async (req, res) => {
  try {
    const { memberId } = req.body;

    const sos = await SOSRequest.findById(req.params.id);
    if (!sos) {
      return res.status(404).json({ message: "SOS not found" });
    }

    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    /* ===============================
       NGO ADMIN RESTRICTION
    =============================== */
    if (req.user.role === "NGO_ADMIN") {
      if (member.ngoId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You can assign only your NGO members"
        });
      }
    }

    /* ===============================
       VALIDATION
    =============================== */
    if (member.activeSOS) {
      return res.status(400).json({
        message: "Responder already handling another SOS"
      });
    }

    if (!member.isOnline) {
      return res.status(400).json({
        message: "Responder is offline"
      });
    }

    /* ===============================
       RELEASE OLD RESPONDER (SAFE)
    =============================== */
    if (sos.assignedResponder) {
      const oldResponder = await User.findById(sos.assignedResponder);

      if (oldResponder) {
        oldResponder.availability = "Available";
        oldResponder.activeSOS = null;
        oldResponder.activeMissionsCount = Math.max(
          (oldResponder.activeMissionsCount || 1) - 1,
          0
        );

        await oldResponder.save();
      }
    }

    /* ===============================
       ASSIGN NEW RESPONDER
    =============================== */

    // ✅ main responder
    sos.assignedResponder = member._id;

    // ✅ team support (avoid duplicates)
    if (!sos.assignedTeam) {
      sos.assignedTeam = [];
    }

    const teamIds = sos.assignedTeam.map(id => id.toString());

    // add NGO member
    if (!teamIds.includes(member._id.toString())) {
      sos.assignedTeam.push(member._id);
    }

    // 🔥 ADD NGO ADMIN (CRITICAL FIX)
    if (!teamIds.includes(req.user._id.toString())) {
      sos.assignedTeam.push(req.user._id);
    }

    // ✅ update status
    sos.status = "Assigned";
    sos.assignedAt = new Date();

    await sos.save();

    /* ===============================
       MARK NEW MEMBER BUSY
    =============================== */
    await User.findByIdAndUpdate(member._id, {
      availability: "Busy",
      activeSOS: sos._id,
      activeMissionsCount: (member.activeMissionsCount || 0) + 1
    });

    /* ===============================
       RESPONSE
    =============================== */
    res.json({
      message: "Assigned successfully",
      sos
    });

  } catch (error) {
    console.error("Assign Error:", error);
    res.status(500).json({ error: error.message });
  }
};



module.exports = {
  createSOS,
  updateSOSStatus,
  adminOverrideAssign,
  getActiveSOS,
  cancelSOS,
  rateSOS,
  getCitySOS,assignMember
};