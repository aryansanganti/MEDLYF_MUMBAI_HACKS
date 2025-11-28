require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const twilio = require('twilio');
const moment = require('moment');

// MODELS
const Patient = require('./models/Patients');
const Job = require('./models/Job');
const Vehicle = require('./models/Vehicle');
const Vendor = require('./models/Vendor');

// ROUTES
const hospitalsRoute = require('./routes/hospitals');
const reportsRoute = require('./routes/reports');

// SERVICES
const { assignJob } = require('./services/scheduler');
const { startSimulation, startReturnSimulation } = require('./services/tracker');

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

// Twilio environment variables
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
   GLOBAL REQUEST LOGGER (Merged)
============================================================ */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* ============================================================
   PATIENT ALERT SYSTEM (UNCHANGED)
============================================================ */

async function checkAndSendAlert() {
  const MAX_BEDS = 45;
  const OUTBREAK_THRESHOLD = 10;
  const OUTBREAK_WINDOW_MINUTES = 60;

  let whatsappMessage = "";
  let statusColor = "green";

  // Bed count
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

  // Outbreak last hour
  const oneHourAgo = moment().subtract(OUTBREAK_WINDOW_MINUTES, "minutes").toDate();
  const lastHourCount = await Patient.countDocuments({
    timeOfAdmit: { $gte: oneHourAgo }
  });

  if (lastHourCount >= OUTBREAK_THRESHOLD) {
    whatsappMessage += `🚨 OUTBREAK ALERT: ${lastHourCount} patients in last hour.\n`;
    statusColor = "red";
  }

  // Outbreak 5 min same minute spike
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

  // Exact Timestamp Outbreak
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
      console.log("📲 WhatsApp Alert Sent");
    } catch (err) {
      console.log("❌ WhatsApp Error:", err.message);
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
   ROUTES (MERGED)
============================================================ */
app.use('/api/hospitals', hospitalsRoute);
app.use('/api/reports', reportsRoute);

// Default home route
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Unified MedLyf Server Running" });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* ============================================================
   PATIENT ROUTES
============================================================ */
app.get('/api/patients', async (req, res, next) => {
  try {
    const patients = await Patient.find().sort({ timeOfAdmit: -1 });
    const alertStatus = await checkAndSendAlert();
    res.json({ patients, alertStatus });
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

    res.status(201).json({
      message: "Patient added successfully",
      patient: newPatient,
      alertStatus
    });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   JOB SYSTEM ROUTES
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
   VEHICLE / VENDOR ROUTES
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
const PORT = 5001;
server.listen(PORT, () =>
  console.log(`🚀 Unified Server running at http://localhost:${PORT}`)
);
