import React from 'react';

export default function SparkleLoader({ isEnhancing }) {
    return (
        <div className="flex items-center justify-center w-8 h-8 ">
            <div className="relative w-8 h-8">
                {/* Large sparkle */}
                <svg
                    className={`absolute top-[-3px] left-[-2px] w-[20px] h-[20px] ${isEnhancing ? 'animate-spin' : ''}`}
                    style={{ animationDuration: '3s' }}
                    viewBox="0 0 100 100"
                >
                    <defs>
                        <linearGradient id="sparkleGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="50%" stopColor="#fb923c" />
                            <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M50 0 C55 30, 70 45, 100 50 C70 55, 55 70, 50 100 C45 70, 30 55, 0 50 C30 45, 45 30, 50 0 Z"
                        fill="url(#sparkleGradient1)"
                    />
                </svg>

                {/* Small sparkle */}
                <svg
                    className={`absolute bottom-[9px] right-[3px] w-3 h-3 ${isEnhancing ? 'animate-spin' : ''}`}
                    style={{ animationDuration: '2s', animationDelay: '0.5s' }}
                    viewBox="0 0 100 100"
                >
                    <defs>
                        <linearGradient id="sparkleGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fb923c" />
                            <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M50 0 C55 30, 70 45, 100 50 C70 55, 55 70, 50 100 C45 70, 30 55, 0 50 C30 45, 45 30, 50 0 Z"
                        fill="url(#sparkleGradient2)"
                    />
                </svg>

                {/* Pulsing sparkle */}
                {/* <svg
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 animate-pulse"
                    style={{ animationDuration: '1.5s' }}
                    viewBox="0 0 100 100"
                >
                    <path
                        d="M50 0 C55 30, 70 45, 100 50 C70 55, 55 70, 50 100 C45 70, 30 55, 0 50 C30 45, 45 30, 50 0 Z"
                        fill="#fb923c"
                    />
                </svg> */}
            </div>
        </div>
    );
}