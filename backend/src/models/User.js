const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* ===============================
       BASIC INFORMATION
    =============================== */

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: [
        "Citizen",
        "NGO_ADMIN",
        "NGO_USER",
        "GOV_ADMIN",
        "GOV_EMPLOYEE",
        "Admin"
      ],
      required: true,
      
    },

    /* ===============================
       ORGANIZATIONAL STRUCTURE
    =============================== */

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "NGO_USER";
      }
    },

    govId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "GOV_EMPLOYEE";
      }
    },

    city: {
      type: String,
      default: null,
      index: true
    },

    /* ===============================
       ROLE-BASED FIELDS
    =============================== */

    organizationName: {
      type: String,
      required: function () {
        return this.role === "NGO_ADMIN"; // ✅ FIXED
      },
      default: null
    },

    phone: {
      type: String,
      default: null
    },

    department: {
      type: String,
      required: function () {
        return this.role === "GOV_EMPLOYEE";
      }
    },

    /* ===============================
       GROUP MANAGEMENT
    =============================== */

    familyGroupId: {
      type: String,
      default: null
    },

    societyGroupId: {
      type: String,
      default: null
    },

    /* ===============================
       DISASTER INTELLIGENCE
    =============================== */

    preparednessScore: {
      type: Number,
      default: 0
    },

    lastRiskLevel: {
      type: String,
      default: null
    },

    /* ===============================
       GEO LOCATION (MAIN FOR QUERIES)
    =============================== */

    lastLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
        validate: {
          validator: (val) => val.length === 2,
          message: "Coordinates must be [lng, lat]"
        }
      }
    },

    lastMovementAt: {
      type: Date,
      default: null
    },

    currentSpeed: {
      type: Number,
      default: 0
    },

    /* ===============================
       REAL-TIME TRACKING
    =============================== */

    currentLocation: {
      latitude: {
        type: Number,
        default: 0
      },
      longitude: {
        type: Number,
        default: 0
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    },

    isOnline: {
      type: Boolean,
      default: false
    },

    lastSeenAt: Date,

    activeSOS: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SOSRequest",
      default: null
    },

    activeMissionsCount: {
      type: Number,
      default: 0
    },

    skills: [
      {
        type: String
      }
    ],

    priorityLevel: {
      type: Number,
      default: 1
    },

    /* ===============================
       NGO OPERATION
    =============================== */

    availability: {
      type: String,
      enum: ["Available", "Busy"],
      default: "Available" // ✅ FIXED
    },

    /* ===============================
       PERFORMANCE
    =============================== */

    totalRescues: {
      type: Number,
      default: 0
    },

    avgResponseTime: {
      type: Number,
      default: 0
    },

    performanceScore: {
      type: Number,
      default: 0,
      index: true
    },

    psychologicalChecks: [
      {
        question: String,
        completed: Boolean
      }
    ]
  },
  { timestamps: true }
);

/* ===============================
   INDEXES
================================= */

userSchema.index({ role: 1 });
userSchema.index({ role: 1, ngoId: 1, availability: 1 });
userSchema.index({ role: 1, govId: 1 });
userSchema.index({ performanceScore: -1 });
userSchema.index({ lastLocation: "2dsphere" });


/* ===============================
   METHODS (HELPERS)
================================= */

userSchema.methods.isResponder = function () {
  return this.role === "NGO_USER";
};

userSchema.methods.isNGOAdmin = function () {
  return this.role === "NGO_ADMIN";
};

userSchema.methods.isGovAdmin = function () {
  return this.role === "GOV_ADMIN";
};

module.exports = mongoose.model("User", userSchema);