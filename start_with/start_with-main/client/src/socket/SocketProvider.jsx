// src/socket/SocketProvider.jsx
import React, { createContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import SocketService from "./socketService.js";
import socket from "./socket.js";
import { SOCKET_EVENTS } from "./socketEvents.js";
import { getSessionInfo } from "../utils/deviceInfo.js";

export const SocketContext = createContext(null);

// Routes where socket should NOT connect
const EXCLUDED_ROUTES = ["/", "/l/o", "/r/o"];

export const SocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const currentPath = location.pathname;
        
        // Check if current route is excluded or is a 404 (not matching known routes)
        const isExcludedRoute = EXCLUDED_ROUTES.includes(currentPath);
        
        if (isExcludedRoute) {
            console.log("[SocketProvider] Excluded route, skipping socket connect:", currentPath);
            // Disconnect if already connected
            if (SocketService.getSocket().connected) {
                SocketService.disconnect();
                setIsConnected(false);
            }
            return;
        }

        const savedToken = localStorage.getItem("otoken");

        if (savedToken) {
            console.log("[SocketProvider] Found saved token, connecting socket...");
            SocketService.connect({ auth: { token: savedToken } });
        } else {
            console.log("[SocketProvider] No token found, skipping socket connect.");
            return;
        }

        const handleConnect = async () => {
            console.log("[SocketProvider] ✅ Socket connected:", SocketService.getSocket().id);
            setIsConnected(true);
            
            try {
                console.log("[SocketProvider] Collecting session info (device/location)...");
                
                const hasAskedLocation = localStorage.getItem("hasAskedLocationPermission");
                const sessionInfo = await getSessionInfo(!hasAskedLocation);
                
                if (!hasAskedLocation) {
                    localStorage.setItem("hasAskedLocationPermission", "true");
                }
                
                console.log("[SocketProvider] Session info collected:", {
                    device: sessionInfo.deviceString,
                    location: sessionInfo.locationString
                });
                
                SocketService.getSocket().emit(SOCKET_EVENTS.SESSION_INFO, sessionInfo);
            } catch (err) {
                console.error("[SocketProvider] Error collecting session info:", err);
                SocketService.getSocket().emit(SOCKET_EVENTS.SESSION_INFO, {
                    deviceString: "Unknown Device",
                    locationString: "Location Not Provided"
                });
            }
        };

        const handleDisconnect = (reason) => {
            console.log("[SocketProvider] ❌ Socket disconnected:", reason);
            setIsConnected(false);
        };

        const socketInstance = SocketService.getSocket();
        socketInstance.on(SOCKET_EVENTS.CONNECT, handleConnect);
        socketInstance.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);

        return () => {
            socketInstance.off(SOCKET_EVENTS.CONNECT, handleConnect);
            socketInstance.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
            SocketService.disconnect();
        };
    }, [location.pathname]);

    return (
        <SocketContext.Provider value={{ isConnected, socket: SocketService.getSocket(), SocketService }}>
            {children}
        </SocketContext.Provider>
    );
};