import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';

const StudentProfileModal = ({ isOpen, onClose, studentData, onUpdate }) => {
  const dateInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gender: '',
    birthDate: '',
    height: '',
    weight: '',
    discipline: 'Street Lifting'
  });

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
      console.error('❌ Error updating profile:', error);
      alert(`Erreur lors de la mise à jour du profil: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 w-full max-w-md mx-4 relative border border-[#333333]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-medium text-white mb-2">Modifier le profil</h2>
          <p className="text-sm text-gray-400">
            {studentData?.name || studentData?.full_name || 'Étudiant'}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Gender Selection */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Genre</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleGenderSelect('Femme')}
                type="button"
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
                type="button"
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
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Date de naissance</label>
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
            <label className="block text-xs text-gray-400 mb-2">Taille (cm)</label>
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
          </div>

          {/* Weight */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Poids (kg)</label>
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
          </div>

          {/* Discipline */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Discipline</label>
            <div className="relative">
              <div 
                className="rounded-[10px] flex items-center justify-between"
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
                  value={formData.discipline}
                  onChange={handleChange}
                  className="bg-transparent border-none outline-none text-[rgba(255,255,255,1)] text-xs w-full appearance-none z-10 font-light"
                >
                  <option value="Street Lifting" className="bg-[#1a1a1a]">Street Lifting</option>
                  <option value="Powerlifting" className="bg-[#1a1a1a]">Powerlifting</option>
                  <option value="Bodybuilding" className="bg-[#1a1a1a]">Bodybuilding</option>
                  <option value="Calisthenics" className="bg-[#1a1a1a]">Calisthenics</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)] absolute right-5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#262626] text-white rounded-[10px] hover:bg-[#333333] transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[#d4845a] text-white rounded-[10px] hover:bg-[#c2754d] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentProfileModal;