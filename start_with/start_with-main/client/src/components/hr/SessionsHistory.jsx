import React, { useEffect, useState } from 'react'
import { RxMobile } from "react-icons/rx";
import { PiDesktop } from "react-icons/pi";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import API from '../../axios.config';

const SessionsHistory = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSessions, setTotalSessions] = useState(0);
    const limit = 10;

    const getSessionsHistory = async (page = 1) => {
        try {
            setLoading(true);
            const response = await API.get('/api/owner/session-history', {
                params: {
                    page: page,
                    limit: limit
                }
            });
            console.log("sessions history response", response.data);
            setSessions(response.data.data.sessions || []);
            setTotalPages(response.data.data.totalPages || 1);
            setTotalSessions(response.data.data.total || 0);
            setCurrentPage(page);
        } catch (error) {
            console.log("error fetching sessions history", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getSessionsHistory(1);
    }, []);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            getSessionsHistory(page);
        }
    };

    // Get date label (Today, Yesterday, or formatted date)
    const getDateLabel = (isoDate) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Reset time to compare dates only
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

        if (dateOnly.getTime() === todayOnly.getTime()) {
            return 'Today';
        } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
            return 'Yesterday';
        } else {
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }
    };

    // Format time to "3:00am"
    const formatTime = (isoDate) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes}${ampm}`;
    };

    // Group sessions by date
    const groupSessionsByDate = () => {
        const groups = {};

        sessions.forEach((session) => {
            const dateLabel = getDateLabel(session.connectedAt);
            if (!groups[dateLabel]) {
                groups[dateLabel] = [];
            }
            groups[dateLabel].push(session);
        });

        return groups;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-4 min-h-[200px]">
                <div className="w-5 h-5 border-t-2 border-b-2 border-gray-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const groupedSessions = groupSessionsByDate();

    // Custom scrollbar styles
    const scrollbarStyles = {
        scrollbarWidth: 'thin',
        scrollbarColor: '#d1d5db transparent',
    };

    return (
        <>
            <style>
                {`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #d1d5db;
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #9ca3af;
                    }
                `}
            </style>
            <div 
                className="custom-scrollbar flex flex-col gap-2 w-full max-h-[50vh] overflow-y-auto p-3 pr-2"
                style={scrollbarStyles}
            >
                {sessions.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No session history found</div>
                ) : (
                    Object.entries(groupedSessions).map(([dateLabel, daySessions]) => (
                        <div key={dateLabel} className="mb-3">
                            {/* Date Header */}
                            <div className="text-[14px] font-semibold text-gray-400 mb-2 px-[18px]">
                                {dateLabel}
                            </div>

                            {/* Sessions for this date */}
                            <div className="flex flex-col gap-1">
                                {daySessions.map((session) => (
                                    <div
                                        key={session.id || session._id}
                                        className="LIVE_SESSION_CARD bg-gray-50 hover:bg-gray-100 px-[18px] py-2 rounded-[4px] w-full flex items-center justify-start gap-3 transition-colors"
                                    >
                                        <div className="text-[30px] text-gray-600">
                                            {session.deviceType === 'desktop' ? <PiDesktop /> : <RxMobile />}
                                        </div>
                                        <div className="">
                                            <div className="text-[17px] font-semibold">
                                                {session.deviceString || `${session.browser} on ${session.os}`}
                                            </div>
                                            <div className="text-[15px] font-semibold text-gray-500 flex flex-col">
                                                <span>{session.locationString || `${session.location?.city}, ${session.location?.countryCode}`}</span>
                                                <span className="text-[13px] text-gray-400">
                                                    {formatTime(session.connectedAt)}
                                                    {session.isActive && (
                                                        <span className="ml-2 text-green-500 text-[12px]">● Active</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="PAGINATION_DIV w-full px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        {/* Session count info */}
                        <div className="text-[13px] text-gray-500">
                            Showing {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalSessions)} of {totalSessions}
                        </div>

                        {/* Pagination controls */}
                        <div className="flex items-center gap-1">
                            {/* Previous button */}
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`p-1.5 rounded-md transition-colors ${
                                    currentPage === 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <IoChevronBack className="text-[18px]" />
                            </button>

                            {/* Page numbers */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => {
                                        // Show first page, last page, current page, and pages around current
                                        if (page === 1 || page === totalPages) return true;
                                        if (Math.abs(page - currentPage) <= 1) return true;
                                        return false;
                                    })
                                    .map((page, index, arr) => (
                                        <React.Fragment key={page}>
                                            {/* Add ellipsis if there's a gap */}
                                            {index > 0 && page - arr[index - 1] > 1 && (
                                                <span className="px-1 text-gray-400 text-[13px]">...</span>
                                            )}
                                            <button
                                                onClick={() => handlePageChange(page)}
                                                className={`min-w-[28px] h-[28px] rounded-md text-[13px] font-medium transition-colors ${
                                                    page === currentPage
                                                        ? 'bg-black text-white'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                            </div>

                            {/* Next button */}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`p-1.5 rounded-md transition-colors ${
                                    currentPage === totalPages
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <IoChevronForward className="text-[18px]" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default SessionsHistory