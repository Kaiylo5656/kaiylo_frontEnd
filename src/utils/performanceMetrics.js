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
  { id: 'time_under_tension', label: 'Temps sous tension (hold)' },
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

/**
 * Nombre seul (y compris négatif) ou plage "a-b" / "a - b" → moyenne (ex. 3-5 → 4, -10--5 → -7.5).
 * Utilisé pour charge / reps / RPE dans l’agrégation performance.
 */
function parseNumericOrRangeAverage(v) {
  if (v === null || v === undefined) return null;
  if (v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (s === '') return null;

  const rangeMatch = s.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
    return null;
  }

  const n = Number(s);
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

/** Mouvements du suivi 1RM (alignés sur OneRmModal / movementOptions). */
export const ONE_RM_TRACKED_LIFT_IDS = ['muscle-up', 'pull-up', 'dips', 'squat'];

/**
 * Associe le nom d’un exercice catalogue à un lift 1RM canonique (id), ou null.
 * Ex. « Traction », « Pull-up » → pull-up ; « Squat », « Dips », « Muscle-up ».
 */
export function resolveCanonicalOneRmLiftIdFromExerciseName(exerciseName) {
  const n = String(exerciseName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!n.trim()) return null;
  if (/muscle\s*-?\s*up|muscleup/.test(n)) return 'muscle-up';
  if (/\btraction\b|pull\s*-?\s*up|pullup|\btirage\b/.test(n)) return 'pull-up';
  if (/\bdips?\b/.test(n)) return 'dips';
  if (/\bsquat\b/.test(n)) return 'squat';
  return null;
}

function toPositiveNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * La fiche 1RM correspond au lift canonique (ex. id pull-up, ou nom « Traction » mappé sur pull-up).
 * Les enregistrements API n’ont pas toujours id = pull-up alors que le nom est « Traction ».
 */
function oneRmRecordMatchesCanonicalLift(rec, canonicalLiftId) {
  if (!canonicalLiftId || !rec) return false;
  const want = `exercise:${canonicalLiftId}`;
  if (rec.id === canonicalLiftId) return true;
  if (getMovementIdFromOneRmRecord(rec) === want) return true;
  const fromName = resolveCanonicalOneRmLiftIdFromExerciseName(rec.name || '');
  if (fromName === canonicalLiftId) return true;
  const fromExercise = resolveCanonicalOneRmLiftIdFromExerciseName(rec.exercise || '');
  if (fromExercise === canonicalLiftId) return true;
  return false;
}

/** 1RM (kg) pour un lift canonique à partir des fiches 1RM élève. */
export function getOneRmKgForCanonicalLift(canonicalLiftId, oneRmRecords) {
  if (!canonicalLiftId || !Array.isArray(oneRmRecords)) return null;
  for (const rec of oneRmRecords) {
    if (!oneRmRecordMatchesCanonicalLift(rec, canonicalLiftId)) continue;
    const c = toPositiveNumberOrNull(rec?.current);
    if (c !== null) return c;
    const b = toPositiveNumberOrNull(rec?.best);
    if (b !== null) return b;
  }
  return null;
}

export function getOneRmKgForExerciseName(exerciseName, oneRmRecords) {
  const id = resolveCanonicalOneRmLiftIdFromExerciseName(exerciseName);
  return id ? getOneRmKgForCanonicalLift(id, oneRmRecords) : null;
}

/** Charge saisie → nombre (kg) pour le % 1RM ; moyenne si plage « a-b ». */
export function parseChargeKgForOneRmPercent(weightStr) {
  if (weightStr == null || weightStr === '') return null;
  const s = String(weightStr).trim().replace(/\s/g, '').replace(',', '.');
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isCompletedSet(set) {
  return set?.validation_status === 'completed';
}

function isFailedSet(set) {
  return set?.validation_status === 'failed';
}

function getKgFromSet(set, exercise) {
  // Toujours prioriser la charge saisie par l’élève.
  const fromStudent =
    parseNumericOrRangeAverage(set?.student_weight) ??
    parseNumericOrRangeAverage(set?.studentWeight);
  if (fromStudent != null) return fromStudent;

  // En mode RIR, weight / target sur la séance = cible RPE (voir getRpeFromSet), pas des kg.
  if (exercise?.useRir) return null;

  return (
    parseNumericOrRangeAverage(set?.weight) ??
    parseNumericOrRangeAverage(set?.target_weight) ??
    parseNumericOrRangeAverage(set?.requested_weight) ??
    null
  );
}

function getRepsFromSet(set) {
  return (
    parseNumericOrRangeAverage(set?.reps) ??
    parseNumericOrRangeAverage(set?.target_reps) ??
    parseNumericOrRangeAverage(set?.requested_reps) ??
    null
  );
}

function parseHoldSecondsFromReps(repsValue) {
  if (repsValue === null || repsValue === undefined || repsValue === '') return null;
  if (typeof repsValue === 'number') return Number.isFinite(repsValue) && repsValue >= 0 ? repsValue : null;

  const raw = String(repsValue).trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes(':')) {
    const parts = raw.split(':').map((p) => Number(p));
    if (!parts.length || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  const normalized = raw.endsWith('s') ? raw.slice(0, -1).trim() : raw;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function getRpeFromSet(set, exercise) {
  // Real RPE entered by student (normal mode)
  const rpe =
    parseNumericOrRangeAverage(set?.rpe_rating) ??
    parseNumericOrRangeAverage(set?.rpeRating) ??
    parseNumericOrRangeAverage(set?.rpe) ??
    null;

  // Fallback for `useRir` mode: the UI displays `RPE {set.weight}` when useRir=true.
  if (rpe === null && exercise?.useRir) {
    return parseNumericOrRangeAverage(set?.weight);
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

/**
 * Numéros de bloc (1…N, ordre multi-semaines) à inclure dans la période « Bloc ».
 * Prend en charge `selectedBlockNumbers` (tableau) ou l’ancien `selectedBlockNumber` (nombre).
 */
function resolveSelectedBlockNumbersForPeriod(selectedBlockNumbers, selectedBlockNumberLegacy, multiWeekSorted) {
  const len = multiWeekSorted.length;
  if (len === 0) return [];

  const valid = new Set();
  if (Array.isArray(selectedBlockNumbers) && selectedBlockNumbers.length > 0) {
    selectedBlockNumbers.forEach((raw) => {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 1 && n <= len) valid.add(Math.floor(n));
    });
  } else if (selectedBlockNumberLegacy != null && selectedBlockNumberLegacy !== '') {
    const n = Number(selectedBlockNumberLegacy);
    if (Number.isFinite(n) && n >= 1 && n <= len) valid.add(Math.floor(n));
  }

  let nums = Array.from(valid).sort((a, b) => a - b);
  if (nums.length === 0) {
    const idx = Math.max(0, Number(selectedBlockNumberLegacy) - 1);
    const picked = multiWeekSorted[idx] || multiWeekSorted[len - 1];
    const fallbackNum = multiWeekSorted.indexOf(picked) + 1;
    nums = [fallbackNum > 0 ? fallbackNum : len];
  }
  return nums;
}

export function computePeriodRange({
  periodType,
  lastMonths,
  specificMonthValue,
  blocks,
  selectedBlockNumbers,
  selectedBlockNumber,
}) {
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

    if (!multiWeekSorted.length) return { start: subMonths(now, 3), end: now };

    const nums = resolveSelectedBlockNumbersForPeriod(
      selectedBlockNumbers,
      selectedBlockNumber,
      multiWeekSorted,
    );
    const pickedList = nums.map(n => multiWeekSorted[n - 1]).filter(Boolean);
    if (!pickedList.length) return { start: subMonths(now, 3), end: now };

    const minStartTs = Math.min(...pickedList.map(b => b.start.getTime()));
    const maxEndExclusiveTs = Math.max(...pickedList.map(b => b.end.getTime()));
    const start = new Date(minStartTs);
    const end = new Date(maxEndExclusiveTs);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
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
  selectedBlockNumbers,
  selectedBlockNumber,
  workoutSessions,
}) {
  let { start: periodStart, end: periodEnd } = computePeriodRange({
    periodType,
    lastMonths,
    specificMonthValue,
    blocks,
    selectedBlockNumbers,
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

/**
 * Libellé court de la période (aligné sur PerformanceAnalysisModal) pour affichage dashboard / cartes.
 */
function buildBlockPeriodOptionsForLabel(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const multiWeekSorted = [...list]
    .filter((b) => Number(b?.duration) > 1)
    .sort((a, b) => {
      const dateDiff = new Date(a.start_week_date) - new Date(b.start_week_date);
      if (dateDiff !== 0) return dateDiff;
      if (a.created_at && b.created_at) return new Date(a.created_at) - new Date(b.created_at);
      return String(a.id).localeCompare(String(b.id));
    });

  return multiWeekSorted.map((b, idx) => {
    const number = idx + 1;
    const title = String(b?.name || b?.block_name || '').trim();
    return { number, title };
  });
}

export function formatPerformancePeriodPreferenceLabel({
  periodType,
  lastMonths,
  specificMonthValue,
  selectedBlockNumbers,
  selectedBlockNumber,
  blocks,
}) {
  if (periodType === 'lastWeek') {
    return 'Les 7 derniers jours';
  }

  const pt = periodType;

  if (pt === 'allTime') {
    return 'Depuis le début';
  }

  if (pt === 'lastMonths') {
    const m = Math.max(1, Number(lastMonths) || 3);
    return m === 1 ? 'Le dernier mois' : `Les ${m} derniers mois`;
  }

  if (pt === 'specificMonth' && specificMonthValue) {
    try {
      const d = new Date(`${specificMonthValue}-01T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        const monthName = format(d, 'MMMM yyyy', { locale: fr });
        return monthName.charAt(0).toUpperCase() + monthName.slice(1);
      }
    } catch {
      /* ignore */
    }
  }

  if (pt === 'block') {
    const blockOptions = buildBlockPeriodOptionsForLabel(blocks);
    const numsRaw =
      Array.isArray(selectedBlockNumbers) && selectedBlockNumbers.length
        ? selectedBlockNumbers
        : selectedBlockNumber != null
          ? [selectedBlockNumber]
          : [];
    const nums = [...numsRaw]
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 1)
      .sort((a, b) => a - b);

    const opts = nums.map((n) => blockOptions.find((o) => o.number === n)).filter(Boolean);
    if (opts.length === 1) {
      const o = opts[0];
      return o.title ? `Bloc ${o.number} : ${o.title}` : `Bloc ${o.number}`;
    }
    if (opts.length > 1) {
      return opts
        .map((o) => (o.title ? `Bloc ${o.number} : ${o.title}` : `Bloc ${o.number}`))
        .join(' · ');
    }
    return blockOptions.length ? 'Bloc' : 'Aucun bloc';
  }

  return '';
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
  selectedBlockNumbers,
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
    selectedBlockNumbers,
    selectedBlockNumber,
    workoutSessions,
  });

  const multiWeekSortedForBlockFilter = blockIntervals.filter(b => b.durationWeeks > 1);
  const resolvedBlockNums = resolveSelectedBlockNumbersForPeriod(
    selectedBlockNumbers,
    selectedBlockNumber,
    multiWeekSortedForBlockFilter,
  );
  const selectedBlockPickedIntervals = resolvedBlockNums
    .map(n => multiWeekSortedForBlockFilter[n - 1])
    .filter(Boolean);

  const dateInSelectedPerformancePeriod = (d) => {
    const t = d.getTime();
    if (periodType === 'block' && selectedBlockPickedIntervals.length > 0) {
      return selectedBlockPickedIntervals.some(
        b => t >= b.start.getTime() && t < b.end.getTime(),
      );
    }
    return t >= periodStart.getTime() && t <= periodEnd.getTime();
  };

  // Map 1RM values per movement.
  const oneRmByMovement = {};
  (Array.isArray(oneRmRecords) ? oneRmRecords : []).forEach(rec => {
    const mid = getMovementIdFromOneRmRecord(rec);
    if (!mid) return;
    const v =
      toNumberOrNull(rec?.current) ??
      toNumberOrNull(rec?.best) ??
      toNumberOrNull(rec?.value);
    if (v !== null) oneRmByMovement[mid] = v;
  });

  const sets = [];

  if (workoutSessions && typeof workoutSessions === 'object') {
    Object.keys(workoutSessions).forEach(dateKey => {
      const date = parseISO(dateKey);
      if (!date || Number.isNaN(date.getTime())) return;
      if (!dateInSelectedPerformancePeriod(date)) return;

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

            const kg = getKgFromSet(set, exercise);
            const reps = getRepsFromSet(set);
            const rpe = getRpeFromSet(set, exercise);
            const repType = set?.repType || set?.rep_type || 'reps';
            const holdSeconds =
              repType === 'hold'
                ? parseHoldSecondsFromReps(set?.reps ?? set?.target_reps ?? set?.requested_reps)
                : null;

            if (completed && kg === null && reps === null && rpe === null && holdSeconds === null) return;

            sets.push({
              movementId: mid,
              dateKey,
              date,
              sessionId,
              status: completed ? 'completed' : 'failed',
              kg,
              reps,
              rpe,
              holdSeconds,
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
    time_under_tension: 0,
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
    if (s.holdSeconds !== null && s.holdSeconds !== undefined) {
      agg.time_under_tension += s.holdSeconds;
    }

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
          time_under_tension: null,
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
        time_under_tension: agg.time_under_tension > 0 ? agg.time_under_tension : null,
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

