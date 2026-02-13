import express from 'express';
import Booking from '../models/Booking';
import User from '../models/User';

const router = express.Router();

// Debug endpoint to check database state
router.get('/debug', async (req, res) => {
    try {
        // Get all users with their plates
        const users = await User.find().select('name email managedCars');

        // Get all active bookings
        const bookings = await Booking.find({
            status: { $in: ['PENDING_ARRIVAL', 'ACTIVE'] }
        }).populate('slotId');

        res.json({
            users: users.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                managedCars: u.managedCars
            })),
            bookings: bookings.map(b => ({
                id: b._id,
                userId: b.userId,
                carNumber: b.carNumber,
                source: b.source,
                status: b.status,
                slotNumber: (b.slotId as any)?.slotNumber
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Fix endpoint to unlink incorrectly associated Kiosk bookings
router.post('/fix-bookings', async (req, res) => {
    try {
        // Find all Kiosk bookings with a userId set
        const kioskBookingsWithUser = await Booking.find({
            source: 'KIOSK',
            userId: { $ne: null }
        });

        const results: any[] = [];

        for (const booking of kioskBookingsWithUser) {
            const user = await User.findById(booking.userId);

            if (!user) {
                booking.userId = null as any;
                await booking.save();
                results.push({ bookingId: booking._id, action: 'unlinked', reason: 'user not found' });
                continue;
            }

            // Check if carNumber is in user's managedCars
            const isCorrectlyLinked = user.managedCars?.includes(booking.carNumber);

            if (!isCorrectlyLinked) {
                booking.userId = null as any;
                await booking.save();
                results.push({
                    bookingId: booking._id,
                    carNumber: booking.carNumber,
                    action: 'unlinked',
                    reason: `carNumber not in user's managedCars [${user.managedCars?.join(', ')}]`
                });
            } else {
                results.push({
                    bookingId: booking._id,
                    carNumber: booking.carNumber,
                    action: 'kept',
                    reason: 'correctly linked'
                });
            }
        }

        res.json({
            message: 'Fix completed',
            totalChecked: kioskBookingsWithUser.length,
            results
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

