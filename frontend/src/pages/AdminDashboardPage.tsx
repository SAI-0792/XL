import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SlotMap from '../components/SlotMap';
import api from '../services/api';

interface Booking {
    _id: string;
    userId: { name: string; email: string } | null;
    carNumber: string;
    slotId: { slotNumber: string; type: string } | null;
    startTime: string;
    endTime: string;
    actualStartTime?: string;
    actualEndTime?: string;
    status: string;
    source: string;
    totalCost: number;
}

interface ChatMessage {
    _id: string;
    senderType: 'USER' | 'ADMIN';
    userName: string;
    userEmail?: string;
    message: string;
    isRead: boolean;
    priority?: 'NORMAL' | 'HIGH';
    createdAt: string;
}

const AdminDashboardPage = () => {
    const navigate = useNavigate();
    const [slots, setSlots] = useState<any[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        occupied: 0,
        reserved: 0,
        cancelled: 0
    });
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchVehicle, setSearchVehicle] = useState<string>('');
    const [dateRange, setDateRange] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [showChatPanel, setShowChatPanel] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // Check admin auth
    useEffect(() => {
        const adminInfo = localStorage.getItem('adminInfo');
        if (!adminInfo) {
            navigate('/admin');
            return;
        }
        const admin = JSON.parse(adminInfo);
        if (admin.role !== 'ADMIN') {
            navigate('/admin');
        }
    }, [navigate]);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch slots
                const slotsRes = await api.get('/slots');
                const slotsData = slotsRes.data.slots || [];
                setSlots(slotsData);

                // Calculate stats
                const available = slotsData.filter((s: any) => s.status === 'AVAILABLE').length;
                const occupied = slotsData.filter((s: any) => s.status === 'OCCUPIED').length;
                const reserved = slotsData.filter((s: any) => s.status === 'RESERVED').length;

                // Fetch all bookings (admin endpoint)
                const bookingsRes = await api.get('/admin/bookings');
                const bookingsData = bookingsRes.data || [];
                setBookings(bookingsData);

                const cancelled = bookingsData.filter((b: Booking) => b.status === 'CANCELLED').length;

                setStats({
                    total: slotsData.length,
                    available,
                    occupied,
                    reserved,
                    cancelled
                });

                // Fetch chat messages
                try {
                    const chatRes = await api.get('/chat');
                    setChatMessages(chatRes.data);
                    setUnreadCount(chatRes.data.filter((m: ChatMessage) => !m.isRead && m.senderType === 'USER').length);
                } catch (chatErr) {
                    console.error('Failed to fetch chat messages', chatErr);
                }
            } catch (err) {
                console.error('Failed to fetch admin data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('adminInfo');
        navigate('/admin');
    };

    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'BIKE': return '🏍️';
            case 'TRUCK': return '🚛';
            case 'HANDICAPPED': return '♿';
            default: return '🚗';
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'ACTIVE': 'bg-green-500/20 text-green-400 border-green-500/30',
            'PENDING_ARRIVAL': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            'COMPLETED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'CANCELLED': 'bg-red-500/20 text-red-400 border-red-500/30',
            'RESERVED': 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        };
        return styles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    // Get date range filter
    const getDateRangeStart = () => {
        const now = new Date();
        switch (dateRange) {
            case 'TODAY':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case 'WEEK':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return weekStart;
            case 'MONTH':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            default:
                return null;
        }
    };

    // Filter bookings
    const filteredBookings = bookings.filter(b => {
        const typeMatch = filterType === 'ALL' || (b.slotId?.type === filterType);
        const statusMatch = filterStatus === 'ALL' || b.status === filterStatus;
        const vehicleMatch = !searchVehicle || b.carNumber.toLowerCase().includes(searchVehicle.toLowerCase());

        // Date range filter
        const rangeStart = getDateRangeStart();
        const dateMatch = !rangeStart || new Date(b.startTime) >= rangeStart;

        return typeMatch && statusMatch && vehicleMatch && dateMatch;
    });

    // Calculate total revenue from filtered bookings
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);

    // Download bookings as CSV
    const downloadCSV = () => {
        const headers = ['User', 'Vehicle Number', 'Slot', 'In Time', 'Out Time', 'Amount', 'Status', 'Source'];

        // Simple date format: DD/MM/YYYY HH:MM
        const formatDate = (dateStr: string) => {
            const d = new Date(dateStr);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${mins}`;
        };

        const rows = filteredBookings.map(b => [
            b.source === 'KIOSK' && !b.userId ? 'KIOSK' : (b.userId?.name || 'Unknown'),
            b.carNumber,
            b.slotId?.slotNumber || '-',
            formatDate(b.actualStartTime || b.startTime),
            b.actualEndTime ? formatDate(b.actualEndTime) : formatDate(b.endTime),
            `₹${b.totalCost}`,
            b.status.replace('_', ' '),
            b.source
        ]);

        // Use tab separator for better Excel compatibility
        const tsvContent = [headers, ...rows].map(row => row.join('\t')).join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white animate-pulse">Loading Admin Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Header */}
            <header className="bg-gray-900/80 border-b border-gray-800 px-8 py-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">SmartPark Admin</h1>
                        <p className="text-xs text-gray-400">Management Console</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition text-sm"
                >
                    Logout
                </button>
            </header>

            <main className="p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-white">{stats.total}</div>
                        <div className="text-sm text-gray-400 mt-1">Total Slots</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-green-400">{stats.available}</div>
                        <div className="text-sm text-green-400/70 mt-1">Available</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-red-400">{stats.occupied}</div>
                        <div className="text-sm text-red-400/70 mt-1">Occupied</div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-yellow-400">{stats.reserved}</div>
                        <div className="text-sm text-yellow-400/70 mt-1">Reserved</div>
                    </div>
                    <div className="bg-gray-500/10 border border-gray-500/30 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-gray-400">{stats.cancelled}</div>
                        <div className="text-sm text-gray-400/70 mt-1">Cancelled</div>
                    </div>
                </div>

                {/* Live Map */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Live Parking Map
                    </h2>
                    <SlotMap slots={slots} />
                </div>

                {/* Bookings Table */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold">All Bookings ({filteredBookings.length})</h2>
                        <div className="flex flex-wrap gap-3">
                            {/* Vehicle Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by vehicle..."
                                    value={searchVehicle}
                                    onChange={(e) => setSearchVehicle(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white w-48 focus:border-blue-500 focus:outline-none"
                                />
                                <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
                            >
                                <option value="ALL">All Types</option>
                                <option value="CAR">🚗 Car</option>
                                <option value="BIKE">🏍️ Bike</option>
                                <option value="TRUCK">🚛 Truck</option>
                                <option value="HANDICAPPED">♿ Handicapped</option>
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PENDING_ARRIVAL">Pending Arrival</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-400 font-medium"
                            >
                                <option value="ALL">All Time</option>
                                <option value="TODAY">Today</option>
                                <option value="WEEK">This Week</option>
                                <option value="MONTH">This Month</option>
                            </select>
                            {/* Download Button */}
                            <button
                                onClick={downloadCSV}
                                className="bg-green-600/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600/30 transition flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download CSV
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                                    <th className="pb-4 font-medium">User</th>
                                    <th className="pb-4 font-medium">Vehicle</th>
                                    <th className="pb-4 font-medium">Slot</th>
                                    <th className="pb-4 font-medium">In Time</th>
                                    <th className="pb-4 font-medium">Out Time</th>
                                    <th className="pb-4 font-medium">Amount</th>
                                    <th className="pb-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            No bookings found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBookings.map((booking) => (
                                        <tr key={booking._id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                                            <td className="py-4">
                                                <div className="flex items-center">
                                                    {booking.source === 'KIOSK' && !booking.userId ? (
                                                        <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-bold">
                                                            KIOSK
                                                        </span>
                                                    ) : (
                                                        <span className="text-white">
                                                            {booking.userId?.name || 'Unknown'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center">
                                                    <span className="mr-2">{getVehicleIcon(booking.slotId?.type || 'CAR')}</span>
                                                    <span className="font-mono text-white">{booking.carNumber}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-white font-bold">{booking.slotId?.slotNumber || '-'}</td>
                                            <td className="py-4 text-gray-300 text-sm">
                                                {new Date(booking.actualStartTime || booking.startTime).toLocaleString()}
                                            </td>
                                            <td className="py-4 text-gray-300 text-sm">
                                                {booking.actualEndTime
                                                    ? new Date(booking.actualEndTime).toLocaleString()
                                                    : new Date(booking.endTime).toLocaleString()}
                                            </td>
                                            <td className="py-4 text-green-400 font-bold">₹{booking.totalCost}</td>
                                            <td className="py-4">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(booking.status)}`}>
                                                    {booking.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Revenue Summary */}
                    <div className="mt-6 flex justify-between items-center border-t border-gray-800 pt-6">
                        <div className="text-gray-400">
                            Showing <span className="text-white font-bold">{filteredBookings.length}</span> bookings
                            {dateRange !== 'ALL' && <span className="text-blue-400 ml-2">({dateRange === 'TODAY' ? 'Today' : dateRange === 'WEEK' ? 'This Week' : 'This Month'})</span>}
                        </div>
                        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl px-6 py-4">
                            <span className="text-gray-400 text-sm">Total Revenue</span>
                            <div className="text-3xl font-bold text-green-400">₹{totalRevenue.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Live Chat Panel Toggle Button */}
            <button
                onClick={() => setShowChatPanel(!showChatPanel)}
                className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-blue-600/30 transition flex items-center gap-2"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Live Chat Panel */}
            {showChatPanel && (
                <div className="fixed right-6 bottom-24 w-96 h-[500px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                    <div className="bg-blue-600 px-4 py-3 flex justify-between items-center">
                        <span className="font-bold text-white flex items-center gap-2">
                            💬 Live Chat
                            {unreadCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2">{unreadCount} new</span>}
                        </span>
                        <button onClick={() => setShowChatPanel(false)} className="text-white/70 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatMessages.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p>No messages yet</p>
                            </div>
                        ) : (
                            chatMessages.map(msg => (
                                <div
                                    key={msg._id}
                                    className={`p-3 rounded-xl relative ${msg.senderType === 'USER'
                                        ? 'bg-gray-800 border-l-4 border-l-transparent'
                                        : 'bg-blue-600/20 border border-blue-500/30'} ${msg.priority === 'HIGH' ? 'border-l-red-500 bg-red-500/5' : 'border-gray-700'}`}
                                >
                                    {msg.priority === 'HIGH' && (
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-lg">
                                            PRIORITY
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-white">
                                            {msg.userName}
                                            {msg.senderType === 'USER' && !msg.isRead && (
                                                <span className="ml-2 bg-red-500 text-white text-xs px-1.5 rounded">NEW</span>
                                            )}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {msg.userEmail && <p className="text-xs text-gray-500 mb-1">{msg.userEmail}</p>}
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.message}</p>

                                    {msg.senderType === 'USER' && (
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await api.patch(`/chat/${msg._id}/priority`);
                                                        setChatMessages(prev => prev.map(m => m._id === msg._id ? res.data : m));
                                                    } catch (err) {
                                                        alert('Failed to update priority');
                                                    }
                                                }}
                                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition ${msg.priority === 'HIGH'
                                                        ? 'bg-white/10 text-gray-400 hover:bg-white/20'
                                                        : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                                    }`}
                                            >
                                                {msg.priority === 'HIGH' ? 'Unprioritize' : 'Prioritize'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setReplyingTo(msg._id);
                                                    setReplyText('');
                                                }}
                                                className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                                            >
                                                Reply
                                            </button>
                                            {!msg.isRead && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await api.patch(`/chat/${msg._id}/read`);
                                                            setChatMessages(prev => prev.map(m => m._id === msg._id ? res.data : m));
                                                            setUnreadCount(prev => Math.max(0, prev - 1));
                                                        } catch (err) {
                                                            alert('Failed to mark as read');
                                                        }
                                                    }}
                                                    className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {replyingTo === msg._id && (
                                        <div className="mt-3 bg-black/40 p-3 rounded-lg border border-blue-500/30">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write your reply..."
                                                className="w-full bg-transparent border-none text-sm text-white placeholder-gray-600 focus:outline-none resize-none h-16"
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button
                                                    onClick={() => setReplyingTo(null)}
                                                    className="text-[10px] font-bold text-gray-500 hover:text-white"
                                                >
                                                    CANCEL
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!replyText.trim()) return;
                                                        setSendingReply(true);
                                                        try {
                                                            await api.post(`/chat/${msg._id}/reply`, { message: replyText });
                                                            setReplyingTo(null);
                                                            setReplyText('');
                                                            // Refresh messages
                                                            const res = await api.get('/chat');
                                                            setChatMessages(res.data);
                                                        } catch (err) {
                                                            alert('Failed to send reply');
                                                        } finally {
                                                            setSendingReply(false);
                                                        }
                                                    }}
                                                    disabled={sendingReply}
                                                    className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-blue-500 disabled:opacity-50"
                                                >
                                                    {sendingReply ? 'SENDING...' : 'SEND REPLY'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-3 border-t border-gray-800">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await api.get('/chat');
                                    setChatMessages(res.data);
                                    setUnreadCount(res.data.filter((m: ChatMessage) => !m.isRead && m.senderType === 'USER').length);
                                } catch (err) {
                                    console.error('Failed to refresh messages');
                                }
                            }}
                            className="w-full py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition text-sm"
                        >
                            🔄 Refresh Messages
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;
