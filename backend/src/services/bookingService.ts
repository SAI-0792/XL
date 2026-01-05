import Booking, { IBooking } from '../models/Booking';
import ParkingSlot from '../models/ParkingSlot';
import User from '../models/User';

// Constants
const BUFFER_MINUTES = 30;

export const createBooking = async (
    userId: string | null, // null for Kiosk
    carNumber: string,
    slotId: string,
    startTime: Date,
    endTime: Date,
    source: 'WEB' | 'KIOSK'
) => {
    // Check slot availability (Simplified)
    const slot = await ParkingSlot.findById(slotId);
    if (!slot || slot.status !== 'AVAILABLE') {
        throw new Error('Slot not available');
    }

    // Auto-link to user if they have an account with this plate
    let linkedUserId = userId;
    if (!linkedUserId && carNumber) {
        const userWithPlate = await User.findOne({ managedCars: carNumber });
        if (userWithPlate) {
            linkedUserId = userWithPlate._id.toString();
        }
    }

    // Calculate cost (Logic placeholder)
    const durationHours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 36e5;
    const totalCost = Math.ceil(durationHours) * 50; // 50 per hour dummy rate

    const booking = new Booking({
        userId: linkedUserId,
        source,
        carNumber,
        slotId,
        status: source === 'WEB' ? 'PENDING_ARRIVAL' : 'ACTIVE', // Kiosk is immediate entry
        startTime,
        endTime,
        bufferExpiry: source === 'WEB' ? new Date(Date.now() + BUFFER_MINUTES * 60000) : undefined,
        totalCost
    });

    await booking.save();

    // Mark slot reserved
    // Mark slot reserved or occupied based on source
    // If KIOSK, user is entering immediately -> OCCUPIED
    // If WEB, user will arrive later -> RESERVED
    slot.status = source === 'KIOSK' ? 'OCCUPIED' : 'RESERVED';
    slot.currentBookingId = booking._id;
    await slot.save();

    return booking;
};

export const handlePlateRecognition = async (plateNumber: string, gateId: string) => {
    console.log(`Plate detected: ${plateNumber} at ${gateId}`);

    // Find pending booking for this car
    const booking = await Booking.findOne({
        carNumber: plateNumber,
        status: 'PENDING_ARRIVAL',
        bufferExpiry: { $gt: new Date() } // Not expired
    });

    if (booking) {
        console.log(`Matched booking ${booking._id} for plate ${plateNumber}`);
        booking.status = 'ACTIVE';
        booking.actualStartTime = new Date();
        booking.actualEndTime = undefined; // Clear if any
        await booking.save();

        // Update slot status to OCCUPIED
        await ParkingSlot.findByIdAndUpdate(booking.slotId, { status: 'OCCUPIED' });

        return { matched: true, bookingId: booking._id };
    } else {
        // Maybe check if it's an exit event? 
        // For now assuming entry only implementation as per prompt focus
        return { matched: false };
    }
};

export const autoCancelExpiredBuffers = async () => {
    const now = new Date();
    // Find all pending bookings that have a buffer expiry set
    const pendingBookings = await Booking.find({
        status: 'PENDING_ARRIVAL',
        bufferExpiry: { $exists: true, $ne: null }
    });

    for (const booking of pendingBookings) {
        if (!booking.bufferExpiry) continue;

        const msRemaining = booking.bufferExpiry.getTime() - now.getTime();
        const minutesRemaining = msRemaining / 60000;

        // Auto Cancel if expired
        if (minutesRemaining <= 0) {
            console.log(`Auto-cancelling expired booking: ${booking._id}`);
            booking.status = 'CANCELLED';
            await booking.save();

            // Free the slot
            await ParkingSlot.findByIdAndUpdate(booking.slotId, {
                status: 'AVAILABLE',
                currentBookingId: null
            });
            continue; // Done with this booking
        }

        // Notification Logic
        // 15 mins elapsed (Total 30) -> 15 mins remaining
        if (minutesRemaining <= 15 && !booking.notificationsSent.includes('15_MIN_REMAINING')) {
            console.log(`[NOTIFICATION] Booking ${booking._id}: 15 minutes remaining to report!`);
            booking.notificationsSent.push('15_MIN_REMAINING');
            await booking.save();
        }

        // 20 mins elapsed -> 10 mins remaining
        if (minutesRemaining <= 10 && !booking.notificationsSent.includes('10_MIN_REMAINING')) {
            console.log(`[NOTIFICATION] Booking ${booking._id}: 10 minutes remaining to report!`);
            booking.notificationsSent.push('10_MIN_REMAINING');
            await booking.save();
        }

        // 25 mins elapsed -> 5 mins remaining
        if (minutesRemaining <= 5 && !booking.notificationsSent.includes('5_MIN_REMAINING')) {
            console.log(`[NOTIFICATION] Booking ${booking._id}: CRITICAL: 5 minutes remaining to report!`);
            booking.notificationsSent.push('5_MIN_REMAINING');
            await booking.save();
        }
    }
};
export const cancelBooking = async (bookingId: string) => {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
        throw new Error('Cannot cancel a completed or already cancelled booking');
    }

    booking.status = 'CANCELLED';
    await booking.save();

    // Free the slot
    await ParkingSlot.findByIdAndUpdate(booking.slotId, {
        status: 'AVAILABLE',
        currentBookingId: null
    });

    return booking;
};

export const extendBooking = async (bookingId: string, additionalHours: number) => {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status !== 'ACTIVE' && booking.status !== 'PENDING_ARRIVAL') {
        throw new Error('Cannot extend a completed or cancelled booking');
    }

    // Calculate additional cost
    const extraCost = additionalHours * 50; // Use same rate

    // Update times
    const currentEndTime = new Date(booking.endTime);
    booking.endTime = new Date(currentEndTime.getTime() + additionalHours * 60 * 60 * 1000);
    booking.totalCost += extraCost;

    await booking.save();
    return booking;
};
