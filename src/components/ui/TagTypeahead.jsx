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
  alwaysExpanded = false,
  circularButton = false
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

  // Filter suggestions based on input and exclude already selected tags (for circularButton mode)
  const suggestions = useMemo(() => {
    // For circularButton mode, filter out already selected tags
    const availableTags = circularButton
      ? tagsWithCounts.filter(({ tag }) => !isTagSelected(tag, selectedTags))
      : tagsWithCounts;
    
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
  }, [inputValue, tagsWithCounts, selectedTags, circularButton]);

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
      if (circularButton) {
        // In circularButton mode, toggle dropdown
        setIsOpen(!isOpen);
        if (!isOpen) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }
      } else {
        // Normal mode: expand input
        setIsCollapsed(false);
        setIsOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
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
    
    // Clear input
    setInputValue('');
    setActiveIndex(-1);
    
    // In circularButton mode, keep dropdown open; otherwise close
    if (circularButton) {
      inputRef.current?.focus();
    } else {
      setIsOpen(false);
      setIsCollapsed(true);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
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
        if (!circularButton) {
          setIsCollapsed(true);
        }
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
      // Only handle clicks when menu is open or component is expanded
      if (isCollapsed && !isOpen) {
        return;
      }
      
      const container = containerRef.current;
      if (!container) return;
      
      const target = event.target;
      if (!target || !(target instanceof Node)) return;
      
      // Check if click is inside the container (dropdown is a child, so it's included)
      const clickedInside = container.contains(target);
      
      // Close menu if click is outside the container
      if (!clickedInside) {
        setIsOpen(false);
        if (!circularButton) {
          setIsCollapsed(true);
        }
        setActiveIndex(-1);
        // Clear input value when clicking outside
        setInputValue('');
      }
    };

    // Always attach listener, but function checks if menu is open
    document.addEventListener('mousedown', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen, isCollapsed, circularButton]);

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
      {circularButton ? (
        <>
          {/* Circular Button - Dropdown Mode */}
          <button
            onClick={handleCollapsedClick}
            disabled={disabled}
            className="bg-primary hover:bg-primary/90 font-extralight h-[42px] w-[42px] rounded-full transition-colors flex items-center justify-center text-primary-foreground"
            style={{
              backgroundColor: isOpen || selectedTags.length > 0 
                ? 'rgba(212, 132, 89, 0.15)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: isOpen || selectedTags.length > 0 
                ? '#D48459' 
                : 'rgba(250, 250, 250, 0.75)'
            }}
            type="button"
            title="Tag"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-4 w-4" fill="currentColor">
              <path d="M32 64C19.1 64 7.4 71.8 2.4 83.8S.2 109.5 9.4 118.6L192 301.3 192 416c0 8.5 3.4 16.6 9.4 22.6l64 64c9.2 9.2 22.9 11.9 34.9 6.9S320 492.9 320 480l0-178.7 182.6-182.6c9.2-9.2 11.9-22.9 6.9-34.9S492.9 64 480 64L32 64z"/>
            </svg>
          </button>

          {/* Dropdown Menu - Similar to TagFilterDropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg pb-2 right-0"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Header with Search Input */}
              <div className="pt-3 px-3 pb-2 border-border">
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
                          : 'text-foreground'
                      }`}
                      style={
                        index === activeIndex
                          ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        if (index !== activeIndex) {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                          const textElements = e.currentTarget.querySelectorAll('span');
                          textElements.forEach(el => {
                            el.style.color = '#D48459';
                            el.style.fontWeight = '400';
                          });
                          const svgElements = e.currentTarget.querySelectorAll('svg');
                          svgElements.forEach(el => {
                            el.style.color = '#D48459';
                          });
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== activeIndex) {
                          e.currentTarget.style.backgroundColor = '';
                          const textElements = e.currentTarget.querySelectorAll('span');
                          textElements.forEach(el => {
                            el.style.color = '';
                            el.style.fontWeight = '';
                          });
                          const svgElements = e.currentTarget.querySelectorAll('svg');
                          svgElements.forEach(el => {
                            el.style.color = '';
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isNew ? (
                          <Plus className={`h-4 w-4 ${index === activeIndex ? 'text-[#D48459]' : 'text-primary'}`} />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`h-4 w-4 ${index === activeIndex ? 'text-[#D48459]' : 'text-muted-foreground'}`} fill="currentColor" aria-hidden="true" style={index === activeIndex ? { color: '#D48459' } : {}}>
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
        </>
      ) : (
        <>
          {/* Selected Tags - Normal Mode */}
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
                      handleTagRemove(tag, e);
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

          {/* Collapsed State - Normal Mode */}
          {isCollapsed && (
            <button
              onClick={handleCollapsedClick}
              disabled={disabled}
              className="bg-primary hover:bg-primary/90 font-extralight h-[42px] rounded-xl transition-colors flex items-center justify-center text-primary-foreground w-full"
              style={{
                backgroundColor: 'rgba(212, 132, 89, 0.15)',
                color: '#D48459'
              }}
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Tag</span>
            </button>
          )}

          {/* Expanded State - Normal Mode */}
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
                  onMouseDown={(e) => {
                    // Prevent closing when clicking inside the dropdown
                    e.stopPropagation();
                  }}
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
                <div 
                  onMouseDown={(e) => {
                    // Prevent closing when clicking inside the empty state dropdown
                    e.stopPropagation();
                  }}
                  className="absolute z-50 w-full mt-1 bg-[#111]/95 backdrop-blur border border-white/10 rounded-lg shadow-2xl p-3"
                >
                  <div className="text-sm text-white/50 text-center">
                    Aucun tag trouvé pour "{inputValue}"
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TagTypeahead;
