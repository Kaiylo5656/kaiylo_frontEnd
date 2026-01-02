import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { 
  normalizeTagName, 
  validateTagName, 
  isTagSelected 
} from '../../utils/tagNormalization';

const TagFilterDropdown = ({ 
  tags = [], 
  selectedTags = [], 
  onTagsChange, 
  placeholder = "Rechercher un tag...",
  className = "",
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Get unique tags with counts
  const tagsWithCounts = useMemo(() => {
    const tagCounts = {};
    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [tags]);

  // Filter suggestions based on input and exclude already selected tags
  const suggestions = useMemo(() => {
    // First, filter out already selected tags
    const availableTags = tagsWithCounts.filter(({ tag }) => 
      !isTagSelected(tag, selectedTags)
    );
    
    if (!inputValue.trim()) return availableTags.slice(0, 8);
    
    const normalizedInput = normalizeTagName(inputValue);
    const filtered = availableTags.filter(({ tag }) => 
      normalizeTagName(tag).includes(normalizedInput)
    );
    
    // Add "Create new tag" option if no exact match
    const hasExactMatch = filtered.some(({ tag }) => 
      normalizeTagName(tag) === normalizedInput
    );
    if (!hasExactMatch && normalizedInput.length > 0) {
      filtered.push({ tag: normalizedInput, count: 0, isNew: true });
    }
    
    return filtered.slice(0, 8);
  }, [inputValue, tagsWithCounts, selectedTags]);

  // Handle button click
  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        // Focus input when opening
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setActiveIndex(-1);
  };

  // Handle tag selection
  const handleTagSelect = (tag) => {
    const normalizedTag = normalizeTagName(tag);
    
    // Validate the tag name
    const validation = validateTagName(normalizedTag);
    if (!validation.isValid) {
      console.warn('Invalid tag name:', validation.error);
      return;
    }
    
    // Check if tag is already selected (case-insensitive)
    if (!isTagSelected(normalizedTag, selectedTags)) {
      onTagsChange([...selectedTags, normalizedTag]);
    }
    
    // Clear input but keep dropdown open
    setInputValue('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  // Handle tag removal
  const handleTagRemove = (tagToRemove, e) => {
    e?.stopPropagation();
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          const selectedTag = suggestions[activeIndex];
          handleTagSelect(selectedTag.tag);
        } else if (inputValue.trim()) {
          const normalizedInput = normalizeTagName(inputValue.trim());
          if (!isTagSelected(normalizedInput, selectedTags)) {
            handleTagSelect(normalizedInput);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        setInputValue('');
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
        setInputValue('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle dropdown positioning
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      if (spaceBelow < 200 && spaceAbove > 200) {
        dropdown.style.top = 'auto';
        dropdown.style.bottom = '100%';
        dropdown.style.marginBottom = '4px';
      } else {
        dropdown.style.top = '100%';
        dropdown.style.bottom = 'auto';
        dropdown.style.marginBottom = '0';
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Button with selected tags chips */}
      <button
        onClick={handleButtonClick}
        disabled={disabled}
        className={`bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground ${
          isOpen || selectedTags.length > 0 ? 'bg-primary/90' : ''
        }`}
        style={{
          backgroundColor: isOpen || selectedTags.length > 0 ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          color: isOpen || selectedTags.length > 0 ? '#D48459' : 'rgba(250, 250, 250, 0.75)'
        }}
        title="Filtres"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4">
          <path fill="currentColor" d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z"/>
        </svg>
        <span>Filtres</span>
        {selectedTags.length > 0 && (
          <span className="ml-1 bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full text-xs font-normal">
            {selectedTags.length}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg pb-2"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Header */}
          <div className="pt-3 px-3 pb-2 border-border">
            {/* Search Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 bg-input border border-border rounded-[10px] text-xs font-light text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              />
            </div>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="p-3 border-border">
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 rounded-full text-xs text-primary cursor-pointer hover:bg-primary/30 transition-colors group"
                    onClick={(e) => handleTagRemove(tag, e)}
                    title="Cliquer pour supprimer"
                  >
                    {tag}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTagRemove(tag, e);
                      }}
                      className="hover:text-red-400 transition-colors opacity-70 group-hover:opacity-100"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions List */}
          <div className="max-h-60 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map(({ tag, count, isNew }, index) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className={`w-full px-5 py-2 text-left text-sm font-light transition-colors flex items-center justify-between ${
                    index === activeIndex 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-foreground hover:bg-muted'
                  }`}
                  style={
                    index === activeIndex
                      ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2">
                    {isNew ? (
                      <Plus className="h-4 w-4 text-primary" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4 text-muted-foreground" fill="currentColor" aria-hidden="true">
                        <path d="M96.5 160L96.5 309.5C96.5 326.5 103.2 342.8 115.2 354.8L307.2 546.8C332.2 571.8 372.7 571.8 397.7 546.8L547.2 397.3C572.2 372.3 572.2 331.8 547.2 306.8L355.2 114.8C343.2 102.7 327 96 310 96L160.5 96C125.2 96 96.5 124.7 96.5 160zM208.5 176C226.2 176 240.5 190.3 240.5 208C240.5 225.7 226.2 240 208.5 240C190.8 240 176.5 225.7 176.5 208C176.5 190.3 190.8 176 208.5 176z"/>
                      </svg>
                    )}
                    <span className="truncate">{normalizeTagName(tag)}</span>
                  </div>
                  {!isNew && count > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {count}
                    </span>
                  )}
                </button>
              ))
            ) : inputValue.trim() ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Aucun tag trouvé pour "{inputValue}"
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Aucun tag disponible
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default TagFilterDropdown;

