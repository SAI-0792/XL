import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SlotMap from '../components/SlotMap';
import Sidebar from '../components/Sidebar';
import { fetchSlots, fetchDashboardStats, extendBooking } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import api from '../services/api';

const UserDashboardPage = () => {
    const [stats, setStats] = useState<any>({
        totalRevenue: 0,
        totalBookings: 0,
        occupancy: { occupied: 0, total: 0 }
    });
    const [activeBooking, setActiveBooking] = useState<any>(null);
    const [slots, setSlots] = useState<any[]>([]);
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const userVehicleType = userInfo.vehicleType || 'CAR';
    const userName = userInfo.name || 'User';
    const [isExtending, setIsExtending] = useState(false);
    const [extendDuration, setExtendDuration] = useState(1);
    const [showPayment, setShowPayment] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [chatSent, setChatSent] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [timeLeftMinutes, setTimeLeftMinutes] = useState<number | null>(null);

    const EMERGENCY_NUMBER = '9381276836';

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                // In a real app, you'd filter by userId here. 
                // For now, fetching all to see admin replies to this user.
                const res = await api.get('/chat');
                setChatMessages(res.data.reverse()); // Show newest at bottom
            } catch (err) {
                console.error('Failed to fetch messages');
            }
        };

        if (showChat) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [showChat]);

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

    useEffect(() => {
        // Interval to check time left every minute
        const checkTimeLeft = () => {
            if (activeBooking && activeBooking.endTime) {
                const now = new Date();
                const end = new Date(activeBooking.endTime);
                const diffMs = end.getTime() - now.getTime();
                const diffMins = Math.floor(diffMs / 60000);

                setTimeLeftMinutes(diffMins);
            } else {
                setTimeLeftMinutes(null);
            }
        };

        checkTimeLeft();
        const interval = setInterval(checkTimeLeft, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [activeBooking]);

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

    const handleSendChat = async () => {
        if (!chatMessage.trim()) return;
        setChatSending(true);
        try {
            await api.post('/chat', {
                message: chatMessage,
                userName: userName,
                userEmail: userInfo.email
            });
            // Immediately refresh messages
            const res = await api.get('/chat');
            setChatMessages(res.data.reverse());
            setChatMessage('');
        } catch (err) {
            console.error('Failed to send message', err);
            alert('Failed to send message');
        } finally {
            setChatSending(false);
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
                            <p className="text-gray-400">Welcome back, {userName}</p>
                        </div>
                        <Link to="/book" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition transform hover:-translate-y-0.5 font-medium flex items-center border border-white/10">
                            <span className="mr-2 text-xl">+</span> Book Slot
                        </Link>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[
                            { label: 'Total Spent', value: `₹${stats.totalRevenue}`, sub: 'Life-time', color: 'blue', border: 'hover:border-blue-500/30' },
                            { label: 'Total Bookings', value: stats.totalBookings, sub: 'All time', color: 'purple', border: 'hover:border-purple-500/30' },
                            { label: 'Current Occupancy', value: `${stats.occupancy.occupied}/${stats.occupancy.total}`, sub: 'Real-time', color: 'green', border: 'hover:border-green-500/30', isOccupancy: true }
                        ].map((item, idx) => (
                            <div key={idx} className={`bg-gray-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md group ${item.border} transition-all duration-500 animate-slide-up`} style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="text-gray-500 text-xs uppercase tracking-widest mb-2 group-hover:text-blue-400 transition">{item.label}</div>
                                <div className="text-4xl font-bold text-white flex items-center">
                                    {item.isOccupancy && (
                                        <span className={`w-3 h-3 rounded-full mr-4 animate-pulse ${stats.occupancy.occupied === stats.occupancy.total ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-green-500 shadow-[0_0_15px_#22c55e]'}`}></span>
                                    )}
                                    {item.value}
                                </div>
                                <div className={`text-[10px] font-mono mt-3 opacity-40 uppercase tracking-tighter`}>{item.sub} tracking enabled</div>
                            </div>
                        ))}
                    </div>

                    {/* Exit Time Warning Banner */}
                    {activeBooking && timeLeftMinutes !== null && timeLeftMinutes <= 10 && timeLeftMinutes >= 0 && (
                        <div className="bg-red-500/20 border-l-4 border-red-500 rounded-r-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between text-white shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
                            <div className="flex items-center mb-4 md:mb-0">
                                <span className="text-3xl mr-4">⚠️</span>
                                <div>
                                    <h3 className="text-xl font-bold text-red-400">Warning: Session Expiring Soon</h3>
                                    <p className="text-red-200/80">Your parking session will expire in <strong className="text-white text-lg">{timeLeftMinutes} minutes</strong>. Please extend your session or exit to avoid penalties.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsExtending(true)}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition transform hover:-translate-y-0.5 whitespace-nowrap"
                            >
                                Extend Now
                            </button>
                        </div>
                    )}

                    {/* Active Booking Card */}
                    {activeBooking && (
                        <section className="relative rounded-[2rem] p-10 mb-12 overflow-hidden group border border-white/5 animate-slide-up">
                            {/* Animated Background Layers */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10"></div>
                            <div className="absolute inset-0 backdrop-blur-2xl"></div>
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay"></div>

                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-shimmer pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
                                <div className="mb-8 md:mb-0 space-y-4">
                                    <div className="inline-flex items-center px-4 py-1.5 bg-blue-500/10 rounded-full text-blue-400 text-xs font-bold tracking-widest uppercase border border-blue-500/20">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-ping"></div>
                                        Session: {activeBooking.status.replace('_', ' ')}
                                    </div>

                                    <div>
                                        <h3 className="text-5xl font-black text-white mb-2 leading-none tracking-tighter">
                                            SLOT <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8">{activeBooking.slotNumber}</span>
                                        </h3>
                                        <div className="flex items-center space-x-3 text-gray-400 pt-2 font-mono text-sm">
                                            <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-500">PLATE</span>
                                            <span className="text-white tracking-[0.2em]">{activeBooking.carNumber}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={() => setIsExtending(true)}
                                            className="px-8 py-3 bg-white text-black hover:bg-blue-500 hover:text-white rounded-xl text-sm font-black transition-all transform active:scale-95 shadow-xl hover:shadow-blue-500/40 uppercase tracking-widest"
                                        >
                                            Extend Session
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto text-center md:text-right">
                                    <div className="bg-black/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl relative overflow-hidden group/clock">
                                        <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-gray-700">MT-SYS: 4.8.1</div>
                                        <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-2">Duration Timer</div>
                                        <div className="text-6xl font-mono font-black text-white group-hover/clock:text-red-400 transition-colors">
                                            {Math.floor((Date.now() - new Date(activeBooking.startTime).getTime()) / 60000)}<span className="text-2xl ml-1 text-gray-600 tracking-normal">m</span>
                                        </div>

                                        {/* Simple Progress Indicator */}
                                        <div className="mt-4 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 animate-pulse" style={{ width: '45%' }}></div>
                                        </div>
                                        <div className="mt-2 text-[10px] font-mono text-blue-500/60 flex justify-between uppercase">
                                            <span>Start</span>
                                            <span>Est. End</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* HUD Corner Accents */}
                            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/10"></div>
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/10"></div>
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
                            <h3 className="text-xl font-bold text-white">Live View: Parking Map</h3>
                            <div className="flex space-x-4 text-sm">
                                <span className="flex items-center text-gray-400"><span className="w-3 h-3 bg-green-500 rounded-full mr-2 shadow-[0_0_100px_#22c55e]"></span>Available</span>
                                <span className="flex items-center text-gray-400"><span className="w-3 h-3 bg-gray-700 rounded-full mr-2 opacity-60"></span>Occupied</span>
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

            {/* Emergency Contact & Quick Actions - Floating */}
            <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
                {/* Emergency Quick Dial */}
                <a
                    href={`tel:${EMERGENCY_NUMBER}`}
                    className="flex items-center gap-3 bg-red-600/90 hover:bg-red-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-red-600/30 transition group"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-bold">Emergency: {EMERGENCY_NUMBER}</span>
                </a>

                {/* Live Chat Button */}
                <button
                    onClick={() => setShowChat(!showChat)}
                    className="flex items-center gap-3 bg-blue-600/90 hover:bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-blue-600/30 transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="font-bold">Live Chat</span>
                </button>
            </div>

            {/* Chat Widget */}
            {showChat && (
                <div className="fixed bottom-24 right-6 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="bg-blue-600 px-4 py-3 flex justify-between items-center shrink-0">
                        <span className="font-bold text-white">💬 Live Support</span>
                        <button onClick={() => setShowChat(false)} className="text-white/70 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="h-64 overflow-y-auto p-4 space-y-3 bg-black/20 flex flex-col-reverse">
                        <div className="flex flex-col gap-3">
                            {chatMessages.length === 0 ? (
                                <p className="text-center text-gray-500 text-xs py-4">No messages yet. How can we help?</p>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div
                                        key={msg._id || idx}
                                        className={`max-w-[85%] p-2 rounded-xl text-sm ${msg.senderType === 'USER'
                                            ? 'bg-blue-600 text-white self-end rounded-tr-none'
                                            : 'bg-gray-800 text-gray-200 self-start rounded-tl-none border border-gray-700'
                                            }`}
                                    >
                                        {msg.senderType === 'ADMIN' && (
                                            <div className="text-[10px] text-blue-400 font-bold mb-1 uppercase tracking-tighter">Support Reply</div>
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                        <div className={`text-[8px] mt-1 ${msg.senderType === 'USER' ? 'text-white/50' : 'text-gray-500'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="p-3 border-t border-gray-800 shrink-0">
                        <div className="flex gap-2">
                            <textarea
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Type your query..."
                                className="flex-1 bg-black/50 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:border-blue-500 focus:outline-none h-10"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendChat();
                                    }
                                }}
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={chatSending || !chatMessage.trim()}
                                className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-500 transition disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboardPage;
