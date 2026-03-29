require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./src/models/User");
const SOSRequest = require("./src/models/SOSRequest");

const MONGO_URL =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/DisasterApp";

/* ================= HELPERS ================= */

const cities = ["Kanpur", "Lucknow", "Prayagraj", "Varanasi"];

const disasterTypes = ["Flood", "Fire", "Earthquake", "Heatwave"];

const randomFrom = (arr) =>
  arr[Math.floor(Math.random() * arr.length)];

const randomCoords = () => ({
  latitude: 26.5 + (Math.random() - 0.5) * 0.5,
  longitude: 80.3 + (Math.random() - 0.5) * 0.5
});

/* ================= MAIN ================= */

(async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ DB Connected");

    console.log("🧹 Cleaning old data...");
    await SOSRequest.deleteMany({});
    await User.deleteMany({});

    const password = await bcrypt.hash("123456", 10);

    /* ================= GOVERNMENT ================= */

    const govCoords = randomCoords();

    const govAdmin = await User.create({
      name: "Central Government Admin",
      email: "gov_admin@mail.com",
      password,
      role: "GOV_ADMIN",
      department: "Disaster Control",

      currentLocation: {
        latitude: govCoords.latitude,
        longitude: govCoords.longitude
      },

      lastLocation: {
        type: "Point",
        coordinates: [govCoords.longitude, govCoords.latitude]
      }
    });

    for (let i = 1; i <= 3; i++) {
      const coords = randomCoords();

      await User.create({
        name: `Gov Officer ${i}`,
        email: `gov_employee${i}@mail.com`,
        password,
        role: "GOV_EMPLOYEE",
        govId: govAdmin._id,
        department: "District Response",
        city: randomFrom(cities),

        currentLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude
        },

        lastLocation: {
          type: "Point",
          coordinates: [coords.longitude, coords.latitude]
        }
      });
    }

    console.log("🏛 Government Done");

    /* ================= NGO ================= */

    const ngos = [];

    for (let i = 1; i <= 3; i++) {
      const coords = randomCoords();

      const ngoAdmin = await User.create({
        name: `NGO Admin ${i}`,
        email: `ngo_admin${i}@mail.com`,
        password,
        role: "NGO_ADMIN",
        organizationName: `Rescue NGO ${i}`,
        city: randomFrom(cities),

        currentLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude
        },

        lastLocation: {
          type: "Point",
          coordinates: [coords.longitude, coords.latitude]
        }
      });

      ngos.push(ngoAdmin);

      for (let j = 1; j <= 3; j++) {
        const mCoords = randomCoords();

        await User.create({
          name: `NGO ${i} Member ${j}`,
          email: `ngo${i}_user${j}@mail.com`,
          password,
          role: "NGO_USER",
          ngoId: ngoAdmin._id,
          city: ngoAdmin.city,

          currentLocation: {
            latitude: mCoords.latitude,
            longitude: mCoords.longitude
          },

          lastLocation: {
            type: "Point",
            coordinates: [mCoords.longitude, mCoords.latitude]
          }
        });
      }
    }

    console.log("🏢 NGOs Done");

    /* ================= GROUPS ================= */

    const familyGroups = ["FAM-001", "FAM-002", "FAM-003"];
    const societyGroups = ["SOC-001", "SOC-002"];

    /* ================= CITIZENS ================= */

    const citizens = [];

    for (let i = 1; i <= 15; i++) {
      const coords = randomCoords();

      const citizen = await User.create({
        name: `Citizen ${i}`,
        email: `citizen${i}@mail.com`,
        password,
        role: "Citizen",
        city: randomFrom(cities),

        familyGroupId: randomFrom(familyGroups),
        societyGroupId: randomFrom(societyGroups),

        currentLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude
        },

        lastLocation: {
          type: "Point",
          coordinates: [coords.longitude, coords.latitude]
        },

        availability: "Available"
      });

      // 🔥 Danger simulation
      if (i % 5 === 0) {
        citizen.lastRiskLevel = "High";
        await citizen.save();
      }

      citizens.push(citizen);
    }

    console.log("👥 Citizens Done");

    /* ================= SOS ================= */

    for (let i = 0; i < 50; i++) {
      const citizen = randomFrom(citizens);
      const ngo = randomFrom(ngos);
      const coords = randomCoords();

      const members = await User.find({
        ngoId: ngo._id,
        role: "NGO_USER"
      });

      const member = randomFrom(members);

      await SOSRequest.create({
        userId: citizen._id,
        name: citizen.name,
        phone: "9999999999",
        disasterType: randomFrom(disasterTypes),

        location: {
          type: "Point",
          coordinates: [coords.longitude, coords.latitude]
        },

        city: citizen.city,
        message: "Test SOS",

        status: "Assigned",

        assignedResponder: member._id,
        assignedTeam: [ngo._id, member._id],

        familyGroupId: citizen.familyGroupId,
        societyGroupId: citizen.societyGroupId,

        assignedAt: new Date()
      });
    }

    console.log("🚨 SOS Created");
    console.log("🎯 DATABASE READY");

    process.exit();

  } catch (err) {
    console.error("❌ Seeder error:", err);
    process.exit(1);
  }
})();