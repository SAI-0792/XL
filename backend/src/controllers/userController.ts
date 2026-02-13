import { Request, Response } from 'express';
import User, { IVehicle } from '../models/User';

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId).select('-passwordHash');

        if (user) {
            // Auto-migrate: If user has managedCars but no vehicles, sync them
            if ((!user.vehicles || user.vehicles.length === 0) && user.managedCars && user.managedCars.length > 0) {
                console.log(`Migrating managedCars to vehicles for user ${userId}`);
                user.vehicles = user.managedCars.map(plate => ({
                    plateNumber: plate,
                    type: 'CAR' as const // Default to CAR for migrated plates
                })) as any;
                await user.save();
            }

            res.json({
                id: user._id,
                name: user.name,
                email: user.email,
                vehicles: user.vehicles || [],
                // Legacy fields for backward compatibility
                vehicleNo: user.vehicles && user.vehicles.length > 0 ? user.vehicles[0].plateNumber : '',
                vehicleType: user.vehicles && user.vehicles.length > 0 ? user.vehicles[0].type : 'CAR',
                membership: 'Standard'
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;

            // Handle legacy single vehicle update
            if (req.body.vehicleNo) {
                // Check if plate is already registered to another user
                const plateExists = await User.findOne({
                    'vehicles.plateNumber': req.body.vehicleNo,
                    _id: { $ne: userId }
                });

                if (plateExists) {
                    return res.status(400).json({ message: 'Car plate is already registered to another account' });
                }

                // Update or add to vehicles array
                if (user.vehicles && user.vehicles.length > 0) {
                    user.vehicles[0].plateNumber = req.body.vehicleNo;
                    if (req.body.vehicleType) {
                        user.vehicles[0].type = req.body.vehicleType;
                    }
                } else {
                    user.vehicles = [{
                        plateNumber: req.body.vehicleNo,
                        type: req.body.vehicleType || 'CAR'
                    }] as any;
                }
            }

            const updatedUser = await user.save();
            res.json({
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                vehicles: updatedUser.vehicles,
                vehicleNo: updatedUser.vehicles && updatedUser.vehicles.length > 0 ? updatedUser.vehicles[0].plateNumber : '',
                vehicleType: updatedUser.vehicles && updatedUser.vehicles.length > 0 ? updatedUser.vehicles[0].type : 'CAR',
                token: req.headers.authorization?.split(' ')[1]
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a new vehicle
export const addVehicle = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { plateNumber, type, nickname } = req.body;

        if (!plateNumber || !type) {
            return res.status(400).json({ message: 'Plate number and type are required' });
        }

        // Check if plate is already registered
        const plateExists = await User.findOne({
            'vehicles.plateNumber': plateNumber.toUpperCase().trim(),
            _id: { $ne: userId }
        });

        if (plateExists) {
            return res.status(400).json({ message: 'This plate number is already registered to another account' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user already has this plate
        const alreadyHasPlate = user.vehicles?.some(v => v.plateNumber === plateNumber.toUpperCase().trim());
        if (alreadyHasPlate) {
            return res.status(400).json({ message: 'You already have this vehicle registered' });
        }

        const newVehicle: IVehicle = {
            plateNumber: plateNumber.toUpperCase().trim(),
            type,
            nickname: nickname || undefined
        };

        user.vehicles = [...(user.vehicles || []), newVehicle] as any;
        await user.save();

        res.json({ message: 'Vehicle added successfully', vehicles: user.vehicles });
    } catch (error) {
        console.error('Add vehicle error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Remove a vehicle
export const removeVehicle = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { vehicleId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.vehicles = user.vehicles?.filter((v: any) => v._id.toString() !== vehicleId) as any;
        await user.save();

        res.json({ message: 'Vehicle removed successfully', vehicles: user.vehicles });
    } catch (error) {
        console.error('Remove vehicle error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
