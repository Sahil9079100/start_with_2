// src/socket/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "https://e39f2f419ab1.ngrok-free.app";
// console.log("Connecting to SOCKET_URL:", SOCKET_URL);
const socket = io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    path: '/socket.io',
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {}
});

export default socket;