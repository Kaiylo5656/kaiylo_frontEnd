import React, { useMemo } from 'react';
import { getExerciseTableVisibility } from '../utils/sessionExerciseTableVisibility';
import { getSetGroups } from '../utils/setGroups';

/** Même picto que les cartes séance coach (StudentDetailView). */
const SET_LINE_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 512"
    className="h-3 w-3 flex-shrink-0"
    fill="currentColor"
    style={{ color: 'rgba(255, 255, 255, 0.5)' }}
    aria-hidden
  >
    <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
  </svg>
);

const schemeClass = 'text-white/75';
const prescriptionClass = 'font-normal';
/** Gras 400 (distinct du corps en font-light 300 du conteneur) */
const prescriptionStyle = { color: 'var(--kaiylo-primary-hex)', fontWeight: 400 };

function seriesLabelFr(n) {
  if (n <= 0) return '0 série';
  return n === 1 ? '1 série' : `${n} séries`;
}

function showKgSuffix(weight) {
  return !/[a-zA-Z]/.test(String(weight ?? ''));
}

/** Reps non renseignées → 0 (affichage élève, pas « ? »). */
function coalesceReps(v) {
  return v != null && v !== '' ? v : 0;
}

function coalesceWeight(v) {
  return v != null && v !== '' ? v : 0;
}

function getSetRepType(set) {
  if (!set) return 'reps';
  return set.repType || set.rep_type || 'reps';
}

/**
 * Partie après « Nx » : « 12 reps » (reps), « 12s » (hold), valeur brute (AMRAP).
 * Aligné sur ExerciseArrangementModal / saisie séance (repType === 'hold').
 */
function formatRepsAfterNx(reps, repsSourceSet) {
  const rt = getSetRepType(repsSourceSet);
  const raw = reps == null || reps === '' ? '0' : String(reps);
  if (rt === 'hold') {
    if (/[0-9]/.test(raw) && !/[a-zA-Z]/.test(raw)) return `${raw}s`;
    return raw;
  }
  if (rt === 'amrap') return raw;
  return `${raw} reps`;
}

/** Affichage d’une valeur reps seule (lignes variées sans préfixe Nx). */
function formatRepsStandalone(set) {
  return formatRepsAfterNx(set?.reps, set);
}

/** Valeur reps seule (nombre ou « 12s ») pour listes « 12 RPE … » / « 12@… » sans mot « reps ». */
function formatRepsCompactValue(set) {
  const rt = getSetRepType(set);
  const raw = set?.reps == null || set?.reps === '' ? '0' : String(set.reps);
  if (rt === 'hold') {
    if (/[0-9]/.test(raw) && !/[a-zA-Z]/.test(raw)) return `${raw}s`;
    return raw;
  }
  return raw;
}

