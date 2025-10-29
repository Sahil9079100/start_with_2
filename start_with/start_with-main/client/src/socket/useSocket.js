// src/socket/useSocket.js
import { useEffect } from "react";
import SocketService from "./socketService.js";

export default function useSocket(event, handler) {
    useEffect(() => {
        if (!event || !handler) return;
        SocketService.on(event, handler);
        return () => {
            SocketService.off(event, handler);
        };
    }, [event, handler]);
}
