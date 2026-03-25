import { format, parseISO, startOfWeek, addWeeks, addDays, startOfMonth, endOfMonth, subMonths, getISOWeek, getISOWeekYear } from 'date-fns';
import { fr } from 'date-fns/locale';

const MOVEMENT_IDS = ['muscle-up', 'pull-up', 'dips', 'squat'];

export const movementOptions = [
  { id: 'muscle-up', label: 'Muscle-up' },
  { id: 'pull-up', label: 'Traction / Pull-up' },
  { id: 'dips', label: 'Dips' },
  { id: 'squat', label: 'Squat' },
];

export const metricOptions = [
  { id: 'tonnage', label: 'Tonnage (kg)' },
  { id: 'reps', label: 'Reps (total)' },
  { id: 'series', label: 'Séries (réussies)' },
  { id: 'failed_series', label: 'Séries (échouées)' },
  { id: 'intensity', label: 'Intensité (%)' },
  { id: 'rpe_avg', label: 'RPE moyen' },
  { id: 'avg_charge', label: 'Charge moyenne (kg)' },
  { id: 'utilization', label: 'Utilisation (séances)' },
];

function toNumberOrNull(v) {
  if (v === null || v === undefined) return null;
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toExerciseKey(name) {
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized;
}

export function getMovementIdFromExerciseName(exerciseName) {
  const key = toExerciseKey(exerciseName);
  return key ? `exercise:${key}` : null;
}

export function getMovementIdFromOneRmRecord(record) {
  const candidate =
    String(record?.name || '').trim() ||
    String(record?.exercise || '').trim() ||
    String(record?.id || '').trim();
  return getMovementIdFromExerciseName(candidate);
}

function isCompletedSet(set) {
  return set?.validation_status === 'completed';
}

function isFailedSet(set) {
  return set?.validation_status === 'failed';
}

function getKgFromSet(set) {
  // Prefer student-entered charge fields, then fall back to generic weight fields.
  return (
    toNumberOrNull(set?.student_weight) ??
    toNumberOrNull(set?.studentWeight) ??
    toNumberOrNull(set?.weight) ??
    toNumberOrNull(set?.target_weight) ??
    toNumberOrNull(set?.requested_weight) ??
    null
  );
}

function getRepsFromSet(set) {
  return (
    toNumberOrNull(set?.reps) ??
    toNumberOrNull(set?.target_reps) ??
    toNumberOrNull(set?.requested_reps) ??
    null
  );
}

function getRpeFromSet(set, exercise) {
  // Real RPE entered by student (normal mode)
  const rpe =
    toNumberOrNull(set?.rpe_rating) ??
    toNumberOrNull(set?.rpeRating) ??
    toNumberOrNull(set?.rpe) ??
    null;

  // Fallback for `useRir` mode: the UI displays `RPE {set.weight}` when useRir=true.
  if (rpe === null && exercise?.useRir) {
    return toNumberOrNull(set?.weight);
  }

  return rpe;
}

function computeBlockIntervals(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];

  // Sort only multi-week blocks for numbering (same idea as StudentDetailView header).
  const multiWeekSorted = [...list]
    .filter(b => Number(b?.duration) > 1)
    .sort((a, b) => {
      const dateDiff = new Date(a.start_week_date) - new Date(b.start_week_date);
      if (dateDiff !== 0) return dateDiff;
      const aCreated = a.created_at ? new Date(a.created_at) : null;
      const bCreated = b.created_at ? new Date(b.created_at) : null;
      if (aCreated && bCreated) return aCreated - bCreated;
      return String(a.id).localeCompare(String(b.id));
    });

  const blockNumberById = new Map(
    multiWeekSorted.map((b, idx) => [b.id, idx + 1])
  );

  return list
    .map(b => {
      const start = startOfWeek(parseISO(b.start_week_date), { weekStartsOn: 1 });
      const durationWeeks = Number(b.duration) || 1;
      const end = addWeeks(start, durationWeeks);
      const blockNumber = blockNumberById.get(b.id);

      const name = b.name || b.block_name || '';
      const label =
        durationWeeks <= 1
          ? (name ? `Bloc - ${name}` : 'Bloc')
          : `Bloc ${blockNumber ?? ''}${name ? ` - ${name}` : ''}`.trim();

      return {
        id: b.id,
        start,
        end,
        durationWeeks,
        blockNumber,
        name,
        label,
      };
    })
    .sort((a, b) => a.start - b.start);
}

