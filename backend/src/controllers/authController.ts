import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Booking from '../models/Booking';

const generateToken = (id: string, role: string) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'default_secret', {
        expiresIn: '30d',
    });
};

export const registerUser = async (req: Request, res: Response) => {
    console.log('Register request received:', req.body);
    try {
        const { name, email, password, plateNumber, vehicleType } = req.body;

        if (!name || !email || !password) {
            console.log('Missing fields:', { name: !!name, email: !!email, password: !!password });
            return res.status(400).json({ message: 'Please provide name, email and password' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Check if plate is already registered to another user
        if (plateNumber) {
            const plateExists = await User.findOne({ managedCars: plateNumber });
            if (plateExists) {
                console.log('Plate already registered to another user:', plateNumber);
                return res.status(400).json({ message: 'Car plate is already registered to another account' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create vehicles array with proper type
        const vehicles = plateNumber ? [{
            plateNumber: plateNumber.toUpperCase().trim(),
            type: vehicleType || 'CAR'
        }] : [];

        console.log('Creating user...');
        const user = await User.create({
            name,
            email,
            passwordHash,
            vehicles
            // managedCars will be auto-synced by the pre-save middleware
        });

        // Retroactively link existing kiosk bookings (userId=null) to this new user
        if (plateNumber && user) {
            const normalizedPlate = plateNumber.toUpperCase().replace(/[\s\-\.]/g, '').trim();
            const originalPlate = plateNumber.toUpperCase().trim();

            const linkedCount = await Booking.updateMany(
                {
                    userId: { $in: [null, undefined] },
                    carNumber: { $in: [normalizedPlate, originalPlate] },
                    status: { $in: ['PENDING_ARRIVAL', 'ACTIVE'] }
                },
                { $set: { userId: user._id } }
            );

            if (linkedCount.modifiedCount > 0) {
                console.log(`✅ Linked ${linkedCount.modifiedCount} existing kiosk bookings to new user ${user._id}`);
            }
        }

        if (user) {
            console.log('User created successfully:', user._id);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                vehicles: user.vehicles,
                vehicleType: user.vehicles && user.vehicles.length > 0 ? user.vehicles[0].type : 'CAR',
                token: generateToken(user._id as string, user.role),
            });
        } else {
            console.log('User creation returned null');
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message });
    }
};


export const loginUser = async (req: Request, res: Response) => {
    console.log('Login request received:', req.body.email); // LOG 1
    try {
        const { email, password } = req.body;

        console.log('Finding user by email...'); // LOG 2
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found');
            return res.status(404).json({ message: 'Account not found. Please create an account.' });
        }

        console.log('User found, comparing password...'); // LOG 3
        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (isMatch) {
            console.log('Password match, generating token...'); // LOG 4
            const token = generateToken(user._id.toString(), user.role);
            console.log('Token generated, sending response'); // LOG 5

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                vehicles: user.vehicles,
                vehicleType: user.vehicles && user.vehicles.length > 0 ? user.vehicles[0].type : 'CAR',
                token: token,
            });
        } else {
            console.log('Password mismatch');
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error: any) {
        console.error('Login error in controller:', error);
        // Ensure JSON response even on error
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};

import crypto from 'crypto';

// @desc    Forgot Password (Mock Email)
// @route   POST /api/auth/forgot
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash and set to resetPasswordToken
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set expire (10 mins)
        user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        // Simulate Email Sending
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        const message = `\n\n[MOCK EMAIL SERVICE]\nTo: ${user.email}\nSubject: Password Reset Request\n\nYou requested a password reset. Please click the link below:\n\n${resetUrl}\n\nThis link expires in 10 minutes.\n\n`;

        console.log(message); // Log to server console

        res.status(200).json({
            success: true,
            data: 'Email sent (Check Server Console)',
            resetToken: resetToken // SEND TOKEN TO FRONTEND FOR AUTO-REDIRECT
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resetToken
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(req.body.password, salt);

        // Clear reset fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ success: true, data: 'Password updated' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
