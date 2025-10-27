import { describe, it, expect } from 'vitest';
import { 
  normalizeTagName, 
  validateTagName, 
  areTagsEquivalent, 
  findExistingTag, 
  removeDuplicateTags, 
  isTagSelected 
} from '../tagNormalization';

describe('tagNormalization', () => {
  describe('normalizeTagName', () => {
    it('should convert to lowercase and trim whitespace', () => {
      expect(normalizeTagName('  PUSH  ')).toBe('push');
      expect(normalizeTagName('Pull Ups')).toBe('pull ups');
      expect(normalizeTagName('CHEST')).toBe('chest');
    });

    it('should collapse multiple spaces to single space', () => {
      expect(normalizeTagName('  pull   ups  ')).toBe('pull ups');
      expect(normalizeTagName('chest  and  back')).toBe('chest and back');
    });

    it('should handle empty strings', () => {
      expect(normalizeTagName('')).toBe('');
      expect(normalizeTagName('   ')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(normalizeTagName(null)).toBe('');
      expect(normalizeTagName(undefined)).toBe('');
    });
  });

  describe('validateTagName', () => {
    it('should validate correct tag names', () => {
      expect(validateTagName('push')).toEqual({ isValid: true });
      expect(validateTagName('pull ups')).toEqual({ isValid: true });
      expect(validateTagName('chest')).toEqual({ isValid: true });
    });

    it('should reject empty tag names', () => {
      expect(validateTagName('')).toEqual({ 
        isValid: false, 
        error: 'Tag name cannot be empty' 
      });
    });

    it('should reject tags that are too long', () => {
      const longTag = 'a'.repeat(25);
      expect(validateTagName(longTag)).toEqual({ 
        isValid: false, 
        error: 'Tag name must be 24 characters or less' 
      });
    });

    it('should reject tags with invalid characters', () => {
      expect(validateTagName('push!')).toEqual({ 
        isValid: false, 
        error: 'Tag name can only contain letters, numbers, and spaces' 
      });
      expect(validateTagName('push-ups')).toEqual({ 
        isValid: false, 
        error: 'Tag name can only contain letters, numbers, and spaces' 
      });
    });
  });

  describe('areTagsEquivalent', () => {
    it('should return true for equivalent tags', () => {
      expect(areTagsEquivalent('PUSH', 'push')).toBe(true);
      expect(areTagsEquivalent('Pull Ups', 'pull ups')).toBe(true);
      expect(areTagsEquivalent('  CHEST  ', 'chest')).toBe(true);
    });

    it('should return false for different tags', () => {
      expect(areTagsEquivalent('push', 'pull')).toBe(false);
      expect(areTagsEquivalent('chest', 'back')).toBe(false);
    });
  });

  describe('findExistingTag', () => {
    const existingTags = [
      { name: 'push' },
      { name: 'pull' },
      { name: 'chest' }
    ];

    it('should find existing tags case-insensitively', () => {
      expect(findExistingTag('PUSH', existingTags)).toEqual({ name: 'push' });
      expect(findExistingTag('Pull', existingTags)).toEqual({ name: 'pull' });
      expect(findExistingTag('  CHEST  ', existingTags)).toEqual({ name: 'chest' });
    });

    it('should return null for non-existing tags', () => {
      expect(findExistingTag('legs', existingTags)).toBeNull();
      expect(findExistingTag('back', existingTags)).toBeNull();
    });
  });

  describe('removeDuplicateTags', () => {
    it('should remove duplicates case-insensitively', () => {
      const tags = ['push', 'PUSH', 'pull', 'Pull', 'chest'];
      const result = removeDuplicateTags(tags);
      expect(result).toEqual(['push', 'pull', 'chest']);
    });

    it('should preserve order of first occurrence', () => {
      const tags = ['PUSH', 'push', 'pull', 'PULL'];
      const result = removeDuplicateTags(tags);
      expect(result).toEqual(['PUSH', 'pull']);
    });
  });

  describe('isTagSelected', () => {
    const selectedTags = ['push', 'pull', 'chest'];

    it('should return true for selected tags case-insensitively', () => {
      expect(isTagSelected('PUSH', selectedTags)).toBe(true);
      expect(isTagSelected('Pull', selectedTags)).toBe(true);
      expect(isTagSelected('  CHEST  ', selectedTags)).toBe(true);
    });

    it('should return false for non-selected tags', () => {
      expect(isTagSelected('legs', selectedTags)).toBe(false);
      expect(isTagSelected('back', selectedTags)).toBe(false);
    });
  });
});
