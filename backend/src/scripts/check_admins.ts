import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const checkAdmins = async () => {
    try {
        if (!MONGO_URI) throw new Error("No MONGO_URI provided!");
        await mongoose.connect(MONGO_URI);

        const admins = await User.find({ role: 'ADMIN' });

        if (admins.length > 0) {
            console.log(`Found ${admins.length} admin(s):`);
            admins.forEach(admin => {
                console.log(`- Name: ${admin.name}, Email: ${admin.email}`);
            });
        } else {
            console.log("No admins found in the database.");
        }
    } catch (error) {
        console.error('❌ Query Failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

checkAdmins();
