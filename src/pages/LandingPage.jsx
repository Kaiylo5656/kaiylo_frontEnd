import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardShowcase from '../components/DashboardShowcase';
import BorderBeam from '../components/ui/BorderBeam';
import DashboardCoachCard from '../components/DashboardCoachCard';
import BetaSignupSection from '../components/BetaSignupSection';
import LegalFooter from '../components/LegalFooter';

const LandingPage = () => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isHeaderCompact, setIsHeaderCompact] = React.useState(false);

  const handleNavScroll = (e, targetId) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    setIsLoaded(true);
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  useEffect(() => {
    const SCROLL_COMPACT_PX = 56;
    const onScroll = () => {
      setIsHeaderCompact(window.scrollY > SCROLL_COMPACT_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative w-full min-h-screen text-white selection:bg-[#d4845a] selection:text-white" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Background desktop identique a LoginPage */}
      <div className="hidden md:block">
        <div
          style={{
            position: 'fixed',
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
        <div
          style={{
            position: 'fixed',
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
        <div
          style={{
            position: 'absolute',
            top: '-175px',
            left: '0',
            transform: 'translateY(-50%)',
            width: '50vw',
            height: '600px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.25)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.75,
            animation: 'organicGradient 15s ease-in-out infinite'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-175px',
            left: '50vw',
            transform: 'translateY(-50%) scaleX(-1)',
            width: '50vw',
            height: '600px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.25)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.75,
            animation: 'organicGradient 15s ease-in-out infinite 1.5s'
          }}
        />
      </div>

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

      {/* Logo + nav : hors du hero (sinon les sections frères z-10 les recouvrent au scroll) */}
      <div
        className={`fixed left-6 md:left-8 z-[9999] transition-[top] duration-[1100ms] ease-in-out ${
          isHeaderCompact ? 'top-2 md:top-3' : 'top-6 md:top-8'
        }`}
      >
        <img
          src="/logo-full.svg"
          alt="Kaiylo Logo"
          className="h-6 md:h-7 w-auto"
        />
      </div>

      <div
        className={`fixed right-6 md:right-8 z-[9999] hidden md:flex items-center gap-2 transition-[top] duration-[1100ms] ease-in-out ${
          isHeaderCompact ? 'top-2 md:top-3' : 'top-6 md:top-8'
        }`}
      >
        <a
          href="#interface"
          onClick={(e) => handleNavScroll(e, 'interface')}
          className="h-9 px-4 rounded-full bg-black/35 backdrop-blur-md text-white/50 hover:bg-[#D4845A]/10 hover:text-[#D4845A] text-sm font-['Inter'] font-normal transition-all duration-300 flex items-center justify-center"
        >
          Fonctionnalites
        </a>
        <a
          href="#interface-showcase"
          onClick={(e) => handleNavScroll(e, 'interface-showcase')}
          className="h-9 px-4 rounded-full bg-black/35 backdrop-blur-md text-white/50 hover:bg-[#D4845A]/10 hover:text-[#D4845A] text-sm font-['Inter'] font-normal transition-all duration-300 flex items-center justify-center"
        >
          Interface
        </a>
        <a
          href="#tarif"
          onClick={(e) => handleNavScroll(e, 'tarif')}
          className="h-9 px-4 rounded-full bg-black/35 backdrop-blur-md text-white/50 hover:bg-[#D4845A]/10 hover:text-[#D4845A] text-sm font-['Inter'] font-normal transition-all duration-300 flex items-center justify-center"
        >
          Tarif
        </a>
        <Link
          to="/login"
          className="h-9 px-5 rounded-full bg-[#D4845A] text-white hover:bg-[#bf7348] text-sm font-['Inter'] transition-all flex items-center justify-center"
        >
          Connexion
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-32">

        {/* Hero Content Wrapper */}
        <div className="flex flex-col items-center text-center max-w-[1000px] mx-auto">

          {/* Badge / Label (Optional aesthetic touch common in Cobalt style) */}
          <div
            className={`mb-12 transition-all duration-1000 ease-out delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="px-3 py-1 rounded-full border border-white/10 text-xs text-zinc-400 font-['Inter'] tracking-wide">
              Disponible maintenant
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
            className={`w-full max-w-2xl transition-all duration-1000 ease-out delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex flex-col sm:flex-row items-start justify-center gap-3">
              <div className="w-full sm:w-auto sm:min-w-[340px]">
                <Link
                  to="/login"
                  className="w-full h-12 px-8 bg-[#D4845A] text-white hover:bg-[#bf7348] rounded-full text-base transition-all whitespace-nowrap overflow-hidden flex items-center justify-center group/btn relative"
                >
                  <span className="relative z-10 font-normal">Créer mon compte gratuitement</span>
                  <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] group-hover/btn:left-[100%] transition-[left] duration-700 ease-in-out" />
                </Link>
                <p className="mt-4 text-xs md:text-sm text-[rgba(212,132,90,1)] font-['Inter'] font-normal text-center">
                  3 élèves gratuits
                </p>
              </div>

              <div
                className="relative w-full sm:w-auto sm:min-w-[340px] h-12 rounded-full overflow-hidden p-[1px]"
                style={{ background: 'linear-gradient(90deg, #d4845a 0%, #52525b 100%)' }}
              >
                <button
                  type="button"
                  className="w-full h-full px-8 bg-[#0a0a0a] hover:bg-[#111111] text-white rounded-full text-base transition-all duration-300 whitespace-nowrap flex items-center justify-center relative overflow-hidden group/demo"
                >
                  <span className="relative z-10">Demander une démo</span>
                  <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg] group-hover/demo:left-[100%] transition-[left] duration-700 ease-in-out" />
                </button>
                <BorderBeam
                  size={70}
                  duration={3}
                  delay={0}
                  borderWidth={1.5}
                  colorFrom="#d4845a"
                  colorTo="transparent"
                  radius={24}
                  className="rounded-full pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Pain Points Section */}
      <PainPointsSection />

      {/* Dashboard Showcase (inclut Coach Card + Carousel + Beta Signup) */}
      <div id="interface" className="w-full">
        <DashboardShowcase isActive={true}>
          <DashboardCoachCard />
          <PricingSection />
        </DashboardShowcase>
      </div>

      {/* CTA de bas de page */}
      <div className="w-full">
        <BetaSignupSection />
      </div>

      <div className="relative z-30 w-full mt-[100px]">
        <LegalFooter />
      </div>

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
      id="fonctionnalites"
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

const pricingTiers = [
  {
    price: 'Gratuit',
    students: '3 élèves inclus',
    monthlyPrice: 0,
    monthlyUnitPrice: 0,
    highlighted: true
  },
  {
    price: '29 €',
    students: '4-10 élèves',
    monthlyPrice: 29,
    monthlyUnitPrice: 2.9
  },
  {
    price: '49 €',
    students: '11-20 élèves',
    monthlyPrice: 49,
    monthlyUnitPrice: 2.45
  },
  {
    price: '69 €',
    students: '21-30 élèves',
    monthlyPrice: 69,
    monthlyUnitPrice: 2.3
  }
];

const PricingSection = () => {
  const [hoveredTierIndex, setHoveredTierIndex] = React.useState(null);
  const [billingPeriod, setBillingPeriod] = React.useState('monthly');
  const isAnnual = billingPeriod === 'annual';

  const formatEuro = (value) =>
    `${value.toLocaleString('fr-FR', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    })}€`;

  return (
    <section id="tarif" className="relative z-10 w-full px-4 md:px-6 py-20 md:py-24">
      <div className="mx-auto w-full max-w-[1050px] rounded-[28px] px-5 md:px-8 py-10 md:py-14">
        <div className="text-center">
          <h2 className="font-['Inter'] text-white font-light tracking-tight text-2xl md:text-4xl leading-tight">
            Un tarif évolutif en fonction du{' '}
            <span className="bg-gradient-to-r from-[#D4845A] to-[#A05A3A] bg-clip-text text-transparent font-normal">
              nombre d'élèves
            </span>
          </h2>
          <p className="mt-4 text-base text-white/45 font-['Inter'] font-light">
            Commence gratuitement, puis évolue selon la taille de ton groupe
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-[rgba(24,24,27,0.4)] p-1">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-['Inter'] transition-all duration-300 ${
                  billingPeriod === 'monthly'
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('annual')}
                className={`px-4 py-2 rounded-full text-sm font-['Inter'] transition-all duration-300 ${
                  billingPeriod === 'annual'
                    ? 'bg-[#D4845A]/20 text-[#D4845A]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Annuel
              </button>
            </div>
          </div>
          <p
            className={`mt-3 min-h-[20px] text-xs md:text-sm text-[#D4845A] font-['Inter'] font-light transition-opacity duration-200 ${
              isAnnual ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={!isAnnual}
          >
            -16,67% au forfait annuel (2 mois offerts)
          </p>
        </div>

        <div className="mt-12 md:mt-14 px-2 md:px-4">
          <div className="relative h-px bg-white/[0.12]">
            {[12.5, 37.5, 62.5, 87.5].map((left, idx) => (
              <div
                key={left}
                className={`absolute -top-[4px] -translate-x-1/2 w-2 h-2 rounded-full transition-all duration-300 ${
                  hoveredTierIndex === idx
                    ? 'bg-[#D4845A] shadow-[0_0_12px_rgba(212,132,90,0.65)]'
                    : 'bg-[#595959]'
                }`}
                style={{ left: `${left}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {pricingTiers.map((tier, idx) => (
            <div
              key={tier.price}
              onMouseEnter={() => setHoveredTierIndex(idx)}
              onMouseLeave={() => setHoveredTierIndex(null)}
              className="rounded-[22px] border px-5 py-6 md:py-7 text-center transition-all duration-300 border-white/10 bg-[rgba(24,24,27,0.25)] hover:scale-[1.02] hover:bg-white/6 hover:border-white/10 hover:shadow-[0_0_40px_-10px_rgba(212,132,90,0.6)]"
            >
              <p className="font-['Inter'] text-[34px] leading-none font-light text-[#D4845A]">
                {tier.monthlyPrice === 0
                  ? tier.price
                  : isAnnual
                    ? (
                        <>
                          {formatEuro(tier.monthlyPrice * 10)}{" "}
                          <span className="text-[20px]">/ an</span>
                        </>
                      )
                    : (
                        <>
                          {formatEuro(tier.monthlyPrice)}{" "}
                          <span className="text-[20px]">/ mois</span>
                        </>
                      )}
              </p>
              <p className="mt-4 text-[#D4845A] text-xl font-['Inter'] font-light">{tier.students}</p>
              <p className="mt-8 text-white/50 text-base md:text-base leading-tight font-['Inter'] font-light">
                {isAnnual
                  ? `Prix/élève ${formatEuro(tier.monthlyUnitPrice * 10)} / an`
                  : `Prix/élève ${formatEuro(tier.monthlyUnitPrice)} / mois`}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[20px] md:text-[20px] font-['Inter'] font-light text-white/[0.75]">
            Ajoutez <span className="text-[var(--kaiylo-primary-hex)]">20€</span> tous les 10 élèves supplémentaires
          </p>
          <p className="mt-4 text-[16px] text-white/45 font-['Inter'] font-light">
            Sans engagement. Prix dégressifs au prorata du nombre d'élèves
          </p>
        </div>
      </div>
    </section>
  );
};
