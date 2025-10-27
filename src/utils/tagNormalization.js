/**
 * Tag normalization utilities for enforcing lowercase canonical tags
 */

/**
 * Normalizes a tag name to lowercase canonical form
 * @param {string} name - The tag name to normalize
 * @returns {string} - The normalized tag name
 */
export const normalizeTagName = (name) => {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .trim()                    // Remove leading/trailing whitespace
    .toLowerCase()            // Convert to lowercase
    .replace(/\s+/g, ' ');    // Collapse multiple spaces to single space
};

/**
 * Validates a normalized tag name
 * @param {string} normalizedName - The normalized tag name to validate
 * @returns {object} - { isValid: boolean, error?: string }
 */
export const validateTagName = (normalizedName) => {
  if (!normalizedName) {
    return { isValid: false, error: 'Tag name cannot be empty' };
  }
  
  if (normalizedName.length < 1) {
    return { isValid: false, error: 'Tag name must be at least 1 character' };
  }
  
  if (normalizedName.length > 24) {
    return { isValid: false, error: 'Tag name must be 24 characters or less' };
  }
  
  // Allow only alphanumeric characters and spaces
  if (!/^[a-z0-9\s]+$/.test(normalizedName)) {
    return { isValid: false, error: 'Tag name can only contain letters, numbers, and spaces' };
  }
  
  return { isValid: true };
};

/**
 * Checks if two tag names are equivalent (case-insensitive)
 * @param {string} tag1 - First tag name
 * @param {string} tag2 - Second tag name
 * @returns {boolean} - True if tags are equivalent
 */
export const areTagsEquivalent = (tag1, tag2) => {
  return normalizeTagName(tag1) === normalizeTagName(tag2);
};

/**
 * Finds an existing tag in a list that matches the given tag name (case-insensitive)
 * @param {string} tagName - The tag name to find
 * @param {Array} existingTags - Array of existing tags (strings or objects with name property)
 * @returns {string|object|null} - The matching tag or null if not found
 */
export const findExistingTag = (tagName, existingTags) => {
  const normalizedTarget = normalizeTagName(tagName);
  
  for (const tag of existingTags) {
    const tagNameToCompare = typeof tag === 'string' ? tag : tag.name;
    if (normalizeTagName(tagNameToCompare) === normalizedTarget) {
      return tag;
    }
  }
  
  return null;
};

/**
 * Removes duplicate tags from an array based on normalized names
 * @param {Array} tags - Array of tag names
 * @returns {Array} - Array with duplicates removed
 */
export const removeDuplicateTags = (tags) => {
  const seen = new Set();
  const result = [];
  
  for (const tag of tags) {
    const normalized = normalizeTagName(tag);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(tag);
    }
  }
  
  return result;
};

/**
 * Checks if a tag is already selected (case-insensitive)
 * @param {string} tagName - The tag name to check
 * @param {Array} selectedTags - Array of currently selected tags
 * @returns {boolean} - True if tag is already selected
 */
export const isTagSelected = (tagName, selectedTags) => {
  const normalizedTarget = normalizeTagName(tagName);
  return selectedTags.some(selected => 
    normalizeTagName(selected) === normalizedTarget
  );
};
