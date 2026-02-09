import React, { useState } from 'react';
import axios from 'axios';
import { getApiBaseUrlWithApi } from '../config/api';

const BetaSignupSection = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email) return;

    setStatus('loading');
    try {
      const apiUrl = `${getApiBaseUrlWithApi()}/waitlist`;
      await axios.post(apiUrl, { ...formData });
      
      setStatus('success');
      setMessage("Merci ! Tu es bien inscrit sur la liste d'attente.");
      setFormData({ name: '', email: '' });
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || "Une erreur est survenue.");
    }
  };

  return (
    <section className="w-full pt-[80px] pb-[200px] flex justify-center items-center px-6 relative z-20">
      <div className="max-w-[1000px] w-full flex flex-col gap-12 items-center">
        
        {/* Text Side */}
        <div className="w-full max-w-[500px] flex flex-col gap-6 text-center">
          <h2 className="font-['Inter'] font-light text-[28px] md:text-[36px] text-white leading-[1.1]">
            Fais partie des <span className="bg-gradient-to-r from-[#D4845A] to-[#A05A3A] bg-clip-text text-transparent font-normal">premiers</span> à tester Kaiylo
          </h2>
          <p className="font-['Inter'] font-extralight text-sm md:text-base text-white/50 leading-tight">
            Laisse ton email, on t'envoie les accès à la bêta dès qu'elle est disponible.
          </p>
        </div>

        {/* Form Side */}
        <div className="w-full max-w-[500px] flex flex-col gap-4">
          {status === 'success' ? (
            <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200 text-center">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Prénom Input */}
              <input 
                type="text" 
                placeholder="Prénom" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full h-12 px-5 bg-zinc-900/50 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all font-['Inter'] focus:border-zinc-700"
              />

              {/* Email Input */}
              <input 
                type="email" 
                placeholder="Ton email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="w-full h-12 px-5 bg-zinc-900/50 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all font-['Inter'] focus:border-zinc-700"
              />

              {status === 'error' && (
                <p className="text-red-400 text-sm px-2">{message}</p>
              )}

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={status === 'loading'}
                className="w-full h-12 px-6 flex items-center justify-center bg-[#d4845a] hover:bg-[#bf7348] rounded-full transition-all cursor-pointer group relative overflow-hidden group/btn opacity-80 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <span className="text-sm text-white font-['Inter'] font-normal relative z-10">
                   {status === 'loading' ? 'Inscription...' : 'Rejoins la liste'}
                 </span>
                 <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] group-hover/btn:left-[100%] transition-[left] duration-700 ease-in-out" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default BetaSignupSection;
