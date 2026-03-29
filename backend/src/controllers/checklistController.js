const FamilyChecklist = require("../models/FamilyChecklist");

const updateChecklist = async (req, res) => {
  const { userId, disasterType, items } = req.body;

  const checklist = await FamilyChecklist.findOneAndUpdate(
    { userId, disasterType },
    { items },
    { upsert: true, new: true }
  );

  res.json(checklist);
};

module.exports = { updateChecklist };
