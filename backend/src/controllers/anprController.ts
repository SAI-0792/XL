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

        } catch (geminiError: any) {
            console.error("Gemini API Error:", geminiError);

            // Fallback to Tesseract if Gemini fails (e.g. Rate Limit 429)
            console.log("Falling back to Tesseract OCR due to AI Error...");

            // Re-import Tesseract dynamically to avoid top-level issues if not used often
            const Tesseract = require('tesseract.js');

            const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
                logger: (m: any) => console.log(m),
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                tessedit_pageseg_mode: '7',
            });

            rawText = text;
            // Clean the result
            detectedPlate = rawText.replace(/[\s\W_]+/g, '').toUpperCase();

            // Indian Plate Logic (Simplified)
            // Helper function to extract and standardise plate
            const extractIndianPlate = (input: string): string | null => {
                const str = input.replace(/[\s\W_]+/g, '').toUpperCase();
                const letterToNum: Record<string, string> = { 'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'A': '4' };
                const numToLetter: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A' };

                for (let i = 0; i <= str.length - 10; i++) {
                    const sub = str.substring(i, i + 10);
                    let corrected = '';
                    corrected += (numToLetter[sub[0]] || sub[0]);
                    corrected += (numToLetter[sub[1]] || sub[1]);
                    corrected += (letterToNum[sub[2]] || sub[2]);
                    corrected += (letterToNum[sub[3]] || sub[3]);
                    corrected += (numToLetter[sub[4]] || sub[4]);
                    corrected += (numToLetter[sub[5]] || sub[5]);
                    corrected += (letterToNum[sub[6]] || sub[6]);
                    corrected += (letterToNum[sub[7]] || sub[7]);
                    corrected += (letterToNum[sub[8]] || sub[8]);
                    corrected += (letterToNum[sub[9]] || sub[9]);

                    if (/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/.test(corrected)) {
                        return corrected;
                    }
                }
                const strictMatch = str.match(/[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}/);
                return strictMatch ? strictMatch[0] : null;
            };

            const indianPlate = extractIndianPlate(detectedPlate);
            if (indianPlate) {
                detectedPlate = indianPlate;
                console.log("Tesseract (Indian Logic):", detectedPlate);
            } else {
                console.log("Tesseract Raw:", detectedPlate);
            }
        }

        if (!detectedPlate || detectedPlate.length < 4) {
            return res.status(422).json({ error: 'Could not detect a valid license plate via AI or OCR', rawText: rawText });
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
