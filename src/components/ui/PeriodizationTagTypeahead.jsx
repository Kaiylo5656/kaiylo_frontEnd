import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Tag, Plus, Loader2, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { buildApiUrl } from '../../config/api';
import axios from 'axios';
import { 
  normalizeTagName, 
  validateTagName, 
  isTagSelected 
} from '../../utils/tagNormalization';
import { getTagColor, getTagColorMap } from '../../utils/tagColors';

const PeriodizationTagTypeahead = ({ 
  selectedTags = [], 
  onTagsChange, 
  placeholder = "Appuyez sur Entrée pour ajouter un tag...",
  className = "",
  inputClassName = "",
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
  
  // Tag management states
  const [contextMenu, setContextMenu] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [dropdownMenuTag, setDropdownMenuTag] = useState(null);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch all periodization tags when component mounts
  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(buildApiUrl('/periodization/tags'), {
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

  // Tag management handlers
  const handleTagRightClick = (e, tag) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tag
    });
  };

  const handleRenameTag = (tag) => {
    setEditingTag(tag);
    setEditingValue(tag.name);
    setContextMenu(null);
  };

  const handleSaveRename = async () => {
    if (!editingTag || !editingValue.trim()) {
      setEditingTag(null);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        buildApiUrl(`/periodization/tags/${editingTag.id}`),
        { name: editingValue.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update selected tags
        const updatedSelected = selectedTags.map(t => 
          t.id === editingTag.id ? { ...t, name: editingValue.trim() } : t
        );
        onTagsChange(updatedSelected);
        
        // Refresh all tags
        await fetchTags();
      }
    } catch (err) {
      console.error('Error renaming tag:', err);
      alert('Erreur lors du renommage du tag');
    } finally {
      setEditingTag(null);
      setEditingValue('');
    }
  };



  const handleDeleteTag = async (tag) => {
    setContextMenu(null);
    
    if (!confirm(`Supprimer le tag "${tag.name}" ? Il sera retiré de tous les blocs.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(buildApiUrl(`/periodization/tags/${tag.id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from selected tags and refresh
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
      await fetchTags();
    } catch (err) {
      console.error('Error deleting tag:', err);
      alert('Erreur lors de la suppression du tag');
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Debounced filtering - exclude already selected tags
  const filteredSuggestions = useMemo(() => {
    const availableTags = allTags.filter(tag => 
      !isTagSelected(tag.name, selectedTags)
    );
    
    if (!inputValue.trim()) return availableTags.slice(0, 8);
    
    const normalizedInput = normalizeTagName(inputValue);
    const filtered = availableTags.filter(tag => 
      normalizeTagName(tag.name).includes(normalizedInput)
    );
    
    // Sort by relevance
    const sorted = filtered.sort((a, b) => {
      const aName = normalizeTagName(a.name);
      const bName = normalizeTagName(b.name);
      const aPrefix = aName.startsWith(normalizedInput);
      const bPrefix = bName.startsWith(normalizedInput);
      
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
      return 0; // Usage count might not be available or relevant yet
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
        isNew: true 
      });
    }
    
    return suggestions;
  }, [inputValue, allTags, canCreate, selectedTags]);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (!isCollapsed) {
        setIsOpen(true);
      }
      setActiveIndex(-1);
    }, 250);
  }, [isCollapsed]);

  const handleInputFocus = () => {
    if (!disabled) {
      setIsCollapsed(false);
      setIsOpen(true);
    }
  };

  const handleCollapsedClick = () => {
    if (!disabled) {
      setIsCollapsed(false);
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleTagSelect = (tag) => {
    const normalizedTag = normalizeTagName(tag.name);
    
    const validation = validateTagName(normalizedTag);
    if (!validation.isValid) {
      console.warn('Invalid tag name:', validation.error);
      return;
    }
    
    if (!isTagSelected(normalizedTag, selectedTags)) {
      onTagsChange([...selectedTags, normalizedTag]);
    }
    
    setInputValue('');
    setActiveIndex(-1);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleTagRemove = (tagToRemove) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCollapsed && !isOpen) {
        return;
      }
      
      const container = containerRef.current;
      if (!container) return;
      
      const target = event.target;
      if (!target || !(target instanceof Node)) return;
      
      const clickedInside = container.contains(target);
      
      if (!clickedInside) {
        setIsOpen(false);
        setIsCollapsed(true);
        setActiveIndex(-1);
        setInputValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen, isCollapsed]);

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

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const tagColorMap = useMemo(() => {
    const tagNames = allTags.map(tag => tag.name).filter(Boolean);
    return getTagColorMap(tagNames);
  }, [allTags]);


  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Collapsed State */}
      {isCollapsed && (
        <div
          onClick={handleCollapsedClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCollapsedClick();
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          className={`flex items-center flex-wrap gap-1.5 rounded-[10px] bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] px-[14px] py-2.5 transition-colors w-full text-left min-h-[40px] ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[rgba(255,255,255,0.08)]'
          } ${inputClassName}`}
        >
          {selectedTags.length > 0 ? (
            selectedTags.map((tag) => {
              const tagStyle = getTagColor(tag, tagColorMap);
              
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer group font-light focus:outline-none"
                  style={tagStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagRemove(tag);
                  }}
                  onContextMenu={(e) => handleTagRightClick(e, tag)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  title="Cliquez pour supprimer | Clic droit pour plus d'options"
                >
                  {editingTag && editingTag.id === tag.id ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={handleSaveRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename();
                        if (e.key === 'Escape') setEditingTag(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="bg-transparent border-none outline-none w-20 text-white"
                    />
                  ) : (
                    tag.name || tag
                  )}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagRemove(tag);
                    }}
                    role="button"
                    tabIndex={-1}
                    className="ml-0.5 hover:text-[var(--kaiylo-primary-hex)] transition-colors opacity-70 group-hover:opacity-100 focus:outline-none rounded"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    title="Supprimer ce tag"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              );
            })
          ) : (
            <span className="text-sm text-[rgba(255,255,255,0.25)] font-extralight">+ Tag</span>
          )}
        </div>
      )}

      {/* Expanded State */}
      {!isCollapsed && (
        <div className="relative">
          <div className={`flex items-center flex-wrap gap-1.5 rounded-[10px] bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] px-4 py-2.5 transition-all min-h-[40px] ${inputClassName}`}>
            {selectedTags.map((tag) => {
              const tagStyle = getTagColor(tag, tagColorMap);
              
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer group font-light focus:outline-none"
                  style={tagStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagRemove(tag);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                >
                  {tag}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagRemove(tag);
                    }}
                    role="button"
                    tabIndex={-1}
                    className="ml-0.5 hover:text-[var(--kaiylo-primary-hex)] transition-colors opacity-70 group-hover:opacity-100 focus:outline-none rounded"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
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
                <div
                  key={tag.id}
                  className={`w-full px-5 py-2 text-left text-sm font-light transition-colors flex items-center justify-between group ${
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
                  <button
                    type="button"
                    onClick={() => handleTagSelect(tag)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    {tag.isNew ? (
                      <Plus className="h-4 w-4 text-primary" />
                    ) : (
                      <Tag className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">
                      {tag.isNew ? `Créer "${tag.name}"` : normalizeTagName(tag.name)}
                    </span>
                  </button>
                  
                  {/* Three-dot menu for existing tags */}
                  {!tag.isNew && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownMenuTag(dropdownMenuTag?.id === tag.id ? null : tag);
                        }}
                        className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {/* Dropdown menu for tag options */}
                      {dropdownMenuTag?.id === tag.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-2 min-w-[180px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              handleDeleteTag(tag);
                              setDropdownMenuTag(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-2 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleRenameTag(contextMenu.tag)}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Renommer
          </button>
          <div className="border-t border-white/10 my-1" />
          <button
            onClick={() => handleDeleteTag(contextMenu.tag)}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
};

export default PeriodizationTagTypeahead;
