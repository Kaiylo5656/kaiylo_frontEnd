import logger from '../utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useOverlayModal } from '../contexts/VideoModalContext';
import { getApiBaseUrlWithApi } from '../config/api';

const StudentProfileModal = ({ isOpen, onClose, studentData, onUpdate }) => {
  const { registerModalOpen, registerModalClose } = useOverlayModal();
  const dateInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isDisciplineDropdownOpen, setIsDisciplineDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    gender: '',
    birthDate: '',
    height: '',
    weight: '',
    discipline: 'Street Lifting'
  });

  const disciplines = ['Street Lifting', 'Powerlifting', 'Bodybuilding', 'Calisthenics'];

  useEffect(() => {
    if (isOpen) {
      registerModalOpen();
      return () => registerModalClose();
    }
  }, [isOpen, registerModalOpen, registerModalClose]);

  // Initialize form data when modal opens or studentData changes
  useEffect(() => {
    if (isOpen && studentData) {
      setFormData({
        gender: studentData.gender || '',
        birthDate: studentData.birth_date || '',
        height: studentData.height?.toString() || '',
        weight: studentData.weight?.toString() || '',
        discipline: studentData.discipline || 'Street Lifting'
      });
    }
  }, [isOpen, studentData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDisciplineDropdownOpen && !event.target.closest('.discipline-dropdown-container')) {
        setIsDisciplineDropdownOpen(false);
      }
    };

    if (isDisciplineDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDisciplineDropdownOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderSelect = (gender) => {
    setFormData(prev => ({ ...prev, gender }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.gender || !formData.birthDate || !formData.height || !formData.weight || !formData.discipline) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const profileData = {
        gender: formData.gender,
        birth_date: formData.birthDate,
        height: parseInt(formData.height),
        weight: parseFloat(formData.weight),
        discipline: formData.discipline
      };

      const response = await fetch(`${getApiBaseUrlWithApi()}/coach/student/${studentData.id}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      if (onUpdate) {
        onUpdate(result.data);
      }
      onClose();
    } catch (error) {
      logger.error('❌ Error updating profile:', error);
      alert(`Erreur lors de la mise à jour du profil: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
      style={{ zIndex: 100 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="relative mx-auto w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
          opacity: 0.95
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center justify-end gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-5 w-5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
              <path d="M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z"/>
            </svg>
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              Profil - <span className="font-light">{studentData?.name || studentData?.full_name || 'Étudiant'}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
              <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
            </svg>
          </button>
        </div>
        <div className="border-b border-white/10 mx-6"></div>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 space-y-5">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-extralight text-white/50 mb-2">Email</label>
            <div className="relative flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 512 512" 
                className="absolute left-[14px] h-4 w-4 pointer-events-none flex-shrink-0"
                style={{ color: '#d4845a' }}
                fill="currentColor"
              >
                <path d="M48 64c-26.5 0-48 21.5-48 48 0 15.1 7.1 29.3 19.2 38.4l208 156c17.1 12.8 40.5 12.8 57.6 0l208-156c12.1-9.1 19.2-23.3 19.2-38.4 0-26.5-21.5-48-48-48L48 64zM0 196L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-188-198.4 148.8c-34.1 25.6-81.1 25.6-115.2 0L0 196z"/>
              </svg>
              <input
                type="email"
                value={studentData?.email || ''}
                readOnly
                disabled
                className="w-full pl-[42px] pr-[14px] py-3 rounded-[10px] bg-[rgba(0,0,0,0.5)] text-white/70 text-sm cursor-not-allowed opacity-60"
              />
            </div>
          </div>

          {/* Gender Selection */}
          <div>
            <label className="block text-sm font-extralight text-white/50 mb-2">Genre</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleGenderSelect('Femme')}
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[10px] transition-all ${
                  formData.gender === 'Femme' 
                    ? 'bg-[#d4845a] border-none' 
                    : 'bg-[rgba(0,0,0,0.5)]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className={`w-5 h-5 ${formData.gender === 'Femme' ? '' : 'opacity-50'}`} fill="currentColor">
                  <path d="M80 176a112 112 0 1 1 224 0 112 112 0 1 1 -224 0zM223.9 349.1C305.9 334.1 368 262.3 368 176 368 78.8 289.2 0 192 0S16 78.8 16 176c0 86.3 62.1 158.1 144.1 173.1-.1 1-.1 1.9-.1 2.9l0 64-32 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l32 0 0 32c0 17.7 14.3 32 32 32s32-14.3 32-32l0-32 32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-32 0 0-64c0-1 0-1.9-.1-2.9z"/>
                </svg>
                <span className={`text-sm font-normal ${formData.gender === 'Femme' ? 'text-white' : 'text-white/50'}`}>Femme</span>
              </button>
              
              <button
                onClick={() => handleGenderSelect('Homme')}
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[10px] transition-all ${
                  formData.gender === 'Homme' 
                    ? 'bg-[#d4845a] border-none' 
                    : 'bg-[rgba(0,0,0,0.5)]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={`w-5 h-5 ${formData.gender === 'Homme' ? '' : 'opacity-50'}`} fill="currentColor">
                  <path d="M320 32c0-17.7 14.3-32 32-32L480 0c17.7 0 32 14.3 32 32l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-50.7-95 95c19.5 28.4 31 62.7 31 99.8 0 97.2-78.8 176-176 176S32 401.2 32 304 110.8 128 208 128c37 0 71.4 11.4 99.8 31l95-95-50.7 0c-17.7 0-32-14.3-32-32zM208 416a112 112 0 1 0 0-224 112 112 0 1 0 0 224z"/>
                </svg>
                <span className={`text-sm font-normal ${formData.gender === 'Homme' ? 'text-white' : 'text-white/50'}`}>Homme</span>
              </button>
            </div>
          </div>

          {/* Discipline */}
          <div>
            <label className="block text-sm font-extralight text-white/50 mb-2">Discipline</label>
            <div className="relative flex items-center discipline-dropdown-container">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 256 512" 
                className="absolute left-[14px] h-4 w-4 pointer-events-none flex-shrink-0 z-10"
                style={{ color: '#d4845a' }}
                fill="currentColor"
              >
                <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
              </svg>
              <button
                type="button"
                onClick={() => setIsDisciplineDropdownOpen(!isDisciplineDropdownOpen)}
                className="w-full pl-[42px] pr-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm outline-none transition-colors flex items-center justify-between focus:border-[rgba(255,255,255,0.05)]"
              >
                <span className="font-extralight">{formData.discipline}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 384 512" 
                  className="h-4 w-4 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                </svg>
              </button>

              {isDisciplineDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[rgba(0,0,0,0.8)] backdrop-blur border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] overflow-hidden max-h-[200px] overflow-y-auto z-50 shadow-xl scrollbar-thin-transparent-track">
                  {disciplines.map((discipline) => {
                    const isSelected = formData.discipline === discipline;
                    return (
                      <button
                        key={discipline}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, discipline }));
                          setIsDisciplineDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                          isSelected 
                            ? 'bg-[#d4845a]/10 text-[#d4845a] font-normal' 
                            : 'text-white/50 hover:bg-white/5 font-extralight'
                        }`}
                      >
                        <span>{discipline}</span>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-sm font-extralight text-white/50 mb-2">Date de naissance</label>
            <div 
              onClick={() => dateInputRef.current?.showPicker()}
              className="relative rounded-[10px] flex items-center cursor-pointer w-full px-[14px] py-3 bg-[rgba(0,0,0,0.5)]"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 448 512" 
                className="h-4 w-4 pointer-events-none mr-3 flex-shrink-0"
                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                fill="currentColor"
              >
                <path d="M128 0C110.3 0 96 14.3 96 32l0 32-32 0C28.7 64 0 92.7 0 128l0 48 448 0 0-48c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32-128 0 0-32c0-17.7-14.3-32-32-32zM0 224L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192-448 0z"/>
              </svg>
              {/* Custom Display */}
              <div className="flex-1 text-sm text-white font-normal">
                {formData.birthDate ? (
                  (() => {
                    const [year, month, day] = formData.birthDate.split('-');
                    return `${day}/${month}/${year}`;
                  })()
                ) : (
                  <span className="text-[rgba(255,255,255,0.25)]">Date de naissance</span>
                )}
              </div>
              
              {/* Native Input */}
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
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-extralight text-white/50 mb-2">Taille (cm)</label>
            <div className="relative flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 256 512" 
                className="absolute left-[14px] h-4 w-4 pointer-events-none flex-shrink-0"
                style={{ color: '#d4845a' }}
                fill="currentColor"
              >
                <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
              </svg>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className="w-full pl-[42px] pr-[14px] py-3 rounded-[10px] bg-[rgba(0,0,0,0.5)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none"
                placeholder="Taille (cm)"
              />
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-extralight text-white/50 mb-2">Poids (kg)</label>
            <div className="relative flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 256 512" 
                className="absolute left-[14px] h-4 w-4 pointer-events-none flex-shrink-0"
                style={{ color: '#d4845a' }}
                fill="currentColor"
              >
                <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
              </svg>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="w-full pl-[42px] pr-[14px] py-3 rounded-[10px] bg-[rgba(0,0,0,0.5)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none"
                placeholder="Poids (kg)"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentProfileModal;