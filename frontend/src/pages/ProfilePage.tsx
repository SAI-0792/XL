import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { fetchUserProfile, updateUserProfile, addVehicle, removeVehicle } from '../services/api';

interface Vehicle {
    _id: string;
    plateNumber: string;
    type: 'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED';
    nickname?: string;
}

const ProfilePage = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState<any>(() => {
        const savedInfo = localStorage.getItem('userInfo');
        return savedInfo ? JSON.parse(savedInfo) : { name: '', email: '', vehicles: [] };
    });
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ plateNumber: '', type: 'CAR', nickname: '' });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchUserProfile();
                setUser((prev: any) => ({ ...prev, ...data }));
                setVehicles(data.vehicles || []);
            } catch (err: any) {
                console.error("Failed to load profile", err);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        try {
            const response = await updateUserProfile(user);
            const currentInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            localStorage.setItem('userInfo', JSON.stringify({
                ...currentInfo,
                name: user.name,
                email: user.email,
                vehicles: response.vehicles
            }));
            setIsEditing(false);
        } catch (err: any) {
            console.error("Failed to update profile", err);
            alert(err.response?.data?.message || 'Failed to update profile');
        }
    };

    const handleAddVehicle = async () => {
        if (!newVehicle.plateNumber || !newVehicle.type) {
            alert('Please enter plate number and select vehicle type');
            return;
        }
        try {
            const response = await addVehicle(newVehicle);
            setVehicles(response.vehicles);
            // Update localStorage
            const currentInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            localStorage.setItem('userInfo', JSON.stringify({ ...currentInfo, vehicles: response.vehicles }));
            setNewVehicle({ plateNumber: '', type: 'CAR', nickname: '' });
            setShowAddVehicle(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to add vehicle');
        }
    };

    const handleRemoveVehicle = async (vehicleId: string) => {
        if (!confirm('Are you sure you want to remove this vehicle?')) return;
        try {
            const response = await removeVehicle(vehicleId);
            setVehicles(response.vehicles);
            // Update localStorage
            const currentInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            localStorage.setItem('userInfo', JSON.stringify({ ...currentInfo, vehicles: response.vehicles }));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to remove vehicle');
        }
    };

    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'HANDICAPPED': return '♿';
            case 'BIKE': return '🏍️';
            case 'TRUCK': return '🚛';
            default: return '🚗';
        }
    };

    return (
        <div className="flex min-h-screen bg-black font-sans text-gray-200">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto relative z-10">
                <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black pointer-events-none -z-10"></div>

                <div className="flex flex-col mb-10">
                    <Link to="/dashboard" className="text-gray-400 hover:text-white mb-4 flex items-center transition w-fit">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Dashboard
                    </Link>
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white">My Profile</h1>
                        <button
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition flex items-center ${isEditing ? 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20' : 'bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600/20'}`}
                        >
                            {isEditing ? (
                                <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Save Changes</>
                            ) : (
                                <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>Edit Profile</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Profile Info Card */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 max-w-3xl backdrop-blur-sm mb-8">
                    <div className="flex flex-col md:flex-row items-center mb-10 pb-10 border-b border-gray-800">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] mb-6 md:mb-0 md:mr-8 border-4 border-black">
                            {user.name ? user.name.charAt(0) : 'U'}
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-bold text-white mb-1">{user.name || 'User'}</h2>
                            <p className="text-gray-400 flex items-center justify-center md:justify-start">
                                <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                Premium Member
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm text-gray-500 uppercase tracking-wide font-bold mb-2 ml-1">Full Name</label>
                            <input
                                type="text"
                                value={user.name || ''}
                                onChange={(e) => setUser({ ...user, name: e.target.value })}
                                disabled={!isEditing}
                                className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition disabled:opacity-70 ${isEditing ? 'border-gray-600' : 'border-transparent bg-transparent pl-0'}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 uppercase tracking-wide font-bold mb-2 ml-1">Email Address</label>
                            <input
                                type="email"
                                value={user.email || ''}
                                onChange={(e) => setUser({ ...user, email: e.target.value })}
                                disabled={!isEditing}
                                className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition disabled:opacity-70 ${isEditing ? 'border-gray-600' : 'border-transparent bg-transparent pl-0'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* My Vehicles Section */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 max-w-3xl backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            My Vehicles
                        </h3>
                        <button
                            onClick={() => setShowAddVehicle(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition flex items-center text-sm font-medium"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            Add Vehicle
                        </button>
                    </div>

                    {/* Add Vehicle Modal */}
                    {showAddVehicle && (
                        <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                            <h4 className="text-white font-medium mb-4">Add New Vehicle</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <input
                                    type="text"
                                    placeholder="Plate Number (e.g., KA05MC1234)"
                                    value={newVehicle.plateNumber}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value.toUpperCase() })}
                                    className="bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono uppercase"
                                />
                                <select
                                    value={newVehicle.type}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
                                    className="bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="CAR">🚗 Car</option>
                                    <option value="BIKE">🏍️ Bike</option>
                                    <option value="TRUCK">🚛 Truck</option>
                                    <option value="HANDICAPPED">♿ Physically Handicapped</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Nickname (optional)"
                                    value={newVehicle.nickname}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, nickname: e.target.value })}
                                    className="bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddVehicle}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition text-sm"
                                >
                                    Save Vehicle
                                </button>
                                <button
                                    onClick={() => { setShowAddVehicle(false); setNewVehicle({ plateNumber: '', type: 'CAR', nickname: '' }); }}
                                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Vehicle List */}
                    {vehicles.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            <p>No vehicles added yet</p>
                            <p className="text-sm mt-1">Click "Add Vehicle" to register your vehicles</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {vehicles.map((vehicle) => (
                                <div key={vehicle._id} className="flex items-center justify-between p-4 bg-gray-800/30 border border-gray-700 rounded-xl hover:border-gray-600 transition">
                                    <div className="flex items-center">
                                        <span className="text-3xl mr-4">{getVehicleIcon(vehicle.type)}</span>
                                        <div>
                                            <div className="font-mono text-lg text-white tracking-wider">{vehicle.plateNumber}</div>
                                            <div className="text-sm text-gray-400">
                                                {vehicle.type} {vehicle.nickname && `• ${vehicle.nickname}`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveVehicle(vehicle._id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition"
                                        title="Remove vehicle"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
