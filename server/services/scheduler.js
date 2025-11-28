const Job = require('../models/Job');
const Vehicle = require('../models/Vehicle');

// Mock function to simulate finding a route and duration
const getMockRoute = (start, end) => {
    // In a real app, call Mapbox Directions API here
    return {
        duration: 1800, // 30 minutes in seconds
        distance: 5000, // 5km
        geometry: 'mock_polyline_string'
    };
};

const assignJob = async (jobId) => {
    try {
        const job = await Job.findById(jobId);
        if (!job) return;

        // Find available vehicle
        const vehicle = await Vehicle.findOne({ status: 'AVAILABLE' });

        if (vehicle) {
            // Assign vehicle
            vehicle.status = 'BUSY';
            vehicle.currentJobId = job._id;
            await vehicle.save();

            // Update Job
            job.status = 'ASSIGNED';
            job.vehicleId = vehicle._id;
            job.vendorId = 'VENDOR_' + Math.floor(Math.random() * 1000);

            const route = getMockRoute(vehicle.location, { lat: 19.0760, lng: 72.8777 }); // Mock dest
            job.route = route;
            job.eta = new Date(Date.now() + route.duration * 1000);

            job.logs.push({ status: 'ASSIGNED', message: `Assigned to vehicle ${vehicle.name}` });
            await job.save();

            return { job, vehicle };
        } else {
            console.log('No vehicles available for job', jobId);
            return null;
        }
    } catch (error) {
        console.error('Scheduler Error:', error);
    }
};

module.exports = { assignJob };
