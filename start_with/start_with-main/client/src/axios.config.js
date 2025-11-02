import axios from 'axios';

const VITE_API_BASE_URL = 'https://ac409bf3900f.ngrok-free.app';
const API = axios.create({
    baseURL: VITE_API_BASE_URL,
    withCredentials: true,
});

export default API;

// import.meta.env.VITE_API_BASE_URL