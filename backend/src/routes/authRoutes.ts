import express from 'express';
import { loginUser, registerUser, forgotPassword, resetPassword } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import User from '../models/User';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);

router.get('/me', protect, (req: any, res) => {
    res.json(req.user);
});

// Admin promotion endpoint (secured with setup key)
router.post('/promote-admin', async (req: any, res) => {
    try {
        const { email, setupKey } = req.body;
        if (setupKey !== 'XL_SETUP_2026') {
            return res.status(403).json({ message: 'Invalid setup key' });
        }
        const user = await User.findOneAndUpdate(
            { email },
            { role: 'ADMIN' },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: `${email} promoted to ADMIN`, role: user.role });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
