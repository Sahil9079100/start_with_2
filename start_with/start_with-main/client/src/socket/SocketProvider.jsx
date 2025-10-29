// src/socket/SocketProvider.jsx
import React, { createContext, useEffect, useState } from "react";
import SocketService from "./socketService.js";
import socket from "./socket.js";
import { SOCKET_EVENTS } from "./socketEvents.js";

export const SocketContext = createContext(null);

/**
 * SocketProvider props:
 * - token (optional): if you use token-based auth, pass it here.
 * For demo we allow no auth and connect anyway.
 */
export const SocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const savedToken = localStorage.getItem("otoken");

        if (savedToken) {
            console.log("[SocketProvider] Found saved token, connecting socket...");
            // socket.auth = { token: savedToken };
            // SocketService.connect();
            SocketService.connect({ auth: { token: savedToken } });
        } else {
            console.log("[SocketProvider] No token found, skipping socket connect.");
        }

        const handleConnect = () => {
            console.log("[SocketProvider] ✅ Socket connected:", socket.id);
            setIsConnected(true);
        };

        const handleDisconnect = (reason) => {
            console.log("[SocketProvider] ❌ Socket disconnected:", reason);
            setIsConnected(false);
        };

        const socket = SocketService.getSocket();
        socket.on(SOCKET_EVENTS.CONNECT, handleConnect);
        socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);

        return () => {
            socket.off(SOCKET_EVENTS.CONNECT, handleConnect);
            socket.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
            SocketService.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ isConnected, socket, SocketService }}>
            {children}
        </SocketContext.Provider>
    );
};