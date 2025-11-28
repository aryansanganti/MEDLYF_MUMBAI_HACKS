// index.js (COMPLETE and CORRECTED)

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const twilio = require('twilio');
const moment = require('moment');

// ============================================================
// HOSPITAL CONFIG CONSTANTS
// ============================================================
const MAX_BEDS = 45;
const HOSPITAL_OXYGEN_CAPACITY_LITRES = 100000; // Example: 100,000 Litres
const OXYGEN_THRESHOLD_PERCENT = 0.20; // 20% Threshold for alert and job creation

// MODELS
const Patient = require('./models/Patients');
const Job = require('./models/Job');
const Vehicle = require('./models/Vehicle');
const Vendor = require('./models/Vendor');
const Oxygen = require('./models/Oxygen');

// ROUTES
const hospitalsRoute = require('./routes/hospitals');

// SERVICES (Placeholders - ensure these files exist)
const { assignJob } = require('./services/scheduler');
const { startSimulation, startReturnSimulation } = require('./services/tracker');
const { runOptimizationAgent } = require('./services/optimizationAgent');

/* ============================================================
   INITIALIZE APP + SOCKET SERVER
============================================================ */
const app = express();
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || "*"
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

/* ============================================================
   ENV CONFIG
============================================================ */
const MONGO_URI = process.env.MONGO_URI;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const RECIPIENT_PHONE_NUMBER = process.env.RECIPIENT_PHONE_NUMBER;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/* ============================================================
   MONGODB CONNECTION
============================================================ */
mongoose.connect(MONGO_URI)
    .then(() => console.log(" MongoDB Connected"))
    .catch((err) => console.error(" DB Error:", err));

/* ============================================================
   GLOBAL REQUEST LOGGER
============================================================ */
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/* ============================================================
   OXYGEN ALERT SYSTEM (CORRECTED FUNCTION)
============================================================ */

async function checkOxygenLevelAndAlert() {

    // CORRECTION: Removed the 24-hour time filter to ensure calculation uses
    // total cumulative usage against hospital capacity.
    const oxygenUsedResults = await Oxygen.aggregate([
        { $group: { _id: null, totalUsed: { $sum: "$litresUsed" } } }
    ]);

    const totalUsed = oxygenUsedResults.length > 0 ? oxygenUsedResults[0].totalUsed : 0;

    const remainingOxygen = HOSPITAL_OXYGEN_CAPACITY_LITRES - totalUsed;
    const thresholdLitres = HOSPITAL_OXYGEN_CAPACITY_LITRES * OXYGEN_THRESHOLD_PERCENT;

    let alertMessage = "";
    let statusColor = "green";

    if (remainingOxygen <= thresholdLitres) {
        statusColor = "red";
        alertMessage = `🚨 CRITICAL OXYGEN LOW ALERT! Remaining: ${remainingOxygen.toFixed(0)}L.`;

        // 1. Create a Job
        const existingJob = await Job.findOne({
            type: 'OXYGEN',
            status: { $in: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'EN_ROUTE'] }
        });

        if (!existingJob) {
            console.log("-> Creating new CRITICAL OXYGEN Job...");
            const oxygenJob = new Job({
                type: 'OXYGEN',
                priority: 'CRITICAL',
                // IMPORTANT: Use a valid existing Hospital ID from your DB
                hospitalId: new mongoose.Types.ObjectId("60c72b2f9f1b2c001f8e4d1f"),
            });
            await oxygenJob.save();
            alertMessage += " A CRITICAL OXYGEN job has been created.";

            try {
                // Attempt to assign the job immediately
                const assignment = await assignJob(oxygenJob._id);
                if (assignment) {
                    io.emit('job_update', assignment.job);
                }
            } catch (e) {
                console.error("Error during assignJob:", e.message);
            }

        } else {
            alertMessage += " An OXYGEN job is already PENDING or IN TRANSIT.";
        }

        // 2. Send Twilio Alert (This remains the same, ensuring variables are correct)
        try {
            await client.messages.create({
                body: alertMessage,
                from: TWILIO_PHONE_NUMBER,
                to: RECIPIENT_PHONE_NUMBER,
            });
            console.log("📲 WhatsApp Oxygen Alert Sent");
        } catch (err) {
            console.log("❌ WhatsApp Oxygen Error:", err.message);
        }
    }

    return {
        totalCapacity: HOSPITAL_OXYGEN_CAPACITY_LITRES,
        totalUsed,
        remainingOxygen: remainingOxygen > 0 ? remainingOxygen : 0,
        thresholdLitres,
        statusColor,
        alertMessage
    };
}

