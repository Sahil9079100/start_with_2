import React from 'react';

function ExploreFeatures() {
  return (
    <section className="w-full bg-[#212121] text-white py-24 font-sans">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8">

        {/* Main Section Title */}
        <h2 className="text-4xl md:text-[44px] font-bold text-center mb-24 leading-tight tracking-tight">
          Explore more features in StartWith
        </h2>


        <div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-24 mb-32">

          {/* Left Column: Text Content */}
          <div className="flex-1 max-w-md flex flex-col gap-4 order-2 md:order-1 text-center md:text-left">
            <h3 className="text-2xl md:text-[32px] font-bold leading-tight">
              AI Screening
            </h3>
            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              No ATS Friendly
              Scan and assess any kind of Resume
            </p>

            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              Score
              Score based on Job fit for the company
            </p>

            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              Match
              Easy assessment with High match, Medium match, Low match and Unqualified
            </p>

            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              AI review
              Give candidate review based on its profile
            </p>

            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              Recommended Question
              Give candidate review based on its profile
            </p>

          </div>


          <div className="flex-1 order-1 md:order-2 w-full flex justify-center md:justify-end">
            {/* The light rounded container holding the phone */}
            <div className="bg-[#ffffff] rounded-[28px] w-fit aspect-square flex justify-center items-center relative overflow-hidden">

              <img
                src="https://startwith.live/image%20copy%203.png"
                alt="AI Screening Feature"
                className=" h-full object-contain rounded-[40px] z-10 relative"
              />
              {/* PLACEHOLDER FOR PHONE IMAGE
                 Replace the src below with the actual phone mockup image.
                 The classNames are set to replicate the look of the phone in the screenshot (rounded corners, border, shadow).
              */}
              {/* Subtle background gradient effect within the container */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* Feature Block 2: Search (Partial view as in image) */}


      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-8">


        {/* Feature Block 1: Voice */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-24">

          {/* Left Column: Text Content */}
          <div className="flex-1 max-w-md flex flex-col gap-4 order-2 md:order-1 text-center md:text-left">
            <h3 className="text-2xl md:text-[32px] font-bold leading-tight">
              Integrations
            </h3>
            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              Workday
            </p>
            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              Google Sheets
            </p>
            <p className="text-[#b4b4b4] text-lg leading-relaxed">
              Local .csv/.xlsx file
            </p>
          </div>

          {/* Right Column: Image Mockup Container */}
          <div className="flex-1 order-1 md:order-2 w-full flex justify-center md:justify-end">
            {/* The light rounded container holding the phone */}
            <div className="bg-[#fff] rounded-[48px] w-fit aspect-square flex justify-center items-center relative overflow-hidden">

              {/* PLACEHOLDER FOR PHONE IMAGE
                 Replace the src below with the actual phone mockup image.
                 The classNames are set to replicate the look of the phone in the screenshot (rounded corners, border, shadow).
              */}
              <img
                src="/allInte.png"
                alt="integrations"
                className="h-full object-contain rounded-[40px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] z-10 relative"
              />
              {/* Subtle background gradient effect within the container */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>


      </div>


    </section>
  );
}

export default ExploreFeatures;