import React from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PricingPage = () => {
    const navigate = useNavigate();
    const plans = [
        {
            name: "Custom Option",
            description: "A tailored hiring package for your organization — we handle integrations, screening, and an end-to-end AI interview experience. Schedule a video meeting with our team to design a plan that fits your needs",
            price: "Custom pricing",
            features: [
                "Dedicated onboarding and integration",
                "Priority support and custom workflows",
                "Custom AI interviewer + voice & avatar options",
            ],
            // footerNote: "Have an existing plan? See billing help",
            buttonText: "Schedule a meeting",
        },

    ];

    return (
        <div className="min-h-screen bg-[#212121] text-white p-6 md:p-12 font-sans flex flex-col items-center justify-center">
            <div className="max-w-7xl w-full space-y-12">

                {/* Pricing Grid */}
                <div className="flex justify-center gap-6">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className="flex flex-col h-full p-6 rounded-lg border border-white/10 hover:border-white/20 transition-colors duration-300 max-w-md w-full"
                        >
                            <div className="mb-6">
                                <h3 className="text-xl font-medium mb-1">{plan.name}</h3>
                                <p className="text-sm text-gray-300">{plan.description}</p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-grow">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start text-[13px] leading-5 text-gray-200">
                                        <span className="mr-3 mt-0.5 text-white">
                                            <Check size={14} strokeWidth={3} />
                                        </span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {plan.footerNote && (
                                <div className="text-xs text-gray-400 mb-4 italic border-b border-transparent">
                                    {plan.footerNote.includes("billing help") ? (
                                        <>
                                            Have an existing plan? See <span className="underline cursor-pointer">billing help</span>
                                        </>
                                    ) : (
                                        <>
                                            {plan.footerNote.split('Learn more')[0]}
                                            <span className="underline cursor-pointer">Learn more</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="mt-auto">
                                <div className="flex items-baseline mb-4">
                                    <span className="text-2xl font-semibold mr-1">₹{plan.price}</span>
                                    <span className="text-sm text-gray-400">/ month</span>
                                </div>

                                <div onClick={() => { navigate("/schedule") }} className="flex items-center gap-4">
                                    <button className="flex items-center justify-center gap-2 bg-white text-black text-sm font-medium py-2 px-4 rounded-full hover:bg-gray-200 transition-colors">
                                        {plan.buttonText}
                                        <ArrowUpRight size={16} />
                                    </button>

                                    {plan.footerLink && (
                                        <button className="text-xs text-gray-400 flex items-center hover:text-white transition-colors">
                                            {plan.footerLink} <span className="ml-1 text-[10px]">&gt;</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Banner */}
                {/* <div className="bg-[#262626] rounded-xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl md:text-3xl font-medium mb-2">
              Join hundreds of millions of users and try ChatGPT today.
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <button className="flex items-center gap-2 bg-white text-black font-medium py-2.5 px-5 rounded-full hover:bg-gray-200 transition-colors text-sm">
              Try StartWith
              <ArrowUpRight size={16} />
            </button>
        
      
      
          </div>
        </div> */}

            </div>
        </div>
    );
};

export default PricingPage;