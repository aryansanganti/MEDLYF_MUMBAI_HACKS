require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to Atlas'))
    .catch((err) => console.error('Atlas connection error:', err));

const Vendor = require('./models/Vendor');

const seedVehicles = async () => {
    await Vehicle.deleteMany({});
    await Vendor.deleteMany({});

    const vendors = await Vendor.insertMany([
        { name: 'Central Supply', location: { latitude: 19.0700, longitude: 72.8700 } },
        { name: 'North Depot', location: { latitude: 19.0900, longitude: 72.8900 } },
        { name: 'South Hub', location: { latitude: 19.0600, longitude: 72.8600 } }
    ]);

    const vehicles = [
        { name: 'Tanker-01', type: 'TANKER', status: 'AVAILABLE', location: { latitude: 19.0700, longitude: 72.8700 }, vendorId: vendors[0]._id },
        { name: 'Van-Alpha', type: 'VAN', status: 'AVAILABLE', location: { latitude: 19.0900, longitude: 72.8900 }, vendorId: vendors[1]._id },
        { name: 'Drone-X', type: 'DRONE', status: 'AVAILABLE', location: { latitude: 19.0600, longitude: 72.8600 }, vendorId: vendors[2]._id },
    ];

    await Vehicle.insertMany(vehicles);
    console.log('Vehicles and Vendors seeded');
    mongoose.connection.close();
};

seedVehicles();
