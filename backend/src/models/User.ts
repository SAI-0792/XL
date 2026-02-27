import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle {
    plateNumber: string;
    type: 'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED';
    nickname?: string; // e.g., "My Honda", "Office Bike"
}

export interface IUser extends Document {
    name: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role: 'USER' | 'ADMIN';
    vehicles: IVehicle[]; // New: array of vehicles with type and plate
    managedCars: string[]; // Legacy: kept for backward compatibility with queries
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
}

const VehicleSchema = new Schema({
    plateNumber: { type: String, required: true },
    type: { type: String, enum: ['CAR', 'BIKE', 'TRUCK', 'HANDICAPPED'], required: true },
    nickname: { type: String }
}, { _id: true });

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    vehicles: { type: [VehicleSchema], default: [] },
    managedCars: [{ type: String }], // Legacy field, kept for booking queries

    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date }
}, { timestamps: true });

// Middleware to sync managedCars with vehicles array
UserSchema.pre('save', function (next) {
    if (this.isModified('vehicles')) {
        this.managedCars = (this.vehicles as IVehicle[]).map(v => v.plateNumber);
    }
    next();
});

export default mongoose.model<IUser>('User', UserSchema);
