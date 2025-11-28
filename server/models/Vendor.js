const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: {
        latitude: Number,
        longitude: Number
    }
});

module.exports = mongoose.model('Vendor', vendorSchema);
