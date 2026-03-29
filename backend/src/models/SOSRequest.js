const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema({

  /* ===============================
     BASIC INFO
  =============================== */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true
  },

  phone: {
  type: String,
  default: null
},

  disasterType: {
    type: String,
    required: true
  },

  city: {
    type: String,
    
  },

  message: String,

  /* ===============================
     STATUS (UPGRADED FLOW)
  =============================== */
  status: {
    type: String,
    enum: [
      "Pending",
      "Assigned",
      "Accepted",
      "OnTheWay",
      "Reached",
      "Rescued",
      "Completed",
      "Escalated",
      "Cancelled",
      "Closed"
    ],
    default: "Pending",
    
  },

  /* ===============================
     ✅ SINGLE ASSIGN (MAIN)
  =============================== */
  assignedResponder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    
  },

  /* ===============================
     ✅ MULTI ASSIGN (TEAM)
  =============================== */
  assignedTeam: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  assignedAt: Date,
  acceptedAt: Date,
  startedAt: Date,
  resolvedAt: Date,

  /* ===============================
     RESPONSE METRICS
  =============================== */
  responseTime: Number,

  /* ===============================
     PRIORITY + CRITICAL FLAG
  =============================== */
  priority: {
    type: Number,
    default: 1 // 1 normal, 2 urgent, 3 critical
  },

  criticalFlag: {
    type: Boolean,
    default: false
  },

  /* ===============================
     ESCALATION SYSTEM
  =============================== */
  escalationCount: {
    type: Number,
    default: 0
  },

  lastEscalatedAt: Date,

  escalationHistory: [
    {
      fromPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      toPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      escalatedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  /* ===============================
     ASSIGNMENT HISTORY
  =============================== */
  assignmentHistory: [
    {
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      assignedAt: Date,
      assignedBy: String // "System" or "Admin"
    }
  ],

  /* ===============================
     RATING SYSTEM
  =============================== */
  rating: {
    type: Number,
    min: 1,
    max: 5
  },

  feedback: String,

  /* ===============================
     🚑 LIVE RESPONDER TRACKING
  =============================== */
  responderLocations: {
    type: [
      {
        responder: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        latitude: Number,
        longitude: Number,
        updatedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: [],
    validate: [
      (arr) => arr.length <= 10,
      "Too many stored locations (limit 10 per SOS)"
    ]
  },

  /* ===============================
     RESPONDER STATUS
  =============================== */
  responderStatus: [
    {
      responder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      status: {
        type: String,
        enum: ["Assigned", "Accepted", "OnTheWay", "Reached", "Rescued"],
        default: "Assigned"
      },
      updatedAt: Date
    }
  ],

  /* ===============================
     DISTANCE + ETA CACHE
  =============================== */
  responderMetrics: [
    {
      responder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      distance: Number,
      eta: Number,
      updatedAt: Date
    }
  ],

  /* ===============================
     COMPLETION DETAILS
  =============================== */
  completionDetails: {
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    completedAt: Date,
    notes: String
  },

  /* ===============================
     MEDIA
  =============================== */
  media: [
    {
      type: String
    }
  ],

  /* ===============================
     GEO LOCATION (MAIN LOCATION)
  =============================== */
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (val) => val.length === 2,
        message: "Coordinates must be [lng, lat]"
      }
    }
  },

  /* ===============================
     FLAGS
  =============================== */
  isEscalated: {
    type: Boolean,
    default: false
  },

  isResolved: {
    type: Boolean,
    default: false
  },

  /* ===============================
     ALERT SYSTEM
  =============================== */
  alerts: [
    {
      message: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, { timestamps: true });


/* ===============================
   INDEXES
================================= */
sosSchema.index({ status: 1 });
sosSchema.index({ assignedResponder: 1 });
sosSchema.index({ city: 1 });
sosSchema.index({ location: "2dsphere" });
sosSchema.index({ status: 1, location: "2dsphere" });


/* ===============================
   VIRTUAL (CLEAN LAT/LNG ACCESS)
================================= */
sosSchema.virtual("coords").get(function () {
  if (!this.location || !this.location.coordinates) return null;
  return {
    lat: this.location.coordinates[1],
    lng: this.location.coordinates[0]
  };
});


module.exports = mongoose.model("SOSRequest", sosSchema);