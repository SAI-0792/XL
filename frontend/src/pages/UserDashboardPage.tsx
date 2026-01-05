import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SlotMap from '../components/SlotMap';
import Sidebar from '../components/Sidebar';
import { fetchSlots, fetchDashboardStats, extendBooking } from '../services/api';
import PaymentModal from '../components/PaymentModal';

const UserDashboardPage = () => {
    const [stats, setStats] = useState<any>({
        totalRevenue: 0,
        totalBookings: 0,
        occupancy: { occupied: 0, total: 0 }
    });
    const [activeBooking, setActiveBooking] = useState<any>(null);
    const [slots, setSlots] = useState<any[]>([]);
    const [isExtending, setIsExtending] = useState(false);
    const [extendDuration, setExtendDuration] = useState(1);
    const [showPayment, setShowPayment] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            // Fetch Slots
            try {
                const slotsData = await fetchSlots();
                setSlots(slotsData);
            } catch (err) {
                console.error("Failed to load slots", err);
            }

            // Fetch Stats
            try {
                const dashboardData = await fetchDashboardStats();
                setStats(dashboardData.stats);
                setActiveBooking(dashboardData.activeBooking);
            } catch (err: any) {
                console.error("Failed to load dashboard data", err);
                // Optional: alert specific error to user for debugging
                // alert(`Dashboard stats error: ${err.message}`); 
            }
        };
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleExtendConfirm = async () => {
        setIsExtending(false);
        setShowPayment(true);
    };

    const handlePaymentSuccess = async () => {
        try {
            await extendBooking(activeBooking.id, extendDuration);
            setShowPayment(false);
            // Reload data
            const dashboardData = await fetchDashboardStats();
            setStats(dashboardData.stats);
            setActiveBooking(dashboardData.activeBooking);
            alert('Booking extended successfully!');
        } catch (err: any) {
            console.error("Extension failed", err);
            alert(`Extension failed: ${err.message}`);
        }
    };

    return (
        <div className="flex min-h-screen bg-black font-sans text-gray-200">
            {/* Background Texture */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none"></div>

            <Sidebar />

            <div className="flex-1 flex flex-col relative z-10">
                {/* Top Mobile Header */}
                <header className="bg-black/50 border-b border-gray-800 p-4 md:hidden flex justify-between items-center backdrop-blur-md">
                    <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">SmartPark</span>
                    <button className="text-gray-400">Menu</button>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-1">Dashboard</h2>
                            <p className="text-gray-400">Welcome back, John</p>
                        </div>
                        <Link to="/book" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition transform hover:-translate-y-0.5 font-medium flex items-center border border-white/10">
                            <span className="mr-2 text-xl">+</span> Book Slot
                        </Link>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm group hover:border-blue-500/30 transition">
                            <div className="text-gray-500 text-sm mb-2 group-hover:text-blue-400 transition">Total Spent</div>
                            <div className="text-3xl font-bold text-white">₹{stats.totalRevenue}</div>
                            <div className="text-xs text-green-400 mt-2">↑ Life-time</div>
                        </div>
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm group hover:border-purple-500/30 transition">
                            <div className="text-gray-500 text-sm mb-2 group-hover:text-purple-400 transition">Total Bookings</div>
                            <div className="text-3xl font-bold text-white">{stats.totalBookings}</div>
                            <div className="text-xs text-blue-400 mt-2">All time</div>
                        </div>
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm group hover:border-green-500/30 transition">
                            <div className="text-gray-500 text-sm mb-2 group-hover:text-green-400 transition">Current Occupancy</div>
                            <div className="text-3xl font-bold text-green-400 flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-3 animate-pulse ${stats.occupancy.occupied === stats.occupancy.total ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                {stats.occupancy.occupied}/{stats.occupancy.total}
                            </div>
                        </div>
                    </div>

                    {/* Active Booking Card */}
                    {activeBooking && (
                        <section className="relative rounded-3xl p-8 mb-10 overflow-hidden group border border-blue-500/20">
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-xl"></div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>

                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center">
                                <div className="mb-6 md:mb-0">
                                    <div className="inline-flex items-center px-4 py-1.5 bg-blue-500/20 rounded-full text-blue-300 text-sm font-medium mb-4 border border-blue-500/30">
                                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        {activeBooking.status.replace('_', ' ')}
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Slot <span className="text-blue-400">{activeBooking.slotNumber}</span></h3>
                                    <p className="text-gray-300 max-w-lg mb-4">Plate: <span className="font-mono text-white">{activeBooking.carNumber}</span></p>

                                    <button
                                        onClick={() => setIsExtending(true)}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/40 transition transform active:scale-95"
                                    >
                                        Extend Time
                                    </button>
                                </div>

                                <div className="text-center md:text-right bg-black/30 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
                                    <div className="text-sm uppercase tracking-wider text-gray-400 mb-1">Time Elapsed</div>
                                    <div className="text-4xl font-mono font-bold text-red-400">
                                        {/* Simple duration calc demo */}
                                        {Math.floor((Date.now() - new Date(activeBooking.startTime).getTime()) / 60000)} min
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {!activeBooking && (
                        <section className="bg-gray-900/40 rounded-3xl border border-gray-800 p-8 mb-10 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                            <div className="text-gray-500 mb-4 text-lg">No active session found</div>
                            <Link to="/book" className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition">Start Parking</Link>
                        </section>
                    )}

                    {/* Map Section */}
                    <section className="bg-gray-900/40 rounded-3xl border border-gray-800 p-8 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-white">Live Parking View</h3>
                            <div className="flex space-x-4 text-sm">
                                <span className="flex items-center text-gray-400"><span className="w-3 h-3 bg-green-500 rounded-full mr-2 shadow-[0_0_10px_#22c55e]"></span>Available</span>
                                <span className="flex items-center text-gray-400"><span className="w-3 h-3 bg-red-500 rounded-full mr-2 opacity-60"></span>Occupied</span>
                            </div>
                        </div>
                        <SlotMap slots={slots} />
                    </section>
                </main>
            </div>

            {/* Extension Modal */}
            {isExtending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
                        <h2 className="text-2xl font-bold text-white mb-6">Extend Your Session</h2>

                        <div className="mb-8">
                            <label className="block text-gray-400 font-medium mb-4">Additional Hours</label>
                            <input
                                type="range"
                                min="1"
                                max="6"
                                value={extendDuration}
                                onChange={(e) => setExtendDuration(parseInt(e.target.value))}
                                className="w-full h-3 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between mt-4 text-gray-500 font-mono">
                                <span>1h</span>
                                <span className="text-blue-400 font-bold text-xl">{extendDuration} Hours</span>
                                <span>6h</span>
                            </div>
                        </div>

                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center mb-8">
                            <span className="text-gray-400">Extra Cost</span>
                            <span className="text-3xl font-bold text-white">₹{extendDuration * 50}</span>
                        </div>

                        <div className="flex space-x-4">
                            <button onClick={() => setIsExtending(false)} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-800 transition">Cancel</button>
                            <button onClick={handleExtendConfirm} className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold shadow-lg">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal for Extension */}
            {showPayment && (
                <PaymentModal
                    amount={extendDuration * 50}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setShowPayment(false)}
                />
            )}
        </div>
    );
};

export default UserDashboardPage;
