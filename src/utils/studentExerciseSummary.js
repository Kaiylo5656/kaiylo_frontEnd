import { getExerciseTableVisibility } from './sessionExerciseTableVisibility';

/** Reps affichés sous le nom d'exercice (hold numérique → « 12s »). */
export function formatStudentSummaryReps(reps, repType) {
  const r = reps == null || reps === '' ? '?' : String(reps);
  if (repType !== 'hold') return r;
  if (r !== '?' && /[0-9]/.test(r) && !/[a-zA-Z]/.test(r)) return `${r}s`;
  return r;
}

/**
 * Résumé sous le nom d'exercice (colonnes coach reps/charge, hold → …x12s, charge seule → « N séries @12kg »).
 * Même logique que l'écran d'exécution de séance.
 *
 * @returns {{ scheme: string, weight: string|null } | { groups: Array<{ scheme: string, weight: string|null }> } | null}
 */
export function getExerciseSummaryForDisplay(exercise) {
  if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) {
    return null;
  }

  const vis = getExerciseTableVisibility(exercise);
  const sets = exercise.sets;
  const repType = sets[0]?.repType || sets[0]?.rep_type || 'reps';
  const fr = (reps) => formatStudentSummaryReps(reps, repType);

  const setHasMeaningfulReps = (s) => {
    const r = s?.reps;
    if (r == null) return false;
    return String(r).trim() !== '';
  };
  const hasAnyReps = sets.some(setHasMeaningfulReps);
  const hasAnyCharge = sets.some((s) => s?.weight != null && String(s.weight).trim() !== '');

  let showReps = vis.repsHold;
  let showCharge = vis.chargeRpe;
  if (showReps && showCharge && !hasAnyReps && hasAnyCharge) {
    showReps = false;
  }

  if (!showReps && !showCharge) {
    return { scheme: `${sets.length} série${sets.length > 1 ? 's' : ''}`, weight: null };
  }

  if (!showReps && showCharge) {
    if (exercise.useRir) {
      const chargeGroups = [];
      let i = 0;
      while (i < sets.length) {
        let j = i + 1;
        while (j < sets.length && String(sets[j].weight ?? 0) === String(sets[i].weight ?? 0)) j++;
        const count = j - i;
        chargeGroups.push({
          scheme: `${count} série${count > 1 ? 's' : ''}`,
          weight: `RPE ${sets[i].weight ?? 0}`,
        });
        i = j;
      }
      if (chargeGroups.length === 1) {
        return { scheme: chargeGroups[0].scheme, weight: chargeGroups[0].weight };
      }
      return { groups: chargeGroups };
    }
    const chargeGroups = [];
    let i = 0;
    while (i < sets.length) {
      let j = i + 1;
      while (j < sets.length && String(sets[j].weight ?? '') === String(sets[i].weight ?? '')) j++;
      const count = j - i;
      const w = sets[i].weight;
      const weightLabel =
        w != null && w !== ''
          ? `@${w}${!/[a-zA-Z]/.test(String(w)) ? 'kg' : ''}`
          : null;
      chargeGroups.push({
        scheme: `${count} série${count > 1 ? 's' : ''}`,
        weight: weightLabel,
      });
      i = j;
    }
    if (chargeGroups.length === 1) {
      return { scheme: chargeGroups[0].scheme, weight: chargeGroups[0].weight };
    }
    return { groups: chargeGroups };
  }

  if (showReps && !showCharge) {
    if (exercise.useRir) {
      const firstReps = sets[0]?.reps ?? '?';
      const allSameReps = sets.every((s) => String(s.reps ?? '?') === String(firstReps));
      if (allSameReps) {
        return { scheme: `${sets.length}x${fr(firstReps)}`, weight: null };
      }
      const repGroups = [];
      let i = 0;
      while (i < sets.length) {
        let j = i + 1;
        while (j < sets.length && String(sets[j].reps ?? '?') === String(sets[i].reps ?? '?')) j++;
        const count = j - i;
        repGroups.push({ scheme: `${count}x${fr(sets[i].reps ?? '?')}`, weight: null });
        i = j;
      }
      if (repGroups.length === 1) {
        return { scheme: repGroups[0].scheme, weight: null };
      }
      return { groups: repGroups };
    }
    const withWeight = sets.every((s) => s.weight != null && s.weight !== '');
    const firstReps = sets[0]?.reps ?? '?';
    const allSameReps = sets.every((s) => String(s.reps ?? '?') === String(firstReps));
    if (!withWeight && allSameReps) {
      return { scheme: `${sets.length}x${fr(firstReps)}`, weight: null };
    }
    const repGroups = [];
    let i = 0;
    while (i < sets.length) {
      let j = i + 1;
      while (j < sets.length && String(sets[j].reps ?? '?') === String(sets[i].reps ?? '?')) j++;
      const count = j - i;
      repGroups.push({ scheme: `${count}x${fr(sets[i].reps ?? '?')}`, weight: null });
      i = j;
    }
    if (repGroups.length === 1) {
      return { scheme: repGroups[0].scheme, weight: null };
    }
    return { groups: repGroups };
  }

  if (exercise.useRir) {
    const firstReps = sets[0]?.reps ?? '?';
    const firstRpe = sets[0]?.weight ?? 0;
    const allSameReps = sets.every((s) => String(s.reps ?? '?') === String(firstReps));
    const allSameRpe = sets.every((s) => String(s.weight ?? 0) === String(firstRpe));
    if (allSameReps && allSameRpe) {
      return { scheme: `${sets.length}x${fr(firstReps)}`, weight: `RPE ${firstRpe}` };
    }
    const groups = [];
    let i = 0;
    while (i < sets.length) {
      let j = i + 1;
      while (
        j < sets.length &&
        String(sets[j].reps ?? '?') === String(sets[i].reps ?? '?') &&
        String(sets[j].weight ?? 0) === String(sets[i].weight ?? 0)
      )
        j++;
      const count = j - i;
      groups.push({
        scheme: `${count}x${fr(sets[i].reps ?? '?')}`,
        weight: `RPE ${sets[i].weight ?? 0}`,
      });
      i = j;
    }
    if (groups.length === 1) {
      return { scheme: groups[0].scheme, weight: groups[0].weight };
    }
    return { groups };
  }

  const withWeight = sets.every((s) => s.weight != null && s.weight !== '');
  const firstReps = sets[0]?.reps ?? '?';
  const firstWeight = sets[0]?.weight;
  const allSameReps = sets.every((s) => String(s.reps ?? '?') === String(firstReps));
  const allSameWeight = !withWeight || sets.every((s) => String(s.weight) === String(firstWeight));

  if (withWeight && allSameReps && allSameWeight && firstWeight != null) {
    const showKg = !/[a-zA-Z]/.test(String(firstWeight));
    return { scheme: `${sets.length}x${fr(firstReps)}`, weight: `@${firstWeight}${showKg ? 'kg' : ''}` };
  }
  if (!withWeight && allSameReps) {
    return { scheme: `${sets.length}x${fr(firstReps)}`, weight: null };
  }

  const groups = [];
  let i = 0;
  while (i < sets.length) {
    let j = i + 1;
    while (
      j < sets.length &&
      String(sets[j].reps ?? '?') === String(sets[i].reps ?? '?') &&
      String(sets[j].weight ?? '') === String(sets[i].weight ?? '')
    )
      j++;
    const count = j - i;
    const scheme = `${count}x${fr(sets[i].reps ?? '?')}`;
    const w = sets[i].weight;
    const weightLabel =
      w != null && w !== '' ? `@${w}${!/[a-zA-Z]/.test(String(w)) ? 'kg' : ''}` : null;
    groups.push({ scheme, weight: weightLabel });
    i = j;
  }
  if (groups.length === 1) {
    return { scheme: groups[0].scheme, weight: groups[0].weight };
  }
  return { groups };
}
