
import { Button } from "@/components/ui/button";

const CTA = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-1/4 w-40 h-40 border border-blue-400/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-1/4 w-32 h-32 border border-purple-400/10 transform rotate-45 animate-spin-slow"></div>
      </div>
      
      <div className="container mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
          Create Your Space Today
        </h2>
        
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 text-lg rounded-full transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25">
          Get Started
        </Button>
      </div>
    </section>
  );
};

export default CTA;