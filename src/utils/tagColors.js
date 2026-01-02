/**
 * Tag color utilities for consistent styling across the application
 * Uses Notion's color palette for tags
 */

// Notion color palette
const NOTION_COLORS = [
  '#373736', // gris foncé
  '#686762', // gris moyen
  '#745a48', // marron
  '#8e5835', // marron foncé
  '#896a2c', // marron doré
  '#3e6e54', // vert
  '#3b6591', // bleu
  '#6e5482', // violet
  '#824e67', // rose foncé
  '#9d5650'  // rouge/terracotta
];

/**
 * Convert hex color to rgba with opacity
 * @param {string} hex - Hex color (e.g., '#373736')
 * @param {number} opacity - Opacity value between 0 and 1
 * @returns {string} - RGBA color string
 */
const hexToRgba = (hex, opacity = 0.25) => {
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
      while (usedColors.has(availableColors[colorIndex]) && attempts < availableColors.length) {
        colorIndex = (colorIndex + 1) % availableColors.length;
        attempts++;
      }
      
      selectedColor = availableColors[colorIndex];
      usedColors.add(selectedColor);
    } else {
      // More tags than colors, reuse colors cyclically
      const hash = hashString(tag);
      colorIndex = hash % availableColors.length;
      selectedColor = availableColors[colorIndex];
    }
    
    colorMap.set(tag, selectedColor);
  });
  
  return colorMap;
};

/**
 * Get tag color styles based on tag name
 * Uses a color map if provided, otherwise falls back to hash-based assignment
 * @param {string} tag - The tag name
 * @param {Map<string, string>} colorMap - Optional map of tag names to colors
 * @returns {object} - Style object with backgroundColor and color (no border)
 */
export const getTagColor = (tag, colorMap = null) => {
  if (!tag || typeof tag !== 'string') {
    // Default color for invalid tags
    return {
      backgroundColor: hexToRgba(NOTION_COLORS[0], 1),
      color: 'rgba(255, 255, 255, 1)'
    };
  }

  // Normalize tag name to lowercase for consistent lookup
  const normalizedTag = tag.toLowerCase().trim();
  
  // Use color map if provided
  let selectedColor;
  if (colorMap && colorMap.has(normalizedTag)) {
    selectedColor = colorMap.get(normalizedTag);
  } else {
    // Fallback to hash-based assignment
    const hash = hashString(normalizedTag);
    const colorIndex = hash % NOTION_COLORS.length;
    selectedColor = NOTION_COLORS[colorIndex];
  }

  // Return style with background color (solid) and white text color
  // No border as requested
  return {
    backgroundColor: hexToRgba(selectedColor, 1),
    color: 'rgba(255, 255, 255, 1)'
  };
};

