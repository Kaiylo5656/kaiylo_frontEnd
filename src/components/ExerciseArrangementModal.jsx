import React, { useState, useRef } from 'react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { Link } from 'lucide-react';
import { getExerciseTableVisibility } from '../utils/sessionExerciseTableVisibility';

/**
 * Symmetric drag auto-scroll (Framer's built-in scroll gates bottom edge on velocity > 0, which breaks scrolling down).
 * Uses viewport coordinates (clientY).
 */
function scrollContainerByPointerEdge(scrollEl, clientY) {
  if (!scrollEl) return;
  const rect = scrollEl.getBoundingClientRect();
  const threshold = 56;
  const maxSpeed = 24;
  const distTop = clientY - rect.top;
  const distBottom = rect.bottom - clientY;
  let delta = 0;
  if (distTop < threshold && distTop >= 0) {
    const intensity = 1 - distTop / threshold;
    delta = -maxSpeed * intensity * intensity;
  } else if (distBottom < threshold && distBottom >= 0) {
    const intensity = 1 - distBottom / threshold;
    delta = maxSpeed * intensity * intensity;
  }
  if (delta === 0) return;
  const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
  scrollEl.scrollTop = Math.max(0, Math.min(maxScroll, scrollEl.scrollTop + delta));
}

/** Group consecutive sets with same reps/weight for display; keys respect colonnes Reps / Charge visibles. */
function getSetGroups(sets, useRir, visibility) {
  const showReps = visibility?.repsHold !== false;
  const showCharge = visibility?.chargeRpe !== false;
  if (!sets || sets.length === 0) return [];
  const keyFor = (s) => {
    const r = showReps ? String(s?.reps ?? '?') : '';
    const w = showCharge ? String(s?.weight ?? (useRir ? 0 : '')) : '';
    return `${r}|${w}`;
  };
  const groups = [];
  let current = {
    count: 1,
    reps: showReps ? (sets[0]?.reps ?? '?') : '',
    weight: showCharge ? (sets[0]?.weight ?? (useRir ? 0 : null)) : null,
  };
  let currentKey = keyFor(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const s = sets[i];
    const k = keyFor(s);
    if (k === currentKey) {
      current.count++;
    } else {
      groups.push(current);
      current = {
        count: 1,
        reps: showReps ? (s?.reps ?? '?') : '',
        weight: showCharge ? (s?.weight ?? (useRir ? 0 : null)) : null,
      };
      currentKey = k;
    }
  }
  groups.push(current);
  return groups;
}

/** Partie reps / hold dans le libellé d’agencement (hold numérique → « 12s »). */
function formatArrangementRepsSegment(reps, repType) {
  const r = reps == null || reps === '' ? '?' : String(reps);
  if (repType !== 'hold') return r;
  if (r !== '?' && /[0-9]/.test(r) && !/[a-zA-Z]/.test(r)) return `${r}s`;
  return r;
}

