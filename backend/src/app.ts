import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import bookingRoutes from './routes/bookingRoutes';
import hardwareRoutes from './routes/hardwareRoutes';
import slotRoutes from './routes/slotRoutes';
import userRoutes from './routes/userRoutes';
import kioskRoutes from './routes/kioskRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import debugRoutes from './routes/debugRoutes';
import adminRoutes from './routes/adminRoutes';
import chatRoutes from './routes/chatRoutes';
import anprRoutes from './routes/anprRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/anpr', anprRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Smart Parking API is running');
});

export default app;
