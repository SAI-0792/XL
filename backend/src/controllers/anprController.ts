import { Request, Response } from 'express';
import Tesseract from 'tesseract.js';
import { Server } from 'socket.io';
import Jimp from 'jimp';

export const scanLicensePlate = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
        // @ts-ignore
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Image Preprocessing with Jimp (Computer Vision techniques)
        const image = await Jimp.read(req.file.buffer);

        // Resize to a reasonable width (Jimp v0.x / v1.x uses .bitmap.width or .getWidth())
        if (image.getWidth() > 1024) {
            image.resize(1024, Jimp.AUTO);
        }

        // Apply filters
        image
            .greyscale()
            .contrast(1);

        const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

        // Perform OCR with Whitelist on PROCESSED image
        const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
            logger: (m: any) => console.log(m),
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        } as any);

        // Improved ANPR for Indian License Plates
        const cleanText = text.replace(/[^a-zA-Z0-9\s]/g, '').toUpperCase();

        // Helper function to extract and standardise plate
        const extractIndianPlate = (input: string): string | null => {
            // Remove all whitespace for processing
            const str = input.replace(/\s+/g, '');

            // Regex for standard Indian format: 
            // 2 Chars (State) + 2 Digits (District) + 1-2 Chars (Series) + 4 Digits (Number)
            // Example: AP 07 TA 4050
            const strictRegex = /([A-Z]{2})([0-9]{2})([A-Z]{1,2})([0-9]{4})/;

            // Attempt strict match first
            const match = str.match(strictRegex);
            if (match) return match[0];

            // Fuzzy heuristic: Try to fix common OCR errors if pattern is close
            // Look for a sequence of 9-10 chars
            // Check for State Code pattern at start
            // Allow 0/O confusion, S/5 confusion, etc.

            // Simple heuristic updates:
            // 1. Look for 4 digits at the end
            const potentialMatches = str.match(/[A-Z0-9]{9,10}/g);
            if (!potentialMatches) return null;

            for (const candidate of potentialMatches) {
                // Try to force format LLNNLLNNNN
                // Fix Number part (last 4 chars) -> replace O with 0, I with 1, etc.
                const last4 = candidate.slice(-4).replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5');

                // Fix District part (chars 2-4) -> usually numbers
                // ... this is complex to do perfectly without more code.

                // Basic: Check if it starts with valid letters
                if (/^[A-Z]{2}/.test(candidate)) {
                    // Return the candidate with fixed last 4 digits at least
                    return candidate.slice(0, -4) + last4;
                }
            }

            return null;
        };

        const detectedPlate = extractIndianPlate(cleanText) || cleanText.replace(/[^A-Z0-9]/g, '');

        if (!detectedPlate || detectedPlate.length < 4) {
            return res.status(422).json({ error: 'Could not detect a valid license plate', rawText: text });
        }

        const plateData = {
            plateNumber: detectedPlate,
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
