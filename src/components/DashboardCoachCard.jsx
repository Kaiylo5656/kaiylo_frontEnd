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
    <section className="w-full py-20 px-4 flex justify-center items-center">
      <div className="max-w-[1200px] w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 flex flex-col gap-6 hover:border-[#d4845a]/30 transition-colors duration-300"
          >
            {/* Header: Icon + Title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-[#d4845a] rounded-lg shrink-0">
                <feature.icon className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-['Inter'] text-2xl md:text-3xl text-white font-normal leading-tight">
                {feature.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-lg leading-relaxed">
              {feature.description}
            </p>

            {/* Orange Highlight Arrow */}
            <div className="mt-auto pt-2">
              <p className="font-['Inter'] font-medium text-[16px] text-[#d4845a] flex gap-2">
                <span className="shrink-0">→</span>
                {feature.highlight}
              </p>
            </div>
            
            {/* Subtle Hover Glow */}
            <div className="absolute inset-0 bg-[#d4845a]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default DashboardCoachCard;
