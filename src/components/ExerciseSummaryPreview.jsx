import React from 'react';
import { getExerciseSummaryForDisplay } from '../utils/studentExerciseSummary';

function GroupArrow() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 512"
      className="flex-shrink-0 inline"
      style={{ width: '6px', height: '6px', fill: 'rgba(255,255,255,0.5)', marginRight: '3px', verticalAlign: 'middle' }}
      aria-hidden
    >
      <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
    </svg>
  );
}

/**
 * Affiche le résumé séries/reps/charge (même logique et style que sous le nom d’exercice en séance).
 * @param {{ exercise: object, alignEnd?: boolean }} props — alignEnd : texte aligné à droite (cartes dashboard).
 */
export function ExerciseSummaryPreview({ exercise, alignEnd = false }) {
  const exerciseSummary = getExerciseSummaryForDisplay(exercise);
  if (!exerciseSummary) return null;

  const line =
    'text-[11px] font-light text-white/50 leading-tight whitespace-nowrap max-w-full overflow-hidden text-ellipsis';
  const accent = 'text-[#d4845a] font-medium';
  const wrapSingleAlignEnd =
    'flex flex-col gap-[2px] items-end text-right min-w-0 max-w-full';
  const wrapGroupsAlignEnd =
    'flex flex-col gap-[2px] items-start text-left min-w-0 max-w-full';
  const wrapDefault = 'flex flex-col gap-[2px] mt-[1px] min-w-0 max-w-full';

  if (exerciseSummary.groups) {
    const wrapCls = alignEnd ? wrapGroupsAlignEnd : wrapDefault;
    return (
      <div className={wrapCls}>
        {exerciseSummary.groups.map((g, gi) => (
          <p key={gi} className={line}>
            {exerciseSummary.groups.length > 1 && <GroupArrow />}
            <span>{g.scheme}</span>
            {g.weight && (
              <>
                <span> </span>
                <span className={accent}>{g.weight}</span>
              </>
            )}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={alignEnd ? wrapSingleAlignEnd : wrapDefault}>
      <p className={line}>
        <span>{exerciseSummary.scheme}</span>
        {exerciseSummary.weight ? (
          <>
            {' '}
            <span className={accent}>{exerciseSummary.weight}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
