import express from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
import ParkingSlot from '../models/ParkingSlot';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Get all bookings (admin only)
router.get('/bookings', async (req: any, res) => {
    try {
        const bookings = await Booking.find()
            .populate('userId', 'name email')
            .populate('slotId', 'slotNumber type')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (err: any) {
        console.error('Admin bookings fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get admin stats
router.get('/stats', async (req: any, res) => {
    try {
        const slots = await ParkingSlot.find();
        const bookings = await Booking.find();

        const stats = {
            totalSlots: slots.length,
            available: slots.filter(s => s.status === 'AVAILABLE').length,
            occupied: slots.filter(s => s.status === 'OCCUPIED').length,
            reserved: slots.filter(s => s.status === 'RESERVED').length,
            totalBookings: bookings.length,
            activeBookings: bookings.filter(b => b.status === 'ACTIVE').length,
            completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
            cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
            totalRevenue: bookings
                .filter(b => b.status === 'COMPLETED' || b.status === 'ACTIVE')
                .reduce((sum, b) => sum + (b.totalCost || 0), 0)
        };

        res.json(stats);
    } catch (err: any) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all users (admin only)
router.get('/users', async (req: any, res) => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err: any) {
        console.error('Admin users fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
