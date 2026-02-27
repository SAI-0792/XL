import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RegisterPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        vehicleType: 'CAR' as 'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED',
        carNumber: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                vehicleType: formData.vehicleType,
                plateNumber: formData.carNumber // Map carNumber to plateNumber expected by backend
            });

            const data = response.data;

            if (response.status === 201 || response.status === 200) {
                localStorage.setItem('userInfo', JSON.stringify(data));
                navigate('/dashboard');
            } else {
                alert(data.message || 'Registration failed');
            }
        } catch (error: any) {
            console.error('Registration error', error);
            const message = error.response?.data?.message || error.message || 'Registration failed';
            alert(`Error: ${message}`);
        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black"></div>

            <div className="bg-gray-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">SmartPark</h1>
                    <h2 className="text-xl font-medium text-gray-300">Create Account</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1">Full Name</label>
                        <input
                            type="text"
                            className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1">Vehicle Type</label>
                        <select
                            className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                            value={formData.vehicleType}
                            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as 'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED' })}
                            required
                        >
                            <option value="CAR">Car</option>
                            <option value="BIKE">Bike</option>
                            <option value="TRUCK">Truck</option>
                            <option value="HANDICAPPED">Physically Handicapped</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1">Car Plate Number</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-black/50 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 uppercase font-mono tracking-wider"
                                placeholder="KA01AB1234"
                                value={formData.carNumber}
                                onChange={(e) => setFormData({ ...formData, carNumber: e.target.value.toUpperCase() })}
                                required
                            />
                            <div className="absolute right-3 top-3 text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">IND</div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-900/20 transform transition hover:scale-[1.02] disabled:opacity-50"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
