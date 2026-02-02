import React from 'react';

const BetaSignupSection = () => {
  return (
    <section className="w-full py-24 flex justify-center items-center px-6 relative z-20">
      <div className="max-w-[1000px] w-full flex flex-col md:flex-row gap-12 items-start justify-between">
        
        {/* Text Side */}
        <div className="flex-1 flex flex-col gap-6 max-w-[500px]">
          <h2 className="font-['Inter'] font-normal text-[40px] md:text-[50px] text-white leading-[1.1]">
            Fais partie des <span className="text-[#d4845a]">premiers</span> à coacher avec Kaiylo
          </h2>
          <p className="font-['Inter'] text-[20px] md:text-[30px] text-white leading-tight">
            Laisse ton email, on t’envoie les accès à la bêta dès qu’elle est disponible.
          </p>
        </div>

        {/* Form Side */}
        <div className="flex-1 w-full max-w-[500px] flex flex-col gap-4">
          
          {/* Prénom Input */}
          <div className="w-full h-[75px] px-6 flex items-center bg-white/10 border border-white/50 rounded-[10px] overflow-hidden focus-within:border-white transition-colors">
             <input 
                type="text" 
                placeholder="Prénom" 
                className="w-full bg-transparent border-none outline-none text-[20px] md:text-[25px] text-white placeholder-white/80 font-['Inter'] text-center md:text-left"
             />
          </div>

          {/* Email Input */}
          <div className="w-full h-[75px] px-6 flex items-center bg-white/10 border border-white/50 rounded-[10px] overflow-hidden focus-within:border-white transition-colors">
             <input 
                type="email" 
                placeholder="Ton email" 
                className="w-full bg-transparent border-none outline-none text-[20px] md:text-[25px] text-white placeholder-white/80 font-['Inter'] text-center md:text-left"
             />
          </div>

          {/* Submit Button */}
          <button className="w-full h-[75px] px-6 flex items-center justify-center bg-[#d4845a] hover:bg-[#bf7348] rounded-[10px] transition-colors cursor-pointer group relative overflow-hidden">
             <span className="text-[20px] md:text-[25px] text-white font-['Inter'] relative z-10">Demander un accès</span>
             <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
          </button>

        </div>
      </div>
    </section>
  );
};

export default BetaSignupSection;
