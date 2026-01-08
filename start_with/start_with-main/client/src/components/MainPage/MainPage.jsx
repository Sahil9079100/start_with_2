import React from 'react';
import WritingFeature from './comp/WritingFeature';
import ExploreFeatures from './comp/ExploreFeatures';
import PricingPage from './comp/PricingPage';
import Footer from './comp/Footer';
import { useNavigate } from 'react-router-dom';



// --- Data ---
const promptData = [
    "Champions League top scorers and match highlights",
    "How come orange juice prices have dropped?",
    "Give me ideas for what to do with my kids' art",
    "Help me study vocabulary for a college entrance exam",
    "How are oil prices impacting global energy markets",
    "Test my knowledge on ancient civilizations",
    "Help me pick an outfit that will look good on camera",
    "Write an email to request a quote from local plumbers",
    "Cycling groups open to beginners",
    "Write a Python script to automate sending daily email reports",
    "What's going on with the asteroid sample NASA brought back?",
    "Create a morning routine to boost my productivity",
    "Plan a 'mental health day' to relax",
    "Good brunch spots near me with outdoor seating",
    "Design a programming game teach basics in a fun way",
    "NBA draft prospects and scouting report",
    "Explain nostalgia to a kindergartener",
    "Plan a trip to experience Seoul like a local",
    "Create a content calendar for a TikTok account",
];

// --- Internal CSS for Animation & Masking ---
const styles = `
  @keyframes scrollLeftToRight {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  
  @keyframes scrollRightToLeft {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .animate-marquee-ltr {
    animation: scrollLeftToRight 80s linear infinite;
  }
  
  .animate-marquee-rtl {
    animation: scrollRightToLeft 80s linear infinite;
  }

  /* Pause animation on hover */
  .group:hover .animate-marquee-ltr,
  .group:hover .animate-marquee-rtl {
    animation-play-state: paused;
  }

  /* Blur Effect (Mask) for the edges */
  .mask-gradient {
    mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
  }
`;

// --- Components ---

function Header() {
    const navLinks = ["About", "Features", "Learn", "Business", "Pricing", "Download"];

    return (
        <header className="flex items-center justify-between px-6 py-4 w-full max-w-[1600px] mx-auto z-10 relative">
            <div className="text-lg font-bold tracking-tight text-white">StartWith_</div>

            {/* <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-[#b4b4b4]">
                {navLinks.map((link) => (
                    <a key={link} href="#" className="hover:text-white transition-colors">
                        {link}
                    </a>
                ))}
            </nav> */}

            <div>
                <a href="/l/o" className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">
                    Sign In
                </a>
            </div>
        </header>
    );
}

function HeroSection() {
    const navigate = useNavigate();
    return (
        <section className="flex-grow flex flex-col items-center justify-center  h-[74vh] text-center px-4 mt-20 mb-12 z-10 relative">
            <h2 className="text-[#b4b4b4] text-sm font-medium mb-5 tracking-wide">
                StartWith_
            </h2>

            <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1] mb-6 text-white">
                AI Sorting and AI Interviewer
                <br />

            </h1>

            <p className="text-[#b4b4b4] text-lg md:text-xl max-w-2xl mx-auto mb-8 font-normal">
                Find the best match for your organization, and get interviewed by AI
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <button onClick={() => { navigate("/schedule") }} className="bg-white text-black text-base font-medium px-6 py-3 rounded-full hover:bg-gray-200 transition-colors flex items-center">
                    Book a demo
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 ml-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>

                {/* <a href="#" className="text-[#b4b4b4] text-base font-medium px-4 py-3 hover:text-white transition-colors flex items-center">
                    Book a demo
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 ml-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </a> */}
            </div>
        </section>
    );
}

function MarqueeRow({ items, direction = 'ltr' }) {
    // We double the items to ensure seamless scrolling
    const content = [...items, ...items];

    // Choose animation class based on direction (ltr = left to right)
    const animClass = direction === 'ltr' ? 'animate-marquee-ltr' : 'animate-marquee-rtl';

    return (
        // 'mask-gradient' class applies the blur effect to the edges
        <div className="flex overflow-hidden w-full mb-3 group mask-gradient relative">
            <div className={`flex gap-3 whitespace-nowrap ${animClass} w-max`}>
                {content.map((prompt, index) => (
                    <div
                        key={`${index}-${prompt}`}
                        // Updated bg color to #2f2f2f to stand out against the #212121 background
                        className="bg-[#2f2f2f] p-4 rounded-xl text-sm font-medium text-[#ececec] hover:bg-[#424242] transition-colors cursor-pointer w-[260px] h-[100px] flex-shrink-0 flex flex-col justify-between whitespace-normal leading-snug select-none"
                    >
                        {prompt}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PromptGrid() {
    // Slice data for different rows
    const row1 = promptData.slice(0, 7);
    const row2 = promptData.slice(7, 13);
    const row3 = promptData.slice(13, promptData.length);

    return (
        // <div className="w-full pb-8 flex flex-col overflow-hidden">
        //   {/* direction="ltr" -> Moves Left to Right 
        //      direction="rtl" -> Moves Right to Left
        //   */}
        //   <MarqueeRow items={row1} direction="ltr" />
        //   <MarqueeRow items={row2} direction="rtl" />
        //   <MarqueeRow items={row3} direction="ltr" />
        // </div>
        <></>
    );
}

// --- Main App Component ---

function App() {
    return (
        <>
            {/* Injecting styles here */}
            <style>{styles}</style>

            {/* Changed bg-black to bg-[#212121] as requested */}
            <div className="min-h-screen flex flex-col bg-[#212121] text-white font-sans overflow-x-hidden">
                <Header />

                <main className="flex-grow flex flex-col justify-between">
                    <HeroSection />
                    <PromptGrid />
                    <WritingFeature />
                    <ExploreFeatures />
                    <PricingPage />
                    <Footer />
                </main>
            </div>
        </>
    );
}

export default App;