/* ============================================================
   PATIENT ALERT SYSTEM (UNCHANGED)
============================================================ */
async function checkAndSendAlert() {
    const OUTBREAK_THRESHOLD = 10;
    const OUTBREAK_WINDOW_MINUTES = 60;

    let whatsappMessage = "";
    let statusColor = "green";

    const activePatients = await Patient.countDocuments({ inHospital: "yes" });
    const bedsLeft = MAX_BEDS - activePatients;

    if (bedsLeft <= 10) {
        whatsappMessage += `⚠️ Beds running out! Only ${bedsLeft} beds left.\n`;
        statusColor = "orange";
        if (bedsLeft <= 5) {
            whatsappMessage += `❗ CRITICAL: Only ${bedsLeft} beds left.\n`;
            statusColor = "red";
        }
    }

    const oneHourAgo = moment().subtract(OUTBREAK_WINDOW_MINUTES, "minutes").toDate();
    const lastHourCount = await Patient.countDocuments({
        timeOfAdmit: { $gte: oneHourAgo }
    });

    if (lastHourCount >= OUTBREAK_THRESHOLD) {
        whatsappMessage += `🚨 OUTBREAK ALERT: ${lastHourCount} patients in last hour.\n`;
        statusColor = "red";
    }

    const last5Min = moment().subtract(5, "minutes").toDate();
    const recentPatients = await Patient.find({ timeOfAdmit: { $gte: last5Min } });

    const groups = {};
    recentPatients.forEach((p) => {
        const minuteKey = moment(p.timeOfAdmit).format("YYYY-MM-DD HH:mm");
        groups[minuteKey] = (groups[minuteKey] || 0) + 1;
    });

    if (Object.values(groups).some((c) => c >= 10)) {
        whatsappMessage += `🚨 OUTBREAK ALERT: 10+ patients in the SAME minute.\n`;
        statusColor = "red";
    }

    const recentExactPatients = await Patient.aggregate([
        { $group: { _id: "$timeOfAdmit", count: { $sum: 1 } } },
        { $match: { count: { $gte: 10 } } }
    ]);

    if (recentExactPatients.length > 0) {
        const exactSpikeTime = moment(recentExactPatients[0]._id).format("YYYY-MM-DD HH:mm:ss");
        whatsappMessage += `🚨 OUTBREAK ALERT: Multiple patients admitted at EXACT timestamp ${exactSpikeTime}.\n`;
        statusColor = "red";
    }

    if (whatsappMessage.trim().length > 0) {
        try {
            await client.messages.create({
                body: whatsappMessage,
                from: TWILIO_PHONE_NUMBER,
                to: RECIPIENT_PHONE_NUMBER,
            });
            console.log("📲 WhatsApp Patient Alert Sent");
        } catch (err) {
            console.log("❌ WhatsApp Patient Error:", err.message);
        }
    }

    return {
        activePatients,
        bedsLeft,
        lastHourCount,
        statusColor,
        message: whatsappMessage || "System normal."
    };
}


/* ============================================================
   ROUTES
============================================================ */
app.use('/api/hospitals', hospitalsRoute);

app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Unified MedLyf Server Running" });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});

/* ============================================================
   OPTIMIZATION AGENT ROUTE
============================================================ */
/* ============================================================
   OPTIMIZATION AGENT ROUTE
============================================================ */
const OptimizationPrediction = require('./models/OptimizationPrediction');

// GET: Fetch the latest optimization plan from DB
app.get('/api/optimization/plan', async (req, res) => {
    try {
        const latestPlan = await OptimizationPrediction.findOne().sort({ timestamp: -1 });
        if (latestPlan) {
            console.log("✅ Returning cached optimization plan");
            return res.json(latestPlan);
        }

        // If no plan exists, generate one
        console.log("🤖 No cached plan found. Generating new one...");
        const plan = await runOptimizationAgent();
        res.json(plan);
    } catch (err) {
        console.error("Agent Error:", err);
        res.status(500).json({ error: "Agent failed to fetch plan" });
    }
});

// POST: Force generate a new optimization plan
app.post('/api/optimization/generate', async (req, res) => {
    try {
        console.log("🤖 Force generating new optimization plan...");
        const plan = await runOptimizationAgent();
        res.json(plan);
    } catch (err) {
        console.error("Agent Error:", err);
        res.status(500).json({ error: "Agent failed to generate plan" });
    }
});

/* ============================================================
   OXYGEN TRACKING ROUTES
============================================================ */
app.post('/api/log-oxygen-usage', async (req, res, next) => {
    try {
        const { patientName, litresUsed, hospitalId } = req.body;
        if (!patientName || !litresUsed) {
            return res.status(400).json({ error: "Missing required fields: patientName and litresUsed" });
        }

        const newUsage = new Oxygen({ patientName, litresUsed: Number(litresUsed), hospitalId });
        await newUsage.save();

        const oxygenStatus = await checkOxygenLevelAndAlert();

        res.status(201).json({
            message: "Oxygen usage logged successfully",
            usage: newUsage,
            oxygenStatus
        });
    } catch (err) {
        next(err);
    }
});

app.get('/api/oxygen-status', async (req, res, next) => {
    try {
        const oxygenStatus = await checkOxygenLevelAndAlert();
        res.json(oxygenStatus);
    } catch (err) {
        next(err);
    }
});

/* ============================================================
   PATIENT ROUTES (MODIFIED TO INCLUDE OXYGEN CHECK)
============================================================ */
app.get('/api/patients', async (req, res, next) => {
    try {
        const patients = await Patient.find().sort({ timeOfAdmit: -1 });
        const alertStatus = await checkAndSendAlert();
        const oxygenStatus = await checkOxygenLevelAndAlert();
        res.json({ patients, alertStatus, oxygenStatus });
    } catch (err) {
        next(err);
    }
});

app.post('/api/add-patient', async (req, res, next) => {
    try {
        const newPatientData = { ...req.body };
        if (!newPatientData.timeOfAdmit) {
            newPatientData.timeOfAdmit = new Date();
        }
        const newPatient = new Patient(newPatientData);
        await newPatient.save();

        const alertStatus = await checkAndSendAlert();
        const oxygenStatus = await checkOxygenLevelAndAlert();

        res.status(201).json({
            message: "Patient added successfully",
            patient: newPatient,
            alertStatus,
            oxygenStatus
        });
    } catch (err) {
        next(err);
    }
});

/* ============================================================
   JOB SYSTEM ROUTES (UNCHANGED)
============================================================ */
app.post('/api/jobs', async (req, res) => {
    try {
        const { type, priority, hospitalId } = req.body;
        const job = new Job({ type, priority, hospitalId });
        await job.save();

        const assignment = await assignJob(job._id);

        if (assignment) {
            io.emit('job_update', assignment.job);
        }

        res.status(201).json(job);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await Job.find().populate('vehicleId').sort({ scheduledAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============================================================
   VEHICLE / VENDOR ROUTES (UNCHANGED)
============================================================ */
app.get('/api/vehicles', async (req, res) => {
    try {
        const vehicles = await Vehicle.find().populate('vendorId');
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/vendors', async (req, res) => {
    try {
        const vendors = await Vendor.find();
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============================================================
   SOCKET.IO HANDLERS (UNCHANGED)
============================================================ */
io.on('connection', (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("start_delivery", ({ jobId, routePoints }) => {
        startSimulation(io, jobId, routePoints);
    });

    socket.on("return_to_base", ({ vehicleId, routePoints }) => {
        startReturnSimulation(io, vehicleId, routePoints);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
});

/* ============================================================
   START SERVER
============================================================ */
const PORT = process.env.PORT || 5001;
server.listen(5001, () =>
    console.log(`🚀 Unified Server running at http://localhost:${PORT}`)
);