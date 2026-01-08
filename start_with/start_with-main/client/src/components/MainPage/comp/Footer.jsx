import React from 'react';
import { Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#212121] text-white pt-16 pb-6 px-6 md:px-12 font-sans overflow-hidden">
      <div className="max-w-[1600px] mx-auto flex flex-col h-full">

        {/* Top Section: Logo & Links */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-24 md:mb-32">

          {/* OpenAI Logo */}
          <div className="mb-12 md:mb-0">
            {/*  */}
          </div>

          {/* Links Columns */}
          <div className="flex gap-16 w-full justify-around md:gap-32 text-[13px] md:text-sm">
            {/* <div className="flex gap-3">
              <span className="text-gray-500 font-medium mb-1">OpenAI</span>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Research</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Safety</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">API</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Sora</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">News</a>
            </div> */}

            <div className="flex gap-8">
              {/* <span className="text-gray-500 font-medium mb-1">Terms & Policies</span> */}
              {/* <a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Use</a> */}
              <a href="https://legal.startwith.live/privacy" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a>
              <a href="https://legal.startwith.live/terms" className="text-gray-300 hover:text-white transition-colors">Terms and Conditions</a>
              <a href="mailto:contact@startwith.co" className="text-gray-300 hover:text-white transition-colors">Contact Us</a>
            </div>
          </div>
        </div>

        {/* Big Text Section */}
        <div className="flex justify-center w-full mb-16 md:mb-24">
          <h1 className="text-[14vw] leading-none font-bold tracking-tighter text-white select-none">
            StartWith
          </h1>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-6">

          {/* Copyright */}
          <div className="text-xs text-gray-300 flex flex-wrap gap-1">
            <span>StartWith © 2025–2026</span>
            {/* <a href="#" className="underline decoration-1 underline-offset-2 hover:text-white ml-1">Manage cookies</a> */}
          </div>

          {/* Social Icons & Language */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-5 text-white">
              {/* X (Twitter) */}
              <a href="#" className="hover:text-gray-300 transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>
              {/* YouTube */}
              <a href="#" className="hover:text-gray-300 transition-colors">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>
              </a>
              {/* LinkedIn */}
              <a href="#" className="hover:text-gray-300 transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>
              </a>
              {/* GitHub */}
              {/* <a href="#" className="hover:text-gray-300 transition-colors"> */}
              {/* <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg> */}
              {/* </a> */}
              {/* Instagram */}
              <a href="#" className="hover:text-gray-300 transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.069-1.644-.069-4.849 0-3.204.012-3.584.069-4.849.149-3.228 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"></path></svg>
              </a>
              {/* TikTok */}
              {/* <a href="#" className="hover:text-gray-300 transition-colors"> */}
              {/* <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.55-1.1-.06-.06-.07-.07-.07-.07v6.16c-.01 2.83-1.9 5.38-4.66 6.32-2.91.99-6.14.37-8.47-1.63-2.31-2-2.97-5.26-1.66-7.96 1.3-2.69 4.14-4.22 7.08-3.83.24.03.48.08.71.14v4.23c-.76-.32-1.6-.32-2.34.02-1.07.49-1.74 1.6-1.67 2.78.07 1.25 1.09 2.27 2.33 2.33 1.23.06 2.33-.84 2.48-2.07.03-.23.03-.46 0-.69V.02z"></path></svg> */}
              {/* </a> */}
            </div>

            {/* <div className="flex items-center gap-2 text-[13px] font-medium text-gray-300 hover:text-white cursor-pointer transition-colors">
              <Globe size={16} />
              <span>English (US)</span>
            </div> */}
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;