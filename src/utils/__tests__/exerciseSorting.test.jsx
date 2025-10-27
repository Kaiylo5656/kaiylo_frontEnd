import { sortExercises, getSortDescription } from '../exerciseSorting';

describe('exerciseSorting', () => {
  const mockExercises = [
    {
      id: '1',
      title: 'Zebra Exercise',
      created_at: '2023-01-01T00:00:00Z'
    },
    {
      id: '2', 
      title: 'Apple Exercise',
      created_at: '2023-01-03T00:00:00Z'
    },
    {
      id: '3',
      title: 'Banana Exercise',
      created_at: '2023-01-02T00:00:00Z'
    },
    {
      id: '4',
      title: 'Exercise without date'
      // No created_at
    }
  ];

  describe('sortExercises', () => {
    it('should sort by name A-Z', () => {
      const result = sortExercises(mockExercises, 'name', 'asc');
      expect(result[0].title).toBe('Apple Exercise');
      expect(result[1].title).toBe('Banana Exercise');
      expect(result[2].title).toBe('Exercise without date');
      expect(result[3].title).toBe('Zebra Exercise');
    });

    it('should sort by name Z-A', () => {
      const result = sortExercises(mockExercises, 'name', 'desc');
      expect(result[0].title).toBe('Zebra Exercise');
      expect(result[1].title).toBe('Exercise without date');
      expect(result[2].title).toBe('Banana Exercise');
      expect(result[3].title).toBe('Apple Exercise');
    });

    it('should sort by creation date newest first', () => {
      const result = sortExercises(mockExercises, 'createdAt', 'desc');
      expect(result[0].title).toBe('Apple Exercise'); // 2023-01-03
      expect(result[1].title).toBe('Banana Exercise'); // 2023-01-02
      expect(result[2].title).toBe('Zebra Exercise'); // 2023-01-01
    });

    it('should sort by creation date oldest first', () => {
      const result = sortExercises(mockExercises, 'createdAt', 'asc');
      expect(result[0].title).toBe('Zebra Exercise'); // 2023-01-01
      expect(result[1].title).toBe('Banana Exercise'); // 2023-01-02
      expect(result[2].title).toBe('Apple Exercise'); // 2023-01-03
    });

    it('should handle exercises without creation dates', () => {
      const result = sortExercises(mockExercises, 'createdAt', 'desc');
      // Exercise without date should be at the end
      expect(result[result.length - 1].title).toBe('Exercise without date');
    });

    it('should return empty array for empty input', () => {
      const result = sortExercises([], 'name', 'asc');
      expect(result).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      const result = sortExercises(null, 'name', 'asc');
      expect(result).toEqual(null);
    });
  });

  describe('getSortDescription', () => {
    it('should return correct description for name sorting', () => {
      expect(getSortDescription('name', 'asc')).toBe('Sorted by Name ascending');
      expect(getSortDescription('name', 'desc')).toBe('Sorted by Name descending');
    });

    it('should return correct description for date sorting', () => {
      expect(getSortDescription('createdAt', 'asc')).toBe('Sorted by Creation date ascending');
      expect(getSortDescription('createdAt', 'desc')).toBe('Sorted by Creation date descending');
    });
  });
});
