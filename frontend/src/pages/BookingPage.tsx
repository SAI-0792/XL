import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SlotMap from '../components/SlotMap';
import PaymentModal from '../components/PaymentModal';
import { fetchSlots, createBooking, fetchUserProfile, checkBookingAvailability } from '../services/api';

interface Vehicle {
    _id: string;
    plateNumber: string;
    type: 'CAR' | 'BIKE' | 'TRUCK';
    nickname?: string;
}

const BookingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [duration, setDuration] = useState(2);
    const getLocalISOString = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const [startTime, setStartTime] = useState(getLocalISOString(new Date()));
    const [showPayment, setShowPayment] = useState(false);
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Vehicle selection state
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [loadingVehicles, setLoadingVehicles] = useState(true);

    // Load user's vehicles on mount
    useEffect(() => {
        const loadVehicles = async () => {
            try {
                const data = await fetchUserProfile();
                const userVehicles = data.vehicles || [];
                setVehicles(userVehicles);
                if (userVehicles.length > 0) {
                    setSelectedVehicle(userVehicles[0]);
                }
            } catch (err) {
                console.error("Failed to load vehicles", err);
            } finally {
                setLoadingVehicles(false);
            }
        };
        loadVehicles();
    }, []);

    const getEndTime = (start: string, durationHrs: number) => {
        const d = new Date(start);
        return new Date(d.getTime() + durationHrs * 60 * 60 * 1000).toISOString();
    };

    const loadSlots = async () => {
        setLoadingSlots(true);
        try {
            const end = getEndTime(startTime, duration);
            const data = await fetchSlots(new Date(startTime).toISOString(), end);
            setSlots(data);
        } catch (err: any) {
            console.error("Failed to load slots", err);
            const errorMsg = err.response?.data?.message || err.response?.data || err.message;
            alert(`Error loading slots: ${JSON.stringify(errorMsg)}`);
        } finally {
            setLoadingSlots(false);
        }
    };

    useEffect(() => {
        if (step === 2) {
            loadSlots();
        }
    }, [step, startTime, duration]);

    const handleSlotSelect = (slot: any) => {
        setSelectedSlot(slot);
        setStep(3);
    };

    const handlePaymentSuccess = async () => {
        try {
            if (!selectedVehicle) {
                alert('Please select a vehicle');
                return;
            }

            const start = new Date(startTime);
            const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

            await createBooking({
                slotId: selectedSlot._id,
                carNumber: selectedVehicle.plateNumber,
                startTime: start,
                endTime: end,
                source: 'WEB'
            });

            setShowPayment(false);
            navigate('/dashboard');
        } catch (err: any) {
            console.error("Booking failed", err);
            const errorMsg = err.response?.data?.error || err.message;
            alert(`Booking Failed: ${errorMsg}`);
            setShowPayment(false);
        }
    };

    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'BIKE': return '🏍️';
            case 'TRUCK': return '🚛';
            default: return '🚗';
        }
    };

    // Pre-validate before showing payment
    const handleProceedToPayment = async () => {
        if (!selectedVehicle) {
            alert('Please select a vehicle');
            return;
        }

        try {
            const start = new Date(startTime);
            const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

            const result = await checkBookingAvailability({
                carNumber: selectedVehicle.plateNumber,
                startTime: start,
                endTime: end
            });

            if (!result.available) {
                alert(result.error || 'This vehicle already has a booking during this time period');
                return;
            }

            setShowPayment(true);
        } catch (err: any) {
            console.error('Check failed:', err);
            alert(err.response?.data?.error || 'This vehicle already has a booking during this time period');
        }
    };

    // Check if there are available slots of the selected vehicle type
    const hasAvailableSlots = selectedVehicle
        ? slots.some((s: any) => s.type === selectedVehicle.type && s.status === 'AVAILABLE')
        : slots.some((s: any) => s.status === 'AVAILABLE');

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans relative">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black pointer-events-none"></div>

            <div className="max-w-5xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white">Book Your Spot</h1>
                    <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition">Exit</button>
                </div>

                {/* Progress Steps */}
                <div className="flex mb-12 relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -z-10 transform -translate-y-1/2 rounded-full"></div>
                    <div className={`flex-1 flex flex-col items-center ${step >= 1 ? 'text-blue-400' : 'text-gray-600'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all ${step >= 1 ? 'bg-blue-600 text-white shadow-[0_0_15px_#2563eb]' : 'bg-gray-800'}`}>1</div>
                        <span className="text-sm font-medium">Vehicle & Time</span>
                    </div>
                    <div className={`flex-1 flex flex-col items-center ${step >= 2 ? 'text-blue-400' : 'text-gray-600'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all ${step >= 2 ? 'bg-blue-600 text-white shadow-[0_0_15px_#2563eb]' : 'bg-gray-800'}`}>2</div>
                        <span className="text-sm font-medium">Select Slot</span>
                    </div>
                    <div className={`flex-1 flex flex-col items-center ${step >= 3 ? 'text-blue-400' : 'text-gray-600'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all ${step >= 3 ? 'bg-blue-600 text-white shadow-[0_0_15px_#2563eb]' : 'bg-gray-800'}`}>3</div>
                        <span className="text-sm font-medium">Payment</span>
                    </div>
                </div>

                {step === 1 && (
                    <div className="bg-gray-900/60 p-8 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-md animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-8 text-gray-200">Select Vehicle, Time & Duration</h2>

                        {/* Vehicle Selection */}
                        <div className="mb-8">
                            <label className="block text-gray-400 font-medium mb-4">Select Vehicle</label>
                            {loadingVehicles ? (
                                <div className="text-gray-500 animate-pulse">Loading your vehicles...</div>
                            ) : vehicles.length === 0 ? (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-400">
                                    <p className="mb-2">You don't have any vehicles registered yet.</p>
                                    <Link to="/profile" className="underline hover:text-yellow-300">Add a vehicle in your profile →</Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {vehicles.map((vehicle) => (
                                        <button
                                            key={vehicle._id}
                                            onClick={() => setSelectedVehicle(vehicle)}
                                            className={`p-4 rounded-xl border transition-all text-left ${selectedVehicle?._id === vehicle._id
                                                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <span className="text-2xl mr-3">{getVehicleIcon(vehicle.type)}</span>
                                                <div>
                                                    <div className="font-mono text-white tracking-wider">{vehicle.plateNumber}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {vehicle.type} {vehicle.nickname && `• ${vehicle.nickname}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mb-8">
                            <label className="block text-gray-400 font-medium mb-4">Start Time</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                min={getLocalISOString(new Date())}
                                className="w-full bg-gray-700 text-white p-3 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="mb-10">
                            <label className="block text-gray-400 font-medium mb-4">Duration (Hours)</label>
                            <input
                                type="range"
                                min="1"
                                max="12"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between mt-4 text-gray-500 font-mono">
                                <span>1h</span>
                                <span className="text-blue-400 font-bold text-xl">{duration} Hours</span>
                                <span>12h</span>
                            </div>
                        </div>

                        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 flex justify-between items-center mb-8">
                            <span className="text-gray-400">Estimated Cost</span>
                            <span className="text-4xl font-bold text-white">₹{duration * 50}</span>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => {
                                    if (!selectedVehicle) {
                                        alert("Please select a vehicle first");
                                        return;
                                    }
                                    if (new Date(startTime) < new Date(new Date().getTime() - 60000)) {
                                        alert("Cannot book for a past time. Please select a future time.");
                                        setStartTime(getLocalISOString(new Date()));
                                        return;
                                    }
                                    setStep(2);
                                }}
                                disabled={!selectedVehicle}
                                className={`px-8 py-3 rounded-xl flex-1 font-bold shadow-lg transition ${selectedVehicle
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Next: Check Availability
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-gray-900/60 p-8 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-md animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-200">Choose a Slot</h2>
                            <div className="flex space-x-3">
                                <div className="px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center">
                                    {getVehicleIcon(selectedVehicle?.type || 'CAR')} <span className="ml-2">{selectedVehicle?.plateNumber}</span>
                                </div>
                                <div className="px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest flex items-center">
                                    {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(getEndTime(startTime, duration)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                        {loadingSlots ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="animate-pulse text-blue-400 font-mono">Scanning availability for {selectedVehicle?.type} slots...</span>
                            </div>
                        ) : !hasAvailableSlots ? (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                <p>No {selectedVehicle?.type} slots available for this time</p>
                                <button onClick={() => setStep(1)} className="mt-4 text-blue-400 hover:underline">Change time or vehicle</button>
                            </div>
                        ) : (
                            <SlotMap
                                slots={slots}
                                filterType={selectedVehicle?.type || null}
                                onSlotSelect={handleSlotSelect}
                            />
                        )}
                        <div className="mt-8">
                            <button onClick={() => setStep(1)} className="px-8 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800 transition">Back to Vehicle & Time</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-gray-900/60 p-8 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-md animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-8 text-gray-200">Review Booking</h2>
                        <div className="space-y-6 mb-10">
                            <div className="flex justify-between border-b border-gray-800 pb-4">
                                <span className="text-gray-400">Vehicle</span>
                                <span className="font-bold text-white flex items-center">
                                    {getVehicleIcon(selectedVehicle?.type || 'CAR')}
                                    <span className="ml-2 font-mono">{selectedVehicle?.plateNumber}</span>
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-4">
                                <span className="text-gray-400">Parking Slot</span>
                                <span className="font-bold text-xl text-white">{selectedSlot?.slotNumber}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-4">
                                <span className="text-gray-400">Total Duration</span>
                                <span className="font-bold text-xl text-white">{duration} Hours</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-4">
                                <span className="text-gray-400">Start Time</span>
                                <span className="font-bold text-white text-right">{new Date(startTime).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-2 items-center">
                                <span className="text-gray-300 font-bold text-lg">Total Payable</span>
                                <span className="text-green-400 font-bold text-4xl">₹{duration * 50}</span>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button onClick={() => setStep(2)} className="px-8 py-4 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800 transition">Back</button>
                            <button onClick={handleProceedToPayment} className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-[0_0_20px_#16a34a] flex-1 shadow-lg transform transition active:scale-95">Proceed to Payment</button>
                        </div>
                    </div>
                )}
            </div>

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

export default BookingPage;
