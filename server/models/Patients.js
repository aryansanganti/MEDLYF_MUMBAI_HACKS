const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reason: { type: String, required: true },

  injury: { type: String, default: "-" },
  condition: { type: String, default: "-" },

  timeOfAdmit: { type: Date, default: Date.now },

  // NEW KEY FIELD
  active: { type: Boolean, default: true }, // active = occupying a bed
});

module.exports = mongoose.model("Patient", PatientSchema);
