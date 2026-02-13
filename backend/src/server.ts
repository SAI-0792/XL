import http from 'http';
import app from './app';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setupCronJobs } from './services/cronService';
import { setupSocket } from './services/socketService';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
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

// Connect DB and Start
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    console.log('Connected to MongoDB');
    // server.listen(PORT, '0.0.0.0', () => {
    //   console.log(`Server running on port ${PORT}`);
    //   setupCronJobs(); // Start background jobs (buffer expiry)
    // });
    server.listen(3000, "0.0.0.0", () => {
      console.log("Server running on port 3000");
      setupCronJobs();
    });
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
  });
