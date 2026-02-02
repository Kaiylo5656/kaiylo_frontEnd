import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const DashboardShowcase = () => {
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Tilt effect: Strong symmetric tilt for "upward and downward" motion
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40]);

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

  return (
    <section ref={containerRef} className="relative w-full py-32 min-h-screen flex flex-col items-center justify-center perspective-1000">
      
      {/* Background Glow for this section */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] bg-[#d4845a]/10 blur-[120px] rounded-full -z-10" />

      <div className="container mx-auto px-4 z-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-['Inter'] text-white mb-6">
            Tout ton <span className="text-[#d4845a]">coaching</span> au même endroit
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Une interface pensée pour les coachs, par des coachs.
          </p>
        </motion.div>

        {/* 3D Dashboard Container */}
        {/* Removed overflow-hidden from parent section to allow 3D elements to extend if needed, added more vertical padding */}
        <div className="relative w-full max-w-[1200px] px-4 perspective-[1200px]">
          <motion.div
            style={{ 
              rotateX,
              scale,
            }}
            className="w-full relative rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden"
          >
            {/* Using the captured coach dashboard screenshot */}
            {/* Changed to w-full h-auto to let the image define the aspect ratio, avoiding black bars */}
            <img 
               src="/dashboard-ui.png" 
               alt="Kaiylo Dashboard Interface" 
               className="w-full h-auto"
            />
            
            {/* Reflection/Sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DashboardShowcase;
