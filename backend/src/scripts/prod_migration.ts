import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ParkingSlot from '../models/ParkingSlot';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const prodMigration = async () => {
    console.log('--- STARTING PRODUCTION MIGRATION ---');

    try {
        if (!MONGO_URI) throw new Error("No MONGO_URI provided!");
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connection Successful');

        // A1, A2 -> CAR
        await ParkingSlot.updateMany({ slotNumber: { $in: ['A1', 'A2'] } }, { $set: { type: 'CAR' } });
        console.log('✅ Updated A1, A2 to CAR');

        // B1, B2 -> HANDICAPPED
        await ParkingSlot.updateMany({ slotNumber: { $in: ['B1', 'B2'] } }, { $set: { type: 'HANDICAPPED' } });
        console.log('✅ Updated B1, B2 to HANDICAPPED');

        // C1, C2, C3 -> TRUCK
        await ParkingSlot.updateMany({ slotNumber: { $in: ['C1', 'C2', 'C3'] } }, { $set: { type: 'TRUCK' } });
        console.log('✅ Updated C1, C2, C3 to TRUCK');

        // C4, C5, C6 -> BIKE
        await ParkingSlot.updateMany({ slotNumber: { $in: ['C4', 'C5', 'C6'] } }, { $set: { type: 'BIKE' } });
        console.log('✅ Updated C4, C5, C6 to BIKE');

    } catch (error) {
        console.error('❌ Update Failed:', error);
    } finally {
        console.log('--- PRODUCTION MIGRATION COMPLETE ---');
        await mongoose.disconnect();
        process.exit(0);
    }
};

prodMigration();
