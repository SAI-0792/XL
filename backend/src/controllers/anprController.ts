import { Request, Response } from 'express';
// import Tesseract from 'tesseract.js'; // Keeping import for fallback if needed, or remove.
import { Server } from 'socket.io';
import Jimp from 'jimp';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const scanLicensePlate = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
        // @ts-ignore
        if (!req.file) {
            console.error("ANPR Error: No image uploaded.");
            return res.status(400).json({ error: 'No image uploaded' });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("CRITICAL: GEMINI_API_KEY is missing in backend environment variables.");
            return res.status(500).json({ error: 'Server Misconfiguration: AI Key Missing' });
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

        // Call Gemini Vision API
        const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        const base64Image = processedBuffer.toString('base64');

        const prompt = "Extract the Indian license plate number from this image. Return ONLY the license plate number as a text string (e.g., MH12DE1433). Ignore any other text. If there are multiple, return the most prominent one. Fix common OCR character confusion (e.g. 0 vs O, I vs 1) for the Indian format (LLNNLLNNNN like AP07TA4050).";

        let detectedPlate = '';
        let rawText = '';

        try {
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: "image/jpeg",
                    },
                },
            ]);
            rawText = result.response.text();

            // Clean the result
            detectedPlate = rawText.replace(/[\s\W_]+/g, '').toUpperCase();
            console.log("Gemini Raw:", rawText);
            console.log("Gemini Cleaned:", detectedPlate);

        } catch (geminiError) {
            console.error("Gemini API Error:", geminiError);
            return res.status(500).json({ error: 'AI processing failed' });
        }

        if (!detectedPlate || detectedPlate.length < 4) {
            return res.status(422).json({ error: 'Could not detect a valid license plate via AI', rawText: rawText });
        }

        const plateData = {
            plateNumber: detectedPlate,
            timestamp: new Date(),
            rawText: rawText
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
