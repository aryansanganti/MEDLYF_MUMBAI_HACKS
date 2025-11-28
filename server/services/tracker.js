const Job = require('../models/Job');
const Vehicle = require('../models/Vehicle');

// Mock route points (Mumbai area)
const MOCK_ROUTE_POINTS = [
    { lat: 19.0760, lng: 72.8777 }, // Start
    { lat: 19.0800, lng: 72.8800 },
    { lat: 19.0850, lng: 72.8900 },
    { lat: 19.0900, lng: 72.9000 }, // End
];

const activeSimulations = new Map(); // jobId -> intervalId

const startSimulation = (io, jobId, routePoints = null) => {
    if (activeSimulations.has(jobId)) return;

    const points = routePoints || MOCK_ROUTE_POINTS;
    let step = 0;

    // Calculate speed based on route length to keep simulation reasonable
    // For now, just move 1 point per second (assuming high res points from Mapbox)

    const interval = setInterval(async () => {
        try {
            const job = await Job.findById(jobId).populate('vehicleId');
            if (!job || !job.vehicleId) {
                clearInterval(interval);
                activeSimulations.delete(jobId);
                return;
            }

            const vehicle = job.vehicleId;

            // Move vehicle
            if (step < points.length) {
                // Mapbox returns [lng, lat], our model uses {latitude, longitude}
                // or if it's already formatted. Let's assume we pass [lng, lat] arrays or format them before.
                // Mapbox geometry coordinates are [lng, lat].

                const point = points[step];
                // Check format
                const lng = Array.isArray(point) ? point[0] : point.lng;
                const lat = Array.isArray(point) ? point[1] : point.lat;

                vehicle.location = { latitude: lat, longitude: lng, lastUpdated: new Date() };
                await vehicle.save();

                // Emit update
                io.emit('vehicle_update', {
                    vehicleId: vehicle._id,
                    location: vehicle.location,
                    jobId: job._id
                });

                // Update job status if started
                if (job.status === 'ASSIGNED' && step > 0) {
                    job.status = 'EN_ROUTE';
                    await job.save();
                    io.emit('job_update', job);
                }

                step++;
            } else {
                // Arrived
                job.status = 'DELIVERED';
                job.logs.push({ status: 'DELIVERED', message: 'Arrived at destination' });
                await job.save();

                vehicle.status = 'AVAILABLE';
                vehicle.currentJobId = null;
                await vehicle.save();

                io.emit('job_update', job);

                clearInterval(interval);
                activeSimulations.delete(jobId);
            }
        } catch (err) {
            console.error('Simulation error:', err);
            clearInterval(interval);
        }
    }, 1000); // Update every 1 second for smoother high-res path

    activeSimulations.set(jobId, interval);
};

const startReturnSimulation = (io, vehicleId, routePoints) => {
    // Use vehicleId as key for return simulation, maybe prefix it to avoid collision with job simulation?
    // Or just use vehicleId since a vehicle can't be doing a job and returning at the same time.
    const simId = `return-${vehicleId}`;
    if (activeSimulations.has(simId)) return;

    const points = routePoints || [];
    let step = 0;

    const interval = setInterval(async () => {
        try {
            const vehicle = await Vehicle.findById(vehicleId);
            if (!vehicle) {
                clearInterval(interval);
                activeSimulations.delete(simId);
                return;
            }

            if (step < points.length) {
                const point = points[step];
                const lng = Array.isArray(point) ? point[0] : point.lng;
                const lat = Array.isArray(point) ? point[1] : point.lat;

                vehicle.location = { latitude: lat, longitude: lng, lastUpdated: new Date() };
                // Keep status as BUSY or maybe 'RETURNING' if we had that enum. 
                // For now, let's keep it BUSY so it doesn't get assigned new jobs.
                // vehicle.status = 'BUSY'; 
                await vehicle.save();

                io.emit('vehicle_update', {
                    vehicleId: vehicle._id,
                    location: vehicle.location
                });

                step++;
            } else {
                // Arrived at vendor
                vehicle.status = 'AVAILABLE';
                await vehicle.save();

                io.emit('vehicle_update', {
                    vehicleId: vehicle._id,
                    location: vehicle.location,
                    status: 'AVAILABLE'
                });

                clearInterval(interval);
                activeSimulations.delete(simId);
            }
        } catch (err) {
            console.error('Return simulation error:', err);
            clearInterval(interval);
        }
    }, 1000);

    activeSimulations.set(simId, interval);
};

module.exports = { startSimulation, startReturnSimulation };
