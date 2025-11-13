import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../../axios.config';

import { OrbitProgress } from 'react-loading-indicators'


const Spinner = React.memo(() => (
    <div className='scale-[45%] mt-[-15px] mr-[-10px]'>
        <OrbitProgress variant="spokes" dense color="#9ca3af" size="small" text="" textColor="" />
    </div>
));

export default function StartwithSignup() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleContinue = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!firstName || !lastName || !email || !password) {
            setError('Please fill all fields.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await API.post('/api/owner/register', {
                name: `${firstName} ${lastName}`,
                email,
                password,
            });

            console.log(response.data);
            console.log(response.data.owner);
            console.log(response.data.token);

            if (response.data.token) {
                localStorage.setItem('otoken', response.data.token);
                console.log('🔐Token saved in localStorage:', response.data.token);

                setSuccess('Registration successful!');
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');

                // Navigate to owner dashboard
                navigate(`/p/o/${response.data.owner}`);
            } else {
                console.error('❌ No token received from server');
                setError('Registration failed. No token received.');
            }
        } catch (error) {
            console.error(error);
            setError('Registration failed. Please try again.');
            setSuccess('');
        } finally {
            setIsLoading(false);
        }

        setIsLoading(false);
    };

    const handleGoogleSignIn = () => {
        console.log('Google sign in clicked');
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-12">
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100" height="100" rx="43" fill="black" />
                            <path d="M50.1333 32V67.9333ZM37.0667 40.9833V58.95ZM24 45.475V54.4583ZM63.2 40.9833V58.95ZM76.2667 45.475V54.4583Z" fill="black" />
                        </svg>
                    </div>
                    <span className="text-black font-medium">Startwith.</span>
                </div>

                {/* Welcome Text */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-black mb-1">
                        Welcome to Startwith.
                    </h1>
                    <p className="text-gray-600 text-sm">
                        A new way to sort resume
                    </p>
                </div>

                {/* Google Sign In Button */}
                {/* <button
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white border border-gray-300 rounded py-2.5 px-4 mb-6 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" />
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                    </svg>
                    <span className="text-gray-700 text-sm font-medium">Continue with Google</span>
                </button> */}

                <form onSubmit={handleContinue}>
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-xs text-gray-700 mb-1.5">
                                First Name
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full bg-gray-200 border-0 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-700 mb-1.5">
                                Last Name
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full bg-gray-200 border-0 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                required
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-700 mb-1.5">
                            Email ID
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-200 border-0 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            required
                        />
                    </div>

                    {/* Password Field */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-700 mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-200 border-0 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            required
                        />
                    </div>

                    {/* Error and Success Messages */}
                    {error && <div className="mb-4 text-red-600 text-xs text-center">{error}</div>}
                    {success && <div className="mb-4 text-green-600 text-xs text-center">{success}</div>}

                    {/* Continue Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-black py-4 text-white rounded px-4 mb-4 font-medium text-sm hover:bg-black/90 transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <div className='relative  flex  w-full h-full items-center justify-center'>
                                    <div className='absolute left-[110px] pt-[18px]'>
                                        <Spinner />
                                    </div>
                                    <span className='pl-[35px]'>Creating Account...</span>

                                </div>
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                {/* Sign In Link */}
                <div className="text-center">
                    <span className="text-xs text-gray-600">
                        Already have an account?{' '}
                        <a href="/l/o" className="text-gray-900 font-medium hover:underline">
                            Sign In
                        </a>
                    </span>
                </div>
            </div>
        </div>
    );
}