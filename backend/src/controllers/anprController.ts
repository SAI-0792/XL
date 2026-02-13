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
        // PSM 7: Treat the image as a single text line.
        const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
            logger: (m: any) => console.log(m),
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7',
        } as any);

        // Improved ANPR for Indian License Plates
        const cleanText = text.replace(/[^a-zA-Z0-9\s]/g, '').toUpperCase();

        // Helper function to extract and standardise plate
        const extractIndianPlate = (input: string): string | null => {
            // Remove all whitespace
            const str = input.replace(/[\s\W_]+/g, '').toUpperCase();

            console.log("Processing cleaned text:", str);

            // Dictionary for Position-Based Correction
            // If we expect a Number but see a Letter, map it
            const letterToNum: Record<string, string> = { 'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'A': '4' };
            // If we expect a Letter but see a Number, map it
            const numToLetter: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A' };

            // We look for a sequence of 10 characters that MIGHT be a plate
            // Standard: LL NN LL NNNN (Total 10)

            // Search based on length of 10 chars
            for (let i = 0; i <= str.length - 10; i++) {
                const sub = str.substring(i, i + 10);

                // Character by Character Validation & Correction
                let corrected = '';

                // Slots 0,1: State Code (Letters)
                corrected += (numToLetter[sub[0]] || sub[0]);
                corrected += (numToLetter[sub[1]] || sub[1]);

                // Slots 2,3: District Code (Numbers)
                corrected += (letterToNum[sub[2]] || sub[2]);
                corrected += (letterToNum[sub[3]] || sub[3]);

                // Slots 4,5: Series (Letters) - note: sometimes it's 1 char, but standard is usually 2 or empty. 
                // Let's assume standard full format for now.
                corrected += (numToLetter[sub[4]] || sub[4]);
                corrected += (numToLetter[sub[5]] || sub[5]);

                // Slots 6,7,8,9: Number (Numbers)
                corrected += (letterToNum[sub[6]] || sub[6]);
                corrected += (letterToNum[sub[7]] || sub[7]);
                corrected += (letterToNum[sub[8]] || sub[8]);
                corrected += (letterToNum[sub[9]] || sub[9]);

                // Validate the Corrected String matches Strict Regex
                // Regex: ^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$
                if (/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/.test(corrected)) {
                    return corrected;
                }
            }

            // Fallback: Try regex on original strict match if above failed (e.g. different spaced format)
            const strictMatch = str.match(/[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}/);
            return strictMatch ? strictMatch[0] : null;
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
