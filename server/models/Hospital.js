const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('Hospital', hospitalSchema, 'Hospitals');
