const moment = require('moment');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Hospital = require('../models/Hospital'); // Import Hospital model
const OptimizationPrediction = require('../models/OptimizationPrediction'); // Import Prediction model

// Initialize Gemini
// NOTE: Ensure GEMINI_API_KEY is in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Simulates an AI optimization agent running analysis on hospital data.
 * Returns a plan with recommended actions and demand forecasts.
 */
async function runOptimizationAgent() {
    console.log("🤖 Optimization Agent: Analyzing network status...");

    let hospitals = [];

    try {
        // Fetch real hospitals from MongoDB
        const hospitalDocs = await Hospital.find({});

        if (hospitalDocs.length > 0) {
            // Map DB documents to the format required by the Agent
            // If DB lacks dynamic stats (occupancy/oxygen), we simulate them for the demo
            hospitals = hospitalDocs.map(doc => ({
                name: doc.name || doc.Name || "Unknown Hospital",
                icuOccupancy: doc.icuOccupancy || Math.floor(Math.random() * (95 - 40) + 40), // Mock if missing
                oxygenLevel: doc.oxygenLevel || Math.floor(Math.random() * (100 - 30) + 30)   // Mock if missing
            }));
            console.log(`✅ Loaded ${hospitals.length} hospitals from MongoDB.`);
        } else {
            console.warn("⚠️ No hospitals found in DB. Using fallback mock data.");
            hospitals = [
                { name: "City Medical Center", icuOccupancy: 85, oxygenLevel: 45 },
                { name: "District Hospital", icuOccupancy: 72, oxygenLevel: 38 },
                { name: "Rural Medical Complex", icuOccupancy: 56, oxygenLevel: 68 },
                { name: "Community Health Center", icuOccupancy: 48, oxygenLevel: 82 }
            ];
        }

        if (!process.env.GEMINI_API_KEY) {
            console.warn("⚠️ GEMINI_API_KEY not found. Falling back to simulation.");
            throw new Error("No API Key");
        }

        // Use gemini-1.5-flash as it is the current stable version
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an advanced AI Resource Optimization Agent for a hospital network.
        
        Current Network Status:
        ${JSON.stringify(hospitals, null, 2)}
        
        Task:
        1. Predict patient influx for the next 7 days for each hospital based on the current high occupancy trends.
        2. Recommend resource redistribution actions (Oxygen Transfer, Patient Transfer, Staff Reallocation) to balance the load.
        
        Output Format (Strict JSON, no markdown):
        {
          "recommendedActions": [
            { "type": "OXYGEN_TRANSFER" | "PATIENT_TRANSFER" | "STAFF_REALLOCATION", "from": "Hospital Name", "to": "Hospital Name", "amount": number, "reason": "Brief explanation" }
          ],
          "forecast": [
            { 
              "hospitalName": "Hospital Name", 
              "days": [
                { "day": "Mon", "predictedPatients": number, "status": "GOOD" | "WARNING" | "CRITICAL" }
              ] 
            }
          ]
        }
        
        Rules:
        - Forecast 7 days starting from tomorrow.
        - Status CRITICAL if patients > 55, WARNING > 40, else GOOD.
        - Generate realistic, varied data.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        // Save prediction to DB
        try {
            const prediction = new OptimizationPrediction(data);
            await prediction.save();
            console.log("✅ Optimization Plan Saved to DB");
        } catch (dbError) {
            console.error("⚠️ Failed to save prediction to DB:", dbError.message);
        }

        console.log("✅ Gemini Optimization Plan Generated");
        return data;

    } catch (error) {
        console.error("❌ Gemini Agent Failed (or no key):", error.message);
        console.log("🔄 Falling back to heuristic simulation...");
        return runSimulationFallback(hospitals);
    }
}

function runSimulationFallback(hospitals) {
    // 1. Generate Forecasts
    const forecast = hospitals.map(h => {
        const days = [];
        for (let i = 1; i <= 7; i++) {
            const date = moment().add(i, 'days');
            const predictedPatients = Math.floor(Math.random() * 50) + 20; // Random 20-70

            let status = 'GOOD';
            if (predictedPatients > 55) status = 'CRITICAL';
            else if (predictedPatients > 40) status = 'WARNING';

            days.push({
                day: date.format('ddd'),
                predictedPatients,
                status
            });
        }
        return { hospitalName: h.name, days };
    });

    // 2. Generate Recommended Actions
    const recommendedActions = [];

    // Simple heuristic: If we have at least 2 hospitals, try to move from first to second
    if (hospitals.length >= 2) {
        if (Math.random() > 0.3) {
            recommendedActions.push({
                type: 'OXYGEN_TRANSFER',
                from: hospitals[0].name,
                to: hospitals[1].name,
                amount: 50,
                reason: 'Predicted shortage in destination hospital due to surge.'
            });
        }

        if (Math.random() > 0.5) {
            recommendedActions.push({
                type: 'PATIENT_TRANSFER',
                from: hospitals[1].name,
                to: hospitals[0].name,
                amount: 5,
                reason: 'ICU capacity reaching critical limits.'
            });
        }
    }

    return { recommendedActions, forecast };
}

module.exports = { runOptimizationAgent };