/** Texte brut pour l’infobulle (même logique que l’affichage). */
function buildSummaryPlainText(exercise) {
  const sets = exercise?.sets || [];
  if (!Array.isArray(sets) || sets.length === 0) return '';

  const visibility = getExerciseTableVisibility(exercise);
  const repsOnly = visibility.repsHold && !visibility.chargeRpe;
  const chargeOnly = visibility.chargeRpe && !visibility.repsHold;
  const prescriptionHidden = !visibility.repsHold && !visibility.chargeRpe;

  if (prescriptionHidden) {
    return seriesLabelFr(sets.length);
  }

  if (repsOnly) {
    const firstReps = coalesceReps(sets[0]?.reps);
    const allSameReps = sets.every((s) => String(coalesceReps(s?.reps)) === String(firstReps));
    if (allSameReps) return `${sets.length}x${formatRepsAfterNx(firstReps, sets[0])}`;
    return sets.map((s) => `1x${formatRepsAfterNx(s?.reps, s)}`).join('\n');
  }

  if (chargeOnly && exercise?.useRir) {
    const groups = getSetGroups(sets, true);
    if (groups.length > 1) {
      return groups.map((g) => `${seriesLabelFr(g.count)} RPE ${g.weight}`).join('\n');
    }
    const firstRpe = sets[0]?.weight ?? 0;
    const allSameRpe = sets.every((s) => String(s?.weight ?? 0) === String(firstRpe));
    if (allSameRpe) {
      return `${seriesLabelFr(sets.length)} RPE ${firstRpe}`;
    }
    return sets.map((s) => `1 série RPE ${s?.weight ?? 0}`).join(', ');
  }

  if (chargeOnly && !exercise?.useRir) {
    const groups = getSetGroups(sets, false);
    if (groups.length > 1) {
      return groups
        .map((g) => {
          const w = coalesceWeight(g.weight);
          const sk = showKgSuffix(w);
          return `${seriesLabelFr(g.count)} @${w}${sk ? 'kg' : ''}`;
        })
        .join('\n');
    }
    const withWeight = sets.every((s) => s?.weight != null && s?.weight !== '');
    const firstWeight = sets[0]?.weight;
    const allSameWeight = withWeight && sets.every((s) => String(s?.weight) === String(firstWeight));
    if (withWeight && allSameWeight && firstWeight != null && firstWeight !== '') {
      const sk = showKgSuffix(firstWeight);
      return `${seriesLabelFr(sets.length)} @${firstWeight}${sk ? 'kg' : ''}`;
    }
    return sets
      .map((s) => {
        const w = coalesceWeight(s?.weight);
        const sk = showKgSuffix(w);
        return `1 série @${w}${sk ? 'kg' : ''}`;
      })
      .join(', ');
  }

  // Reps + charge / RPE : plusieurs blocs → une ligne par groupe (comme le coach)
  const groups = getSetGroups(sets, !!exercise?.useRir);
  if (groups.length > 1) {
    if (exercise?.useRir) {
      return groups
        .map((g) => `${g.count}x${formatRepsAfterNx(g.reps, sets[0])} RPE ${coalesceWeight(g.weight)}`)
        .join('\n');
    }
    return groups
      .map((g) => {
        const w = coalesceWeight(g.weight);
        const sk = showKgSuffix(w);
        return `${g.count}x${formatRepsAfterNx(g.reps, sets[0])} @${w}${sk ? 'kg' : ''}`;
      })
      .join('\n');
  }

  if (exercise?.useRir) {
    const firstReps = coalesceReps(sets[0]?.reps);
    const firstRpe = sets[0]?.weight ?? 0;
    const allSameReps = sets.every((s) => String(coalesceReps(s?.reps)) === String(firstReps));
    const allSameRpe = sets.every((s) => String(s?.weight ?? 0) === String(firstRpe));
    if (allSameReps && allSameRpe) {
      return `${sets.length}x${formatRepsAfterNx(firstReps, sets[0])} RPE ${firstRpe}`;
    }
    return sets.map((s) => `${formatRepsCompactValue(s)} RPE ${s?.weight ?? 0}`).join(', ');
  }

  const withWeight = sets.every((s) => s?.weight != null && s?.weight !== '');
  const firstReps = coalesceReps(sets[0]?.reps);
  const firstWeight = sets[0]?.weight;
  const allSameReps = sets.every((s) => String(coalesceReps(s?.reps)) === String(firstReps));
  const allSameWeight = !withWeight || sets.every((s) => String(s?.weight) === String(firstWeight));

  if (withWeight && allSameReps && allSameWeight && firstWeight != null) {
    const cw = coalesceWeight(firstWeight);
    const sk = showKgSuffix(cw);
    return `${sets.length}x${formatRepsAfterNx(firstReps, sets[0])} @${cw}${sk ? 'kg' : ''}`;
  }

  if (!withWeight && allSameReps) return `${sets.length}x${formatRepsAfterNx(firstReps, sets[0])}`;

  return sets
    .map((s) => {
      const w = coalesceWeight(s?.weight);
      const sk = showKgSuffix(w);
      return `${formatRepsCompactValue(s)}@${w}${sk ? 'kg' : ''}`;
    })
    .join(', ');
}

/**
 * Compact preview of an exercise "scheme" under the exercise name.
 * Séries × reps en neutre ; charge (@kg) ou RPE demandé par le coach en orange Kaiylo.
 * Colonne charge seule : « 1 série @2kg », pas « 1x… ».
 */
