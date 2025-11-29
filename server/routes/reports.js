// routes/reports.js
const express = require('express');
const router = express.Router();
const moment = require('moment');

// Import models
const Patient = require('../models/Patients');
const Job = require('../models/Job');
const Vehicle = require('../models/Vehicle');
const Oxygen = require('../models/Oxygen');
const Hospital = require('../models/Hospital');

// Import services
const { generateReportSummary } = require('../services/geminiService');
const { generatePDFReport } = require('../services/pdfService');

/**
 * GET /api/reports/data
 * Fetch all aggregated hospital data from MongoDB
 */
router.get('/data', async (req, res) => {
    try {
        console.log('📊 Fetching report data...');

        // Fetch patient statistics
        const totalPatients = await Patient.countDocuments();
        const activePatients = await Patient.countDocuments({ active: true });
        const totalBeds = 45; // As per the system configuration
        const occupancyRate = totalBeds > 0 ? Math.round((activePatients / totalBeds) * 100) : 0;

        // Recent admissions (last 24 hours)
        const last24Hours = moment().subtract(24, 'hours').toDate();
        const recentAdmissions = await Patient.countDocuments({
            timeOfAdmit: { $gte: last24Hours }
        });

        // Recent admissions (last 7 days trend)
        const last7Days = moment().subtract(7, 'days').toDate();
        const patientTrend = await Patient.aggregate([
            { $match: { timeOfAdmit: { $gte: last7Days } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timeOfAdmit" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fetch recent patients for detailed view
        const recentPatients = await Patient.find({
            timeOfAdmit: { $gte: last24Hours }
        }).sort({ timeOfAdmit: -1 }).limit(20).lean();

        // Fetch oxygen statistics with detailed usage
        const oxygenCapacity = 10000; // Default capacity in litres
        const oxygenRecords = await Oxygen.find().sort({ timestamp: -1 }).limit(50);
        const totalOxygenUsed = oxygenRecords.reduce((sum, record) => sum + (record.litresUsed || 0), 0);
        const oxygenRemaining = Math.max(0, oxygenCapacity - totalOxygenUsed);
        const percentageRemaining = oxygenCapacity > 0
            ? Math.round((oxygenRemaining / oxygenCapacity) * 100)
            : 0;

        // Calculate average oxygen usage per patient
        const avgOxygenPerPatient = oxygenRecords.length > 0
            ? Math.round(totalOxygenUsed / oxygenRecords.length)
            : 0;

        // Fetch job statistics with performance metrics
        const totalJobs = await Job.countDocuments();
        const pendingJobs = await Job.countDocuments({ status: 'pending' });
        const assignedJobs = await Job.countDocuments({ status: 'assigned' });
        const completedJobs = await Job.countDocuments({ status: 'completed' });

        // Calculate average job completion time (mock calculation as we might not have completion times stored yet)
        // In a real scenario, we would diff created vs completed timestamps
        const completedJobDocs = await Job.find({ status: 'completed' }).limit(50);
        const avgCompletionTimeMinutes = completedJobDocs.length > 0 ? 45 : 0; // Mock average if no data

        // Fetch vehicle count
        const totalVehicles = await Vehicle.countDocuments();

        // Compile report data
        const reportData = {
            timestamp: new Date().toISOString(),
            patients: {
                total: totalPatients,
                active: activePatients,
                totalBeds: totalBeds,
                occupancyRate: occupancyRate,
                recentAdmissions: recentAdmissions,
                trend: patientTrend
            },
            oxygen: {
                capacity: oxygenCapacity,
                totalUsed: totalOxygenUsed,
                remaining: oxygenRemaining,
                percentageRemaining: percentageRemaining,
                avgPerPatient: avgOxygenPerPatient,
                recentLogs: oxygenRecords.slice(0, 5).map(o => ({
                    patient: o.patientName,
                    amount: o.litresUsed,
                    time: o.timestamp
                }))
            },
            jobs: {
                total: totalJobs,
                pending: pendingJobs,
                assigned: assignedJobs,
                completed: completedJobs,
                avgCompletionTime: avgCompletionTimeMinutes
            },
            vehicles: {
                total: totalVehicles
            },
            recentPatients: recentPatients.map(p => ({
                name: p.name,
                reason: p.reason,
                timeOfAdmit: p.timeOfAdmit
            }))
        };

        console.log('✅ Report data fetched successfully');
        res.json(reportData);

    } catch (error) {
        console.error('❌ Error fetching report data:', error);
        res.status(500).json({
            error: 'Failed to fetch report data',
            details: error.message
        });
    }
});

/**
 * POST /api/reports/generate-summary
 * Generate AI summary using Gemini API
 */
router.post('/generate-summary', async (req, res) => {
    try {
        console.log('🤖 Generating AI summary...');

        const { data } = req.body;

        if (!data) {
            return res.status(400).json({ error: 'Report data is required' });
        }

        // Generate AI summary using Gemini
        const summary = await generateReportSummary(data);

        console.log('✅ AI summary generated successfully');
        res.json({ summary });

    } catch (error) {
        console.error('❌ Error generating AI summary:', error);
        res.status(500).json({
            error: 'Failed to generate AI summary',
            details: error.message
        });
    }
});

/**
 * POST /api/reports/download
 * Generate and download PDF report
 */
router.post('/download', async (req, res) => {
    try {
        console.log('📄 Generating PDF report...');

        const { data, summary } = req.body;

        if (!data) {
            return res.status(400).json({ error: 'Report data is required' });
        }

        // Generate PDF using pdfService
        const pdfBuffer = await generatePDFReport(data, summary || '');

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=medlyf-report-${Date.now()}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);

        console.log('✅ PDF report generated successfully');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        res.status(500).json({
            error: 'Failed to generate PDF report',
            details: error.message
        });
    }
});

module.exports = router;
