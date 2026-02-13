import express from 'express';
import { getUserProfile, updateUserProfile, addVehicle, removeVehicle } from '../controllers/userController';
const router = express.Router();

import { protect } from '../middleware/authMiddleware';

router.get('/me', protect, getUserProfile);
router.put('/me', protect, updateUserProfile);
router.post('/vehicles', protect, addVehicle);
router.delete('/vehicles/:vehicleId', protect, removeVehicle);

export default router;

