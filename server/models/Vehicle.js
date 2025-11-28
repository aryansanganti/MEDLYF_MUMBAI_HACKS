const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['TANKER', 'VAN', 'DRONE'], default: 'VAN' },
    status: { type: String, enum: ['AVAILABLE', 'BUSY', 'MAINTENANCE'], default: 'AVAILABLE' },
    location: {
        latitude: Number,
        longitude: Number,
        lastUpdated: { type: Date, default: Date.now }
    },
    currentJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
