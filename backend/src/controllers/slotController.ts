import { Request, Response } from 'express';
import ParkingSlot from '../models/ParkingSlot';
import Booking from '../models/Booking';

export const getSlots = async (req: Request, res: Response) => {
    try {
        const { startTime, endTime } = req.query;
        let slots = await ParkingSlot.find().sort({ slotNumber: 1 });

        // Seed slots if empty
        if (slots.length === 0) {
            const seedSlots = [];

            // Zone A: Cars (A1-A6)
            for (let i = 1; i <= 6; i++) seedSlots.push({ slotNumber: `A${i}`, type: 'CAR' as const, status: 'AVAILABLE' as const, zone: 'A' as const });

            // Zone B: Handicapped (B1-B2) and Cars (B3-B6)
            seedSlots.push({ slotNumber: 'B1', type: 'HANDICAPPED' as const, status: 'AVAILABLE' as const, zone: 'B' as const });
            seedSlots.push({ slotNumber: 'B2', type: 'HANDICAPPED' as const, status: 'AVAILABLE' as const, zone: 'B' as const });
            for (let i = 3; i <= 6; i++) seedSlots.push({ slotNumber: `B${i}`, type: 'CAR' as const, status: 'AVAILABLE' as const, zone: 'B' as const });

            // Zone C: Trucks (C1-C3) and Bikes (C4-C6)
            for (let i = 1; i <= 3; i++) seedSlots.push({ slotNumber: `C${i}`, type: 'TRUCK' as const, status: 'AVAILABLE' as const, zone: 'C' as const });
            for (let i = 4; i <= 6; i++) seedSlots.push({ slotNumber: `C${i}`, type: 'BIKE' as const, status: 'AVAILABLE' as const, zone: 'C' as const });

            slots = await ParkingSlot.insertMany(seedSlots);
            console.log('Seeded 18 specialized parking slots');
        }

        // If time range is provided, check for overlapping bookings
        if (startTime && endTime) {
            const requestedStart = new Date(startTime as string);
            const requestedEnd = new Date(endTime as string);

            // Find all active/pending bookings that overlap with requested range
            const overlappingBookings = await Booking.find({
                status: { $in: ['PENDING_ARRIVAL', 'ACTIVE'] },
                $or: [
                    {
                        startTime: { $lt: requestedEnd },
                        endTime: { $gt: requestedStart }
                    }
                ]
            });

            const bookedSlotIds = overlappingBookings.map(b => b.slotId.toString());

            // Map slots to reflect availability for this specific range
            const dynamicSlots = slots.map(slot => {
                const isBooked = bookedSlotIds.includes(slot._id.toString());
                return {
                    ...slot.toObject(),
                    status: isBooked ? 'OCCUPIED' : slot.status
                };
            });

            return res.json({ slots: dynamicSlots });
        }

        res.json({ slots });
    } catch (error: any) {
        console.error('Error fetching slots:', error);
        res.status(500).json({
            message: `Slot fetch error: ${error.message}`,
            details: error.toString()
        });
    }
};

export const updateSlotStatus = async (req: Request, res: Response) => {
    try {
        const { slot_id, status, distance } = req.body; // status: 'FREE' | 'OCCUPIED'

        // === GATE SENSOR (slot_id 3) — NOT a real slot ===
        if (String(slot_id) === '3') {
            console.log(`Gate sensor update: status=${status}, distance=${distance}`);
            if (status === 'OCCUPIED') {
                // Vehicle detected at gate — check if any active/pending booking exists
                const activeBooking = await Booking.findOne({
                    status: { $in: ['PENDING_ARRIVAL', 'ACTIVE'] }
                }).sort({ updatedAt: -1 });

                if (activeBooking) {
                    console.log(`Gate: ALLOW — Booking ${activeBooking._id} found (${activeBooking.carNumber})`);
                    return res.json({ status: 'ALLOW', booking: activeBooking._id, plate: activeBooking.carNumber });
                } else {
                    console.log('Gate: DENY — No active booking found');
                    return res.json({ status: 'DENY' });
                }
            } else {
                // FREE = no vehicle at gate, just acknowledge
                return res.json({ status: 'IDLE' });
            }
        }

        // === REGULAR PARKING SLOTS (slot_id 1, 2, A1, B1, etc.) ===
        // Map numeric ID to slotNumber (e.g., 1 -> 'A1') if necessary
        let searchCriteria: any = [
            { slotNumber: String(slot_id) },
            { _id: typeof slot_id === 'string' && slot_id.match(/^[0-9a-fA-F]{24}$/) ? slot_id : undefined }
        ];

        // Heuristic: If slot_id is a number or looks like one, try mapping to 'A' + number
        // This caters to "slot_id": 1 -> "A1" based on the seed data structure
        if (!isNaN(Number(slot_id))) {
            searchCriteria.push({ slotNumber: `A${slot_id}` });
        }

        // Find the slot
        let slot = await ParkingSlot.findOne({ $or: searchCriteria });

        if (!slot) {
            return res.status(404).json({ message: `Slot not found: ${slot_id}` });
        }

        console.log(`Slot Update: ${slot.slotNumber} (ID: ${slot_id}) | Status: ${slot.status} | Sensor: ${status} | Dist: ${distance}`);

        if (status === 'FREE') {
            if (slot.status === 'OCCUPIED') {
                // Check if there is an active booking to complete
                const booking = await Booking.findOne({ slotId: slot._id, status: 'ACTIVE' });
                if (booking) {
                    booking.status = 'COMPLETED';
                    booking.actualEndTime = new Date();
                    await booking.save();
                    console.log(`Booking ${booking._id} completed.`);
                }
                slot.status = 'AVAILABLE';
                await slot.save();
            } else if (slot.status === 'RESERVED') {
                // Check if reservation buffer has expired
                const booking = await Booking.findOne({
                    slotId: slot._id,
                    status: 'PENDING_ARRIVAL'
                }).sort({ startTime: 1 });

                if (booking && booking.bufferExpiry) {
                    // Check if we are past the buffer expiry
                    if (new Date() > booking.bufferExpiry) {
                        console.log(`Reservation ${booking._id} expired (buffer). Cancelling.`);
                        booking.status = 'CANCELLED';
                        await booking.save();
                        slot.status = 'AVAILABLE';
                        await slot.save();
                    } else {
                        // Buffer still active, ignore FREE signal
                        console.log(`Slot ${slot.slotNumber} is RESERVED. Sensor FREE ignored within buffer.`);
                    }
                } else {
                    // No valid booking found or no buffer? If explicitly RESERVED but no booking, free it.
                    // But safer to just free it if no booking found.
                    if (!booking) {
                        slot.status = 'AVAILABLE';
                        await slot.save();
                    }
                }
            }
        } else if (status === 'OCCUPIED') {
            if (slot.status === 'AVAILABLE') {
                slot.status = 'OCCUPIED';
                await slot.save();
            } else if (slot.status === 'RESERVED') {
                // Confirm the reservation arrival
                const booking = await Booking.findOne({
                    slotId: slot._id,
                    status: 'PENDING_ARRIVAL'
                }).sort({ startTime: 1 });

                if (booking) {
                    booking.status = 'ACTIVE';
                    booking.actualStartTime = new Date();
                    await booking.save();
                    console.log(`Booking ${booking._id} activated.`);
                }
                slot.status = 'OCCUPIED';
                await slot.save();
            }
        }

        res.json({ message: 'Slot status updated successfully', slot });

    } catch (error: any) {
        console.error('Error updating slot status:', error);
        res.status(500).json({ message: error.message });
    }
};