function findBlockIntervalForDate(blockIntervals, date) {
  if (!Array.isArray(blockIntervals) || !blockIntervals.length) return null;
  const t = date.getTime();
  return (
    blockIntervals.find(b => date.getTime() >= b.start.getTime() && date.getTime() < b.end.getTime()) || null
  );
}

export function computePeriodRange({ periodType, lastMonths, specificMonthValue, blocks, selectedBlockNumber }) {
  const now = new Date();

  if (periodType === 'allTime') {
    return { start: new Date(0), end: now };
  }

  if (periodType === 'lastWeek') {
    const start = subMonths(now, 0);
    start.setDate(now.getDate() - 7);
    return { start, end: now };
  }

  if (periodType === 'lastMonths') {
    const m = Math.max(1, Number(lastMonths) || 3);
    const start = startOfMonth(subMonths(now, m - 1));
    const end = endOfMonth(now);
    return { start, end };
  }

  if (periodType === 'specificMonth') {
    // input[type=month] format is YYYY-MM
    const parsed = specificMonthValue ? new Date(`${specificMonthValue}-01T00:00:00`) : now;
    const start = startOfMonth(parsed);
    const end = endOfMonth(parsed);
    return { start, end };
  }

  if (periodType === 'block') {
    const intervals = computeBlockIntervals(blocks);
    const multiWeekSorted = intervals.filter(b => b.durationWeeks > 1);

    const idx = Math.max(0, Number(selectedBlockNumber) - 1);
    const picked = multiWeekSorted[idx] || multiWeekSorted[multiWeekSorted.length - 1] || null;
    if (!picked) return { start: subMonths(now, 3), end: now };
    return { start: picked.start, end: picked.end };
  }

  // default fallback
  return { start: subMonths(now, 3), end: now };
}

/**
 * Bornes temporelles utilisées pour l’agrégation et la liste d’exercices (même logique que les données du graphique).
 * Pour « Depuis le début », le début est aligné sur la première séance complétée si on a des séances.
 */
export function resolvePerformancePeriodBounds({
  periodType,
  lastMonths,
  specificMonthValue,
  blocks,
  selectedBlockNumber,
  workoutSessions,
}) {
  let { start: periodStart, end: periodEnd } = computePeriodRange({
    periodType,
    lastMonths,
    specificMonthValue,
    blocks,
    selectedBlockNumber,
  });

  if (periodType === 'allTime' && workoutSessions && typeof workoutSessions === 'object') {
    let firstCompletedDate = null;
    Object.keys(workoutSessions).forEach(dateKey => {
      const date = parseISO(dateKey);
      if (!date || Number.isNaN(date.getTime())) return;
      const sessions = workoutSessions[dateKey] || [];
      const hasCompleted = sessions.some(session => String(session?.status || '').toLowerCase() === 'completed');
      if (!hasCompleted) return;
      if (!firstCompletedDate || date.getTime() < firstCompletedDate.getTime()) {
        firstCompletedDate = date;
      }
    });

    if (firstCompletedDate) {
      periodStart = firstCompletedDate;
    }
  }

  return { periodStart, periodEnd };
}

function formatBucketLabel(groupBy, dateOrMonthOrBlockLabel) {
  return String(dateOrMonthOrBlockLabel || '');
}

