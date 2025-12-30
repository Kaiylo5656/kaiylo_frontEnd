import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import { ChevronDown, Check } from 'lucide-react';
import Logo from '../components/Logo';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, getAuthToken } = useAuth();
  const dateInputRef = useRef(null);
  const API_BASE_URL = getApiBaseUrlWithApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gender: '',
    birthDate: '',
    height: '',
    weight: '',
    discipline: 'Street Lifting' // Default as per design
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderSelect = (gender) => {
    setFormData(prev => ({ ...prev, gender }));
  };

  const handleSubmit = async () => {
    if (!user) {
      console.error('❌ No user found');
      alert('Vous devez être connecté pour continuer');
      return;
    }
    
    // Basic validation
    if (!formData.gender || !formData.birthDate || !formData.height || !formData.weight || !formData.discipline) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken();
      
      if (!token) {
        console.error('❌ No auth token found');
        alert('Vous devez être connecté pour continuer');
        return;
      }

      console.log('🔄 Updating profile with data:', {
        userId: user.id,
        gender: formData.gender,
        birth_date: formData.birthDate,
        height: parseInt(formData.height),
        weight: parseFloat(formData.weight),
        discipline: formData.discipline
      });

      const profileData = {
        gender: formData.gender,
        birth_date: formData.birthDate,
        height: parseInt(formData.height),
        weight: parseFloat(formData.weight),
        discipline: formData.discipline
      };

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        console.error('❌ Error updating profile:', errorData);
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Profile updated successfully:', result);
      navigate('/student/dashboard');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      alert(`Erreur lors de la mise à jour du profil: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col antialiased relative" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Image de fond */}
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
      
      {/* Layer blur sur l'écran */}
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
      
      <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-50">
        <Logo />
      </header>

      {/* Gradient conique Figma - partie droite */}
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
      
      {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
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

      <main className="flex-grow flex items-start justify-center p-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[375px] mx-auto flex flex-col items-center text-center pt-[80px] pb-16">
          <div className="w-full">
            
            {/* Header */}
            <div className="text-center mb-12 relative z-10 px-6">
              <h1 className="text-3xl font-thin text-foreground mb-4" style={{ fontSize: '30px' }}>
                Informations physiques
              </h1>
              <p className="text-xs text-[rgba(255,255,255,0.5)] font-light">
                Votre coach utilise ces données pour personnaliser votre suivi
              </p>
            </div>

            {/* Form */}
            <div className="w-full flex flex-col gap-3 relative z-10">
              
              {/* Gender Selection */}
              <div className="flex gap-3 mb-2">
            <button
              onClick={() => handleGenderSelect('Femme')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[10px] border transition-all ${
                formData.gender === 'Femme' 
                  ? 'bg-[rgba(212,132,90,0.2)] border-[#d4845a]' 
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)]'
              }`}
              style={{
                borderWidth: '0.5px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <circle cx="12" cy="9" r="5" />
                <path d="M12 14v7" />
                <path d="M9 18h6" />
              </svg>
              <span className="text-xs font-light text-[rgba(255,255,255,0.8)]">Femme</span>
            </button>
            
            <button
              onClick={() => handleGenderSelect('Homme')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[10px] border transition-all ${
                formData.gender === 'Homme' 
                  ? 'bg-[rgba(212,132,90,0.2)] border-[#d4845a]' 
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)]'
              }`}
              style={{
                borderWidth: '0.5px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <circle cx="10" cy="14" r="5" />
                <path d="M19 5l-5.4 5.4" />
                <path d="M19 5h-5" />
                <path d="M19 5v5" />
              </svg>
              <span className="text-xs font-light text-[rgba(255,255,255,0.8)]">Homme</span>
            </button>
              </div>

              {/* Birth Date */}
              <div 
                onClick={() => dateInputRef.current?.showPicker()}
                className="relative rounded-[10px] flex items-center cursor-pointer"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '0.5px solid rgba(255, 255, 255, 0.05)',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  height: '46px'
                }}
              >
                {/* Custom Display */}
                <div className="absolute inset-0 px-5 flex items-center pointer-events-none text-xs text-[rgba(255,255,255,1)] font-light">
                  {formData.birthDate ? (
                    (() => {
                      const [year, month, day] = formData.birthDate.split('-');
                      return `${day}/${month}/${year}`;
                    })()
                  ) : (
                    <span className="text-[rgba(255,255,255,0.5)]">Date de naissance</span>
                  )}
                </div>
                
                {/* Native Input (Invisible but interactive via ref) */}
                <input
                  ref={dateInputRef}
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Height */}
              <div 
                className="rounded-[10px] flex items-center"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '0.5px solid rgba(255, 255, 255, 0.05)',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  height: '46px'
                }}
              >
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="bg-transparent border-none outline-none text-[rgba(255,255,255,1)] text-xs w-full font-light placeholder-[rgba(255,255,255,0.5)]"
                  placeholder="Taille (cm)"
                />
              </div>

              {/* Weight */}
              <div 
                className="rounded-[10px] flex items-center"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '0.5px solid rgba(255, 255, 255, 0.05)',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  height: '46px'
                }}
              >
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="bg-transparent border-none outline-none text-[rgba(255,255,255,1)] text-xs w-full font-light placeholder-[rgba(255,255,255,0.5)]"
                  placeholder="Poids (kg)"
                />
              </div>

              {/* Discipline */}
              <div className="relative">
                <div 
                  className="rounded-[10px] flex items-center justify-between opacity-50 cursor-not-allowed"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(255, 255, 255, 0.05)',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    height: '46px'
                  }}
                >
                  <select
                    name="discipline"
                    value="Street Lifting"
                    disabled={true}
                    className="bg-transparent border-none outline-none text-[rgba(255,255,255,1)] text-xs w-full appearance-none z-10 font-light cursor-not-allowed"
                  >
                    <option value="Street Lifting" className="bg-[#1a1a1a]">Street Lifting</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)] absolute right-5 pointer-events-none" />
                </div>
              </div>

            </div>

            {/* Submit Button */}
            <div className="mt-12 w-full relative z-10">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#d4845a] hover:bg-[#c2754d] text-white rounded-[10px] py-3 text-sm font-light transition-colors flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(212, 132, 89, 1)',
                  paddingTop: '12px',
                  paddingBottom: '12px'
                }}
              >
                {loading ? 'Enregistrement...' : 'Terminer'}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;
