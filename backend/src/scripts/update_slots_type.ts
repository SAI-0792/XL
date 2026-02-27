import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ParkingSlot from '../models/ParkingSlot';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-parking';

const updateSlotsType = async () => {
    console.log('--- UPDATING SLOT TYPES START ---');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connection Successful');

        // Rename T4 -> C1 (TRUCK)
        await ParkingSlot.updateOne({ slotNumber: 'T4' }, { $set: { slotNumber: 'C1', type: 'TRUCK', zone: 'C' } });
        // Rename T5 -> C2 (TRUCK)
        await ParkingSlot.updateOne({ slotNumber: 'T5' }, { $set: { slotNumber: 'C2', type: 'TRUCK', zone: 'C' } });
        // Rename T6 -> C3 (TRUCK)
        await ParkingSlot.updateOne({ slotNumber: 'T6' }, { $set: { slotNumber: 'C3', type: 'TRUCK', zone: 'C' } });

        // Rename BK1 -> C4 (BIKE)
        await ParkingSlot.updateOne({ slotNumber: 'BK1' }, { $set: { slotNumber: 'C4', type: 'BIKE', zone: 'C' } });
        // Rename BK2 -> C5 (BIKE)
        await ParkingSlot.updateOne({ slotNumber: 'BK2' }, { $set: { slotNumber: 'C5', type: 'BIKE', zone: 'C' } });
        // Rename BK3 -> C6 (BIKE)
        await ParkingSlot.updateOne({ slotNumber: 'BK3' }, { $set: { slotNumber: 'C6', type: 'BIKE', zone: 'C' } });

        console.log('✅ Updated BK/T slots to C slots with TRUCK/BIKE types.');

    } catch (error) {
        console.error('❌ Update Failed:', error);
    }

    console.log('--- UPDATING SLOT TYPES END ---');
    process.exit(0);
};

updateSlotsType();
