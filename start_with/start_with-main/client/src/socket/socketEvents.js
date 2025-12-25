// client/src/socket/socketEvents.js

export const SOCKET_EVENTS = {
    CONNECT: "connect",
    DISCONNECT: "disconnect",
    TEST_SEND: "test:send",
    TEST_RECEIVE: "test:receive",
    
    // Live session tracking events
    LIVE_SESSION_COUNT: "LIVE_SESSION_COUNT",
    GET_LIVE_SESSION_COUNT: "GET_LIVE_SESSION_COUNT",
    SESSION_INFO: "SESSION_INFO", // Client sends device/location info to server
}