import express from 'express';
import Message from '../models/Message';
import { protect, optionalProtect } from '../middleware/authMiddleware';

const router = express.Router();

// Send a message (user)
router.post('/', optionalProtect, async (req: any, res) => {
    try {
        const { message, userName, userEmail } = req.body;

        if (!message || !userName) {
            return res.status(400).json({ error: 'Message and name are required' });
        }

        const newMessage = await Message.create({
            senderType: 'USER',
            userId: req.user?.id || null,
            userName: userName,
            userEmail: userEmail || req.user?.email || '',
            message: message,
            isRead: false
        });

        // Emit socket event for real-time updates
        const io = req.app.get('io');
        if (io) {
            io.emit('new-message', newMessage);
        }

        res.status(201).json(newMessage);
    } catch (err: any) {
        console.error('Send message error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all messages (admin)
router.get('/', async (req: any, res) => {
    try {
        const messages = await Message.find()
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(messages);
    } catch (err: any) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark message as read (admin)
router.patch('/:id/read', async (req: any, res) => {
    try {
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );
        res.json(message);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Admin reply to a message
router.post('/:id/reply', async (req: any, res) => {
    try {
        const { message } = req.body;
        const originalMessage = await Message.findById(req.params.id);

        if (!originalMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const reply = await Message.create({
            senderType: 'ADMIN',
            userId: originalMessage.userId,
            userName: 'SmartPark Support',
            userEmail: originalMessage.userEmail,
            message: message,
            isRead: true
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('admin-reply', reply);
        }

        res.status(201).json(reply);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle priority (admin)
router.patch('/:id/priority', async (req: any, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        message.priority = message.priority === 'HIGH' ? 'NORMAL' : 'HIGH';
        await message.save();
        res.json(message);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread count
router.get('/unread-count', async (req: any, res) => {
    try {
        const count = await Message.countDocuments({ isRead: false, senderType: 'USER' });
        res.json({ count });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
