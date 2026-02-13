import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const scanLicensePlate = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
        // @ts-ignore
        if (!req.file) {
            console.error("ANPR Error: No image uploaded.");
            return res.status(400).json({ error: 'No image uploaded' });
        }

        console.log(`Analyzing image with Gemini API...`);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Convert buffer to base64
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';

        const prompt = `You are a license plate recognition system. Look at this image and extract ANY text that appears to be a vehicle license plate number. 
Rules:
- Return ONLY the plate number, nothing else
- Remove spaces and special characters 
- If you see an Indian plate like "AP 07 TA 4050", return "AP07TA4050"
- If you cannot find a license plate, return exactly "NONE"
- Do NOT add any explanation, just the plate text`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        const detectedText = response.text().trim().replace(/\s+/g, '');

        console.log(`Gemini Raw Response: "${detectedText}"`);

        if (detectedText && detectedText !== 'NONE' && detectedText.length >= 4) {
            const plateData = {
                plateNumber: detectedText,
                timestamp: new Date(),
                rawText: detectedText
            };

            console.log("Gemini Detected:", plateData.plateNumber);

            // Emit to Kiosk via Socket.io
            const io: Server = req.app.get('io');
            if (io) {
                io.emit('plate_detected', plateData);
            }

            return res.json({ success: true, data: plateData });
        } else {
            console.warn("Gemini: No valid plate found.");
            return res.status(422).json({ error: 'No license plate detected' });
        }

    } catch (error: any) {
        console.error('ANPR Controller Error:', error.message || error);

        // Handle rate limiting specifically
        if (error.status === 429) {
            return res.status(429).json({ error: 'Rate limited, please wait and try again' });
        }

        res.status(500).json({ error: 'Internal Server Error' });
    }
};
