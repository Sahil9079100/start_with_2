import axios from 'axios';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://e39f2f419ab1.ngrok-free.app';
const API = axios.create({
    baseURL: VITE_API_BASE_URL,
    withCredentials: true,
});

export default API;

// import.meta.env.VITE_API_BASE_URL