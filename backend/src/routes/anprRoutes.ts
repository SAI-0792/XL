import express from 'express';
import multer from 'multer';
import { scanLicensePlate } from '../controllers/anprController';

const router = express.Router();

// Configure Multer to store files in memory for quick processing
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/', (req, res) => {
    res.json({ message: 'ANPR Service Ready', timestamp: new Date() });
});

router.post('/scan', upload.single('image'), scanLicensePlate);

export default router;
