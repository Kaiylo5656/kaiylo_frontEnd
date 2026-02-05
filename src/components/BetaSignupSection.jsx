import React from 'react';

const BetaSignupSection = () => {
  return (
    <section className="w-full pt-[80px] pb-[200px] flex justify-center items-center px-6 relative z-20">
      <div className="max-w-[1000px] w-full flex flex-col gap-12 items-center">
        
        {/* Text Side */}
        <div className="w-full max-w-[500px] flex flex-col gap-6 text-center">
          <h2 className="font-['Inter'] font-light text-[28px] md:text-[36px] text-white leading-[1.1]">
            Fais partie des <span className="text-[#d4845a]">premiers</span> à coacher avec Kaiylo
          </h2>
          <p className="font-['Inter'] font-extralight text-base md:text-[20px] text-white/50 leading-tight">
            Laisse ton email, on t'envoie les accès à la bêta dès qu'elle est disponible.
          </p>
        </div>

        {/* Form Side */}
        <div className="w-full max-w-[500px] flex flex-col gap-4">
          
          {/* Prénom Input */}
          <input 
            type="text" 
            placeholder="Prénom" 
            className="w-full h-12 px-5 bg-zinc-900/50 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all font-['Inter'] focus:border-zinc-700"
          />

          {/* Email Input */}
          <input 
            type="email" 
            placeholder="Ton email" 
            className="w-full h-12 px-5 bg-zinc-900/50 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all font-['Inter'] focus:border-zinc-700"
          />

          {/* Submit Button */}
          <button className="w-full h-12 px-6 flex items-center justify-center bg-[#d4845a] hover:bg-[#bf7348] rounded-full transition-all cursor-pointer group relative overflow-hidden group/btn opacity-80 hover:opacity-100">
             <span className="text-sm text-white font-['Inter'] font-normal relative z-10">Rejoins la liste</span>
             <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] group-hover/btn:left-[100%] transition-[left] duration-700 ease-in-out" />
          </button>

        </div>
      </div>
    </section>
  );
};

export default BetaSignupSection;
