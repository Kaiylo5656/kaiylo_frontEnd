import logger from '../../utils/logger';
import React, { useState } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

const ExerciseCreateForm = ({ 
  onBack, 
  onCreate, 
  onCancel,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    tags: ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le nom de l\'exercice est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      // Parse tags from comma-separated string
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const exerciseData = {
        title: formData.title.trim(),
        instructions: formData.instructions.trim(),
        tags: tagsArray
      };

      await onCreate(exerciseData);
    } catch (error) {
      logger.error('Error creating exercise:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e);
    }
  };

  return (
    <div className="max-w-xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white/75 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-white">Créer un nouvel exercice</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Exercise Name */}
        <div>
          <label className="text-xs uppercase text-white/60 block mb-2">
            Nom de l'exercice *
          </label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Développé couché"
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-3 outline-none focus:ring-2 focus:ring-[#e87c3e]/70 focus:border-[#e87c3e]/50 transition-all duration-200"
            disabled={loading}
          />
          {errors.title && (
            <p className="text-red-400 text-xs mt-1">{errors.title}</p>
          )}
        </div>

        {/* Instructions */}
        <div>
          <label className="text-xs uppercase text-white/60 block mb-2">
            Instructions
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Décrivez l'exécution de l'exercice..."
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-3 outline-none focus:ring-2 focus:ring-[#e87c3e]/70 focus:border-[#e87c3e]/50 min-h-[120px] resize-none transition-all duration-200"
            disabled={loading}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs uppercase text-white/60 block mb-2">
            Tags
          </label>
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: pectoraux, poussée, haltères (séparés par des virgules)"
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-3 outline-none focus:ring-2 focus:ring-[#e87c3e]/70 focus:border-[#e87c3e]/50 transition-all duration-200"
            disabled={loading}
          />
          <p className="text-white/50 text-xs mt-1">
            Séparez les tags par des virgules
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 text-white/75 hover:text-white hover:bg-white/5"
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            type="submit"
            className="flex-1 rounded-xl bg-[#e87c3e] px-4 py-3 font-medium text-black/90 hover:brightness-110 transition-all duration-200 hover:scale-[1.02]"
            disabled={loading || !formData.title.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Création...' : 'Créer et ajouter'}
          </Button>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-white/40 text-xs text-center">
          Appuyez sur Ctrl+Entrée pour créer rapidement
        </p>
      </form>
    </div>
  );
};

export default ExerciseCreateForm;
