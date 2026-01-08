import React from 'react';

function WritingFeature() {
  return (
    // Main Container - Dark Background (#212121)
    <section className="w-full bg-[#212121] text-white py-20 flex flex-col items-center">
      
      {/* Header Text */}
      <h2 className="text-3xl md:text-5xl font-bold text-center mb-6 tracking-tight">
AI Intervirew Portal
      </h2>
      
      <a href="#" className="text-[#b4b4b4] hover:text-white transition-colors text-base font-medium mb-12 flex items-center">
        Learn more about writing with StartWith 
        <span className="ml-1 text-xs">›</span>
      </a>

      {/* The Card Container */}
      <div className="relative w-full max-w-6xl px-4">
        
    
        <div className="relative bg-transparent rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex">
          
          {/* Inner Window Container (White Box) */}
          <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-inner flex justify-center items-center">
            
            {/* YOUR IMAGE GOES HERE 
                Replace 'your-image-url.jpg' with your actual image path.
                'object-contain' ensures the whole image is visible within the box.
            */}
            <img 
              src="https://startwith.live/interview-preview.png" 
              alt="Feature Preview" 
              className="w-full h-full object-contain" 
            />

          </div>
        </div>
      </div>
    </section>
  );
}

export default WritingFeature;