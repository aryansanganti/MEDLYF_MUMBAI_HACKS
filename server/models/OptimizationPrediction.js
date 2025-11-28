const mongoose = require('mongoose');

const OptimizationPredictionSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    forecast: [
        {
            hospitalName: String,
            days: [
                {
                    day: String,
                    predictedPatients: Number,
                    status: String
                }
            ]
        }
    ],
    recommendedActions: [
        {
            type: { type: String }, // OXYGEN_TRANSFER, PATIENT_TRANSFER, etc.
            from: String,
            to: String,
            amount: Number,
            reason: String
        }
    ]
});

module.exports = mongoose.model('OptimizationPrediction', OptimizationPredictionSchema);