export const ExerciseSummaryPreview = ({ exercise, alignEnd = false }) => {
  const titleText = useMemo(() => buildSummaryPlainText(exercise), [exercise]);

  const stackedLayout = useMemo(() => {
    const sets = exercise?.sets || [];
    if (!Array.isArray(sets) || sets.length === 0) return false;
    const visibility = getExerciseTableVisibility(exercise);
    if (!visibility.repsHold && !visibility.chargeRpe) return false;
    const repsOnly = visibility.repsHold && !visibility.chargeRpe;
    const chargeOnly = visibility.chargeRpe && !visibility.repsHold;
    if (repsOnly) {
      const firstReps = coalesceReps(sets[0]?.reps);
      const allSameReps = sets.every((s) => String(coalesceReps(s?.reps)) === String(firstReps));
      return !allSameReps;
    }
    const groups = getSetGroups(sets, !!exercise?.useRir);
    return groups.length > 1;
  }, [exercise]);

  const content = useMemo(() => {
    const sets = exercise?.sets || [];
    if (!Array.isArray(sets) || sets.length === 0) return null;

    const visibility = getExerciseTableVisibility(exercise);
    const repsOnly = visibility.repsHold && !visibility.chargeRpe;
    const chargeOnly = visibility.chargeRpe && !visibility.repsHold;
    const prescriptionHidden = !visibility.repsHold && !visibility.chargeRpe;

    if (prescriptionHidden) {
      return <span className={schemeClass}>{seriesLabelFr(sets.length)}</span>;
    }

    if (repsOnly) {
      const firstReps = coalesceReps(sets[0]?.reps);
      const allSameReps = sets.every((s) => String(coalesceReps(s?.reps)) === String(firstReps));
      if (allSameReps) {
        return (
          <span className={schemeClass}>{`${sets.length}x${formatRepsAfterNx(firstReps, sets[0])}`}</span>
        );
      }
      return (
        <>
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-[3px] shrink-0">
              {SET_LINE_ICON}
              <span className={schemeClass}>{`1x${formatRepsAfterNx(s?.reps, s)}`}</span>
            </div>
          ))}
        </>
      );
    }

    // Tableau avec uniquement la colonne charge (ou RPE) : « N série(s) @… » / « N série(s) RPE … »
    if (chargeOnly && exercise?.useRir) {
      const groups = getSetGroups(sets, true);
      if (groups.length > 1) {
        return (
          <>
            {groups.map((g, i) => (
              <div key={i} className="flex items-center gap-[3px] shrink-0">
                {SET_LINE_ICON}
                <span className={schemeClass}>{seriesLabelFr(g.count)}</span>
                <span className={prescriptionClass} style={prescriptionStyle}>
                  {' '}
                  RPE {g.weight}
                </span>
              </div>
            ))}
          </>
        );
      }
      const firstRpe = sets[0]?.weight ?? 0;
      const allSameRpe = sets.every((s) => String(s?.weight ?? 0) === String(firstRpe));
      if (allSameRpe) {
        return (
          <>
            <span className={schemeClass}>{seriesLabelFr(sets.length)}</span>
            <span className={prescriptionClass} style={prescriptionStyle}>
              {' '}
              RPE {firstRpe}
            </span>
          </>
        );
      }
      return (
        <>
          {sets.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span className="text-white/40">, </span> : null}
              <span className={schemeClass}>1 série</span>
              <span className={prescriptionClass} style={prescriptionStyle}>
                {' '}
                RPE {s?.weight ?? 0}
              </span>
            </React.Fragment>
          ))}
        </>
      );
    }

    if (chargeOnly && !exercise?.useRir) {
      const groups = getSetGroups(sets, false);
      if (groups.length > 1) {
        return (
          <>
            {groups.map((g, i) => (
              <div key={i} className="flex items-center gap-[3px] shrink-0">
                {SET_LINE_ICON}
                <span className={schemeClass}>{seriesLabelFr(g.count)}</span>
                <span className={prescriptionClass} style={prescriptionStyle}>
                  {' '}
                  @{coalesceWeight(g.weight)}
                  {showKgSuffix(coalesceWeight(g.weight)) ? 'kg' : ''}
                </span>
              </div>
            ))}
          </>
        );
      }
      const withWeight = sets.every((s) => s?.weight != null && s?.weight !== '');
      const firstWeight = sets[0]?.weight;
      const allSameWeight = withWeight && sets.every((s) => String(s?.weight) === String(firstWeight));
      if (withWeight && allSameWeight && firstWeight != null && firstWeight !== '') {
        const cw = coalesceWeight(firstWeight);
        const sk = showKgSuffix(cw);
        return (
          <>
            <span className={schemeClass}>{seriesLabelFr(sets.length)}</span>
            <span className={prescriptionClass} style={prescriptionStyle}>
              {' '}
              @{cw}
              {sk ? 'kg' : ''}
            </span>
          </>
        );
      }
      return (
        <>
          {sets.map((s, i) => {
            const w = coalesceWeight(s?.weight);
            const sk = showKgSuffix(w);
            return (
              <React.Fragment key={i}>
                {i > 0 ? <span className="text-white/40">, </span> : null}
                <span className={schemeClass}>1 série</span>
                <span className={prescriptionClass} style={prescriptionStyle}>
                  {' '}
                  @{w}
                  {sk ? 'kg' : ''}
                </span>
              </React.Fragment>
            );
          })}
        </>
      );
    }

    // Reps + charge / RPE : plusieurs groupes (blocs consécutifs identiques) → une ligne par groupe + icône
    const groups = getSetGroups(sets, !!exercise?.useRir);
    if (groups.length > 1) {
      return (
        <>
          {groups.map((g, i) => (
            <div key={i} className="flex items-center gap-[3px] shrink-0">
              {SET_LINE_ICON}
              <span className={schemeClass}>
                {`${g.count}x${formatRepsAfterNx(g.reps, sets[0])}`}
              </span>
              {exercise.useRir ? (
                <span className={prescriptionClass} style={prescriptionStyle}>
                  {' '}
                  RPE {coalesceWeight(g.weight)}
                </span>
              ) : (
                <span className={prescriptionClass} style={prescriptionStyle}>
                  {' '}
                  @{coalesceWeight(g.weight)}
                  {showKgSuffix(coalesceWeight(g.weight)) ? 'kg' : ''}
                </span>
              )}
            </div>
          ))}
        </>
      );
    }

    // RPE mode — un seul groupe
    if (exercise?.useRir) {
      const firstReps = coalesceReps(sets[0]?.reps);
      const firstRpe = sets[0]?.weight ?? 0;
      const allSameReps = sets.every((s) => String(coalesceReps(s?.reps)) === String(firstReps));
      const allSameRpe = sets.every((s) => String(s?.weight ?? 0) === String(firstRpe));

      if (allSameReps && allSameRpe) {
        return (
          <>
            <span className={schemeClass}>
              {`${sets.length}x${formatRepsAfterNx(firstReps, sets[0])}`}
            </span>
            <span className={prescriptionClass} style={prescriptionStyle}>
              {' '}
              RPE {firstRpe}
            </span>
          </>
        );
      }

      return (
        <>
          {sets.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span className="text-white/40">, </span> : null}
              <span className={schemeClass}>{formatRepsCompactValue(s)}</span>
              <span className={prescriptionClass} style={prescriptionStyle}>
                {' '}
                RPE {s?.weight ?? 0}
              </span>
            </React.Fragment>
          ))}
        </>
      );
    }

    // Charge mode — un seul groupe
    const withWeight = sets.every((s) => s?.weight != null && s?.weight !== '');
    const firstReps = coalesceReps(sets[0]?.reps);
    const firstWeight = sets[0]?.weight;
    const allSameReps = sets.every((s) => String(coalesceReps(s?.reps)) === String(firstReps));
    const allSameWeight =
      !withWeight || sets.every((s) => String(s?.weight) === String(firstWeight));

    if (withWeight && allSameReps && allSameWeight && firstWeight != null) {
      const cw = coalesceWeight(firstWeight);
      const sk = showKgSuffix(cw);
      return (
        <>
          <span className={schemeClass}>
            {`${sets.length}x${formatRepsAfterNx(firstReps, sets[0])}`}
          </span>
          <span className={prescriptionClass} style={prescriptionStyle}>
            {' '}
            @{cw}
            {sk ? 'kg' : ''}
          </span>
        </>
      );
    }

    if (!withWeight && allSameReps) {
      return (
        <span className={schemeClass}>{`${sets.length}x${formatRepsAfterNx(firstReps, sets[0])}`}</span>
      );
    }

    return (
      <>
        {sets.map((s, i) => {
          const w = coalesceWeight(s?.weight);
          const sk = showKgSuffix(w);
          return (
            <React.Fragment key={i}>
              {i > 0 ? <span className="text-white/40">, </span> : null}
              <span className={schemeClass}>{formatRepsCompactValue(s)}</span>
              <span className={prescriptionClass} style={prescriptionStyle}>
                @{w}
                {sk ? 'kg' : ''}
              </span>
            </React.Fragment>
          );
        })}
      </>
    );
  }, [exercise]);

  if (!content) {
    return null;
  }

  // Plusieurs lignes : contenu aligné à gauche (bords gauches des lignes alignés) ; une seule ligne : alignEnd comme le parent.
  const textAlignClass = stackedLayout ? 'text-left' : alignEnd ? 'text-right' : 'text-left';

  return (
    <div
      className={`text-[12px] font-light leading-snug ${textAlignClass} ${stackedLayout ? 'flex flex-col gap-0.5' : ''}`}
      style={{
        fontWeight: 300,
        margin: 0,
        whiteSpace: stackedLayout ? 'normal' : 'nowrap',
        overflow: stackedLayout ? 'visible' : 'hidden',
        textOverflow: stackedLayout ? 'clip' : 'ellipsis',
        alignItems: stackedLayout ? 'flex-start' : undefined,
      }}
      title={titleText || undefined}
    >
      {content}
    </div>
  );
};
