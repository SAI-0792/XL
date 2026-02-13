import { Request, Response } from 'express';
import Tesseract from 'tesseract.js';
import { Server } from 'socket.io';

export const scanLicensePlate = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const imageBuffer = req.file.buffer;

        // Perform OCR
        const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
            // logger: m => console.log(m) // Optional: logging
        });

        // Basic cleaning and extraction logic
        // This is a naive implementation. Real ANPR needs specific training or constraints.
        // We look for alphanumeric strings of length 5-10.
        const cleanText = text.replace(/[^a-zA-Z0-9]/g, '');

        // Attempt to find a pattern resembling a plate (e.g., AA00AA0000 or similar)
        // For now, we just take the cleaned text if it's substantial, or the raw text lines.
        // Let's refine it to finding the longest alphanumeric sequence in the text.

        const potentialPlates = text.match(/[A-Z0-9]{5,15}/g) || [];
        const bestCandidate = potentialPlates.length > 0 ? potentialPlates[0] : cleanText;

        if (!bestCandidate || bestCandidate.length < 4) {
            return res.status(422).json({ error: 'Could not detect a valid license plate', rawText: text });
        }

        const plateData = {
            plateNumber: bestCandidate,
            timestamp: new Date(),
            rawText: text
        };

        // Emit to Kiosk via Socket.io
        const io: Server = req.app.get('io');
        if (io) {
            io.emit('plate_detected', plateData);
        } else {
            console.warn('Socket.io instance not found on app');
        }

        res.json({ success: true, data: plateData });

    } catch (error) {
        console.error('ANPR Error:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
};
