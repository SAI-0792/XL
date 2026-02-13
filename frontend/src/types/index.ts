export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    token?: string;
}

export interface Slot {
    _id: string;
    slotNumber: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
    type: 'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED';
    zone?: string;
}

export interface Booking {
    _id: string;
    carNumber: string;
    slotId: string;
    status: 'PENDING_ARRIVAL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    startTime: string;
    endTime: string;
    totalCost: number;
    bufferExpiry?: string;
}
