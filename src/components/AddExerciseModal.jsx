import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AddExerciseModal = ({ isOpen, onClose, onExerciseCreated, editingExercise, onExerciseUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    tags: []
  });
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes or when editing exercise changes
  useEffect(() => {
    if (isOpen) {
      if (editingExercise && editingExercise.id) {
        // Editing an existing exercise
        setFormData({
          title: editingExercise.title || '',
          instructions: editingExercise.instructions || '',
          tags: editingExercise.tags || []
        });
      } else {
        // Creating a new exercise - always reset to empty values
        setFormData({
          title: '',
          instructions: '',
          tags: []
        });
      }
    }
  }, [isOpen, editingExercise]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = e.target.value.trim();
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        e.target.value = '';
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingExercise && editingExercise.id) {
        await onExerciseUpdated(editingExercise.id, formData);
      } else {
        await onExerciseCreated(formData);
      }
      
      // Reset form after successful submission
      setFormData({
        title: '',
        instructions: '',
        tags: []
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving exercise:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to empty values
    setFormData({
      title: '',
      instructions: '',
      tags: []
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Exercise Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Exercise Name *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Push-ups"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Instructions
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Step-by-step instructions for performing the exercise..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            <input
              type="text"
              onKeyPress={handleTagInput}
              placeholder="Press Enter to add tags..."
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-primary hover:text-primary/80"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-muted-foreground bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (editingExercise ? 'Update Exercise' : 'Create Exercise')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExerciseModal;
