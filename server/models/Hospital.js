const mongoose = require('mongoose');

// Allow schema-less read of existing docs
const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    city: { type: String, required: true },
    icuBeds: { type: Number, required: true },
    occupancy: { type: Number, required: true }, // Percentage 0-100
    oxygenLevel: { type: Number, required: true } // Percentage 0-100
});

module.exports = mongoose.model('Hospital', hospitalSchema, 'Hospitals');
