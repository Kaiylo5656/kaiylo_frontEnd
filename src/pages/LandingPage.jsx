import React, { useEffect, useRef } from 'react';
import DashboardShowcase from '../components/DashboardShowcase';
import DashboardCoachCard from '../components/DashboardCoachCard';
import BetaSignupSection from '../components/BetaSignupSection';

const LandingPage = () => {
  const canvasRef = useRef(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    
    // Star properties
    const stars = [];
    // maxStars is defined later
    const trailLength = 15; // Kept if needed, or remove if unused. Let's just keep 'stars' here for scope if needed, but remove maxStars.
    
    // Mouse tracking
    const mouse = { x: width / 2, y: height / 2 };
    
    // Handle resize
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    // Track mouse
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Dot class for "Rising Particles"
    class Star {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5 + 0.5; // Small, varying sizes
        // Upward velocity: varies between -0.3 and -0.8 pixels per frame
        this.speedY = -Math.random() * 0.5 - 0.3; 
        this.opacity = Math.random() * 0.5 + 0.1; // Varied opacity for depth
      }

      update() {
        // Move up
        this.y += this.speedY;
        
        // Reset when moving off top of screen
        if (this.y < 0) {
          this.y = height;
          this.x = Math.random() * width; // Randomize X again for variety
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
      }
    }

    // Initialize stars
    const maxStars = 80; // More particles for a nice density
    for (let i = 0; i < maxStars; i++) {
      stars.push(new Star());
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw static background/glow effect via canvas if needed, 
      // but we will do the main gradient in CSS/Divs to match the "aurora" style better.
      // We'll just draw stars here.

      stars.forEach(star => {
        star.update();
        star.draw();
      });

      requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const [isLoaded, setIsLoaded] = React.useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#09090b] text-white selection:bg-[#d4845a] selection:text-white">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">

        {/* Radial Vignette/Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/50 to-[#09090b]"></div>
        {/* Primary Intense Blue Glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#0055ff]/40 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
        {/* Secondary Cyan Core for "Hot" Center */}
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/20 blur-[90px] rounded-full mix-blend-screen pointer-events-none"></div>
      </div>

      {/* Canvas for Rising Dots */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* Hero Section */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-32">
        
        {/* Hero Content Wrapper */}
        <div className="flex flex-col items-center text-center max-w-[1000px] mx-auto gap-8">
          
          {/* Badge / Label (Optional aesthetic touch common in Cobalt style) */}
          <div 
            className={`transition-all duration-1000 ease-out delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-zinc-400 font-['Inter'] tracking-wide">
              Bêta Privée
            </span>
          </div>

          {/* Main Heading */}
          <h1 
            className={`font-['Inter'] font-semibold text-5xl md:text-7xl tracking-tight leading-[1.1] text-white transition-all duration-1000 ease-out delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            Tu passes plus de temps à <span className="text-[#D4845A]">organiser</span> <br className="hidden md:block"/>
            qu’à coacher ?
          </h1>

          {/* Subtext */}
          <p 
            className={`font-['Inter'] text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed transition-all duration-1000 ease-out delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            Kaiylo centralise tout ce dont tu as besoin pour coacher tes élèves en <strong className="text-[#D4845A] font-medium">streetlifting</strong> : programmes, feedbacks vidéos, suivi de progression et paiements.
          </p>

          {/* CTA Section */}
          <div 
            className={`flex flex-col sm:flex-row items-center gap-4 mt-4 w-full max-w-md transition-all duration-1000 ease-out delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
             {/* Input */}
             <div className="relative w-full group">
                <input 
                  type="email" 
                  placeholder="Ton email professionnel" 
                  className="w-full h-12 bg-zinc-900/50 border border-zinc-800 rounded-full px-5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                />
             </div>
             
             {/* Button */}
             <button className="group relative h-12 w-full sm:w-auto px-8 bg-[#D4845A] text-white hover:bg-[#bf7348] font-medium rounded-full text-sm transition-colors whitespace-nowrap overflow-hidden">
               <span className="relative z-10">Rejoins la liste</span>
               <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] group-hover:left-[100%] transition-[left] duration-700 ease-in-out" />
             </button>
          </div>

          {/* Footer/Social Proof Text */}
          <p 
            className={`text-xs text-zinc-600 mt-4 transition-all duration-1000 ease-out delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            Laisse tes coordonnées ci-dessus pour faire partie des premiers à accéder à la bêta de Kaiylo (l’accès est limité aux premiers inscrits).
          </p>
        </div>

      </div>

      {/* Pain Points Section */}
      <PainPointsSection />

      {/* Dashboard Coach Card */}
      <DashboardCoachCard />

      {/* 3D Dashboard Showcase */}
      <DashboardShowcase />

      {/* Beta Signup Section */}
      <BetaSignupSection />
    </div>
  );
};

export default LandingPage;

const PainPointsSection = () => {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, []);

  return (
    <div 
      ref={sectionRef} 
      className="relative w-full min-h-[800px] flex items-center justify-center bg-[#050505] overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/C:/Users/kheff/.gemini/antigravity/brain/5a4be2fd-c955-41b2-b4d3-55fae37e0008/dark_gym_athlete_back_1769875585172.png" 
          alt="Athlete Back" 
          className="w-full h-full object-cover opacity-40 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]" />
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col gap-12 max-w-[1000px] px-6 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
        
        <h2 className="text-white text-4xl md:text-[50px] font-['Inter'] font-light text-center mb-8">
           Tu te reconnais ?
        </h2>

        <div className="flex flex-col gap-6">
          <CheckItem text="Tu passes ton temps à jongler entre Google Sheets, WhatsApp, Drive et Insta ?" delay="200ms" isVisible={isVisible} />
          <CheckItem text="Tu perds du temps à tout faire à la main : relances, suivi, vidéos, paiements." delay="400ms" isVisible={isVisible} />
          <CheckItem text="Tu as l’impression de plafonner alors que tu pourrais gérer plus d’élèves sans sacrifier de qualité." delay="600ms" isVisible={isVisible} />
        </div>

      </div>
    </div>
  );
};

const CheckItem = ({ text, delay, isVisible }) => (
  <div 
    className={`flex items-start gap-4 text-white/80 text-lg md:text-xl font-['Inter'] font-light transition-all duration-1000`}
    style={{ transitionDelay: delay, opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)' }}
  >
    <svg className="w-6 h-6 text-[#d4845a] flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>{text}</span>
  </div>
);