const ExerciseArrangementModal = ({
  isOpen,
  onClose,
  exercises,
  position,
  draggedIndex,
  dragOverIndex,
  onDragStart: nativeDragStart,
  onDragEnd: nativeDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onMoveUp,
  onMoveDown,
  useAbsolute = false,
  embedded = false,
  onReorder,
  onLinkSuperset,
  /** While reordering, keep the matching exercise card in view in the main session modal (left column). */
  scrollMainToExerciseId,
  /** Notify parent when drag is active so it can lock its own scroll to prevent layout-shift scroll jumps. */
  onDragActiveChange
}) => {
  const [hoveredId, setHoveredId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const arrangementScrollRef = useRef(null);
  /**
   * During drag, we keep a local copy of the exercise order so that
   * the parent's setExercises is NOT called on every micro-move.
   * This prevents the center column from re-rendering (and scroll-jumping)
   * while the user is still dragging.
   */
  const [localExercises, setLocalExercises] = useState(null);
  const pendingReorderRef = useRef(null);

  // Use local exercises during drag, parent exercises otherwise
  const activeExercises = localExercises ?? exercises;

  const groupedExercises = React.useMemo(() => {
    const groups = [];
    let currentGroup = [];
    for (let i = 0; i < activeExercises.length; i++) {
      const exercise = activeExercises[i];
      if (currentGroup.length === 0) {
        currentGroup.push(exercise);
      } else {
        const prevExercise = currentGroup[currentGroup.length - 1];
        if (
          exercise.supersetGroup != null &&
          prevExercise.supersetGroup != null &&
          exercise.supersetGroup === prevExercise.supersetGroup
        ) {
          currentGroup.push(exercise);
        } else {
          groups.push(currentGroup);
          currentGroup = [exercise];
        }
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [activeExercises]);

  const handleGroupReorder = (newGroups) => {
    const flat = newGroups.flat();
    if (draggingId != null) {
      // During drag: only update local state (arrangement panel visual)
      setLocalExercises(flat);
      pendingReorderRef.current = flat;
    } else if (onReorder) {
      // Not dragging (e.g. keyboard reorder): commit immediately
      onReorder(flat);
    }
  };

  if (!isOpen && !embedded) return null;

  const renderGroupedList = () => (
    <Reorder.Group axis="y" values={groupedExercises} onReorder={handleGroupReorder} className="flex flex-col" style={{ padding: 0, margin: 0, listStyleType: 'none', gap: '6px' }}>
      {groupedExercises.map((group) => {
        const groupKey = group[0].id;
        return (
          <Reorder.Item
            key={groupKey}
            value={group}
            className="relative flex flex-col cursor-move"
            style={{
              borderRadius: '14px',
              userSelect: 'none',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              backgroundColor: draggingId === groupKey || (hoveredId === groupKey && !draggingId)
                ? 'rgba(212, 132, 90, 0.25)'
                : 'rgba(0, 0, 0, 0.5)',
              scale: draggingId === groupKey ? 1.02 : 1,
              boxShadow: draggingId === groupKey ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
              zIndex: draggingId === groupKey ? 50 : 1
            }}
            transition={{
              backgroundColor: { duration: 0 },
              layout: { type: "spring", bounce: 0.2, duration: 0.6 },
              default: { duration: 0.3 }
            }}
            onDragStart={(e) => {
              // Snapshot the current exercises into local state for drag
              setLocalExercises(exercises);
              pendingReorderRef.current = null;
              setDraggingId(groupKey);
              onDragActiveChange?.(true);
              if (e?.clientY != null) {
                scrollContainerByPointerEdge(arrangementScrollRef.current, e.clientY);
              }
            }}
            onDrag={(e) => {
              if (e?.clientY != null) {
                scrollContainerByPointerEdge(arrangementScrollRef.current, e.clientY);
              }
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setHoveredId(null);
              // Commit the final order to the parent now that drag is done
              const pending = pendingReorderRef.current;
              setLocalExercises(null);
              pendingReorderRef.current = null;
              if (pending && onReorder) {
                onReorder(pending);
              }
              onDragActiveChange?.(false);
            }}
            onPointerEnter={() => setHoveredId(groupKey)}
            onPointerLeave={() => setHoveredId(null)}
          >
            {group.map((exercise, indexInGroup) => {
              const isLinked = indexInGroup < group.length - 1;

              return (
                <motion.div
                  key={exercise.id}
                  layoutId={`exercise-${exercise.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  className="relative flex items-center justify-between px-4 py-3"
                  style={{ background: 'transparent' }}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-4 w-4 flex-shrink-0" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                      <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                    </svg>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-base font-normal break-words leading-relaxed text-left">{exercise.name}</span>
                      {exercise.tempo && (
                        <span className="text-xs font-extralight text-white/50">Tempo {exercise.tempo}</span>
                      )}
                      {exercise.sets && exercise.sets.length > 0 && (() => {
                        const vis = getExerciseTableVisibility(exercise);
                        if (!vis.repsHold && !vis.chargeRpe) {
                          return (
                            <span key="sets-both-cols-hidden" className="text-sm font-extralight text-white/50">
                              {exercise.sets.length} série{exercise.sets.length > 1 ? 's' : ''}
                            </span>
                          );
                        }
                        const groups = getSetGroups(exercise.sets, exercise.useRir, vis);
                        const chargeStyle = { color: 'var(--kaiylo-primary-hex)', fontWeight: 400 };
                        const kgSuffix = (w) =>
                          w !== null && w !== '' && !/[a-zA-Z]/.test(String(w)) ? 'kg' : '';
                        const repType = exercise.sets[0]?.repType || 'reps';

                        if (!vis.repsHold && vis.chargeRpe) {
                          return groups.map((g, i) => (
                            <span key={i} className="text-sm font-extralight text-white/50 flex items-center gap-1.5">
                              {groups.length > 1 && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 flex-shrink-0" fill="currentColor" style={{ color: 'rgba(255,255,255,0.5)' }} aria-hidden>
                                  <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                                </svg>
                              )}
                              {g.count} série{g.count > 1 ? 's' : ''}
                              {exercise.useRir ? (
                                <>
                                  {' '}
                                  <span style={chargeStyle}>RPE {g.weight ?? 0}</span>
                                </>
                              ) : (
                                g.weight != null &&
                                g.weight !== '' && (
                                  <>
                                    {' '}
                                    <span style={chargeStyle}>
                                      @{g.weight}
                                      {kgSuffix(g.weight)}
                                    </span>
                                  </>
                                )
                              )}
                            </span>
                          ));
                        }

                        return groups.map((g, i) => (
                          <span key={i} className="text-sm font-extralight text-white/50 flex items-center gap-1.5">
                            {groups.length > 1 && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 flex-shrink-0" fill="currentColor" style={{ color: 'rgba(255,255,255,0.5)' }} aria-hidden>
                                <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                              </svg>
                            )}
                            {vis.repsHold && vis.chargeRpe && (
                              <>
                                {g.count}×{formatArrangementRepsSegment(g.reps, repType)}{' '}
                                {exercise.useRir ? (
                                  <span style={chargeStyle}>RPE {g.weight}</span>
                                ) : (
                                  <span style={chargeStyle}>
                                    @{g.weight ?? 0}{kgSuffix(g.weight)}
                                  </span>
                                )}
                              </>
                            )}
                            {vis.repsHold && !vis.chargeRpe && (
                              <span>
                                {g.count}×{formatArrangementRepsSegment(g.reps, repType)}
                              </span>
                            )}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="h-4 w-4 flex-shrink-0" fill="currentColor" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                      <path d="M128 40c0-22.1-17.9-40-40-40L40 0C17.9 0 0 17.9 0 40L0 88c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zm0 192c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM0 424l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 40c0-22.1-17.9-40-40-40L232 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM192 232l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 424c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48z" />
                    </svg>
                  </div>
                  <AnimatePresence>
                    {isLinked && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
                        className="absolute right-6 -bottom-[10px] z-[60] flex items-center justify-center pointer-events-none rounded-full w-[20px] h-[20px] bg-transparent border-none"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );

  if (embedded) {
    return (
      <div
        ref={arrangementScrollRef}
        className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overscroll-contain modal-scrollable-body"
        style={{ overflowX: 'hidden' }}
      >
        {renderGroupedList()}
        {exercises.length === 0 && (
          <div className="rounded-2xl px-6 py-12 text-center text-xs text-white/50 font-extralight">
            Aucun exercice ajouté
          </div>
        )}
      </div>
    );
  }

  const style = position
    ? {
      top: position.top ?? 0,
      left: position.left ?? 800,
      width: position.width ?? 340,
      height: position.height ? `${position.height}px` : 'auto',
      maxHeight: position.height ? `${position.height}px` : '600px',
    }
    : { top: 0, left: 800, width: 340, maxHeight: '600px', height: 'auto' };

  return (
    <div
      role="region"
      aria-label="Agencement des exercices"
      className={`${useAbsolute ? 'relative' : 'fixed'} z-[1001] text-white pointer-events-auto w-[340px] overflow-hidden rounded-2xl shadow-2xl flex flex-col`}
      style={{
        ...(useAbsolute ? {} : style),
        ...(useAbsolute && position ? {
          width: position.width ?? 340,
          height: position.height ? `${position.height}px` : 'auto',
          maxHeight: position.height ? `${position.height}px` : '600px',
        } : {}),
        background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
        opacity: 0.95,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-3 flex items-center">
        <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5" fill="currentColor">
            <path d="M0 72C0 58.8 10.7 48 24 48l48 0c13.3 0 24 10.7 24 24l0 104 24 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-96 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l24 0 0-80-24 0C10.7 96 0 85.3 0 72zM30.4 301.2C41.8 292.6 55.7 288 70 288l4.9 0c33.7 0 61.1 27.4 61.1 61.1 0 19.6-9.4 37.9-25.2 49.4l-24 17.5 33.2 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-90.7 0C13.1 464 0 450.9 0 434.7 0 425.3 4.5 416.5 12.1 411l70.5-51.3c3.4-2.5 5.4-6.4 5.4-10.6 0-7.2-5.9-13.1-13.1-13.1L70 336c-3.9 0-7.7 1.3-10.8 3.6L38.4 355.2c-10.6 8-25.6 5.8-33.6-4.8S-1 324.8 9.6 316.8l20.8-15.6zM224 64l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z" />
          </svg>
          Agencement des exercices
        </h2>
      </div>
      <div className="border-b border-white/10 mx-6"></div>

      {/* Exercises List */}
      <div
        ref={arrangementScrollRef}
        className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overscroll-contain modal-scrollable-body"
        style={{ overflowX: 'hidden' }}
      >
        {renderGroupedList()}

        {exercises.length === 0 && (
          <div className="rounded-2xl px-6 py-12 text-center text-xs text-white/50 font-extralight">
            Aucun exercice ajouté
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseArrangementModal;
