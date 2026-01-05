import axios from 'axios';

const getBaseURL = () => {
    let url = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
    if (!url.endsWith('/api') && !url.endsWith('/api/')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    return url;
};

const api = axios.create({
    baseURL: getBaseURL()
});

console.log('API Base URL set to:', api.defaults.baseURL);

api.interceptors.request.use((config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        const token = JSON.parse(userInfo).token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export const fetchSlots = async () => {
    const response = await api.get('/slots');
    return response.data.slots;
};

export const createBooking = async (bookingData: any) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
};

export const fetchDashboardStats = async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

export const fetchBookings = async () => {
    const response = await api.get('/bookings');
    return response.data;
};

export const fetchUserProfile = async () => {
    const response = await api.get('/users/me');
    return response.data;
};

export const updateUserProfile = async (data: any) => {
    const response = await api.put('/users/me', data);
    return response.data;
};

export const cancelBooking = async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/cancel`);
    return response.data;
};

export const checkEntry = async (carNumber: string) => {
    const response = await api.post('/bookings/entry', { carNumber });
    return response.data;
};

export const extendBooking = async (bookingId: string, additionalHours: number) => {
    const response = await api.post(`/bookings/${bookingId}/extend`, { additionalHours });
    return response.data;
};

export default api;
