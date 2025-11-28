const mongoose = require('mongoose');
const Prediction = require('./models/Prediction');
require('dotenv').config();

const predictions = [
    {
        disease: "COVID-19",
        predicted_date: "2025-01-01",
        predicted_cases: 85,
        severity: "medium",
        confidence: 0.738,
        ai_analysis: "Forecast: 85 cases expected by 2025-01-01. Risk: medium."
    },
    {
        disease: "Dengue",
        predicted_date: "2025-01-01",
        predicted_cases: 398,
        severity: "low",
        confidence: 1,
        ai_analysis: "Forecast: 398 cases expected by 2025-01-01. Risk: low."
    },
    {
        disease: "Malaria",
        predicted_date: "2025-01-01",
        predicted_cases: 493,
        severity: "low",
        confidence: 1,
        ai_analysis: "Forecast: 493 cases expected by 2025-01-01. Risk: low."
    },
    {
        disease: "HIV/AIDS",
        predicted_date: "2025-01-01",
        predicted_cases: 577,
        severity: "low",
        confidence: 1,
        ai_analysis: "Forecast: 577 cases expected by 2025-01-01. Risk: low."
    },
    {
        disease: "Measles",
        predicted_date: "2025-01-01",
        predicted_cases: 92,
        severity: "low",
        confidence: 1,
        ai_analysis: "Forecast: 92 cases expected by 2025-01-01. Risk: low."
    }
];

async function seedPredictions() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        await Prediction.deleteMany({});
        console.log('Cleared existing predictions');

        await Prediction.insertMany(predictions);
        console.log('Seeded predictions');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding predictions:', error);
        process.exit(1);
    }
}

seedPredictions();
