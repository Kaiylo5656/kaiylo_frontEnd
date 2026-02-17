import React, { useEffect, useRef, useState } from 'react';
import DashboardShowcase from '../components/DashboardShowcase';
import BorderBeam from '../components/ui/BorderBeam';
import DashboardCoachCard from '../components/DashboardCoachCard';
import BetaSignupSection from '../components/BetaSignupSection';
import axios from 'axios';
import { getApiBaseUrlWithApi } from '../config/api';

const LandingPage = () => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isEmailFocused, setIsEmailFocused] = React.useState(false);

  // Hero waitlist state
  const [heroEmail, setHeroEmail] = useState('');
  const [heroStatus, setHeroStatus] = useState('idle'); // idle, loading, success, error
  const [heroMessage, setHeroMessage] = useState('');

  const handleHeroSubmit = async (e) => {
    e.preventDefault();
    if (!heroEmail) return;

    setHeroStatus('loading');
    try {
      const apiUrl = `${getApiBaseUrlWithApi()}/waitlist`;
      await axios.post(apiUrl, { email: heroEmail });

      setHeroStatus('success');
      setHeroMessage("Merci ! Tu es bien inscrit sur la liste d'attente.");
      setHeroEmail('');
    } catch (error) {
      setHeroStatus('error');
      setHeroMessage(error.response?.data?.message || "Une erreur est survenue.");
    }
  };

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
      {/* Image de fond (Desktop) */}
      <div
        className="hidden md:block"
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

      {/* Layer blur sur l'écran (Desktop) */}
      <div
        className="hidden md:block"
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

      {/* --- Mobile Background Elements (from StudentDashboard) --- */}
      <div className="block md:hidden fixed inset-0 pointer-events-none z-0">
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

        {/* Gradient conique Figma - partie droite */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            transform: 'translateY(-50%)',
            width: '50vw',
            height: '900px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.5)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 1.0,
            animation: 'organicGradientBright 15s ease-in-out infinite'
          }}
        />

        {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '50vw',
            transform: 'translateY(-50%) scaleX(-1)',
            width: '50vw',
            height: '900px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.5)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 1.0,
            animation: 'organicGradientBright 15s ease-in-out infinite 1.5s'
          }}
        />

        {/* Top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px] z-[7]"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(60, 60, 60, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
            opacity: 0.35
          }}
        />
        {/* Warm orange glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px] z-[7]"
          style={{
            background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
            opacity: 0.45
          }}
        />
        {/* Subtle bottom depth glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px] z-[7]"
          style={{
            background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
            opacity: 0.25
          }}
        />
      </div>

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

          {/* Main Heading — 2 lines on mobile: smaller size so both lines fit */}
          <h1
            className={`mb-12 font-['Inter'] font-light text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.2] text-white transition-all duration-1000 ease-out delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="block">Enfin un outil professionnel pour</span>
            <span className="block">coacher en <span className="bg-gradient-to-r from-[#D4845A] to-[#A05A3A] bg-clip-text text-transparent font-normal">streetlifting</span></span>
          </h1>

          {/* Subtext */}
          <p
            className={`mb-12 font-['Inter'] font-light text-sm md:text-base lg:text-base text-white/50 max-w-2xl leading-relaxed transition-all duration-1000 ease-out delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ opacity: 1 }}
          >
            Kaiylo centralise tout ce dont tu as besoin pour coacher <span className="bg-gradient-to-r from-[#D4845A] to-[#A05A3A] bg-clip-text text-transparent font-medium">efficacement</span> : programmes, feedbacks vidéos, suivi.<span className="hidden md:inline"> Passe moins de temps à gérer, plus de temps à coacher.</span>
          </p>

          {/* CTA Section */}
          <div
            className={`w-full max-w-md transition-all duration-1000 ease-out delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {heroStatus === 'success' ? (
              <div className="text-center mb-4 text-[#D4845A] font-light">
                {heroMessage}
              </div>
            ) : (
              <form onSubmit={handleHeroSubmit} className="relative w-full group flex flex-col gap-3 md:block">
                <div className="relative w-full h-12">
                  <input
                    type="email"
                    placeholder="Ton email"
                    value={heroEmail}
                    onChange={(e) => setHeroEmail(e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onClick={() => setIsEmailFocused(true)}
                    className="absolute inset-0 w-full h-full bg-zinc-900/50 border border-zinc-800 rounded-full px-5 pr-5 md:pr-32 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all"
                    required
                  />
                  <BorderBeam
                    size={80}
                    duration={3}
                    delay={0}
                    borderWidth={1.5}
                    colorFrom="#d4845a"
                    colorTo="transparent"
                    radius={24}
                    className="rounded-full pointer-events-none"
                  />
                </div>
                {/* Button: below input on mobile, inside on right from md */}
                <button
                  type="submit"
                  disabled={heroStatus === 'loading'}
                  className="relative w-full md:absolute md:right-0 md:top-0 md:bottom-0 md:w-auto h-12 px-6 bg-[#D4845A] text-white hover:bg-[#bf7348] font-medium rounded-full text-sm transition-all whitespace-nowrap overflow-hidden flex items-center justify-center group/btn opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 font-normal">
                    {heroStatus === 'loading' ? '...' : 'Réserver mon accès'}
                  </span>
                  <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] group-hover/btn:left-[100%] transition-[left] duration-700 ease-in-out" />
                </button>
              </form>
            )}

            {heroStatus === 'error' && (
              <p className="mt-2 text-red-400 text-sm">{heroMessage}</p>
            )}

            {/* Helper text */}
            {heroStatus !== 'success' && (
              <p className="mt-4 text-xs md:text-sm text-[rgba(212,132,90,1)] font-['Inter'] font-extralight text-center">
                Laisse ton mail si tu souhaites faire partie des premiers bêta testeurs
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Pain Points Section */}
      <PainPointsSection />

      {/* Dashboard Showcase (inclut Coach Card + Carousel + Beta Signup) */}
      <DashboardShowcase isActive={true}>
        <DashboardCoachCard />
        <BetaSignupSection />
      </DashboardShowcase>

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
