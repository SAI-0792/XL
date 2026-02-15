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

        // If user is logged in, ensure the car plate is in their registered vehicles
        if (userId && carNumber) {
            const user = await User.findById(userId);
            const normalizedInput = carNumber.toUpperCase().replace(/[\s\-\.]/g, '').trim();
            const userPlates = (user?.managedCars || []).map((p: string) =>
                p.toUpperCase().replace(/[\s\-\.]/g, '').trim()
            );

            if (userPlates.length > 0 && !userPlates.includes(normalizedInput)) {
                return res.status(400).json({
                    error: 'This vehicle is not registered to your account. Please add it in your Profile first.'
                });
            }
        }

        const booking = await createBooking(userId, carNumber, slotId, startTime, endTime, source || 'WEB');
        res.json(booking);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Pre-check if booking can be made (before payment)
router.post('/check', async (req: any, res) => {
    try {
        const { carNumber, startTime, endTime } = req.body;

        // Check if this vehicle already has a booking during this time period
        const existingBooking = await Booking.findOne({
            carNumber: carNumber.toUpperCase().trim(),
            status: { $in: ['PENDING_ARRIVAL', 'ACTIVE'] },
            startTime: { $lt: new Date(endTime) },
            endTime: { $gt: new Date(startTime) }
        });

        if (existingBooking) {
            return res.status(400).json({
                available: false,
                error: 'This vehicle already has a booking during this time period'
            });
        }

        res.json({ available: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get User Bookings
router.get('/', protect, async (req: any, res) => {
    try {
        const user = await User.findById(req.user.id);
        const rawPlates = (user?.managedCars || []).filter(p => typeof p === 'string' && p.trim().length > 0);

        // Create both raw and normalized versions for matching
        const allPlateVariants: string[] = [];
        for (const plate of rawPlates) {
            allPlateVariants.push(plate);
            const normalized = plate.toUpperCase().replace(/[\s\-\.]/g, '').trim();
            if (!allPlateVariants.includes(normalized)) {
                allPlateVariants.push(normalized);
            }
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'User not authenticated properly' });
        }

        const bookingsQuery: any = {
            $or: [{ userId: req.user.id }]
        };

        if (allPlateVariants.length > 0) {
            bookingsQuery.$or.push({
                userId: null,
                carNumber: { $in: allPlateVariants }
            });
        }

        console.log(`[DEBUG] Fetching bookings for User: ${req.user.id}`);
        console.log(`[DEBUG] User Managed Cars:`, user?.managedCars);
        console.log(`[DEBUG] Computed Plate Variants:`, allPlateVariants);
        console.log(`[DEBUG] Final Query:`, JSON.stringify(bookingsQuery, null, 2));

        // Fetch potentially matching bookings (broad query)
        const candidateBookings = await Booking.find(bookingsQuery).populate('slotId').sort({ createdAt: -1 });

        // STRICT IN-MEMORY FILTERING
        // Double-check allows us to be 100% sure we only return valid data
        const bookings = candidateBookings.filter(b => {
            // 1. Owned by user?
            if (b.userId && b.userId.toString() === req.user.id) return true;

            // 2. Kiosk booking (no user) matching one of user's plates?
            if (!b.userId && b.carNumber && allPlateVariants.includes(b.carNumber)) return true;

            // 3. Otherwise, FILTER OUT
            console.warn(`[SECURITY WARN] Filtered out unauthorized booking ${b._id} for user ${req.user.id}`);
            return false;
        });

        console.log(`[DEBUG] Returning ${bookings.length} verified bookings out of ${candidateBookings.length} candidates.`);

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
