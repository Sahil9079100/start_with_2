import React, { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-black border-b-2 border-orange-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
            
          {/* Logo / Brand */}
          <div className="flex-shrink-0 flex items-center">
            <span className="text-3xl font-bold text-orange-500 tracking-tighter">
              BRAND<span className="text-white">.</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            <a href="#" className="text-gray-300 hover:text-orange-500 font-medium transition duration-300">Home</a>
            <a href="#" className="text-gray-300 hover:text-orange-500 font-medium transition duration-300">Services</a>
            <a href="#" className="text-gray-300 hover:text-orange-500 font-medium transition duration-300">About</a>
            <a href="#" className="bg-orange-600 hover:bg-orange-700 text-black font-bold py-2 px-6 rounded transition duration-300">
              Contact
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-orange-500 focus:outline-none"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-neutral-900 border-t border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#" className="block px-3 py-2 text-base font-medium text-white hover:text-orange-500">Home</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-orange-500">Services</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-orange-500">About</a>
            <a href="#" className="block px-3 py-2 text-base font-bold text-orange-500">Contact Us</a>
          </div>
        </div>
      )}
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="bg-black border-t-2 border-orange-600 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-3xl font-bold text-orange-500 mb-4">BRAND.</h3>
            <p className="text-gray-400 max-w-sm">
              Crafting digital experiences with precision and passion. 
              We build the future using black and orange.
            </p>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4">Explore</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-500 hover:text-orange-500 transition">Design</a></li>
              <li><a href="#" className="text-gray-500 hover:text-orange-500 transition">Development</a></li>
              <li><a href="#" className="text-gray-500 hover:text-orange-500 transition">Marketing</a></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-500 hover:text-orange-500 transition">Careers</a></li>
              <li><a href="#" className="text-gray-500 hover:text-orange-500 transition">Legal</a></li>
              <li><a href="#" className="text-gray-500 hover:text-orange-500 transition">Privacy</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} Brand Inc. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            {/* Social Placeholders */}
            <div className="w-6 h-6 bg-gray-800 hover:bg-orange-500 rounded-full cursor-pointer transition"></div>
            <div className="w-6 h-6 bg-gray-800 hover:bg-orange-500 rounded-full cursor-pointer transition"></div>
            <div className="w-6 h-6 bg-gray-800 hover:bg-orange-500 rounded-full cursor-pointer transition"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Layout Component
const LandingPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-950">
      <Navbar />
      
      {/* Main Content Area (Placeholder) */}
      <main className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            BUILD <span className="text-orange-500">BOLD</span>.
          </h1>
          <p className="text-gray-500">Content goes here.</p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;