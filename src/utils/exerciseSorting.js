/**
 * Sort exercises with stable comparison
 * @param {Array} exercises - Array of exercise objects
 * @param {string} sortBy - Field to sort by ('createdAt' or 'name')
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted array of exercises
 */
export const sortExercises = (exercises, sortBy, direction) => {
  if (!exercises || exercises.length === 0) return exercises;

  return [...exercises].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'createdAt') {
      // Now we can use the actual created_at field for proper sorting
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      
      // Push items with missing dates to bottom
      if (!a.created_at && !b.created_at) return 0;
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      
      comparison = dateA - dateB;
    } else if (sortBy === 'name') {
      // Handle name sorting with locale-aware comparison
      const nameA = (a.title || '').trim();
      const nameB = (b.title || '').trim();
      
      // Push items with missing titles to bottom
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      
      comparison = nameA.localeCompare(nameB, undefined, {
        sensitivity: 'base',
        numeric: true
      });
    }

    // Apply direction
    return direction === 'desc' ? -comparison : comparison;
  });
};

/**
 * Get sort indicator text for accessibility
 * @param {string} sortBy - Field being sorted
 * @param {string} direction - Sort direction
 * @returns {string} Human-readable sort description
 */
export const getSortDescription = (sortBy, direction) => {
  const field = sortBy === 'createdAt' ? 'Creation date' : 'Name';
  const order = direction === 'desc' ? 'descending' : 'ascending';
  return `Sorted by ${field} ${order}`;
};
