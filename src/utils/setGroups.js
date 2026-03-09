/**
 * Group consecutive sets with same reps/weight for display (e.g. 2×3@5kg, 2×2@5kg).
 * @param {Array} sets - exercise.sets
 * @param {boolean} useRir - exercise.useRir
 * @returns {Array<{ count: number, reps: string|number, weight: number }>}
 */
function orZero(v) {
  return (v != null && v !== '') ? v : 0;
}

export function getSetGroups(sets, useRir) {
  if (!sets || sets.length === 0) return [];
  const groups = [];
  let current = { count: 1, reps: orZero(sets[0]?.reps), weight: orZero(sets[0]?.weight) };
  for (let i = 1; i < sets.length; i++) {
    const s = sets[i];
    const reps = orZero(s?.reps);
    const weight = orZero(s?.weight);
    if (String(reps) === String(current.reps) && String(weight) === String(current.weight)) {
      current.count++;
    } else {
      groups.push(current);
      current = { count: 1, reps, weight };
    }
  }
  groups.push(current);
  return groups;
}
