/**
 * Script to fix incorrectly linked Kiosk bookings.
 * This script will:
 * 1. Find all Kiosk bookings with a userId set
 * 2. Check if the booking's carNumber matches the user's managedCars
 * 3. If NOT, unlink the booking by setting userId to null
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from '../models/Booking';
import User from '../models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartparking';

async function fixBookingAssociations() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all Kiosk bookings that have a userId set
        const kioskBookingsWithUser = await Booking.find({
            source: 'KIOSK',
            userId: { $ne: null }
        });

        console.log(`Found ${kioskBookingsWithUser.length} Kiosk bookings with a userId`);

        let fixedCount = 0;

        for (const booking of kioskBookingsWithUser) {
            // Get the associated user
            const user = await User.findById(booking.userId);

            if (!user) {
                console.log(`Booking ${booking._id}: User ${booking.userId} not found. Unlinking...`);
                booking.userId = null as any;
                await booking.save();
                fixedCount++;
                continue;
            }

            // Check if the booking's carNumber is in the user's managedCars
            const carNumberInManagedCars = user.managedCars?.includes(booking.carNumber);

            if (!carNumberInManagedCars) {
                console.log(`Booking ${booking._id}: carNumber "${booking.carNumber}" NOT in user's managedCars [${user.managedCars?.join(', ')}]. Unlinking...`);
                booking.userId = null as any;
                await booking.save();
                fixedCount++;
            } else {
                console.log(`Booking ${booking._id}: carNumber "${booking.carNumber}" correctly linked to user ${user.name}`);
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total Kiosk bookings checked: ${kioskBookingsWithUser.length}`);
        console.log(`Bookings unlinked (fixed): ${fixedCount}`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixBookingAssociations();
