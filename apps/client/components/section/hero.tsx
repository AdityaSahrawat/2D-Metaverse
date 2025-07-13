

import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 border border-blue-500/20 rounded-lg rotate-12 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border border-purple-500/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-32 left-20 w-40 h-40 border border-cyan-500/20 transform rotate-45 animate-spin-slow"></div>
        <div className="absolute top-60 right-40 w-16 h-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg animate-float"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Step Into
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                the Metaverse
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed">
              Explore immersive virtual worlds, socialize with friends, and create your own experiences.
            </p>
            
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 text-lg rounded-full transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25">
              Get Started
            </Button>
          </div>
          
          {/* Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://img.freepik.com/premium-photo/topdown-view-modern-office-space-layout-with-kitchen-meeting-area-desks_559896-31749.jpg" 
                alt="Top-down view of modern office space layout showing virtual workspace areas like Gather.town"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
            </div>
            
            {/* Floating elements around the image */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse opacity-80"></div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 border-2 border-cyan-400/50 rounded-full animate-spin-slow"></div>
          </div>
        </div>
      </div>
      
      {/* Floating geometric shapes */}
      <div className="absolute top-1/4 right-10 w-20 h-20 border-2 border-blue-400/30 rotate-45 animate-float"></div>
      <div className="absolute bottom-1/3 right-1/4 w-32 h-32 border border-purple-400/20 rounded-full animate-pulse"></div>
    </section>
  );
};

export default Hero;