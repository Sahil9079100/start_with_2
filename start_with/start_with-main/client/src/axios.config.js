import axios from 'axios';

const VITE_API_BASE_URLL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API = axios.create({

    baseURL: VITE_API_BASE_URLL,
    withCredentials: true,
});

export default API;

// import.meta.env.VITE_API_BASE_URL