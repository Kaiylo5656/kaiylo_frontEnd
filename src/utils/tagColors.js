/**
 * Tag color utilities for consistent styling across the application
 * Uses Notion's color palette for tags
 */

// Notion color palette - exact colors from Notion
const NOTION_COLORS = [
  { name: 'Dark Gray', hex: '#373736' },      // gris foncé
  { name: 'Medium Gray', hex: '#686762' },    // gris moyen
  { name: 'Brown', hex: '#745a48' },          // marron
  { name: 'Dark Brown', hex: '#8e5835' },     // marron foncé
  { name: 'Golden Brown', hex: '#896a2c' },   // marron doré
  { name: 'Green', hex: '#3e6e54' },          // vert
  { name: 'Blue', hex: '#3b6591' },           // bleu
  { name: 'Purple', hex: '#6e5482' },         // violet
  { name: 'Dark Pink', hex: '#824e67' },      // rose foncé
  { name: 'Terracotta', hex: '#9d5650' }      // rouge/terracotta
];

/**
 * Get available colors for color picker
 * @returns {Array} - Array of color objects with name and hex
 */
export const getAvailableColors = () => NOTION_COLORS;

/**
 * Convert hex color to rgba with opacity
 * @param {string} hex - Hex color (e.g., '#373736')
 * @param {number} opacity - Opacity value between 0 and 1
 * @returns {string} - RGBA color string
 */
export const hexToRgba = (hex, opacity = 0.25) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Simple hash function to convert string to number
 * @param {string} str - The string to hash
 * @returns {number} - Hash value
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Get a map of unique tags to colors, ensuring no two tags share the same color when possible
 * @param {string[]} tags - Array of tag names
 * @returns {Map<string, string>} - Map of tag name (normalized) to color hex
 */
export const getTagColorMap = (tags) => {
  const colorMap = new Map();
  const usedColors = new Set();
  const availableColors = [...NOTION_COLORS];
  
  // Get unique normalized tags
  const uniqueTags = [...new Set(tags.map(tag => 
    tag && typeof tag === 'string' ? tag.toLowerCase().trim() : null
  ).filter(Boolean))];
  
  // Sort tags for consistent assignment (optional, but helps with determinism)
  uniqueTags.sort();
  
  // Assign colors to tags
  uniqueTags.forEach((tag, index) => {
    // Try to assign a unique color
    let colorIndex;
    let selectedColor;
    
    if (index < availableColors.length) {
      // We have enough colors, assign uniquely
      // Use hash to get a starting point, then find next available
      const hash = hashString(tag);
      const startIndex = hash % availableColors.length;
      
      // Find next available color starting from hash position
      let attempts = 0;
      colorIndex = startIndex;
      while (usedColors.has(availableColors[colorIndex].hex) && attempts < availableColors.length) {
        colorIndex = (colorIndex + 1) % availableColors.length;
        attempts++;
      }
      
      selectedColor = availableColors[colorIndex].hex;
      usedColors.add(selectedColor);
    } else {
      // More tags than colors, reuse colors cyclically
      const hash = hashString(tag);
      colorIndex = hash % availableColors.length;
      selectedColor = availableColors[colorIndex].hex;
    }
    
    colorMap.set(tag, selectedColor);
  });
  
  return colorMap;
};

/**
 * Get tag color styles based on tag name or tag object
 * Priority: 1) tag.color (from database), 2) colorMap, 3) hash-based
 * @param {string|object} tag - The tag name (string) or tag object with .color property
 * @param {Map<string, string>} colorMap - Optional map of tag names to colors
 * @returns {object} - Style object with backgroundColor and color (no border)
 */
export const getTagColor = (tag, colorMap = null) => {
  // If tag is an object with a color property, use that first
  if (tag && typeof tag === 'object' && tag.color) {
    return {
      backgroundColor: hexToRgba(tag.color, 1),
      color: 'rgba(255, 255, 255, 1)'
    };
  }

  // Get tag name for string tags or extract name from object
  const tagName = typeof tag === 'string' ? tag : (tag?.name || tag);
  
  if (!tagName || typeof tagName !== 'string') {
    // Default color for invalid tags
    return {
      backgroundColor: hexToRgba(NOTION_COLORS[0].hex, 1),
      color: 'rgba(255, 255, 255, 1)'
    };
  }

  // Normalize tag name to lowercase for consistent lookup
  const normalizedTag = tagName.toLowerCase().trim();
  
  // Use color map if provided
  let selectedColor;
  if (colorMap && colorMap.has(normalizedTag)) {
    selectedColor = colorMap.get(normalizedTag);
  } else {
    // Fallback to hash-based assignment
    const hash = hashString(normalizedTag);
    const colorIndex = hash % NOTION_COLORS.length;
    selectedColor = NOTION_COLORS[colorIndex].hex;
  }

  // Return style with background color (solid) and white text color
  // No border as requested
  return {
    backgroundColor: hexToRgba(selectedColor, 1),
    color: 'rgba(255, 255, 255, 1)'
  };
};

