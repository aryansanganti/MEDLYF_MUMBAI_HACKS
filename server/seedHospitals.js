require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');

const MONGO_URI = process.env.MONGO_URI;

const hospitals = [
    {
        name: "Kokilaben Dhirubhai Ambani Hospital",
        city: "Andheri West, Mumbai",
        icuBeds: 45,
        occupancy: 85,
        oxygenLevel: 92
    },
    {
        name: "Bombay Hospital and Medical Research Centre",
        city: "Marine Lines, Mumbai",
        icuBeds: 30,
        occupancy: 65,
        oxygenLevel: 88
    },
    {
        name: "Sir H. N. Reliance Foundation Hospital",
        city: "Girgaon, Mumbai",
        icuBeds: 50,
        occupancy: 40,
        oxygenLevel: 95
    },
    {
        name: "Shushrusha Citizens' Co-Operative Hospital",
        city: "Dadar, Mumbai",
        icuBeds: 20,
        occupancy: 90,
        oxygenLevel: 25
    },
    {
        name: "Asian Heart Institute",
        city: "Bandra Kurla Complex, Mumbai",
        icuBeds: 35,
        occupancy: 55,
        oxygenLevel: 75
    },
    {
        name: "Holy Family Hospital",
        city: "Bandra West, Mumbai",
        icuBeds: 25,
        occupancy: 70,
        oxygenLevel: 60
    }
];

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ MongoDB Connected");

        // Clear existing data
        await Hospital.deleteMany({});
        console.log("🗑️ Cleared existing hospitals");

        // Insert new data
        await Hospital.insertMany(hospitals);
        console.log("🚀 Seeded hospital data successfully");

        mongoose.connection.close();
    })
    .catch((err) => {
        console.error("❌ DB Error:", err);
        mongoose.connection.close();
    });
