import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User';
import dotenv from 'dotenv';
dotenv.config();

const changePass = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error("No string");
        await mongoose.connect(process.env.MONGO_URI);
        const salt = await bcrypt.genSalt(10);
        const newPassword = await bcrypt.hash('admin123', salt);
        await User.updateOne({ email: 'admin@demo.com' }, { $set: { passwordHash: newPassword } });
        console.log('Password reset to admin123 using standard bcrypt and passwordHash field');
    } catch (e) {
        console.log("Error", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

changePass();
