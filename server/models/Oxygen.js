// models/Oxygen.js

const mongoose = require('mongoose');

const oxygenSchema = new mongoose.Schema({
    patientName: {
        type: String,
        required: true,
        trim: true
    },
    litresUsed: {
        type: Number,
        required: true,
        min: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital'
    },
});

module.exports = mongoose.model('Oxygen', oxygenSchema);