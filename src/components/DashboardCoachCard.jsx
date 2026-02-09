import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, CreditCard, Camera, Edit } from 'lucide-react';

const DashboardCoachCard = () => {
  const features = [
    {
      icon: LayoutDashboard,
      title: "Dashboard Coach",
      description: "Vue claire sur les progressions de chaque élève, filtres et alertes intelligentes",
      highlight: "Pilote 3x plus d'élèves avec le même effort"
    },
    {
      icon: Camera,
      title: "Feedback vidéo intégré",
      description: "Les élèves uploadent leurs vidéos, tu commentes directement",
      highlight: "Aucune perte de temps, tout est centralisé"
    },
    {
      icon: Edit,
      title: "Création de programme",
      description: "Crée des programmes structurés, fluides et adaptables facilement",
      highlight: "Jusqu'à 5h gagnées par élève chaque semaine"
    },
    {
      icon: CreditCard,
      title: "Paiements intégrés",
      description: "Kaiylo gère les échéances, relances et paiements via Stripe",
      highlight: "Fini les oublis et les conversations désagréables sur l’argent"
    }
  ];

  return (
    <section className="relative z-10 w-full py-20 px-4 flex justify-center items-center">
      {/* Gradient partagé (même dégradé que le texte "streetlifting") */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="coachCardIconGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4845A" />
            <stop offset="100%" stopColor="#A05A3A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="max-w-[1200px] w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group relative bg-[rgba(24,24,27,0.25)] border border-white/10 rounded-2xl p-8 flex flex-col gap-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/6 hover:border-white/10 hover:shadow-[0_0_40px_-10px_rgba(212,132,90,0.6)]"
          >
            {/* Header: Icon + Title */}
            <div className="flex items-center gap-4 relative z-10">
              {feature.title === "Dashboard Coach" ? (
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="w-10 h-10">
                    <path fill="url(#coachCardIconGradient)" d="M348.8 32C340.7 46.1 336 62.5 336 80l0 16-272 0 0 224 272 0 0 64-272 0c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l284.8 0zM336 432c0 17.5 4.7 33.9 12.8 48L120 480c-13.3 0-24-10.7-24-24s10.7-24 24-24l216 0zM432 32l96 0c26.5 0 48 21.5 48 48l0 352c0 26.5-21.5 48-48 48l-96 0c-26.5 0-48-21.5-48-48l0-352c0-26.5 21.5-48 48-48zm24 64c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0zm56 144a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
                  </svg>
                </div>
              ) : feature.title === "Paiements intégrés" ? (
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-10 h-10">
                    <path fill="url(#coachCardIconGradient)" d="M0 128l0 32 512 0 0-32c0-35.3-28.7-64-64-64L64 64C28.7 64 0 92.7 0 128zm0 80L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-176-512 0zM64 360c0-13.3 10.7-24 24-24l48 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-48 0c-13.3 0-24-10.7-24-24zm144 0c0-13.3 10.7-24 24-24l64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0c-13.3 0-24-10.7-24-24z" />
                  </svg>
                </div>
              ) : feature.title === "Feedback vidéo intégré" ? (
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="w-10 h-10">
                    <path fill="url(#coachCardIconGradient)" d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z" />
                  </svg>
                </div>
              ) : feature.title === "Création de programme" ? (
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-10 h-10">
                    <path fill="url(#coachCardIconGradient)" d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L368 46.1 465.9 144 490.3 119.6c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L432 177.9 334.1 80 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center rounded-lg shrink-0 bg-gradient-to-r from-[#D4845A] to-[#A05A3A]">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
              )}
              <h3 className="font-['Inter'] text-2xl md:text-3xl text-white font-normal leading-tight">
                {feature.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-light md:ml-16 relative z-10">
              {feature.description}
            </p>

            {/* Orange Highlight Arrow */}
            <div className="mt-auto pt-2 relative z-10">
              <p className="font-['Inter'] font-medium text-sm md:text-[16px] bg-gradient-to-r from-[#D4845A] to-[#A05A3A] bg-clip-text text-transparent flex gap-2 items-center md:ml-16">
                <span className="shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="w-4 h-4">
                    <path fill="url(#coachCardIconGradient)" d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                  </svg>
                </span>
                {feature.highlight}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DashboardCoachCard;
