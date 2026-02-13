import http from 'http';
import app from './app';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setupCronJobs } from './services/cronService';
import { setupSocket } from './services/socketService';

dotenv.config();

console.log('Starting Server...');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
if (process.env.MONGO_URI) {
  console.log('MONGO_URI starts with:', process.env.MONGO_URI.substring(0, 15) + '...');
} else {
  console.error('CRITICAL: MONGO_URI is not defined! Falling back to localhost.');
}

const PORT = Number(process.env.PORT) || 10000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-parking';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for dev
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Attach socket to request
app.set('io', io);
setupSocket(io);

// Connect DB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    setupCronJobs();
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
  });

// Start Server immediately (Render needs open port)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
