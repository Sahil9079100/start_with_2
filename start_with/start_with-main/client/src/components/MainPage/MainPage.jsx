import { useState } from 'react'
import { GoCheckCircle } from "react-icons/go";
import { IoArrowForwardCircle, IoMenu, IoClose } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from "react-icons/fa6";

function App() {

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeLanguage, setActiveLanguage] = useState('English');

    const trustedLogos = [
        { name: "Chhavi Advertising", url: "/chhavi-preview.png" },
        { name: "Permute", url: "/permute-preview.png" },
        { name: "Educate Girls", url: "/educate-preview.png" },
        // { name: "Simpliaxis", url: "/simpliaxis-preview.png" }
    ];

    const screeningFeatures = [
        { title: "No ATS Friendly", desc: "Scan and assess any kind of resume" },
        { title: "Score", desc: "Score based on Job fit for the company" },
        { title: "Match", desc: "Easy assessment with High match, Medium match, Low match and Unqualified" },
        { title: "AI review", desc: "Give candidate review based on its profile" },
        { title: "Recommended Question", desc: "Give candidate review based on its profile" }
    ];

    const interviewFeatures = [
        { title: "Set Duration", desc: "Add questions to ask on behalf of you" },
        { title: "Add Questions", desc: "Add questions to ask on behalf of you" },
        { title: "Expiry date", desc: "Add questions to ask on behalf of you" }
    ];

    const pricingBasic = [
        "Google Sheet Integration", "No Priority Support",
        "Startwith Email", "Slow Response", "Voice Interview", "Limit duration"
    ];

    const pricingEnterprise = [
        "Custom integration", "Priority Support",
        "Custom Email", "Fast Response", "Voice + AI Avatar", "No Limit"
    ];

    const navigate = useNavigate();

    return (
        <>
            <div className="min-h-screen bg-[#F3F1E7] font-sans text-[#1A1A1A] overflow-x-hidden">

                {/* Navbar - Changed max-w-7xl to w-full and added larger padding for laptop */}
                <nav className="w-full px-6 md:px-12 py-6 flex justify-between items-center relative z-50">

                    <a href="https://startwith.live">
                        <div className="text-2xl font-semibold tracking-tight">Startwith<span className="text-[#000000]">_</span></div>
                    </a>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={() => { navigate('/l/o') }} className="font-medium cursor-pointer hover:bg-[#dedcd3] bg-[#EAE8E0] border border-[#D1D1C7] px-4 py-2 rounded-[5px] transition-all duration-300">Sign in</button>
                        {/* <button className="bg-[#EAE8E0] border border-[#D1D1C7] px-6 py-2.5 rounded-full font-medium hover:bg-[#dedcd3] transition-colors cursor-pointer">
                            Get Started
                        </button> */}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden text-2xl p-1"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <IoClose /> : <IoMenu />}
                    </button>

                    {/* Mobile Dropdown */}
                    {isMobileMenuOpen && (
                        <div className="absolute top-full left-0 w-full bg-[#F3F1E7] border-b border-gray-300 p-6 flex flex-col gap-6 shadow-xl md:hidden">
                            <button onClick={() => { navigate('/l/o') }} className="text-left font-medium text-lg">Sign in</button>
                            {/* <button className="bg-[#EAE8E0] border border-[#D1D1C7] px-5 py-3 rounded-full font-medium text-center hover:bg-[#dedcd3]">Get Started</button> */}
                        </div>
                    )}
                </nav>

                {/* Hero Section */}
                {/* We keep the text centered (max-w-4xl) for readability, but allow the container to be full width */}
                <header className="w-full px-4 md:px-6 pt-20 pb-12 md:pb-20 text-center flex flex-col items-center">

                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-medium mb-6 leading-tight">
                            AI Sorting and AI Interviewer
                        </h1>
                        <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-2xl mx-auto px-2">
                            Find the best match for your organization, and get interviewed by AI
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 mt-14">
                            <button onClick={() => navigate('/schedule')} className="button-85 w-auto font-medium" aria-label="Book a demo">
                                <span>Book a demo</span>
                                <span className="btn-icon" aria-hidden="true"><FaArrowRight /></span>
                            </button>
                        </div>
                    </div>

                    {/* Large Hero Image - Now spans almost full width */}
                    <div className="w-full max-w-[1600px] px-2 md:px-8">
                        <img
                            src="/image copy.png"
                            alt="Hero Dashboard"
                            className="w-full h-auto object-cover rounded-[10px] shadow-sm border border-gray-200"
                        />
                    </div>
                </header>

                {/* Trusted By Section */}
                <section className="text-center pb-12 md:pb-24 px-4">
                    <h3 className="text-xl font-medium mb-1">Trusted by</h3>
                    <p className="text-xs text-gray-500 mb-10 uppercase tracking-wide">Non Tech and Tech Companies</p>

                    {trustedLogos.length > 0 && (
                        <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap px-4">
                            {trustedLogos.map((logo, idx) => (
                                <div
                                    key={idx}
                                    className="w-24 md:w-36 h-20 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                                >
                                    <img
                                        src={logo.url}
                                        alt={logo.name}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Feature 1: AI Screening */}
                {/* Increased max-width to max-w-[1600px] for wider layout */}
                <section className="max-w-[1600px] mx-auto px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-2 gap-12 md:gap-24 items-start">
                    <div className="space-y-8 md:space-y-10 order-2 md:order-1 pt-4">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-medium mb-4">AI Screening</h2>
                            <p className="text-gray-600 text-lg mb-10">Shortlist resume based on Job profile</p>

                            <div className="space-y-2">
                                {screeningFeatures.map((feature, idx) => (
                                    <div key={idx} className="border-l-2 border-black pl-6 py-1">
                                        <h4 className="text-xl md:text-2xl font-medium">{feature.title}</h4>
                                        <p className="text-gray-600 mt-2">{feature.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Integration Block */}
                        <div className="mt-8 pt-4">
                            <p className="text-sm font-medium mb-3 uppercase tracking-wider text-gray-500">Integration</p>
                            <div className="flex items-center gap-4 mb-3">
                                <img
                                    src="/googlesheet-preview.png"
                                    alt="Integration"
                                    className="object-contain h-12 w-12"
                                />
                                <span className="font-medium text-lg">Google Sheets</span>
                            </div>
                            <p className="text-sm text-gray-600">Integrate with your candidate database seamlessly.</p>
                        </div>
                    </div>

                    {/* Feature 1 Image */}
                    <div className="order-1 md:order-2">
                        <img
                            src="/image copy 3.png"
                            alt="AI Screening Feature"
                            className="w-full h-auto object-cover shadow-lg rounded-lg"
                        />
                    </div>
                </section>

                {/* Feature 2: AI Interview */}
                <section className="max-w-[1600px] mx-auto px-6 md:px-12 py-12 md:py-24 grid md:grid-cols-2 gap-12 md:gap-24 items-center">

                    <div className="order-1">
                        <img
                            src="/interview-preview.png"
                            alt="AI Interview Feature"
                            className="w-full h-auto object-cover rounded-lg shadow-lg"
                        />
                    </div>

                    <div className="order-2 pl-0 md:pl-10">
                        <h2 className="text-3xl md:text-5xl font-medium mb-4">AI Interview</h2>
                        <p className="text-gray-600 text-lg mb-10">Take AI interview automatically</p>

                        {/* Language Toggle */}
                        <div className="flex gap-4 mb-12 overflow-x-auto pb-2">
                            {['English', 'Hindi'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setActiveLanguage(lang)}
                                    className={`px-8 py-3 rounded-lg text-base transition-all duration-200 whitespace-nowrap
                  ${activeLanguage === lang
                                            ? 'bg-[#1A1A1A] text-white font-medium shadow-lg'
                                            : 'bg-[#EAE8E0] text-[#1A1A1A] hover:bg-[#Ddddd5]'}`}
                                >
                                    {lang === 'Hindi' ? 'हिन्दी' : lang}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-8">
                            {interviewFeatures.map((feature, idx) => (
                                <div key={idx} className="border-l-2 border-black pl-6 py-1">
                                    <h4 className="text-xl md:text-2xl font-medium">{feature.title}</h4>
                                    <p className="text-gray-600 mt-2">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section - Single Custom Option */}
                <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-16">
                    <h2 className="text-3xl md:text-5xl font-medium text-center mb-8">Pricing</h2>

                    <div className="mt-8 flex justify-center">
                        <div className="w-full sm:w-10/12 md:w-8/12 bg-white rounded-3xl shadow-2xl p-8 md:p-12">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                <div className="flex-1">
                                    <h3 className="text-2xl md:text-3xl font-semibold mb-2 text-black">Custom Option</h3>
                                    <p className="text-gray-700 mb-4 max-w-xl">A tailored hiring package for your organization — we handle integrations, screening, and an end-to-end AI interview experience. Schedule a video meeting with our team to design a plan that fits your needs.</p>

                                    <ul className="space-y-2 text-gray-700 mb-6">
                                        <li className="flex items-start"><span className="mr-3 text-xl text-green-600"><GoCheckCircle /></span> Dedicated onboarding and integration</li>
                                        <li className="flex items-start"><span className="mr-3 text-xl text-green-600"><GoCheckCircle /></span> Priority support and custom workflows</li>
                                        <li className="flex items-start"><span className="mr-3 text-xl text-green-600"><GoCheckCircle /></span> Custom AI interviewer + voice & avatar options</li>
                                    </ul>
                                </div>

                                <div className="flex-shrink-0 flex flex-col items-center md:items-end gap-4">
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Pricing</div>
                                        <div className="text-2xl md:text-3xl font-bold text-black">Custom pricing</div>
                                    </div>

                                    <button onClick={() => navigate('/schedule')} className="mt-2 bg-black text-white px-6 py-3 rounded-full flex items-center gap-3 font-medium hover:scale-[1.02] transition-transform">
                                        Schedule a meeting
                                        <IoArrowForwardCircle size={20} />
                                    </button>

                                    {/* <button onClick={() => navigate('/contact')} className="mt-2 text-sm text-gray-600 underline">Contact sales</button> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-300 mt-12 py-10 bg-[#F3F1E7]">
                    <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">

                        <div className="flex flex-col items-center md:items-start">
                            <span className="font-bold text-2xl">Startwith_</span>
                            <span className="text-sm text-gray-500 mt-2">Startwith. All rights reserved. © 2025</span>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-base font-medium w-full md:w-auto">
                            {/* <button className="hover:underline py-2">Privacy Policy</button> */}
                            {/* <button className="hover:underline py-2">Terms and Conditions</button> */}
                            <a href="https://legal.startwith.live/privacy"><button className="hover:underline py-2">Privacy Policy</button></a>
                            <a href="https://legal.startwith.live/terms"><button className="hover:underline py-2">Terms and Conditions</button></a>
                            <a href="mailto:contact@startwith.live"><button className="hover:underline py-2">Contact Us</button></a>
                            {/* <button className="bg-[#EAE8E0] px-8 py-3 rounded-full hover:bg-[#dedcd3] w-full md:w-auto transition-colors">Contact Support</button> */}
                        </div>

                    </div>
                </footer>
            </div>
        </>
    )
}

export default App




