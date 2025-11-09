import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Tag, Plus } from 'lucide-react';
import { 
  normalizeTagName, 
  validateTagName, 
  areTagsEquivalent, 
  findExistingTag, 
  removeDuplicateTags, 
  isTagSelected 
} from '../../utils/tagNormalization';

const TagTypeahead = ({ 
  tags = [], 
  selectedTags = [], 
  onTagsChange, 
  placeholder = "Filtrer par tags...",
  className = "",
  disabled = false,
  alwaysExpanded = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isCollapsed, setIsCollapsed] = useState(!alwaysExpanded); // Start expanded if alwaysExpanded is true
  
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

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return tagsWithCounts.slice(0, 8);
    
    const normalizedInput = normalizeTagName(inputValue);
    const filtered = tagsWithCounts.filter(({ tag }) => 
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
  }, [inputValue, tagsWithCounts]);

  // Handle input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    // Only open if we're not collapsed and have content
    if (!isCollapsed) {
      setIsOpen(true);
    }
    setActiveIndex(-1);
  };

  // Auto-open dropdown when alwaysExpanded and has tags
  useEffect(() => {
    if (alwaysExpanded && tags.length > 0 && !disabled) {
      setIsOpen(true);
    }
  }, [alwaysExpanded, tags.length, disabled]);

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
      // Focus the input after a brief delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
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
    
    // Clear input and close/collapse everything
    setInputValue('');
    setIsOpen(false);
    setIsCollapsed(true);
    setActiveIndex(-1);
    
    // Blur the input to prevent immediate reopen
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Handle tag removal
  const handleTagRemove = (tagToRemove) => {
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
          if (selectedTag.isNew) {
            // Create new tag with normalized name
            handleTagSelect(selectedTag.tag);
          } else {
            handleTagSelect(selectedTag.tag);
          }
        } else if (inputValue.trim()) {
          const normalizedInput = normalizeTagName(inputValue.trim());
          if (!isTagSelected(normalizedInput, selectedTags)) {
            // Add current input as new tag (normalized)
            handleTagSelect(normalizedInput);
          }
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
          // Remove last tag if input is empty
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 border border-white/15 rounded-full text-sm text-white cursor-pointer hover:bg-white/15 transition-colors group"
              onClick={() => handleTagRemove(tag)}
              title="Cliquer pour supprimer ce tag"
            >
              {tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagRemove(tag);
                }}
                className="ml-1 hover:text-red-400 transition-colors opacity-70 group-hover:opacity-100"
                type="button"
                title="Supprimer ce tag"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Collapsed State - Show "+ Tag" affordance */}
      {isCollapsed && (
        <button
          onClick={handleCollapsedClick}
          disabled={disabled}
          className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 hover:bg-white/10 transition-colors w-full text-left"
          type="button"
        >
          <Plus className="h-4 w-4 text-white/50" />
          <span className="text-sm text-white/50">+ Tag</span>
        </button>
      )}

      {/* Expanded State - Show input and dropdown */}
      {!isCollapsed && (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <Tag className="h-4 w-4 text-white/50" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/50"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
            />
          </div>

          {/* Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-[#111]/95 backdrop-blur border border-white/10 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
              role="listbox"
              aria-label="Tag suggestions"
            >
              {suggestions.map(({ tag, count, isNew }, index) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                    index === activeIndex 
                      ? 'bg-[#e87c3e]/20 text-[#e87c3e]' 
                      : 'text-white hover:bg-white/5'
                  }`}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <div className="flex items-center gap-2">
                    {isNew ? (
                      <Plus className="h-3 w-3 text-[#e87c3e]" />
                    ) : (
                      <Tag className="h-3 w-3 text-white/50" />
                    )}
                    <span className="truncate">{normalizeTagName(tag)}</span>
                  </div>
                  {!isNew && count > 0 && (
                    <span className="text-xs text-white/50 ml-2">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {/* Empty State */}
          {isOpen && suggestions.length === 0 && inputValue.trim() && (
            <div className="absolute z-50 w-full mt-1 bg-[#111]/95 backdrop-blur border border-white/10 rounded-lg shadow-2xl p-3">
              <div className="text-sm text-white/50 text-center">
                Aucun tag trouvé pour "{inputValue}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagTypeahead;
