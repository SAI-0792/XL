import { Request, Response } from 'express';
import { Server } from 'socket.io';
import https from 'https';

// OCR.space API - Free, accurate, 25,000 requests/month
const OCR_API_KEY = process.env.OCR_SPACE_KEY || 'K85833588388957'; // Free demo key as fallback

function callOCRSpace(imageBuffer: Buffer, mimeType: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

        const postData = `apikey=${OCR_API_KEY}&base64Image=${encodeURIComponent(base64Image)}&language=eng&isOverlayRequired=false&detectOrientation=true&scale=true&OCREngine=2`;

        const options = {
            hostname: 'api.ocr.space',
            port: 443,
            path: '/parse/image',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ParsedResults && parsed.ParsedResults.length > 0) {
                        const text = parsed.ParsedResults[0].ParsedText || '';
                        resolve(text);
                    } else {
                        resolve('');
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function extractAllPlates(rawText: string): string[] {
    // Clean up OCR text
    const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9\n]/g, '');
    console.log(`OCR.space Raw: "${rawText.trim()}" -> Cleaned: "${cleaned}"`);

    // Indian License Plate pattern: XX00XX0000 (global flag to find ALL)
    const platePattern = /[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}/g;
    const allMatches = cleaned.match(platePattern) || [];

    // Deduplicate
    const uniquePlates = [...new Set(allMatches)];
    console.log(`Found ${uniquePlates.length} plate(s):`, uniquePlates);
    return uniquePlates;
}

export const scanLicensePlate = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
        // @ts-ignore
        if (!req.file) {
            console.error("ANPR Error: No image uploaded.");
            return res.status(400).json({ error: 'No image uploaded' });
        }

        console.log(`Analyzing image with OCR.space...`);

        const mimeType = req.file.mimetype || 'image/jpeg';
        const rawText = await callOCRSpace(req.file.buffer, mimeType);

        const plates = extractAllPlates(rawText);

        if (plates.length > 0) {
            const io: Server = req.app.get('io');
            const connectedSockets = io?.engine?.clientsCount || 'unknown';

            // Emit EACH detected plate to the kiosk
            for (const plate of plates) {
                const plateData = {
                    plateNumber: plate,
                    timestamp: new Date(),
                    rawText: rawText.trim()
                };

                console.log(`✅ Detected: ${plate}`);

                if (io) {
                    console.log(`📡 Emitting plate_detected (${plate}) to ${connectedSockets} connected clients`);
                    io.emit('plate_detected', plateData);
                } else {
                    console.error("❌ Socket.io NOT available on app!");
                }
            }

            return res.json({ success: true, data: { plates, count: plates.length } });
        } else {
            console.warn("No valid plate found. Raw:", rawText.trim());
            return res.status(422).json({ error: 'No license plate detected', rawText: rawText.trim() });
        }

    } catch (error: any) {
        console.error('ANPR Controller Error:', error.message || error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
