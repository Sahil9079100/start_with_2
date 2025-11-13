import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../axios.config';
import SocketService from '../../socket/socketService';
import { OrbitProgress } from 'react-loading-indicators';


const Spinner = React.memo(() => (
    <div className='scale-[45%] mt-[-15px] mr-[-10px]'>
        <OrbitProgress variant="spokes" dense color="#ffffff" size="small" text="" textColor="" />
    </div>
));


export const LoginHr = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '@gmail.com', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Login details:', form);
        setIsLoading(true);

        try {
            const response = await API.post('/api/owner/login', form);
            console.log("owner login response", response);
            console.log(response.data);

            if (response.data.token) {
                localStorage.setItem('otoken', response.data.token);
                console.log('🔐Token saved in localStorage:', response.data.token);

                SocketService.connect({ auth: { token: response.data.token } });

                navigate(`/p/o/${response.data.owner}`);
            } else {
                console.error('❌ No token received from server');
            }
        } catch (error) {
            console.log("login owner error", error);
            navigate('/r/o');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        console.log('Google sign in clicked');
        // Add your Google OAuth logic here
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
                            <path d="M50.1333 32V67.9333M37.0667 40.9833V58.95M24 45.475V54.4583M63.2 40.9833V58.95M76.2667 45.475V54.4583" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
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
                    type="button"
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

                <form onSubmit={handleSubmit}>
                    {/* Email Field */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-700 mb-1.5">
                            Email ID
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-200 border-0 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                    </div>

                    {/* Password Field */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-700 mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-200 border-0 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                    </div>

                    {/* Secret Key Field */}
                    {/* <div className="mb-6">
                        <label className="block text-xs text-gray-700 mb-1.5">
                            Secret Key
                        </label>
                        <input
                            type="password"
                            name="secretkey"
                            value={form.secretkey}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-200 border-0 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                    </div> */}

                    {/* Continue Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="relative w-full bg-black py-4 text-white rounded px-4 mb-4 font-medium text-sm hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <div className="absolute top-2.5 left-[130px]" >
                                    <Spinner />
                                </div>
                                <span>Signing In...</span>
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Sign Up Link */}
                <div className="text-center">
                    <span className="text-xs text-gray-600">
                        Didn't have an account?{' '}
                        <a href="/r/o" className="text-gray-900 font-medium hover:underline">
                            Sign up
                        </a>
                    </span>
                </div>
            </div>
        </div>
    );
};

