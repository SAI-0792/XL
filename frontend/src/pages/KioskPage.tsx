import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import SlotMap from '../components/SlotMap';
import PaymentModal from '../components/PaymentModal';
import { fetchSlots, createBooking, checkEntry } from '../services/api';

const KioskPage = () => {
    const [step, setStep] = useState<'DETECTING' | 'SELECT_VEHICLE' | 'SELECT_SLOT' | 'SELECT_DURATION' | 'CONFIRMED' | 'ENTRY_GRANTED'>('DETECTING');
    const [detectedPlate, setDetectedPlate] = useState<string>('');
    const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED' | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [duration, setDuration] = useState<number>(2);
    const [showPayment, setShowPayment] = useState(false);
    const [slots, setSlots] = useState<any[]>([]);

    // Socket.io Connection for Real-time Plate Detection
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        // @ts-ignore
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('Kiosk connected to socket server');
        });

        socket.on('plate_detected', (data: { plateNumber: string }) => {
            console.log('Real Plate Detected:', data.plateNumber);
            if (step === 'DETECTING') {
                setDetectedPlate(data.plateNumber);
                handleVerifyPlate(data.plateNumber);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [step]);


    // Check for existing booking when plate is detected/changed
    const handleVerifyPlate = async (plateToCheck: string) => {
        if (!plateToCheck) return;
        try {
            console.log("Checking entry for:", plateToCheck);
            const result = await checkEntry(plateToCheck);
            if (result.matched) {
                // Existing booking found!
                setStep('ENTRY_GRANTED');
                setTimeout(() => {
                    setStep('DETECTING');
                    setDetectedPlate('');
                    setVehicleType(null);
                }, 5000);
            } else {
                alert('No existing booking found for this plate.');
                setStep('SELECT_VEHICLE'); // Proceed to vehicle selection if no booking found
            }
        } catch (error: any) {
            console.error("Entry check failed", error);
            alert('Error checking entry status');
            setStep('SELECT_VEHICLE'); // Fallback to vehicle selection on error
        }
    };


    // Fetch Slots (Time-aware)
    useEffect(() => {
        const loadSlots = async () => {
            try {
                // For Kiosk, availability check starts NOW
                const now = new Date();
                const start = now.toISOString();
                const end = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(); // Future window
                const data = await fetchSlots(start, end);
                setSlots(data);
            } catch (err) {
                console.error("Failed to load slots", err);
            }
        };
        loadSlots();
        const interval = setInterval(loadSlots, 5000);
        return () => clearInterval(interval);
    }, []);

    // Check if there are available slots of the selected vehicle type
    const hasAvailableSlots = vehicleType
        ? slots.some(s => s.type === vehicleType && s.status === 'AVAILABLE')
        : slots.some(s => s.status === 'AVAILABLE');

    const handleVehicleSelect = (type: 'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED') => {
        setVehicleType(type);
        setStep('SELECT_SLOT');
    };

    const handleSlotSelect = (slot: any) => {
        setSelectedSlot(slot);
        setStep('SELECT_DURATION');
    };

    const initiatePayment = () => {
        setShowPayment(true);
    };

    const handlePaymentSuccess = async () => {
        try {
            await createBooking({
                slotId: selectedSlot._id,
                carNumber: detectedPlate,
                startTime: new Date(),
                endTime: new Date(Date.now() + duration * 60 * 60 * 1000),
                source: 'KIOSK'
            });

            setShowPayment(false);
            setStep('CONFIRMED');

            // Auto reset
            setTimeout(() => {
                setStep('DETECTING');
                setDetectedPlate('');
                setSelectedSlot(null);
                setVehicleType(null);
                setDuration(2);
            }, 6000);
        } catch (error) {
            console.error("Booking failed", error);
            alert("Payment successful but booking failed. Please contact support.");
            setShowPayment(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black z-0 pointer-events-none"></div>

            {/* Header */}
            <header className="relative z-10 p-6 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse-glow"></div>
                    <h1 className="text-2xl font-bold tracking-wider uppercase text-gray-200">System Online</h1>
                </div>
                <div className="text-gray-400 font-mono">{new Date().toLocaleTimeString()}</div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-6xl mx-auto p-8 h-[calc(100vh-80px)] flex flex-col justify-center">

                {step === 'DETECTING' && (
                    <div className="flex flex-col items-center justify-center space-y-12">
                        <div className="relative w-full max-w-2xl h-80 border border-blue-500/30 rounded-2xl overflow-hidden bg-gray-900 shadow-[0_0_100px_rgba(59,130,246,0.15)] group animate-float">
                            {/* Camera Grid Overlay */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                            {/* Simulated Camera View */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-blue-500/40 font-mono text-xs tracking-[0.5em] mb-4">REC [●] 1080P 60FPS</div>
                                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                                <div className="mt-4 text-blue-400 font-mono text-sm animate-pulse">LIDAR DEPTH SENSING...</div>
                            </div>

                            {/* Scanning Line */}
                            <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#60a5fa] animate-scan z-30"></div>

                            {/* HUD Corners */}
                            <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-blue-500 rounded-tl-sm transition-all group-hover:scale-110"></div>
                            <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-blue-500 rounded-tr-sm transition-all group-hover:scale-110"></div>
                            <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-blue-500 rounded-bl-sm transition-all group-hover:scale-110"></div>
                            <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-blue-500 rounded-br-sm transition-all group-hover:scale-110"></div>

                            {/* HUD Data Tags */}
                            <div className="absolute top-8 left-20 font-mono text-[10px] text-blue-500/80 leading-relaxed hidden md:block">
                                LAT: 12.9716° N<br />
                                LON: 77.5946° E<br />
                                ALT: 920m
                            </div>
                            <div className="absolute bottom-8 right-20 font-mono text-[10px] text-blue-500/80 text-right leading-relaxed hidden md:block">
                                SIG: OPTIMAL<br />
                                VER: 2.0.4-LNR<br />
                                STATUS: ACTIVE
                            </div>
                        </div>

                        <div className="text-center animate-slide-up">
                            <h2 className="text-5xl font-extralight tracking-tight mb-4 text-white">
                                Preparing <span className="text-blue-400 font-medium">Entrance</span>
                            </h2>
                            <div className="flex items-center justify-center space-x-2 text-gray-500 font-mono italic">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                                <span>Scanning Vehicle Signature...</span>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'SELECT_VEHICLE' && (
                    <div className="animate-slide-up max-w-4xl mx-auto w-full">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold mb-4">Select <span className="text-blue-400">Vehicle Type</span></h2>
                            <p className="text-gray-400">Choose your vehicle to see compatible slots</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { id: 'HANDICAPPED', label: 'Disabled', icon: '♿', color: 'from-blue-600 to-blue-400' },
                                { id: 'CAR', label: 'Car', icon: '🚗', color: 'from-green-600 to-green-400' },
                                { id: 'BIKE', label: 'Bike', icon: '🏍️', color: 'from-purple-600 to-purple-400' },
                                { id: 'TRUCK', label: 'Truck', icon: '🚛', color: 'from-orange-600 to-orange-400' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => handleVehicleSelect(type.id as any)}
                                    className={`relative p-8 rounded-3xl bg-gray-900 border border-white/5 overflow-hidden group transition-all hover:scale-105 hover:border-white/20`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                                    <div className="text-5xl mb-4">{type.icon}</div>
                                    <div className="text-xl font-bold">{type.label}</div>
                                </button>
                            ))}
                        </div>
                        <div className="text-center mb-12">
                            <div className="inline-block px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">Plate Deciphered</div>
                            <div className="relative inline-block">
                                {/* Plate Reflection Effect */}
                                <div className="absolute inset-0 bg-white/5 skew-x-12 blur-xl animate-shimmer pointer-events-none"></div>
                                <input
                                    type="text"
                                    value={detectedPlate}
                                    onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
                                    className="relative bg-[#ffffff] text-[#1a1c1e] px-10 py-6 text-6xl font-mono font-black rounded-xl border-[6px] border-[#fbbf24] shadow-[0_20px_60px_rgba(251,191,36,0.3),inset_0_-4px_0_rgba(0,0,0,0.1)] focus:outline-none focus:border-blue-500 uppercase w-[420px] text-center tracking-tighter"
                                />
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-black animate-bounce">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-center space-x-4">
                                <button onClick={() => handleVerifyPlate(detectedPlate)} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10 flex items-center group">
                                    <span className="mr-3 opacity-50 group-hover:opacity-100 italic font-mono">auth:</span>
                                    Verify Pre-Booking
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'SELECT_SLOT' && (
                    <div className="animate-slide-up max-w-5xl mx-auto w-full">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-4xl font-bold mb-2">Choose <span className="text-blue-400">Your Spot</span></h2>
                                <p className="text-gray-400">Available {vehicleType} slots are highlighted</p>
                            </div>
                            <button
                                onClick={() => setStep('SELECT_VEHICLE')}
                                className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
                            >
                                ← Change Vehicle
                            </button>
                        </div>

                        <div className="bg-gray-900/80 p-8 rounded-[3rem] border border-gray-700/50 shadow-2xl backdrop-blur-2xl">
                            <SlotMap slots={slots} filterType={vehicleType} onSlotSelect={handleSlotSelect} />
                        </div>
                    </div>
                )}

                {step === 'SELECT_DURATION' && (
                    <div className="animate-fade-in-up max-w-4xl mx-auto w-full">
                        <h2 className="text-3xl font-bold mb-8 text-center text-white">Confirm Parking Details</h2>

                        <div className="bg-gray-900/80 p-8 rounded-3xl border border-gray-700/50 backdrop-blur-xl mb-8">
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <span className="text-gray-400 block mb-1">SELECTED SLOT</span>
                                    <span className="text-4xl font-bold text-blue-400">{selectedSlot?.slotNumber}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block mb-1">VEHICLE PLATE</span>
                                    <span className="text-4xl font-mono text-white">{detectedPlate}</span>
                                </div>
                            </div>

                            <div className="mb-8">
                                <span className="text-gray-400 block mb-4">PARKING DURATION</span>
                                <div className="flex items-center space-x-6">
                                    <input
                                        type="range"
                                        min="1"
                                        max="12"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                        className="flex-1 h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <span className="text-3xl font-bold text-white w-24 text-right">{duration} hrs</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-700 pt-6 flex justify-between items-center">
                                <span className="text-xl text-gray-300">Total Amount</span>
                                <span className="text-5xl font-bold text-green-400">₹{duration * 50}</span>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => setStep('SELECT_SLOT')}
                                className="flex-1 py-5 rounded-xl border border-gray-600 text-gray-300 font-bold text-xl hover:bg-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={initiatePayment}
                                className="flex-[2] py-5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl shadow-lg hover:shadow-green-500/30 transform transition hover:-translate-y-1"
                            >
                                Pay & Enter
                            </button>
                        </div>
                    </div>
                )}

                {step === 'ENTRY_GRANTED' && (
                    <div className="flex flex-col items-center justify-center animate-zoom-in text-center">
                        <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_#3b82f6]">
                            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h2 className="text-5xl font-bold text-white mb-4">Welcome Back!</h2>
                        <p className="text-2xl text-blue-300">Web Booking Detected. Gate Opening...</p>
                        <div className="mt-12 text-gray-500 font-mono">Status: CHECK-IN COMPLETE</div>
                    </div>
                )}

                {step === 'CONFIRMED' && (
                    <div className="flex flex-col items-center justify-center animate-zoom-in text-center">
                        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_#22c55e]">
                            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h2 className="text-5xl font-bold text-white mb-4">Access Granted</h2>
                        <p className="text-2xl text-gray-400">Gate Opening... Please Proceed.</p>
                        <div className="mt-12 text-gray-500 font-mono">Session ID: #SP-{Math.floor(Math.random() * 10000)}</div>
                    </div>
                )}
            </main>

            {showPayment && (
                <PaymentModal
                    amount={duration * 50}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setShowPayment(false)}
                />
            )}
        </div>
    );
};

export default KioskPage;