function getBucketForSetDate({ date, groupBy, blockIntervals }) {
  if (groupBy === 'day') {
    const key = format(date, 'yyyy-MM-dd');
    const label = format(date, 'dd/MM/yyyy');
    return { key, label, sortTs: date.getTime() };
  }

  if (groupBy === 'month') {
    const key = format(date, 'yyyy-MM');
    const label = format(date, 'MMM yyyy', { locale: fr });
    return { key, label, sortTs: date.getTime() };
  }

  if (groupBy === 'bloc') {
    const picked = findBlockIntervalForDate(blockIntervals, date);
    const key = picked?.id ? String(picked.id) : 'no-block';
    const label = picked?.label || 'Hors bloc';
    // sortTs: use block start or date if no block
    return { key, label, sortTs: picked?.start?.getTime() ?? date.getTime() };
  }

  // week default
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const isoWeek = getISOWeek(date);
  const key = format(weekStart, 'yyyy-MM-dd');
  const label = `Sem. ${isoWeek}`;
  return { key, label, sortTs: weekStart.getTime() };
}

export function computePerformanceAggregation({
  workoutSessions,
  blocks,
  oneRmRecords,
  selectedMovementIds,
  selectedMetricIds,
  groupBy,
  periodType,
  lastMonths,
  specificMonthValue,
  selectedBlockNumber,
}) {
  const movementIds =
    Array.isArray(selectedMovementIds) && selectedMovementIds.length === 0
      ? []
      : selectedMovementIds?.length
        ? selectedMovementIds
        : MOVEMENT_IDS;
  const metricIds = selectedMetricIds?.length ? selectedMetricIds : metricOptions.map(m => m.id);

  const blockIntervals = computeBlockIntervals(blocks);
  const { periodStart, periodEnd } = resolvePerformancePeriodBounds({
    periodType,
    lastMonths,
    specificMonthValue,
    blocks,
    selectedBlockNumber,
    workoutSessions,
  });

  // Map 1RM values per movement.
  const oneRmByMovement = {};
  (Array.isArray(oneRmRecords) ? oneRmRecords : []).forEach(rec => {
    const mid = getMovementIdFromOneRmRecord(rec);
    if (!mid) return;
    const v = toNumberOrNull(rec?.current) ?? toNumberOrNull(rec?.best);
    if (v !== null) oneRmByMovement[mid] = v;
  });

  const sets = [];

  if (workoutSessions && typeof workoutSessions === 'object') {
    Object.keys(workoutSessions).forEach(dateKey => {
      const date = parseISO(dateKey);
      if (!date || Number.isNaN(date.getTime())) return;
      // Only keep sets inside the selected period
      if (date.getTime() < periodStart.getTime() || date.getTime() > periodEnd.getTime()) return;

      const sessions = workoutSessions[dateKey] || [];
      sessions.forEach(session => {
        if (session?.status !== 'completed') return;
        const sessionId = session?.assignmentId || session?.id || session?.workoutSessionId || `${dateKey}-unknown`;
        const exercises = session?.exercises || [];
        exercises.forEach(exercise => {
          const mid = getMovementIdFromExerciseName(exercise?.name);
          if (!mid || !movementIds.includes(mid)) return;

          (exercise?.sets || []).forEach(set => {
            const completed = isCompletedSet(set);
            const failed = isFailedSet(set);
            if (!completed && !failed) return;

            const kg = getKgFromSet(set);
            const reps = getRepsFromSet(set);
            const rpe = getRpeFromSet(set, exercise);

            if (completed && kg === null && reps === null && rpe === null) return;

            sets.push({
              movementId: mid,
              dateKey,
              date,
              sessionId,
              status: completed ? 'completed' : 'failed',
              kg,
              reps,
              rpe,
            });
          });
        });
      });
    });
  }

  // Build bucket -> movement -> aggregates
  const bucketMap = new Map(); // key -> { bucket, movementAggs }
  const movementAggTemplate = () => ({
    // Raw sums
    tonnage: 0,
    reps: 0,
    series: 0,
    failed_series: 0,
    // Averages
    rpe_sum: 0,
    rpe_count: 0,
    avg_charge_sum: 0,
    avg_charge_count: 0,
    intensity_sum: 0,
    intensity_count: 0,
    // Utilisation
    utilizationSessionIds: new Set(),
  });

  // Ensure day/week modes include every bucket in the selected period,
  // even when there is no completed set for some buckets.
  if (groupBy === 'day') {
    let cursor = new Date(periodStart);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);
    const endTs = end.getTime();
    while (cursor.getTime() <= endTs) {
      const bucket = getBucketForSetDate({ date: cursor, groupBy, blockIntervals });
      if (!bucketMap.has(bucket.key)) {
        bucketMap.set(bucket.key, {
          bucket,
          movementAggs: {},
        });
      }
      cursor = addDays(cursor, 1);
    }
  } else if (groupBy === 'week') {
    let cursor = startOfWeek(periodStart, { weekStartsOn: 1 });
    const endTs = periodEnd.getTime();
    while (cursor.getTime() <= endTs) {
      const bucket = getBucketForSetDate({ date: cursor, groupBy, blockIntervals });
      if (!bucketMap.has(bucket.key)) {
        bucketMap.set(bucket.key, {
          bucket,
          movementAggs: {},
        });
      }
      cursor = addWeeks(cursor, 1);
    }
  }

  sets.forEach(s => {
    const bucket = getBucketForSetDate({ date: s.date, groupBy, blockIntervals });
    const bucketKey = bucket.key;

    if (!bucketMap.has(bucketKey)) {
      bucketMap.set(bucketKey, {
        bucket,
        movementAggs: {},
      });
    }

    const entry = bucketMap.get(bucketKey);
    if (!entry.movementAggs[s.movementId]) {
      entry.movementAggs[s.movementId] = movementAggTemplate();
    }
    const agg = entry.movementAggs[s.movementId];
    if (s.status === 'failed') {
      agg.failed_series += 1;
      return;
    }

    agg.series += 1;

    const reps = s.reps ?? 0;
    const kg = s.kg ?? 0;
    agg.reps += reps;
    agg.tonnage += kg * reps;

    if (s.rpe !== null && s.rpe !== undefined) {
      agg.rpe_sum += s.rpe;
      agg.rpe_count += 1;
    }

    if (s.kg !== null && s.kg !== undefined) {
      agg.avg_charge_sum += s.kg;
      agg.avg_charge_count += 1;
      const oneRm = oneRmByMovement[s.movementId];
      if (oneRm !== null && oneRm !== undefined && oneRm > 0) {
        agg.intensity_sum += (s.kg / oneRm) * 100;
        agg.intensity_count += 1;
      }
    }

    agg.utilizationSessionIds.add(s.sessionId);
  });

  // Sort buckets by chronological order and build final shape.
  const buckets = [...bucketMap.values()]
    .map(v => v.bucket)
    .sort((a, b) => a.sortTs - b.sortTs);

  const metricsByBucketMovement = {};
  buckets.forEach(b => {
    const entry = bucketMap.get(b.key);
    metricsByBucketMovement[b.key] = {};
    movementIds.forEach(mid => {
      const agg = entry?.movementAggs?.[mid];
      if (!agg) {
        metricsByBucketMovement[b.key][mid] = {
          tonnage: null,
          reps: null,
          series: null,
          failed_series: null,
          intensity: null,
          rpe_avg: null,
          avg_charge: null,
          utilization: null,
        };
        return;
      }

      metricsByBucketMovement[b.key][mid] = {
        tonnage: agg.series > 0 ? agg.tonnage : null,
        reps: agg.series > 0 ? agg.reps : null,
        series: agg.series,
        failed_series: agg.failed_series,
        intensity: agg.intensity_count > 0 ? agg.intensity_sum / agg.intensity_count : null,
        rpe_avg: agg.rpe_count > 0 ? agg.rpe_sum / agg.rpe_count : null,
        avg_charge: agg.avg_charge_count > 0 ? agg.avg_charge_sum / agg.avg_charge_count : null,
        utilization: agg.series > 0 ? agg.utilizationSessionIds.size : null,
      };
    });
  });

  return {
    periodStart,
    periodEnd,
    groupBy,
    buckets: buckets.map(b => ({ key: b.key, label: b.label })),
    metricsByBucketMovement,
    metricIds,
  };
}

