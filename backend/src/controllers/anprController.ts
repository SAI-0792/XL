import { Request, Response } from 'express';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export const scanLicensePlate = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
        // @ts-ignore
        if (!req.file) {
            console.error("ANPR Error: No image uploaded.");
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Save buffer to a temporary file for the Python script to read
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `scan_${Date.now()}.jpg`);
        fs.writeFileSync(tempFilePath, req.file.buffer);

        console.log(`Analyzing image with EasyOCR: ${tempFilePath}`);

        // Determine Python executable path
        // In Docker (Render), we installed dependencies in /opt/venv
        let pythonPath = 'python3';
        if (fs.existsSync('/opt/venv/bin/python3')) {
            pythonPath = '/opt/venv/bin/python3';
            console.log("Using Virtualenv Python:", pythonPath);
        }

        // Spawn Python process
        const pythonProcess = spawn(pythonPath, ['src/ocr_engine.py', tempFilePath]);

        let resultData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error(`Python stderr: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            // Cleanup temp file
            try {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (err) {
                console.error("Failed to delete temp file:", err);
            }

            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({ error: 'OCR Engine failed' });
            }

            try {
                // Parse JSON output from Python
                const parsed = JSON.parse(resultData);

                if (parsed.success && parsed.plate && parsed.plate.length >= 4) {
                    const plateData = {
                        plateNumber: parsed.plate,
                        timestamp: new Date(),
                        rawText: parsed.raw_results ? parsed.raw_results.join(', ') : ''
                    };

                    console.log("EasyOCR Detected:", plateData.plateNumber);

                    // Emit to Kiosk via Socket.io
                    const io: Server = req.app.get('io');
                    if (io) {
                        io.emit('plate_detected', plateData);
                    }

                    return res.json({ success: true, data: plateData });
                } else {
                    console.warn("EasyOCR: No valid plate found.", parsed);
                    return res.status(422).json({ error: 'No license plate detected', details: parsed });
                }

            } catch (jsonError) {
                console.error("Failed to parse Python output:", resultData);
                return res.status(500).json({ error: 'Invalid response from OCR engine' });
            }
        });

    } catch (error) {
        console.error('ANPR Controller Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
