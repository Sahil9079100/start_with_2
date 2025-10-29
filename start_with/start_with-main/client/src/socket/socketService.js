// src/socket/socketService.js
import socket from "./socket.js";


const SocketService = {
    connect: (opts = {}) => {
        // console.log("SocketService: connect called with opts", opts);
        if (!socket) return;
        if (opts.auth) socket.auth = opts.auth;
        if (!socket.connected) socket.connect();
    },

    disconnect: () => {
        if (!socket) return;
        if (socket.connected) socket.disconnect();
    },

    emit: (event, data) => {
        if (!socket || !socket.connected) {
            console.warn(`[SocketService] emit before connected: ${event}`);
            return;
        }
        socket.emit(event, data);
    },

    on: (event, handler) => {
        if (!socket) return;
        socket.on(event, handler);
    },

    off: (event, handler) => {
        if (!socket) return;
        socket.off(event, handler);
    },

    getSocket: () => socket,
};

export default SocketService;
