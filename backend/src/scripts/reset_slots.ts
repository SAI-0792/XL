import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ParkingSlot from '../models/ParkingSlot';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-parking';

const resetSlots = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing slots
        await ParkingSlot.deleteMany({});
        console.log('Cleared existing slots');

        const seedSlots = [];
        // Row A: Handicapped & Premium Cars
        for (let i = 1; i <= 2; i++) seedSlots.push({ slotNumber: `A${i}`, type: 'HANDICAPPED', status: 'AVAILABLE', zone: 'A' });
        for (let i = 3; i <= 6; i++) seedSlots.push({ slotNumber: `A${i}`, type: 'CAR', status: 'AVAILABLE', zone: 'A' });

        // Row B: Standard Cars
        for (let i = 1; i <= 6; i++) seedSlots.push({ slotNumber: `B${i}`, type: 'CAR', status: i % 4 === 0 ? 'OCCUPIED' : 'AVAILABLE', zone: 'B' });

        // Row C: Mixed (Bikes & Trucks)
        for (let i = 1; i <= 3; i++) seedSlots.push({ slotNumber: `BK${i}`, type: 'BIKE', status: 'AVAILABLE', zone: 'C' });
        for (let i = 4; i <= 6; i++) seedSlots.push({ slotNumber: `T${i}`, type: 'TRUCK', status: 'AVAILABLE', zone: 'C' });

        await ParkingSlot.insertMany(seedSlots);

        console.log(`Successfully seeded ${seedSlots.length} slots for the new topological map!`);

        process.exit(0);
    } catch (error) {
        console.error('Reset failed:', error);
        process.exit(1);
    }
};

resetSlots();
