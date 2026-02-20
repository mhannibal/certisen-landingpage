import React from 'react';

const SolutionDiagram = () => {
  return (
    <div className="flex flex-col items-center w-full min-w-[1000px] p-8 bg-white font-sans text-gray-900">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-serif mb-4">Our Solution</h1>
        <h2 className="text-2xl font-serif text-gray-800">
          Design Phase: Pre-Deployment Network Verification at ASIL-D Confidence Level
        </h2>
      </div>

      {/* Diagram Container */}
      <div className="relative w-full max-w-[1100px] h-[400px] mt-8">
        
        {/* === RED FEEDBACK LOOP ("Not passed") === */}
        <div className="absolute top-0 left-[10%] w-[42%] h-[120px] border-t-4 border-l-4 border-red-600">
          {/* Arrow head */}
          <div className="absolute -left-[14px] bottom-0 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-red-600"></div>
          {/* Label */}
          <div className="absolute -top-5 left-[45%] bg-white border border-gray-500 px-4 py-1 text-lg">
            Not passed
          </div>
        </div>

        {/* === MAIN HORIZONTAL FLOW === */}
        <div className="absolute top-[120px] w-full flex items-center justify-between">
          
          {/* 1. Existing Tools Node */}
          <div className="flex flex-col items-center w-[200px] relative z-10">
            {/* Laptop SVG */}
            <svg width="100" height="80" viewBox="0 0 100 80" className="mb-2">
              <path d="M10,60 L90,60 L85,10 L15,10 Z" fill="#2563eb" />
              <rect x="18" y="15" width="64" height="40" fill="white" />
              {/* Chart elements */}
              <rect x="25" y="35" width="6" height="15" fill="#3b82f6" />
              <rect x="35" y="25" width="6" height="25" fill="#f43f5e" />
              <rect x="45" y="30" width="6" height="20" fill="#10b981" />
              <path d="M25,40 L40,50 L55,35 L70,45 L75,40" fill="none" stroke="black" strokeWidth="2" />
              <path d="M65,40 L75,40 L75,50" fill="none" stroke="black" strokeWidth="2" />
              {/* Laptop base */}
              <path d="M5,60 L95,60 L100,70 L0,70 Z" fill="#38bdf8" />
              <rect x="40" y="63" width="20" height="3" fill="white" rx="1" />
            </svg>
            <span className="text-xl mb-2">Existing tools</span>
            <div className="border border-gray-500 px-4 py-2 text-center w-full text-lg">
              Modelling<br />Performance Analysis
            </div>
          </div>

          {/* 2. Yellow Arrow & Cloud */}
          <div className="flex-1 flex flex-col items-center relative h-full justify-end pb-8">
            {/* Cloud SVG (Floating above) */}
            <svg width="120" height="80" viewBox="0 0 120 80" className="absolute -top-16">
              <defs>
                <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
              <path d="M30,60 C15,60 10,45 20,35 C20,20 40,15 50,25 C60,5 90,10 95,30 C110,35 110,60 90,60 Z" fill="none" stroke="url(#cloudGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            {/* Yellow Arrow Line */}
            <div className="w-full flex items-center mb-8 relative">
              <div className="h-1 bg-yellow-400 w-full"></div>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-yellow-400"></div>
            </div>
            {/* Label */}
            <div className="absolute bottom-[-10px] bg-white border border-gray-500 px-4 py-1 text-lg">
              Formal check
            </div>
          </div>

          {/* 3. CertiSen Core Node */}
          <div className="flex flex-col items-center w-[200px] relative z-10 pt-16">
            <div className="relative">
              {/* Monitor SVG */}
              <svg width="90" height="80" viewBox="0 0 90 80">
                <rect x="5" y="5" width="80" height="55" fill="white" stroke="black" strokeWidth="3" rx="2" />
                <rect x="35" y="60" width="20" height="15" fill="black" />
                <rect x="20" y="75" width="50" height="4" fill="black" />
                {/* Code lines */}
                <line x1="15" y1="15" x2="40" y2="15" stroke="black" strokeWidth="3" strokeLinecap="round" />
                <line x1="15" y1="25" x2="30" y2="25" stroke="black" strokeWidth="3" strokeLinecap="round" />
                <line x1="15" y1="35" x2="45" y2="35" stroke="black" strokeWidth="3" strokeLinecap="round" />
                <line x1="15" y1="45" x2="35" y2="45" stroke="black" strokeWidth="3" strokeLinecap="round" />
                <line x1="15" y1="50" x2="60" y2="50" stroke="black" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {/* Green Check Badge */}
              <svg width="50" height="50" viewBox="0 0 50 50" className="absolute -top-6 -right-6">
                <circle cx="25" cy="25" r="22" fill="#22c55e" stroke="white" strokeWidth="2" />
                <circle cx="25" cy="25" r="18" fill="none" stroke="white" strokeWidth="1.5" />
                <path d="M15,25 L22,32 L35,15" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl mt-4">CertiSen Core</span>
          </div>

          {/* 4. Green Arrow (Passed) */}
          <div className="flex-1 flex flex-col items-center relative h-full justify-end pb-[70px]">
            {/* Green Arrow Line */}
            <div className="w-full flex items-center relative">
              <div className="h-1 bg-green-500 w-full"></div>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-green-500"></div>
            </div>
            {/* Label */}
            <div className="absolute bottom-[20px] bg-white border border-gray-500 px-4 py-1 text-lg">
              Passed
            </div>
          </div>

          {/* 5. Validation Node */}
          <div className="flex flex-col items-center w-[150px] relative z-10 pt-4">
            <div className="border border-gray-500 px-4 py-1 mb-6 text-lg bg-white">
              Validation
            </div>
            <div className="relative">
              {/* Clipboard SVG */}
              <svg width="80" height="100" viewBox="0 0 80 100">
                <rect x="10" y="15" width="60" height="80" fill="white" stroke="black" strokeWidth="4" rx="5" />
                <path d="M25,15 V10 C25,5 30,0 40,0 C50,0 55,5 55,10 V15 Z" fill="black" />
                <circle cx="40" cy="10" r="3" fill="white" />
                {/* Checklist items */}
                <path d="M20,35 L25,40 L35,30" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
                <line x1="40" y1="35" x2="60" y2="35" stroke="black" strokeWidth="4" strokeLinecap="round" />
                <path d="M20,55 L25,60 L35,50" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
                <line x1="40" y1="55" x2="60" y2="55" stroke="black" strokeWidth="4" strokeLinecap="round" />
                <path d="M20,75 L25,80 L35,70" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
                <line x1="40" y1="75" x2="55" y2="75" stroke="black" strokeWidth="4" strokeLinecap="round" />
              </svg>
              {/* Ribbon Seal */}
              <svg width="50" height="60" viewBox="0 0 50 60" className="absolute -bottom-6 -right-6">
                <path d="M15,40 L10,55 L25,50 L40,55 L35,40 Z" fill="black" />
                <circle cx="25" cy="25" r="20" fill="black" />
                <circle cx="25" cy="25" r="16" fill="black" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
                <path d="M18,25 L23,30 L32,18" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* 6. Branching Green Arrows to Vehicles */}
          <div className="w-[150px] flex flex-col items-center justify-center relative h-[250px] pt-12">
            {/* Vertical Split Line */}
            <div className="absolute left-6 top-[20px] bottom-[20px] w-1 bg-green-500"></div>
            {/* Connecting horizontal line from Validation to Vertical Split */}
            <div className="absolute left-0 top-[115px] w-6 h-1 bg-green-500"></div>

            {/* Top Branch (Car) */}
            <div className="absolute top-[20px] left-6 w-full flex items-center">
              <div className="h-1 bg-green-500 w-12"></div>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-green-500"></div>
              {/* Car SVG */}
              <svg width="80" height="40" viewBox="0 0 80 40" className="ml-2">
                <path d="M10,25 Q10,15 25,15 L35,5 Q40,0 50,0 L60,0 Q65,0 70,10 L75,15 Q80,15 80,25 L80,30 Q80,35 75,35 L5,35 Q0,35 0,30 L0,25 Z" fill="white" stroke="black" strokeWidth="3" />
                <path d="M30,15 L40,5 L55,5 L65,15 Z" fill="none" stroke="black" strokeWidth="2" />
                <circle cx="20" cy="35" r="6" fill="white" stroke="black" strokeWidth="3" />
                <circle cx="60" cy="35" r="6" fill="white" stroke="black" strokeWidth="3" />
              </svg>
            </div>

            {/* Bottom Branch (Train) */}
            <div className="absolute bottom-[40px] left-6 w-full flex items-center">
              <div className="h-1 bg-green-500 w-12"></div>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-green-500"></div>
              {/* Train SVG */}
              <svg width="80" height="40" viewBox="0 0 80 40" className="ml-2">
                <path d="M5,10 L60,10 Q70,10 75,20 L75,30 L5,30 Z" fill="black" />
                <rect x="5" y="15" width="20" height="8" fill="white" />
                <rect x="30" y="15" width="20" height="8" fill="white" />
                <rect x="5" y="35" width="70" height="3" fill="black" />
                <path d="M75,30 Q75,25 70,25" fill="none" stroke="white" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolutionDiagram;