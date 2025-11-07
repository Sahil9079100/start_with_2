import axios from 'axios';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://37d8bbfe437c.ngrok-free.app';
const API = axios.create({
    baseURL: VITE_API_BASE_URL,
    withCredentials: true,
});

export default API;

// import.meta.env.VITE_API_BASE_URL