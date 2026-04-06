import React, { useMemo } from 'react';

/**
 * Compact preview of an exercise "scheme" under the exercise name.
 * Example: "4x8 @35kg" or "2x10 RPE 8"
 */
export const ExerciseSummaryPreview = ({ exercise, alignEnd = false }) => {
  const label = useMemo(() => {
    const sets = exercise?.sets || [];
    if (!Array.isArray(sets) || sets.length === 0) return '';

    // RPE mode: coach targets RPE in `set.weight`, reps in `set.reps`
    if (exercise?.useRir) {
      const firstReps = sets[0]?.reps ?? '?';
      const firstRpe = sets[0]?.weight ?? 0;
      const allSameReps = sets.every(s => String(s?.reps ?? '?') === String(firstReps));
      const allSameRpe = sets.every(s => String(s?.weight ?? 0) === String(firstRpe));

      if (allSameReps && allSameRpe) {
        return `${sets.length}x${firstReps} RPE ${firstRpe}`;
      }

      return sets.map(s => `${s?.reps ?? '?'} RPE ${s?.weight ?? 0}`).join(', ');
    }

    // Charge mode: `set.reps` + optional `set.weight`
    const withWeight = sets.every(s => s?.weight != null && s?.weight !== '');
    const firstReps = sets[0]?.reps ?? '?';
    const firstWeight = sets[0]?.weight;
    const allSameReps = sets.every(s => String(s?.reps ?? '?') === String(firstReps));
    const allSameWeight = !withWeight || sets.every(s => String(s?.weight) === String(firstWeight));

    if (withWeight && allSameReps && allSameWeight && firstWeight != null) {
      // If weight already includes units (e.g. "35kg") keep it as-is.
      const showKg = !/[a-zA-Z]/.test(String(firstWeight));
      return `${sets.length}x${firstReps} @${firstWeight}${showKg ? 'kg' : ''}`;
    }

    if (!withWeight && allSameReps) return `${sets.length}x${firstReps} reps`;

    return sets
      .map(s => {
        if (s?.weight) {
          const w = s.weight;
          const showKg = !/[a-zA-Z]/.test(String(w));
          return `${s?.reps ?? '?'}@${w}${showKg ? 'kg' : ''}`;
        }
        return `${s?.reps ?? '?'}reps`;
      })
      .join(', ');
  }, [exercise]);

  return (
    <p
      className={`text-white/70 text-[12px] font-light leading-none ${alignEnd ? 'text-right' : 'text-left'}`}
      style={{
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: 300,
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={label}
    >
      {label}
    </p>
  );
};

