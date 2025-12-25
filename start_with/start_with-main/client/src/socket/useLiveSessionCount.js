// client/src/socket/useLiveSessionCount.js
import { useState, useEffect, useContext, useCallback } from "react";
import { SocketContext } from "./SocketProvider.jsx";
import { SOCKET_EVENTS } from "./socketEvents.js";

/**
 * Custom hook to get real-time live session count for the current user.
 * 
 * This hook:
 * 1. Listens for LIVE_SESSION_COUNT socket events and updates automatically
 * 2. Provides a method to manually request the current count
 * 3. Returns the current count, session details (with device/location), and loading state
 * 
 * @returns {Object} { liveCount, sessions, isLoading, requestLiveCount, timestamp }
 */
export default function useLiveSessionCount() {
    const { isConnected, socket } = useContext(SocketContext);
    const [liveCount, setLiveCount] = useState(0);
    const [sessions, setSessions] = useState([]);
    const [timestamp, setTimestamp] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Handler for incoming live session count updates
    const handleLiveSessionCount = useCallback((data) => {
        // data: { count, sessions, ownerId, timestamp }
        // sessions now include: socketId, connectedAt, deviceString, locationString, etc.
        setLiveCount(data.count || 0);
        setSessions(data.sessions || []);
        setTimestamp(data.timestamp || new Date().toISOString());
        setIsLoading(false);
    }, []);

    // Request live session count manually
    const requestLiveCount = useCallback(() => {
        if (socket && isConnected) {
            setIsLoading(true);
            socket.emit(SOCKET_EVENTS.GET_LIVE_SESSION_COUNT);
        }
    }, [socket, isConnected]);

    useEffect(() => {
        if (!socket) return;

        // Listen for live session count updates
        socket.on(SOCKET_EVENTS.LIVE_SESSION_COUNT, handleLiveSessionCount);

        // Request initial count when connected
        if (isConnected) {
            requestLiveCount();
        }

        return () => {
            socket.off(SOCKET_EVENTS.LIVE_SESSION_COUNT, handleLiveSessionCount);
        };
    }, [socket, isConnected, handleLiveSessionCount, requestLiveCount]);

    return {
        liveCount,
        sessions, // Each session now has: socketId, connectedAt, deviceString, locationString, deviceType, browser, os, location
        timestamp,
        isLoading,
        isConnected,
        requestLiveCount,
    };
}

/**
 * Format a session's connectedAt date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string (e.g., "Dec 24, 2024 at 10:36pm")
 */
export function formatSessionDate(dateString) {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return `${month} ${day}, ${year} at ${hours}:${minutes}${ampm}`;
}
