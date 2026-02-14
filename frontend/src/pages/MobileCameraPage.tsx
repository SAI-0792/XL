import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const MobileCameraPage = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastResult, setLastResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Camera Setup
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment', // Prefer back camera
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera Access Error:", err);
                setError("Could not access camera. Please allow permissions.");
            }
        };

        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Sequential Scanning Loop (Prevents flooding)
    useEffect(() => {
        let isActive = true;

        const loop = async () => {
            if (isScanning && isActive) {
                await captureAndSend();
                if (isActive && isScanning) {
                    // Wait 2 seconds AFTER the previous request finishes
                    // This creates a sequential queue instead of a pile-up
                    setTimeout(loop, 2000);
                }
            }
        };

        if (isScanning) {
            loop();
        }

        return () => {
            isActive = false;
        };
    }, [isScanning]);

    const captureAndSend = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        return new Promise<void>((resolve) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    resolve();
                    return;
                }

                const formData = new FormData();
                formData.append('image', blob, 'capture.jpg');

                try {
                    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    apiUrl = apiUrl.replace(/\/$/, '');

                    console.log("Sending scan...");
                    // Increased timeout to 60s because EasyOCR on free CPU is slow
                    const response = await axios.post(`${apiUrl}/api/anpr/scan`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        timeout: 60000
                    });

                    if (response.data.success) {
                        const plates = response.data.data.plates || [response.data.data.plateNumber];
                        setLastResult(`Detected: ${plates.join(', ')}`);
                        setError(null);
                    }
                } catch (err: any) {
                    console.error("Scan Error:", err);
                    // Only show critical errors, ignore timeouts to avoid panic
                    if (err.response) {
                        setError(`Server Error: ${err.response.status}`);
                    } else if (err.code === "ERR_NETWORK") {
                        setError("Connection slow... retrying");
                    } else {
                        // Optional: show other errors
                        // setError(err.message);
                    }
                } finally {
                    resolve();
                }
            }, 'image/jpeg', 0.8);
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4">Mobile ANPR Scanner</h1>

            {error && <div className="bg-red-500 text-white p-2 rounded mb-4">{error}</div>}

            <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden border-2 border-blue-500">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
                {/* Overlay reticle */}
                <div className="absolute inset-0 border-2 border-transparent flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-24 border-2 border-green-400 rounded-lg opacity-50"></div>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-6 flex flex-col items-center gap-4">
                <button
                    onClick={() => setIsScanning(!isScanning)}
                    className={`px-8 py-3 rounded-full font-bold text-lg transition-colors ${isScanning
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {isScanning ? 'Stop Scanning' : 'Start Scanning'}
                </button>

                {lastResult && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <p className="text-xl text-green-400 font-mono">{lastResult}</p>
                    </div>
                )}

                {/* Debug Info for Mobile */}
                <div className="mt-8 p-4 bg-gray-900 text-xs text-gray-500 w-full max-w-md break-all">
                    <p>API Config: {import.meta.env.VITE_API_URL || 'Using Localhost Fallback'}</p>
                    {error && <p className="text-red-500 mt-2">Last Error: {error}</p>}
                </div>
            </div>
        </div>
    );
};

export default MobileCameraPage;
