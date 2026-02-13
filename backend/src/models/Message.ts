import mongoose from 'mongoose';

export interface IMessage {
    _id: mongoose.Types.ObjectId;
    senderType: 'USER' | 'ADMIN';
    userId?: mongoose.Types.ObjectId;
    userName: string;
    userEmail?: string;
    message: string;
    isRead: boolean;
    priority: 'NORMAL' | 'HIGH';
    replyTo?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const MessageSchema = new mongoose.Schema({
    senderType: { type: String, enum: ['USER', 'ADMIN'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    userEmail: { type: String },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    priority: { type: String, enum: ['NORMAL', 'HIGH'], default: 'NORMAL' },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

export default mongoose.model<IMessage>('Message', MessageSchema);
