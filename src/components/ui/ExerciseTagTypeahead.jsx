import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Tag, Plus, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../../config/api';
import axios from 'axios';
import { 
  normalizeTagName, 
  validateTagName, 
  areTagsEquivalent, 
  findExistingTag, 
  removeDuplicateTags, 
  isTagSelected 
} from '../../utils/tagNormalization';
import { getTagColor, getTagColorMap } from '../../utils/tagColors';

const ExerciseTagTypeahead = ({ 
  selectedTags = [], 
  onTagsChange, 
  placeholder = "Press Enter to add tags...",
  className = "",
  disabled = false,
  canCreate = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch all tags when component mounts
  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(buildApiUrl('/exercises/tags'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAllTags(response.data.data);
      } else {
        throw new Error('Failed to fetch tags');
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  // Debounced filtering - exclude already selected tags
  const filteredSuggestions = useMemo(() => {
    // Filter out tags that are already selected
    const availableTags = allTags.filter(tag => 
      !isTagSelected(tag.name, selectedTags)
    );
    
    if (!inputValue.trim()) return availableTags.slice(0, 8);
    
    const normalizedInput = normalizeTagName(inputValue);
    const filtered = availableTags.filter(tag => 
      normalizeTagName(tag.name).includes(normalizedInput)
    );
    
    // Sort by relevance: prefix matches first, then substring matches
    const sorted = filtered.sort((a, b) => {
      const aName = normalizeTagName(a.name);
      const bName = normalizeTagName(b.name);
      const aPrefix = aName.startsWith(normalizedInput);
      const bPrefix = bName.startsWith(normalizedInput);
      
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
      return b.usageCount - a.usageCount;
    });
    
    const suggestions = sorted.slice(0, 8);
    
    // Add "Create new tag" option if no exact match and canCreate is true
    const hasExactMatch = suggestions.some(tag => 
      normalizeTagName(tag.name) === normalizedInput
    );
    if (!hasExactMatch && normalizedInput.length > 0 && canCreate) {
      suggestions.push({ 
        id: `new-${normalizedInput}`, 
        name: normalizedInput, 
        usageCount: 0, 
        isNew: true 
      });
    }
    
    return suggestions;
  }, [inputValue, allTags, canCreate, selectedTags]);

  // Handle input changes with debouncing
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce the input
    debounceRef.current = setTimeout(() => {
      if (!isCollapsed) {
        setIsOpen(true);
      }
      setActiveIndex(-1);
    }, 250);
  }, [isCollapsed]);

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled) {
      setIsCollapsed(false);
      setIsOpen(true);
    }
  };

  // Handle collapsed state click
  const handleCollapsedClick = () => {
    if (!disabled) {
      setIsCollapsed(false);
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Handle tag selection
  const handleTagSelect = (tag) => {
    const normalizedTag = normalizeTagName(tag.name);
    
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
    
    // Keep focus on input to continue selecting tags
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle tag removal
  const handleTagRemove = (tagToRemove) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault();
        const newTag = inputValue.trim();
        if (!selectedTags.some(tag => tag.toLowerCase() === newTag.toLowerCase())) {
          onTagsChange([...selectedTags, newTag]);
        }
        setInputValue('');
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
          handleTagSelect(filteredSuggestions[activeIndex]);
        } else if (inputValue.trim()) {
          const normalizedInput = normalizeTagName(inputValue.trim());
          if (!isTagSelected(normalizedInput, selectedTags)) {
            onTagsChange([...selectedTags, normalizedInput]);
          }
          setInputValue('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setIsCollapsed(true);
        setActiveIndex(-1);
        setInputValue('');
        inputRef.current?.blur();
        break;
      case 'Backspace':
        if (inputValue === '' && selectedTags.length > 0) {
          handleTagRemove(selectedTags[selectedTags.length - 1]);
        }
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsCollapsed(true);
        setActiveIndex(-1);
        // Clear input value when clicking outside
        setInputValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Create a color map for tags
  const tagColorMap = useMemo(() => {
    const tagNames = allTags.map(tag => tag.name).filter(Boolean);
    return getTagColorMap(tagNames);
  }, [allTags]);


  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Collapsed State - Show "+ Tag" affordance or selected tags */}
      {isCollapsed && (
        <button
          onClick={handleCollapsedClick}
          disabled={disabled}
          className="flex items-center flex-wrap gap-1.5 rounded-[10px] bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] px-3 py-2.5 hover:bg-[rgba(255,255,255,0.08)] transition-colors w-full text-left min-h-[40px]"
          type="button"
        >
          {selectedTags.length > 0 ? (
            selectedTags.map((tag) => {
              const tagStyle = getTagColor(tag, tagColorMap);
              
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer group font-light"
                  style={tagStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagRemove(tag);
                  }}
                  title="Cliquez pour supprimer ce tag"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagRemove(tag);
                    }}
                    className="ml-0.5 hover:text-red-400 transition-colors opacity-70 group-hover:opacity-100"
                    type="button"
                    title="Supprimer ce tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          ) : (
            <span className="text-sm text-[rgba(255,255,255,0.25)] font-extralight">+ Tag</span>
          )}
        </button>
      )}

      {/* Expanded State - Show input and dropdown */}
      {!isCollapsed && (
        <div className="relative">
          <div className="flex items-center flex-wrap gap-1.5 rounded-[10px] bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] px-3 py-2.5 transition-all min-h-[40px]">
            {/* Selected Tags - Show inside the input container */}
            {selectedTags.map((tag) => {
              const tagStyle = getTagColor(tag, tagColorMap);
              
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer group font-light"
                  style={tagStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagRemove(tag);
                  }}
                  title="Cliquez pour supprimer ce tag"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagRemove(tag);
                    }}
                    className="ml-0.5 hover:text-red-400 transition-colors opacity-70 group-hover:opacity-100"
                    type="button"
                    title="Supprimer ce tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[rgba(255,255,255,0.5)]" />}
          </div>

          {/* Error State */}
          {error && (
            <div className="mt-1 text-sm text-destructive flex items-center gap-2">
              <span>{error}</span>
              <button
                onClick={fetchTags}
                className="text-xs underline hover:no-underline"
                type="button"
              >
                Retry
              </button>
            </div>
          )}

          {/* Dropdown */}
          {isOpen && filteredSuggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto pt-2 pb-2"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
              role="listbox"
              aria-label="Tag suggestions"
            >
              {filteredSuggestions.map((tag, index) => (
                <button
                  key={tag.id}
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
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <div className="flex items-center gap-2">
                    {tag.isNew ? (
                      <Plus className="h-4 w-4 text-primary" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4 text-muted-foreground" fill="currentColor" aria-hidden="true">
                        <path d="M96.5 160L96.5 309.5C96.5 326.5 103.2 342.8 115.2 354.8L307.2 546.8C332.2 571.8 372.7 571.8 397.7 546.8L547.2 397.3C572.2 372.3 572.2 331.8 547.2 306.8L355.2 114.8C343.2 102.7 327 96 310 96L160.5 96C125.2 96 96.5 124.7 96.5 160zM208.5 176C226.2 176 240.5 190.3 240.5 208C240.5 225.7 226.2 240 208.5 240C190.8 240 176.5 225.7 176.5 208C176.5 190.3 190.8 176 208.5 176z"/>
                      </svg>
                    )}
                    <span className="truncate">
                      {tag.isNew ? `Créer "${tag.name}"` : normalizeTagName(tag.name)}
                    </span>
                  </div>
                  {!tag.isNew && tag.usageCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {tag.usageCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {isOpen && filteredSuggestions.length === 0 && inputValue.trim() && !loading && (
            <div 
              className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg p-3"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="text-sm text-muted-foreground text-center">
                Aucun tag trouvé pour "{inputValue}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExerciseTagTypeahead;
