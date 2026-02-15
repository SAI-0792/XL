import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import ParkingSlot from '../models/ParkingSlot';
import User from '../models/User';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId);

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated properly' });
        }

        const validPlates = (user?.managedCars || []).filter(p => typeof p === 'string' && p.trim().length > 0);

        // Query matches:
        // 1. Bookings explicitly linked to this userId
        const bookingQuery: any = {
            $or: [
                { userId: userId }
            ]
        };

        // 2. Unlinked bookings (where userId is null/absent) matching user's specific plates
        if (validPlates.length > 0) {
            bookingQuery.$or.push({
                userId: null,
                carNumber: { $in: validPlates }
            });
        }

        console.log(`[DEBUG Dashboard] User: ${userId} | Plates: ${validPlates.join(', ')}`);

        // Fetch all candidates (newest first)
        const candidateBookings = await Booking.find(bookingQuery).populate('slotId').sort({ createdAt: -1 });

        // STRICT IN-MEMORY FILTERING
        const validatedBookings = candidateBookings.filter(b => {
            const bUserId = b.userId ? b.userId.toString() : null;
            const bCarNumber = b.carNumber;

            // 1. Explicitly linked to this user
            if (bUserId === userId) return true;

            // 2. Unlinked Kiosk booking (userId is null) AND matches a managed plate
            if (!bUserId && bCarNumber && validPlates.includes(bCarNumber)) return true;

            return false;
        });

        console.log(`[DEBUG Dashboard] User: ${userId} | Candidates: ${candidateBookings.length} | Validated: ${validatedBookings.length}`);

        // Calculate Stats from validated list
        const totalBookings = validatedBookings.length;

        const totalRevenue = validatedBookings
            .filter(b => b.status === 'COMPLETED' || b.status === 'ACTIVE')
            .reduce((sum, b) => sum + (b.totalCost || 0), 0);


        // Get Current Active Booking
        // Get Current Active Booking from validated list
        const activeBooking = validatedBookings.find(b =>
            ['PENDING_ARRIVAL', 'ACTIVE'].includes(b.status)
        );

        // Get Occupancy Status (Global, not per user)
        const totalSlots = await ParkingSlot.countDocuments();
        const occupiedSlots = await ParkingSlot.countDocuments({ status: { $ne: 'AVAILABLE' } });

        res.json({
            stats: {
                totalRevenue,
                totalBookings,
                occupancy: { occupied: occupiedSlots, total: totalSlots }
            },
            activeBooking: activeBooking ? {
                id: activeBooking._id,
                slotNumber: (activeBooking.slotId as any).slotNumber,
                status: activeBooking.status,
                startTime: activeBooking.startTime,
                bufferExpiry: activeBooking.bufferExpiry,
                carNumber: activeBooking.carNumber
            } : null
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
