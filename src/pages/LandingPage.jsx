import React, { useEffect, useRef } from 'react';
import DashboardShowcase from '../components/DashboardShowcase';
import BorderBeam from '../components/ui/BorderBeam';
import DashboardCoachCard from '../components/DashboardCoachCard';
import BetaSignupSection from '../components/BetaSignupSection';

const LandingPage = () => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isEmailFocused, setIsEmailFocused] = React.useState(false);

  useEffect(() => {
    setIsLoaded(true);
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen text-white selection:bg-[#d4845a] selection:text-white" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Image de fond */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
          backgroundColor: '#0a0a0a'
        }}
      />

      {/* Layer blur sur l'écran */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(100px)',
          backgroundColor: 'rgba(0, 0, 0, 0.01)',
          zIndex: 6,
          pointerEvents: 'none',
          opacity: 1
        }}
      />

      {/* Hero Section */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-32">

        {/* Logo en haut à gauche */}
        <div className="absolute top-6 left-6 md:top-8 md:left-8 z-20">
          <img
            src="/logo-full.svg"
            alt="Kaiylo Logo"
            className="h-6 md:h-7 w-auto"
          />
        </div>

        {/* Hero Content Wrapper */}
        <div className="flex flex-col items-center text-center max-w-[1000px] mx-auto">

          {/* Badge / Label (Optional aesthetic touch common in Cobalt style) */}
          <div
            className={`mb-12 transition-all duration-1000 ease-out delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-zinc-400 font-['Inter'] tracking-wide">
              Bêta Privée
            </span>
          </div>

          {/* Main Heading */}
          <h1
            className={`mb-12 font-['Inter'] font-light text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.2] text-white transition-all duration-1000 ease-out delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            Tu passes plus de temps à <span className="bg-gradient-to-r from-[#D4845A] to-[#A05A3A] bg-clip-text text-transparent font-normal">organiser</span><br />
            qu'à coacher ?
          </h1>

          {/* Subtext */}
          <p
            className={`mb-12 font-['Inter'] font-light text-sm md:text-base lg:text-base text-white/50 max-w-2xl leading-relaxed transition-all duration-1000 ease-out delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ opacity: 1 }}
          >
            Kaiylo centralise tout ce dont tu as besoin pour coacher tes élèves en <strong className="text-[#D4845A] font-medium" style={{ opacity: 1 }}>streetlifting</strong> : programmes, feedbacks vidéos, suivi de progression.
          </p>

          {/* CTA Section */}
          <div
            className={`w-full max-w-md transition-all duration-1000 ease-out delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {/* Input with integrated button */}
            <div className="relative w-full group">
              <input
                type="email"
                placeholder="Ton email"
                onFocus={() => setIsEmailFocused(true)}
                onClick={() => setIsEmailFocused(true)}
                className="w-full h-12 bg-zinc-900/50 border border-zinc-800 rounded-full px-5 pr-32 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all"
              />
              {/* Button */}
              <button
                onClick={() => setIsEmailFocused(true)}
                className="absolute right-0 top-0 bottom-0 h-12 px-6 bg-[#D4845A] text-white hover:bg-[#bf7348] font-medium rounded-full text-sm transition-all whitespace-nowrap overflow-hidden flex items-center justify-center group/btn opacity-80 hover:opacity-100"
              >
                <span className="relative z-10 font-normal">Rejoins la liste</span>
                <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] group-hover/btn:left-[100%] transition-[left] duration-700 ease-in-out" />
              </button>

              <BorderBeam
                size={80}
                duration={3}
                delay={0}
                borderWidth={1.5}
                colorFrom="#d4845a"
                colorTo="transparent"
                radius={24}
                className="rounded-full pointer-events-none after:bg-no-repeat"
              />


            </div>
            {/* Helper text */}
            <p className="mt-4 text-xs md:text-sm text-[rgba(212,132,90,1)] font-['Inter'] font-extralight text-center">
              Laisse ton mail si tu souhaites faire partie des premiers bêta testeurs
            </p>
          </div>
        </div>

      </div>

      {/* Pain Points Section */}
      <PainPointsSection />

      {/* Dashboard Coach Card */}
      <DashboardCoachCard />

      {/* 3D Dashboard Showcase */}
      <DashboardShowcase isActive={true} />

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
      className="relative z-10 w-full min-h-[600px] flex items-center justify-center bg-[#050505] overflow-hidden mb-20"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/Landingpage/weighted_7.jpg"
          alt="Athlete Back"
          className="w-full h-full object-cover opacity-40 grayscale"
        />
        <div className="absolute inset-0" />
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col gap-12 max-w-[1000px] px-6 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>

        <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-['Inter'] font-light text-left mb-8 tracking-tight leading-[1.2]">
          Tu te reconnais ?
        </h2>

        <div className="flex flex-col gap-[18px]">
          <CheckItem text="Tu passes ton temps à jongler entre Google Sheets, WhatsApp, Drive et Insta ?" delay="200ms" isVisible={isVisible} />
          <CheckItem text="Tu perds du temps à tout faire à la main : relances, suivi, vidéos, paiements." delay="400ms" isVisible={isVisible} />
          <CheckItem text="Tu as l'impression de plafonner alors que tu pourrais gérer plus d'élèves sans sacrifier de qualité." delay="600ms" isVisible={isVisible} />
        </div>

      </div>
    </div>
  );
};

const CheckItem = ({ text, delay, isVisible }) => (
  <div
    className={`flex items-start gap-4 text-white/75 text-base md:text-xl font-['Inter'] font-light leading-relaxed transition-all duration-1000`}
    style={{ transitionDelay: delay, opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)' }}
  >
    <svg className="w-5 h-5 md:w-6 md:h-6 text-[#d4845a] flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span className="text-base md:text-xl">{text}</span>
  </div>
);
