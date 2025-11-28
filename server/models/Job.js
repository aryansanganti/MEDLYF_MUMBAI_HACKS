const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  type: { type: String, enum: ['OXYGEN', 'COLD_CHAIN', 'MEDICINE'], required: true },
  priority: { type: String, enum: ['NORMAL', 'URGENT', 'CRITICAL'], default: 'NORMAL' },
  status: { 
    type: String, 
    enum: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'EN_ROUTE', 'DELIVERED', 'CANCELLED', 'DELAYED'], 
    default: 'PENDING_ASSIGNMENT' 
  },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  vendorId: { type: String }, // Mock vendor ID
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  eta: { type: Date },
  scheduledAt: { type: Date, default: Date.now },
  route: { type: Object }, // Store Mapbox route geometry/duration
  logs: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    message: String
  }]
});

module.exports = mongoose.model('Job', jobSchema);
