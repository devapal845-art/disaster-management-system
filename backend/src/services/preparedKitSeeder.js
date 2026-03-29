const PreparedKit = require("../models/PreparedKit");

const seedPreparedKits = async () => {
  const kits = [
    // 🌊 Flood
    {
      level: "Family",
      disasterType: "Flood",
      items: [
        { name: "Drinking Water", required: true },
        { name: "First Aid Kit", required: true },
        { name: "Flashlight", required: true },
        { name: "Power Bank", required: true },
        { name: "Waterproof Bags", required: true }
      ]
    },
    {
      level: "Society",
      disasterType: "Flood",
      items: [
        { name: "Rescue Boat", required: true },
        { name: "Community Shelter", required: true },
        { name: "Emergency Medical Team", required: true }
      ]
    },

    // 🌍 Earthquake
    {
      level: "Family",
      disasterType: "Earthquake",
      items: [
        { name: "Emergency Backpack", required: true },
        { name: "Helmet", required: true },
        { name: "First Aid Kit", required: true }
      ]
    },

    // 🔥 Forest Fire
    {
      level: "Family",
      disasterType: "Forest Fire",
      items: [
        { name: "Mask (N95)", required: true },
        { name: "Fire Blanket", required: true },
        { name: "Emergency Evacuation Plan", required: true }
      ]
    },

    // 🌀 Cyclone
    {
      level: "Family",
      disasterType: "Cyclone",
      items: [
        { name: "Battery Radio", required: true },
        { name: "Emergency Food", required: true },
        { name: "Important Documents Copy", required: true }
      ]
    },

    // ❄ Cold Wave
    {
      level: "Family",
      disasterType: "Cold Wave",
      items: [
        { name: "Blankets", required: true },
        { name: "Warm Clothing", required: true },
        { name: "Portable Heater", required: false }
      ]
    },

    // 🌫 Air Quality
    {
      level: "Family",
      disasterType: "Air Quality",
      items: [
        { name: "Air Purifier", required: true },
        { name: "N95 Mask", required: true },
        { name: "Indoor Stay Plan", required: true }
      ]
    }
  ];

  for (let kit of kits) {
    const exists = await PreparedKit.findOne({
      level: kit.level,
      disasterType: kit.disasterType
    });

    if (!exists) {
      await PreparedKit.create(kit);
      console.log("Prepared Kit Seeded:", kit.disasterType);
    }
  }
};

module.exports = seedPreparedKits;
