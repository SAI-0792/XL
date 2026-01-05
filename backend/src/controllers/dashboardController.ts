import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import ParkingSlot from '../models/ParkingSlot';
import User from '../models/User';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId);

        const userPlates = user?.managedCars || [];

        // Query matches either the userId specifically OR the carNumber if it's one of user's plates
        const bookingQuery = {
            $or: [
                { userId: userId },
                { carNumber: { $in: userPlates } }
            ]
        };

        // Calculate Total Bookings
        const totalBookings = await Booking.countDocuments(bookingQuery);

        // Calculate Total Revenue
        const revenueResult = await Booking.aggregate([
            {
                $match: {
                    $or: [
                        { userId: new mongoose.Types.ObjectId(userId) },
                        { carNumber: { $in: userPlates } }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: "$totalCost" } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Get Current Active Booking
        const activeBooking = await Booking.findOne({
            ...bookingQuery,
            status: { $in: ['PENDING_ARRIVAL', 'ACTIVE'] }
        })
            .sort({ createdAt: -1 })
            .populate('slotId');

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
