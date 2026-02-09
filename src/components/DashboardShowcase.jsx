import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const DashboardShowcase = ({ isActive, children }) => {
    const containerRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Manual scroll progress tracking (avoids useScroll warning)
    const scrollProgress = useMotionValue(0);
    const smoothProgress = useSpring(scrollProgress, { stiffness: 100, damping: 30 });

    const views = [
        "/Landingpage/page-db.png",
        "/Landingpage/page-clients.png",
        "/Landingpage/page-entrainement.png",
        "/Landingpage/page-periodisation.png"
    ];

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % views.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + views.length) % views.length);
    };

    // Auto-scroll effect
    useEffect(() => {
        const timer = setInterval(() => {
            nextSlide();
        }, 5000);

        return () => clearInterval(timer);
    }, [views.length]);

    // Custom scroll tracking that avoids the "static position" warning
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            
            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // Calculate progress: 0 when element enters viewport, 1 when it leaves
            // "start end" to "end start" offset
            const start = windowHeight; // Element top at viewport bottom
            const end = -rect.height; // Element bottom at viewport top
            const current = rect.top;
            
            const progress = Math.max(0, Math.min(1, (start - current) / (start - end)));
            scrollProgress.set(progress);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial calculation

        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrollProgress]);

    // Tilt effect: Strong symmetric tilt for "upward and downward" motion
    // Map 0-1 progress to rotation: 40 -> 0 -> -40
    const rotateX = useSpring(
        useMotionValue(0),
        { stiffness: 100, damping: 30 }
    );
    
    const scale = useSpring(
        useMotionValue(1),
        { stiffness: 100, damping: 30 }
    );

    // Update transforms based on scroll progress (subtle tilt and scale)
    useEffect(() => {
        const unsubscribe = smoothProgress.on('change', (v) => {
            // rotateX: subtle 12° at 0, 0 at 0.5, -12° at 1
            const newRotateX = 12 - (v * 24);
            rotateX.set(newRotateX);
            
            // scale: 0.94 at edges, 1 at center
            const newScale = 0.94 + (0.06 * (1 - Math.abs(v - 0.5) * 2));
            scale.set(newScale);
        });

        return () => unsubscribe();
    }, [smoothProgress, rotateX, scale]);

    return (
        <section ref={containerRef} className="relative z-10 w-full py-0 min-h-screen flex flex-col items-center justify-center perspective-1000 overflow-hidden">
            
            {/* Background Glow for this section - Accentuated */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-[600px] bg-[#d4845a]/30 blur-[140px] rounded-full -z-10" />

            <div className="container mx-auto px-4 z-10 flex flex-col items-center">
                {React.Children.toArray(children)[0]}
                <div className="w-full flex flex-col items-center pt-20 pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-center mb-16"
                    >
                        <h2 className="font-['Inter'] font-light text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.2] text-white mb-6">
                            Tout ton <span className="bg-gradient-to-r from-[#D4845A] to-[#A05A3A] bg-clip-text text-transparent font-normal">coaching</span> au même endroit
                        </h2>
                        <p className="font-['Inter'] font-light text-sm md:text-base lg:text-base text-white/50 max-w-2xl mx-auto leading-relaxed">
                            Une interface pensée pour les coachs StreetLifting
                        </p>
                    </motion.div>

                    <div className="relative w-full max-w-[1000px] md:max-w-[1200px] px-6 perspective-[1200px] flex items-center justify-center gap-4 md:gap-0">
                    <button
                        onClick={prevSlide}
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-white/25 hover:text-[#d4845a] hover:scale-110 transition-all font-light z-20 md:absolute md:left-[-60px] md:top-1/2 md:-translate-y-1/2"
                    >
                        <ChevronLeft className="w-8 h-8 stroke-[1]" />
                    </button>

                    <motion.div
                        style={{
                            rotateX,
                            scale,
                        }}
                        className="flex-1 min-w-0 w-full relative rounded-xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden antialiased will-change-transform"
                    >


                        {/* Mac Browser Header */}
                        <div className="h-10 bg-[#1e1e1e] border-b border-white/5 flex items-center px-4 w-full relative z-20">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-[#2a2a2a] px-3 py-1 rounded-md text-[11px] font-medium text-white/40 border border-white/5 flex items-center gap-1.5 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-white/10" />
                                    app.kaiylo.com
                                </div>
                            </div>
                        </div>

                        {/* Carousel Container */}
                        <div className="relative w-full h-auto group/carousel bg-[#050505]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    className="w-full flex items-center justify-center p-0"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <img
                                        src={views[currentIndex]}
                                        alt="Kaiylo Dashboard Interface"
                                        className="w-full h-auto object-contain"
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* Reflection/Sheen overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-10" />


                        </div>
                    </motion.div>

                    <button
                        onClick={nextSlide}
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-white/25 hover:text-[#d4845a] hover:scale-110 transition-all font-light z-20 md:absolute md:right-[-60px] md:top-1/2 md:-translate-y-1/2"
                    >
                        <ChevronRight className="w-8 h-8 stroke-[1]" />
                    </button>
                    </div>
                </div>
                {React.Children.toArray(children)[1]}
            </div>
        </section>
    );
};

export default DashboardShowcase;
