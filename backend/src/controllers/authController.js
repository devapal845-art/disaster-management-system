const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ===============================
   REGISTER
=============================== */


/* ===============================
   GROUP ID GENERATOR
================================= */
const generateGroupId = (prefix) => {
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${random}`;
};

/* ===============================
   REGISTER
================================= */
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      city,
      phone,
      ngoId,
      govId,
      department,
      location,
      familyGroupId,
      societyGroupId,
      organizationName,
      currentLocation,
      lastLocation
    } = req.body;

    /* ===============================
       VALIDATION
    =============================== */
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Required fields missing"
      });
    }

    const allowedRoles = [
      "Citizen",
      "NGO_USER",
      "NGO_ADMIN",
      "GOV_EMPLOYEE",
      "GOV_ADMIN",
      "Admin"
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected"
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Invalid phone number"
      });
    }

    /* ===============================
       CHECK EXISTING USER
    =============================== */
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    /* ===============================
       HASH PASSWORD
    =============================== */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ===============================
       CLEAN ROLE FIELDS
    =============================== */
    let finalNgoId = undefined;
    let finalGovId = undefined;

    if (role === "NGO_USER" && ngoId) {
      finalNgoId = ngoId;
    }

    if (role === "GOV_EMPLOYEE" && govId) {
      finalGovId = govId;
    }

    /* ===============================
       GROUP AUTO-GENERATION
    =============================== */
    let finalFamilyGroupId = familyGroupId;
    let finalSocietyGroupId = societyGroupId;

    if (role === "Citizen") {
      finalFamilyGroupId =
        familyGroupId || generateGroupId("FAM");

      finalSocietyGroupId =
        societyGroupId || generateGroupId("SOC");
    }

    /* ===============================
       CREATE USER
    =============================== */
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,

      city: city || null,
      phone: phone || null,
      location: location || "Unknown",

      ngoId: finalNgoId,
      govId: finalGovId,

      organizationName:
        role === "NGO_ADMIN" ? organizationName : null,

      department:
        role === "GOV_EMPLOYEE" ? department : undefined,

      familyGroupId: finalFamilyGroupId,
      societyGroupId: finalSocietyGroupId,

      /* ✅ GPS SUPPORT */
      currentLocation: currentLocation || null,
      lastLocation: lastLocation || null
    });

    res.status(201).json({
      message: "User registered successfully",
      user
    });

  } catch (error) {
    console.error("Register Error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
};
/* ===============================
   LOGIN
=============================== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(), // ✅ FIX
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
        phone: user.phone,
        ngoId: user.ngoId,
        govId: user.govId,
        department: user.department,
        familyGroupId: user.familyGroupId,
        societyGroupId: user.societyGroupId
      }
    });

  } catch (error) {
    console.error("Login Error:", error.message);

    res.status(500).json({
      error: "Login failed"
    });
  }
};

/* ===============================
   UPDATE LIVE LOCATION
=============================== */
exports.updateLocation = async (req, res) => {
  try {

    let { latitude, longitude } = req.body;

    // 🔥 FIX 1: VALIDATE INPUT
    if (
      latitude === undefined ||
      longitude === undefined ||
      latitude === null ||
      longitude === null ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return res.status(400).json({
        message: "Invalid coordinates"
      });
    }

    // 🔥 FIX 2: FORCE NUMBER TYPE
    latitude = Number(latitude);
    longitude = Number(longitude);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        currentLocation: {
          latitude,
          longitude,
          updatedAt: new Date()
        },

        // 🔥 SAFE GEO UPDATE
        lastLocation: {
          type: "Point",
          coordinates: [longitude, latitude]
        },

        lastMovementAt: new Date(),
        lastSeenAt: new Date(),
        isOnline: true
      },
      { returnDocument: "after" } // ✅ FIX mongoose warning
    );

    res.json({
      message: "Location updated",
      user: updatedUser
    });

  } catch (error) {

    console.error("Location Update Error:", error.message);

    res.status(500).json({
      error: "Failed to update location"
    });

  }
};
/* ===============================
   FETCH FAMILY + SOCIETY MEMBERS
=============================== */
exports.getGroupMembers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    const members = await User.find({
      $or: [
        { familyGroupId: currentUser.familyGroupId },
        { societyGroupId: currentUser.societyGroupId }
      ],
      _id: { $ne: currentUser._id }
    });

    res.json(members);

  } catch (error) {
    console.error("Group Fetch Error:", error.message);

    res.status(500).json({
      error: "Failed to fetch group members"
    });
  }
};