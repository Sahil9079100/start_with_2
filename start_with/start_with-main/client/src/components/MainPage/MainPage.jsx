import React from 'react'
import { FaLocationArrow, FaFileAlt, FaCalendarCheck, FaArrowRight, FaCheckCircle, FaUserCheck, FaClock, FaChartBar } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

const MainPage = () => {
    const navigate = useNavigate()

    // Sample candidate avatars with different background colors
    const candidates = [
        { id: 1, name: 'Candidate A', bg: 'bg-purple-500', status: 'Shortlisted' },
        { id: 2, name: 'Candidate B', bg: 'bg-blue-500', status: 'Pending' },
        { id: 3, name: 'Candidate C', bg: 'bg-orange-500', status: 'Interviewed' },
        { id: 4, name: 'Candidate D', bg: 'bg-red-500', status: 'Shortlisted' },
        { id: 5, name: 'Candidate E', bg: 'bg-green-500', status: 'Pending' },
        { id: 6, name: 'Candidate F', bg: 'bg-purple-600', status: 'Shortlisted' },
        { id: 7, name: 'Candidate G', bg: 'bg-yellow-600', status: 'Interviewed' },
        { id: 8, name: 'Candidate H', bg: 'bg-pink-500', status: 'Pending' },
    ]

    const features = [
        {
            title: "Collect",
            description: "Upload resumes",
            icon: <FaFileAlt className="text-3xl" />
        },
        {
            title: "Rank",
            description: "AI ranks best candidates",
            icon: <FaChartBar className="text-3xl" />
        },
        {
            title: "Schedule",
            description: "Book interviews",
            icon: <FaCalendarCheck className="text-3xl" />
        }
    ]

    const recentShortlisted = [
        { id: '#1534', name: 'Sarah Johnson', role: 'Senior Developer', salary: '₹12L', bg: 'bg-purple-400' },
        { id: '#1446', name: 'Alex Kumar', role: 'Product Manager', salary: '₹15L', bg: 'bg-blue-400' },
        { id: '#1102', name: 'Maya Patel', role: 'UX Designer', salary: '₹10L', bg: 'bg-orange-400' },
        { id: '#0857', name: 'Rahul Singh', role: 'Data Analyst', salary: '₹8L', bg: 'bg-green-400' },
    ]

    const recentInterviews = [
        { id: '#2944', candidate: 'John Doe', time: '30 minutes ago', bg: 'bg-green-500' },
        { id: '#2844', candidate: 'Jane Smith', time: '1 hour ago', bg: 'bg-yellow-500' },
        { id: '#2105', candidate: 'Mike Wilson', time: '2 hours ago', bg: 'bg-blue-500' },
        { id: '#1010', candidate: 'Emma Brown', time: '3 hours ago', bg: 'bg-red-500' },
    ]

    const steps = [
        {
            number: 1,
            icon: <FaFileAlt className="text-2xl" />,
            title: "Download and install MetaMask",
            description: "Download and install a Chrome browser plugin called MetaMask. This will allow websites (that you authorize) to retrieve your Ethereum account."
        },
        {
            number: 2,
            icon: <FaUserCheck className="text-2xl" />,
            title: "Buy some Ethereum",
            description: "If you made a new account, buy some Ethereum. The MetaMask plugin has a button that will allow you to buy Ether from Coinbase."
        },
        {
            number: 3,
            icon: <FaCalendarCheck className="text-2xl" />,
            title: "Start bidding, buying and selling",
            description: "Once you have the plugin installed, this website will recognize it and populate the Ethereum account you have in MetaMask."
        }
    ]

    
    return (
        <div className='w-full min-h-screen bg-[#101111] text-white'>
            <nav className='w-full px-6 py-4 flex justify-between items-center border-b border-gray-800'>
                <div className='flex items-center gap-8'>
                    <div className='text-xl font-bold'>☰</div>
                    <div className='hidden md:flex gap-6 text-sm'>
                        <a href="#" className='text-gray-400 hover:text-white transition-colors'>Home</a>
                        <a href="#" className='text-gray-400 hover:text-white transition-colors'>Dashboard</a>
                        <a href="#" className='text-gray-400 hover:text-white transition-colors'>Pricing</a>
                    </div>
                </div>
                <div className='flex items-center gap-4'>
                    <button className='bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors'>
                        Connect Account
                    </button>
                    <div className='flex gap-3'>
                        <span className='text-gray-400 cursor-pointer hover:text-white'>●</span>
                        <span className='text-gray-400 cursor-pointer hover:text-white'>●</span>
                    </div>
                </div>
            </nav>

            <div className='w-full py-16 px-6 text-center'>
                <h1 className='text-5xl md:text-6xl font-bold mb-4'>
                    Free AI Resume Shortlister
                </h1>
                <p className='text-gray-400 text-lg mb-8 max-w-2xl mx-auto'>
                    Automatically rank and shortlist the best candidates based on job requirements,<br />
                    then schedule interviews seamlessly with AI-powered automation.
                </p>
                <button
                    onClick={() => { navigate("/r/o") }}
                    className='bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all duration-300 inline-flex items-center gap-2'
                >
                    Get Started
                </button>
            </div>

            <div className='w-full overflow-hidden py-8 border-y border-gray-800'>
                <div className='flex gap-4 animate-scroll px-6'>
                    {[...candidates, ...candidates].map((candidate, index) => (
                        <div key={index} className='flex-shrink-0'>
                            <div className={`w-24 h-24 ${candidate.bg} rounded-lg flex items-center justify-center text-2xl font-bold border-2 border-gray-700 hover:scale-110 transition-transform cursor-pointer`}>
                                {candidate.name.charAt(10)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className='w-full py-8 text-center'>
                <p className='text-gray-500 text-sm mb-4'>Featured in</p>
                <div className='flex justify-center gap-8 items-center text-gray-600'>
                    <span className='text-xl font-bold'>TechCrunch</span>
                    <span className='text-xl font-bold'>Forbes</span>
                    <span className='text-xl font-bold'>Wired</span>
                </div>
            </div>

            <div className='w-full py-16 px-6'>
                <div className='max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8'>
                    {features.map((feature, index) => (
                        <div key={index} className='bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 hover:border-gray-700 transition-colors group cursor-pointer'>
                            <h3 className='text-2xl font-bold mb-4'>{feature.title}</h3>
                            <p className='text-gray-400 mb-6'>{feature.description}</p>
                            <div className='flex items-center justify-between'>
                                <div className='text-orange-500 group-hover:text-orange-400 transition-colors'>
                                    {feature.icon}
                                </div>
                                <FaArrowRight className='text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all' />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className='w-full py-16 px-6 bg-[#0a0a0a]'>
                <div className='max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
                    <div>
                        <h2 className='text-4xl font-bold mb-6'>Meet the AI Assistant</h2>
                        <p className='text-gray-400 mb-8 leading-relaxed'>
                            Learn how our advanced algorithm uses based on your job description, automatically ranking candidates by relevance. The AI assistant helps you save hours of manual screening and identifies top talent instantly.
                        </p>
                        <div className='flex gap-4'>
                            <button
                                onClick={() => { navigate("/r/o") }}
                                className='bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors'
                            >
                                Get Started
                            </button>
                            <button className='border border-gray-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors'>
                                Learn More
                            </button>
                        </div>
                    </div>
                    <div className='bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl p-12 border border-gray-800'>
                        <div className='space-y-6'>
                            <div className='bg-blue-400/20 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30'>
                                <p className='text-sm text-blue-200'>
                                    ✓ Ranks resumes by AI based on job fit
                                </p>
                            </div>
                            <div className='bg-cyan-400/20 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30 ml-8'>
                                <p className='text-sm text-cyan-200'>
                                    ✓ Parses skills with AI background checks
                                </p>
                            </div>
                            <div className='bg-blue-400/20 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30'>
                                <p className='text-sm text-blue-200'>
                                    ✓ Sends invites with 1-click scheduling
                                </p>
                            </div>
                            <div className='mt-8 flex justify-center'>
                                <div className='w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center relative border-4 border-gray-800 shadow-xl'>
                                    <div className='text-4xl'>👤</div>
                                    <div className='absolute -bottom-2 -right-2 w-12 h-12 bg-cyan-400 rounded border-2 border-gray-800'></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='w-full py-16 px-6'>
                <div className='max-w-7xl mx-auto'>
                    <div className='flex justify-between items-center mb-8'>
                        <h2 className='text-3xl font-bold'>Top Shortlisted</h2>
                        <a href="#" className='text-blue-500 hover:text-blue-400 flex items-center gap-2'>
                            View All <FaArrowRight className='text-sm' />
                        </a>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
                        {recentShortlisted.map((candidate, index) => (
                            <div key={index} className='bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all hover:scale-105 cursor-pointer group'>
                                <div className={`w-full h-48 ${candidate.bg} flex items-center justify-center text-6xl font-bold relative`}>
                                    👤
                                    <div className='absolute top-3 right-3 bg-green-500 w-4 h-4 rounded-full border-2 border-gray-900'></div>
                                </div>
                                <div className='p-4'>
                                    <p className='text-blue-500 text-sm mb-1'>{candidate.id}</p>
                                    <h3 className='font-bold mb-1'>{candidate.name}</h3>
                                    <p className='text-gray-400 text-sm mb-2'>{candidate.role}</p>
                                    <p className='text-sm'><span className='text-gray-500'>Expected:</span> {candidate.salary}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className='w-full py-16 px-6 bg-[#0a0a0a]'>
                <div className='max-w-7xl mx-auto'>
                    <div className='flex justify-between items-center mb-8'>
                        <div>
                            <h2 className='text-3xl font-bold mb-2'>Recent Interviews</h2>
                            <p className='text-gray-500 text-sm'>Updated 30 seconds ago</p>
                        </div>
                        <a href="#" className='text-blue-500 hover:text-blue-400 flex items-center gap-2'>
                            View All <FaArrowRight className='text-sm' />
                        </a>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
                        {recentInterviews.map((interview, index) => (
                            <div key={index} className='bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all hover:scale-105 cursor-pointer'>
                                <div className={`w-full h-48 ${interview.bg} flex items-center justify-center text-6xl font-bold relative`}>
                                    🎯
                                    <FaClock className='absolute top-3 right-3 text-white text-xl' />
                                </div>
                                <div className='p-4'>
                                    <p className='text-blue-500 text-sm mb-1'>{interview.id}</p>
                                    <h3 className='font-bold mb-1'>{interview.candidate}</h3>
                                    <p className='text-gray-400 text-sm'>{interview.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className='w-full py-16 px-6'>
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-4xl font-bold mb-12'>How do I get started?</h2>
                    <div className='space-y-8'>
                        {steps.map((step, index) => (
                            <div key={index} className='flex gap-6'>
                                <div className='flex-shrink-0'>
                                    <div className='w-12 h-12 rounded-full bg-[#1a1a1a] border border-gray-700 flex items-center justify-center font-bold'>
                                        {step.number}
                                    </div>
                                </div>
                                <div className='flex-1'>
                                    <div className='flex items-center gap-3 mb-2'>
                                        <div className='text-orange-500'>
                                            {step.icon}
                                        </div>
                                        <h3 className='text-xl font-bold'>{step.title}</h3>
                                    </div>
                                    <p className='text-gray-400 leading-relaxed'>
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className='w-full py-16 px-6 bg-[#0a0a0a]'>
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-4xl font-bold mb-12'>Details and FAQ</h2>
                    <div className='space-y-8'>
                        <div>
                            <h3 className='text-xl font-bold mb-3'>What are the features of this AI-based recruiter?</h3>
                            <p className='text-gray-400 leading-relaxed'>
                                The AI Resume Shortlister is a collection of 10,000 uniquely generated characters. No two are exactly alike, and each one is officially owned by the recruiter on the Ethereum blockchain. Originally, they could be claimed for free by anybody with an Ethereum wallet, but all 10,000 were quickly claimed. Now they must be purchased from someone via the marketplace that's also embedded in the blockchain.
                            </p>
                        </div>
                        <div>
                            <h3 className='text-xl font-bold mb-3'>Are the CVs on the ERC-721 standard?</h3>
                            <p className='text-gray-400 leading-relaxed'>
                                Yes, the CryptoPunks are one of the first implementations of a non-fungible token on Ethereum, and were the inspiration for the ERC-721 standard. CryptoPunks are currently being used as a template to define the ERC-721 standard.
                            </p>
                        </div>
                        <div>
                            <h3 className='text-xl font-bold mb-3'>Where does my shortlist data reside?</h3>
                            <p className='text-gray-400 leading-relaxed'>
                                Since the CryptoPunks pre-date the ERC-721 standard, they don't fully comply with the standard but are compatible with it. We made a wrapper smart contract that makes the punks fully ERC-721 compatible and allows you to trade them on platforms like OpenSea.
                            </p>
                        </div>
                        <div>
                            <h3 className='text-xl font-bold mb-3'>Do you charge any fees for transactions?</h3>
                            <p className='text-gray-400 leading-relaxed'>
                                No, we do not charge any fees for transactions. The CryptoPunks contract only charges the standard Ethereum transaction fee. CryptoPunks are ERC-721 compatible, so you can trade them on any platform that supports the standard.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className='w-full py-12 px-6 border-t border-gray-800'>
                <div className='max-w-7xl mx-auto'>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8'>
                        <div>
                            <h3 className='font-bold text-lg mb-4'>StartWith AI</h3>
                            <p className='text-gray-400 text-sm leading-relaxed'>
                                AI-powered resume shortlisting and interview scheduling platform for modern recruiters.
                            </p>
                        </div>

                        <div>
                            <h4 className='font-semibold text-sm mb-4 text-gray-300'>Quick Links</h4>
                            <div className='flex flex-col gap-2 text-sm text-gray-400'>
                                <a href="#" className='hover:text-white transition-colors'>Home</a>
                                <a href="#" className='hover:text-white transition-colors'>Dashboard</a>
                                <a href="#" className='hover:text-white transition-colors'>Pricing</a>
                                <a href="#" className='hover:text-white transition-colors'>About Us</a>
                            </div>
                        </div>

                        <div>
                            <h4 className='font-semibold text-sm mb-4 text-gray-300'>Legal</h4>
                            <div className='flex flex-col gap-2 text-sm text-gray-400'>
                                <button onClick={() => navigate('/terms')} className='hover:text-white transition-colors text-left'>Terms and Conditions</button>
                                <button onClick={() => navigate('/privacy')} className='hover:text-white transition-colors text-left'>Privacy Policy</button>
                                <button onClick={() => navigate('/cancellation-refund')} className='hover:text-white transition-colors text-left'>Cancellation & Refund</button>
                            </div>
                        </div>

                        <div>
                            <h4 className='font-semibold text-sm mb-4 text-gray-300'>Contact</h4>
                            <div className='flex flex-col gap-2 text-sm text-gray-400'>
                                <button onClick={() => navigate('/contact')} className='hover:text-white transition-colors text-left'>Contact Us</button>
                                <a href="#" className='hover:text-white transition-colors'>Support</a>
                                <a href="#" className='hover:text-white transition-colors'>FAQ</a>
                            </div>
                            <div className='flex gap-3 mt-4'>
                                <span className='text-gray-400 cursor-pointer hover:text-white transition-colors'>●</span>
                                <span className='text-gray-400 cursor-pointer hover:text-white transition-colors'>●</span>
                                <span className='text-gray-400 cursor-pointer hover:text-white transition-colors'>●</span>
                            </div>
                        </div>
                    </div>

                    <div className='border-t border-gray-800 pt-6 text-center text-gray-500 text-sm'>
                        <p>&copy; 2025 StartWith AI. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <style jsx>{`
                @keyframes scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }
                .animate-scroll {
                    animation: scroll 20s linear infinite;
                }
                .animate-scroll:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    )
}

export default MainPage