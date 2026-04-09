export const DEFAULT_SESSION_TABLE_COLUMNS = {
  repsHold: true,
  chargeRpe: true,
  previous: true,
  rest: true,
};

export function getExerciseTableVisibility(exercise) {
  const v = exercise?.tableColumnVisibility ?? exercise?.table_column_visibility;
  if (!v || typeof v !== 'object') return { ...DEFAULT_SESSION_TABLE_COLUMNS };
  return {
    repsHold: (v.repsHold ?? v.reps_hold) !== false,
    chargeRpe: (v.chargeRpe ?? v.charge_rpe) !== false,
    previous: v.previous !== false,
    rest: v.rest !== false,
  };
}
