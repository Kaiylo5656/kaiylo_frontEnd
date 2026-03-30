/** Tri alphabétique des exercices sur le titre (locale fr, insensible à la casse / accents). */
export function compareExercisesAlphabetically(a, b) {
  return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base', numeric: true });
}
