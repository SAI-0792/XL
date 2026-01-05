import express from 'express';
import { createBooking, handlePlateRecognition, cancelBooking, extendBooking } from '../services/bookingService';
const router = express.Router();

import Booking from '../models/Booking';
import User from '../models/User';

import { protect, optionalProtect } from '../middleware/authMiddleware';

router.post('/', optionalProtect, async (req: any, res) => {
    try {
        const { slotId, carNumber, startTime, endTime, source } = req.body;

        // Use req.user.id if logged in (WEB), otherwise null (KIOSK will auto-link via plate)
        const userId = req.user ? req.user.id : null;

        const booking = await createBooking(userId, carNumber, slotId, startTime, endTime, source || 'WEB');
        res.json(booking);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Get User Bookings
router.get('/', protect, async (req: any, res) => {
    try {
        const user = await User.findById(req.user.id);
        const userPlates = user?.managedCars || [];

        const bookings = await Booking.find({
            $or: [
                { userId: req.user.id },
                { carNumber: { $in: userPlates } }
            ]
        }).populate('slotId').sort({ createdAt: -1 });

        res.json(bookings);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/cancel', async (req, res) => {
    try {
        const booking = await cancelBooking(req.params.id);
        res.json(booking);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/extend', protect, async (req, res) => {
    try {
        const { additionalHours } = req.body;
        const booking = await extendBooking(req.params.id, additionalHours);
        res.json(booking);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/entry', async (req, res) => {
    try {
        const { carNumber, gateId } = req.body;
        const result = await handlePlateRecognition(carNumber, gateId || 'GATE_01');
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
