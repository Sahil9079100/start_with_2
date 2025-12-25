// client/src/components/LiveSessionsDisplay.jsx
// Example component showing how to display live sessions with device and location info
// You can integrate this into your ProfileHr.jsx or any other component

import React from "react";
import useLiveSessionCount, { formatSessionDate } from "../socket/useLiveSessionCount.js";

/**
 * LiveSessionsDisplay Component
 * Shows the current number of live sessions with device and location details
 */
const LiveSessionsDisplay = () => {
    const { liveCount, sessions, isLoading, isConnected, requestLiveCount } = useLiveSessionCount();

    if (!isConnected) {
        return (
            <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-500">Not connected to server</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-500">Loading sessions...</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            {/* Header with count */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                    Live Sessions
                </h3>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <span className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></span>
                        {liveCount} {liveCount === 1 ? 'session' : 'sessions'}
                    </span>
                    <button 
                        onClick={requestLiveCount}
                        className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Refresh"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Sessions list */}
            {sessions.length === 0 ? (
                <p className="text-gray-500 text-sm">No active sessions</p>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session, index) => (
                        <div 
                            key={session.socketId} 
                            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                            <div className="flex-1">
                                {/* Device Info */}
                                <div className="flex items-center gap-2 mb-1">
                                    <DeviceIcon deviceType={session.deviceType} />
                                    <span className="font-medium text-gray-800">
                                        {session.deviceString || "Unknown Device"}
                                    </span>
                                </div>
                                
                                {/* Location */}
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{session.locationString || "Location Not Provided"}</span>
                                </div>
                                
                                {/* Connected time */}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{formatSessionDate(session.connectedAt)}</span>
                                </div>
                            </div>
                            
                            {/* Current session indicator */}
                            {index === 0 && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                    Current
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Info text */}
            {liveCount > 1 && (
                <p className="mt-4 text-xs text-gray-500">
                    {liveCount} people are currently using this account
                </p>
            )}
        </div>
    );
};

/**
 * Device type icon component
 */
const DeviceIcon = ({ deviceType }) => {
    if (deviceType === "mobile") {
        return (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        );
    }
    
    if (deviceType === "tablet") {
        return (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        );
    }
    
    // Desktop/default
    return (
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );
};

export default LiveSessionsDisplay;
