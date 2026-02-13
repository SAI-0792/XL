import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

interface PlateData {
    plateNumber: string;
    timestamp: string;
    rawText: string;
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const KioskDisplayPage = () => {
    const [plates, setPlates] = useState<PlateData[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('Connected to socket server');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
            setIsConnected(false);
        });

        socket.on('plate_detected', (data: PlateData) => {
            console.log('Plate Detected:', data);
            setPlates(prev => [data, ...prev].slice(0, 10)); // Keep last 10
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
                    Smart Parking Kiosk
                </h1>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-semibold">{isConnected ? 'System Online' : 'Connecting...'}</span>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Latest Detection - Prominent Display */}
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center border-l-8 border-indigo-600">
                    <h2 className="text-2xl font-medium text-gray-500 mb-4">Latest Vehicle Detected</h2>
                    {plates.length > 0 ? (
                        <div className="text-center animate-pulse-once">
                            <div className="text-8xl font-black text-gray-900 font-mono tracking-wider border-4 border-gray-900 p-6 rounded-lg inline-block bg-yellow-400 text-black shadow-lg transform -rotate-1">
                                {plates[0].plateNumber}
                            </div>
                            <p className="mt-4 text-gray-400">
                                {new Date(plates[0].timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : (
                        <div className="text-gray-400 text-xl font-light italic">
                            Waiting for vehicle...
                        </div>
                    )}
                </div>

                {/* Recent History List */}
                <div className="bg-white p-6 rounded-2xl shadow-lg overflow-hidden">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Recent Explored Logic</h3>
                    <div className="overflow-y-auto max-h-[500px] space-y-3">
                        {plates.map((plate, index) => (
                            <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700 font-bold font-mono">
                                        {plate.plateNumber}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Confidence: High
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-700">
                                        {new Date(plate.timestamp).toLocaleTimeString()}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(plate.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {plates.length === 0 && (
                            <p className="text-center text-gray-400 py-8">No vehicles detected yet.</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default KioskDisplayPage;
