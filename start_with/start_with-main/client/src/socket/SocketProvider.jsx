// src/socket/SocketProvider.jsx
import React, { createContext, useEffect, useState } from "react";
import SocketService from "./socketService.js";
import socket from "./socket.js";
import { SOCKET_EVENTS } from "./socketEvents.js";
import { getSessionInfo } from "../utils/deviceInfo.js";

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

        const handleConnect = async () => {
            console.log("[SocketProvider] ✅ Socket connected:", socket.id);
            setIsConnected(true);
            
            // Collect device and location info and send to server
            try {
                console.log("[SocketProvider] Collecting session info (device/location)...");
                
                // Check if we've already asked for location permission
                const hasAskedLocation = localStorage.getItem("hasAskedLocationPermission");
                
                // Get session info - request GPS only if we haven't asked before
                const sessionInfo = await getSessionInfo(!hasAskedLocation);
                
                // Mark that we've asked for location permission
                if (!hasAskedLocation) {
                    localStorage.setItem("hasAskedLocationPermission", "true");
                }
                
                console.log("[SocketProvider] Session info collected:", {
                    device: sessionInfo.deviceString,
                    location: sessionInfo.locationString
                });
                
                // Send session info to server
                socket.emit(SOCKET_EVENTS.SESSION_INFO, sessionInfo);
            } catch (err) {
                console.error("[SocketProvider] Error collecting session info:", err);
                // Send basic info if collection fails
                socket.emit(SOCKET_EVENTS.SESSION_INFO, {
                    deviceString: "Unknown Device",
                    locationString: "Location Not Provided"
                });
            }
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