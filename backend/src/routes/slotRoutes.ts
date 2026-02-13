import express from 'express';
import { getSlots, updateSlotStatus } from '../controllers/slotController';
const router = express.Router();

router.get('/', getSlots);
router.post('/slot-update', updateSlotStatus);

export default router;
