const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
    disease: { type: String, required: true },
    predicted_date: { type: String, required: true },
    predicted_cases: { type: Number, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    confidence: { type: Number, required: true },
    ai_analysis: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', PredictionSchema);
