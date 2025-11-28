const mongoose = require('mongoose');

// Allow schema-less read of existing docs
const hospitalSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('Hospital', hospitalSchema, 'Hospitals');
