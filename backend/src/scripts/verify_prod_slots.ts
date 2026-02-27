import mongoose from 'mongoose';
import ParkingSlot from '../models/ParkingSlot';

async function verifyProdSlots() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("MONGO_URI not provided");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB:", uri.split('@')[1]);

        const slots = await ParkingSlot.find({}).sort('slotNumber');
        console.log(`Found ${slots.length} slots:`);

        for (const slot of slots) {
            console.log(`${slot.slotNumber} - Type: ${slot.type}`);
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyProdSlots();
