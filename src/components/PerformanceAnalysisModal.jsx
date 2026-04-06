import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import BaseModal from './ui/modal/BaseModal';
import PerformanceTrendChart from './PerformanceTrendChart';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';
import {
  movementOptions,
  metricOptions,
  computePerformanceAggregation,
  getMovementIdFromExerciseName,
  resolvePerformancePeriodBounds,
} from '../utils/performanceMetrics';
import { normalizeTagName } from '../utils/tagNormalization';
import { getTagColor, getTagColorMap } from '../utils/tagColors';
import TagFilterDropdown from './ui/TagFilterDropdown';

const MOVEMENT_COLOR = {
  'muscle-up': '#d4845a',
  'pull-up': '#3b82f6',
  dips: '#22c55e',
  squat: '#a855f7',
};

const METRIC_COLOR = '#d4845a';

/** Nombre maximal de mesures affichées sur le graphique (axes / séries). */
const MAX_SELECTED_METRICS = 2;

/** Nombre maximal d'exercices (mouvements) sélectionnables en même temps. */
const MAX_SELECTED_MOVEMENTS = 4;

function normalizeMovementSelection(ids) {
  const raw = Array.isArray(ids) ? ids : [];
  const seen = new Set();
  const out = [];
  for (const id of raw) {
    if (id == null || id === '') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_SELECTED_MOVEMENTS) break;
  }
  return out;
}

function getMetricLabel(metricId) {
  return metricOptions.find(m => m.id === metricId)?.label || metricId;
}

function formatNumber(n, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: digits });
}

/** % d’évolution entre la première et la dernière valeur agrégée par période (bucket). */
function evolutionPercentFromFirstLast(firstVal, lastVal) {
  if (firstVal === null || lastVal === null) return null;
  if (!Number.isFinite(firstVal) || !Number.isFinite(lastVal)) return null;
  if (firstVal === 0 && lastVal === 0) return 0;
  if (firstVal === 0) return null;
  return ((lastVal - firstVal) / firstVal) * 100;
}

/** Fusionne les tags d’un exercice dans la liste unique par id de mouvement (affichage = 1re forme vue). */
function mergeMovementTags(entry, rawTags) {
  if (!Array.isArray(rawTags)) return;
  const map = new Map();
  (entry.tags || []).forEach((t) => {
    const n = normalizeTagName(String(t));
    if (n) map.set(n, String(t).trim());
  });
  rawTags.forEach((t) => {
    const n = normalizeTagName(String(t));
    if (n && !map.has(n)) map.set(n, String(t).trim());
  });
  entry.tags = Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

function movementMatchesTagFilters(optionTags, selectedFilters) {
  if (!selectedFilters?.length) return true;
  const set = new Set((optionTags || []).map((t) => normalizeTagName(String(t))).filter(Boolean));
  return selectedFilters.every((f) => set.has(normalizeTagName(f)));
}

function formatMetricValue(metricId, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';

  switch (metricId) {
    case 'tonnage':
      return `${formatNumber(value, 0)} kg`;
    case 'reps':
      return `${formatNumber(value, 0)} reps`;
    case 'series':
      return `${formatNumber(value, 0)} séries`;
    case 'failed_series':
      return `${formatNumber(value, 0)} séries`;
    case 'intensity':
      return `${formatNumber(value, 1)}%`;
    case 'rpe_avg':
      return `RPE ${formatNumber(value, 1)}`;
    case 'avg_charge':
      return `${formatNumber(value, 1)} kg`;
    case 'utilization':
      return `${formatNumber(value, 0)} séances`;
    case 'time_under_tension':
      return `${formatNumber(value, 0)} s`;
    default:
      return formatNumber(value, 2);
  }
}

function getWeekStart(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diffToMonday = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function addWeeksToDate(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(weeks || 0) * 7);
  return d;
}

function formatWeekRangeFromBucketKey(bucketKey) {
  const key = String(bucketKey || '');
  if (!key) return '';
  const startDate = new Date(`${key}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return '';
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const startLabel = startDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const endLabel = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  return `${startLabel} - ${endLabel}`;
}

function formatWeekdayFromBucketKey(bucketKey) {
  const key = String(bucketKey || '');
  if (!key) return '';
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

function formatMovementHeaderLabel(label) {
  const raw = String(label || '').trim();
  if (!raw) return '';
  const lowered = raw.toLocaleLowerCase('fr-FR');
  return lowered.charAt(0).toLocaleUpperCase('fr-FR') + lowered.slice(1);
}

const PerformanceAnalysisModal = ({
  isOpen,
  onClose,
  initialMovementIds = [],
  workoutSessions,
  blocks,
  oneRmRecords,
  totalBlocks = 3,
  preferencesKey = 'performanceAnalysisModalPreferences',
}) => {
  const [selectedMovementIds, setSelectedMovementIds] = useState(() =>
    normalizeMovementSelection(initialMovementIds),
  );
  const [selectedMetricIds, setSelectedMetricIds] = useState(['tonnage', 'reps']);

  const [groupBy, setGroupBy] = useState('bloc'); // 'week' | 'month' | 'bloc'
  const [periodType, setPeriodType] = useState('block'); // 'block' | 'lastMonths' | 'allTime'
  /** Numéros de bloc (1…N) inclus dans la période lorsque « Bloc » est choisi — sélection multiple. */
  const [selectedBlockNumbers, setSelectedBlockNumbers] = useState(() => [3]);
  const [lastMonths, setLastMonths] = useState(3);
  const [isMovementDropdownOpen, setIsMovementDropdownOpen] = useState(false);
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const [isGroupByDropdownOpen, setIsGroupByDropdownOpen] = useState(false);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isBlockDropdownOpen, setIsBlockDropdownOpen] = useState(false);
  const [isLastMonthsDropdownOpen, setIsLastMonthsDropdownOpen] = useState(false);
  const [movementSearchTerm, setMovementSearchTerm] = useState('');
  const [movementTagFilters, setMovementTagFilters] = useState([]);
  const [isMovementTagFilterOpen, setIsMovementTagFilterOpen] = useState(false);
  const [metricSearchTerm, setMetricSearchTerm] = useState('');
  const [saveFeedback, setSaveFeedback] = useState('');
  const [viewMode, setViewMode] = useState('chart');
  /** Exercices masqués du graphique uniquement (clic sur les chips) — la sélection des filtres ne change pas. */
  const [chartMaskedMovementIds, setChartMaskedMovementIds] = useState([]);
  const [specificMonthValue, setSpecificMonthValue] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });

  const blockOptions = useMemo(() => {
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
      const start = getWeekStart(b?.start_week_date);
      const end = start ? addWeeksToDate(start, Number(b?.duration) || 1) : null;
      return {
        id: String(b?.id ?? number),
        number,
        title,
        label: title ? `Bloc ${number} - ${title}` : `Bloc ${number}`,
        shortLabel: title || `Bloc ${number}`,
        start,
        end,
      };
    });
  }, [blocks]);

  const sortedSelectedBlockNumbers = useMemo(
    () => [...selectedBlockNumbers].sort((a, b) => a - b),
    [selectedBlockNumbers],
  );

  const blockPeriodTriggerLabel = useMemo(() => {
    if (!sortedSelectedBlockNumbers.length || !blockOptions.length) return '';
    const opts = sortedSelectedBlockNumbers
      .map((n) => blockOptions.find((o) => o.number === n))
      .filter(Boolean);
    if (opts.length === 1) {
      const o = opts[0];
      return o.title ? `Bloc ${o.number} : ${o.title}` : `Bloc ${o.number}`;
    }
    return `Blocs (${opts.length})`;
  }, [sortedSelectedBlockNumbers, blockOptions]);

  const currentBlockNumber = useMemo(() => {
    if (!blockOptions.length) return '';
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    if (!currentWeekStart) return '';
    const active = blockOptions.find((opt) => (
      opt.start && opt.end && currentWeekStart >= opt.start && currentWeekStart < opt.end
    ));
    return active ? active.number : '';
  }, [blockOptions]);

  useEffect(() => {
    if (!blockOptions.length) return;
    const valid = new Set(blockOptions.map((o) => o.number));
    setSelectedBlockNumbers((prev) => {
      const next = prev.filter((n) => valid.has(n)).sort((a, b) => a - b);
      if (next.length) return next;
      return [blockOptions[0].number];
    });
  }, [blockOptions]);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const raw = localStorage.getItem(preferencesKey);
      if (raw) {
        const saved = JSON.parse(raw);

        if (Array.isArray(saved?.selectedMovementIds) && saved.selectedMovementIds.length) {
          setSelectedMovementIds(normalizeMovementSelection(saved.selectedMovementIds));
        } else if (initialMovementIds?.length) {
          setSelectedMovementIds(normalizeMovementSelection(initialMovementIds));
        }

        if (Array.isArray(saved?.selectedMetricIds) && saved.selectedMetricIds.length) {
          setSelectedMetricIds(saved.selectedMetricIds.slice(0, MAX_SELECTED_METRICS));
        }

        if (typeof saved?.groupBy === 'string') {
          setGroupBy(saved.groupBy);
        }

        if (typeof saved?.periodType === 'string') {
          const pt = saved.periodType === 'lastWeek' ? 'lastMonths' : saved.periodType;
          setPeriodType(pt);
        }

        if (Array.isArray(saved?.selectedBlockNumbers) && saved.selectedBlockNumbers.length) {
          const nums = [
            ...new Set(
              saved.selectedBlockNumbers
                .map((n) => Number(n))
                .filter((n) => Number.isFinite(n) && n >= 1),
            ),
          ].sort((a, b) => a - b);
          if (nums.length) setSelectedBlockNumbers(nums);
        } else if (Number.isFinite(Number(saved?.selectedBlockNumber))) {
          setSelectedBlockNumbers([Number(saved.selectedBlockNumber)]);
        }

        if (Number.isFinite(Number(saved?.lastMonths))) {
          setLastMonths(Number(saved.lastMonths));
        }

        if (saved?.viewMode === 'chart' || saved?.viewMode === 'table') {
          setViewMode(saved.viewMode);
        }

        return;
      }
    } catch {
      // Ignore invalid saved payload and fall back to defaults/props.
    }

    if (initialMovementIds?.length) {
      setSelectedMovementIds(normalizeMovementSelection(initialMovementIds));
    }
  }, [isOpen, initialMovementIds]);

  const aggregation = useMemo(() => {
    if (!workoutSessions) return null;

    return computePerformanceAggregation({
      workoutSessions,
      blocks,
      oneRmRecords,
      selectedMovementIds,
      selectedMetricIds,
      groupBy,
      periodType,
      lastMonths,
      specificMonthValue,
      selectedBlockNumbers: sortedSelectedBlockNumbers,
    });
  }, [
    workoutSessions,
    blocks,
    oneRmRecords,
    selectedMovementIds,
    selectedMetricIds,
    groupBy,
    periodType,
    lastMonths,
    specificMonthValue,
    sortedSelectedBlockNumbers,
  ]);

  const performancePeriodBounds = useMemo(
    () =>
      resolvePerformancePeriodBounds({
        periodType,
        lastMonths,
        specificMonthValue,
        blocks,
        selectedBlockNumbers: sortedSelectedBlockNumbers,
        workoutSessions,
      }),
    [
      workoutSessions,
      periodType,
      lastMonths,
      specificMonthValue,
      sortedSelectedBlockNumbers,
      blocks,
    ],
  );

  const periodMovementOptions = useMemo(() => {
    const dynamicById = new Map();
    const { periodStart, periodEnd } = performancePeriodBounds;

    const hasWorkoutSessionKeys =
      workoutSessions && typeof workoutSessions === 'object' && Object.keys(workoutSessions).length > 0;

    if (hasWorkoutSessionKeys) {
      Object.keys(workoutSessions).forEach((dateKey) => {
        const date = parseISO(dateKey);
        if (!date || Number.isNaN(date.getTime())) return;
        if (date.getTime() < periodStart.getTime() || date.getTime() > periodEnd.getTime()) return;

        const sessions = workoutSessions[dateKey] || [];
        sessions.forEach((session) => {
          if (String(session?.status || '').toLowerCase() !== 'completed') return;
          const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
          exercises.forEach((exercise) => {
            const label = String(exercise?.name || '').trim();
            if (!label) return;
            const id = getMovementIdFromExerciseName(label);
            if (!id) return;
            if (!dynamicById.has(id)) {
              dynamicById.set(id, { id, label, tags: [] });
            }
            const entry = dynamicById.get(id);
            mergeMovementTags(entry, exercise.tags);
          });
        });
      });
    }

    // Ancien comportement : si aucune séance n’est chargée, garder les 4 mouvements par défaut.
    if (!dynamicById.size && !hasWorkoutSessionKeys) {
      movementOptions.forEach((opt) => {
        dynamicById.set(opt.id, { id: opt.id, label: opt.label, tags: [] });
      });
    }

    return Array.from(dynamicById.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [workoutSessions, performancePeriodBounds]);

  const movementIdsWithSelectedMetrics = useMemo(() => {
    if (!periodMovementOptions.length || !selectedMetricIds.length) return new Set();

    const movementIds = periodMovementOptions.map((opt) => opt.id);
    const metricScopedAggregation = computePerformanceAggregation({
      workoutSessions,
      blocks,
      oneRmRecords,
      selectedMovementIds: movementIds,
      selectedMetricIds,
      groupBy,
      periodType,
      lastMonths,
      specificMonthValue,
      selectedBlockNumbers: sortedSelectedBlockNumbers,
    });

    const eligibleMovementIds = new Set();
    (metricScopedAggregation?.buckets || []).forEach((bucket) => {
      movementIds.forEach((movementId) => {
        const hasAnySelectedMetricValue = selectedMetricIds.some((metricId) => {
          const v = metricScopedAggregation.metricsByBucketMovement?.[bucket.key]?.[movementId]?.[metricId];
          return v !== null && v !== undefined && Number.isFinite(Number(v));
        });
        if (hasAnySelectedMetricValue) eligibleMovementIds.add(movementId);
      });
    });

    return eligibleMovementIds;
  }, [
    periodMovementOptions,
    selectedMetricIds,
    workoutSessions,
    blocks,
    oneRmRecords,
    groupBy,
    periodType,
    lastMonths,
    specificMonthValue,
    sortedSelectedBlockNumbers,
  ]);

  const availableMovementOptions = useMemo(
    () => periodMovementOptions.filter((opt) => movementIdsWithSelectedMetrics.has(opt.id)),
    [periodMovementOptions, movementIdsWithSelectedMetrics],
  );

  useEffect(() => {
    if (!availableMovementOptions.length) {
      setSelectedMovementIds([]);
      return;
    }

    const availableIds = new Set(availableMovementOptions.map((opt) => opt.id));
    setSelectedMovementIds((prev) => {
      const validCurrent = normalizeMovementSelection(prev).filter((id) => availableIds.has(id));
      if (validCurrent.length) return validCurrent;

      const validInitial = normalizeMovementSelection(initialMovementIds).filter((id) => availableIds.has(id));
      if (validInitial.length) return validInitial;

      return [availableMovementOptions[0].id];
    });
  }, [availableMovementOptions, initialMovementIds]);

  const movementTagPool = useMemo(
    () => availableMovementOptions.flatMap((o) => o.tags || []),
    [availableMovementOptions],
  );

  const movementTagColorMap = useMemo(() => getTagColorMap(movementTagPool), [movementTagPool]);

  const movementLabelById = useMemo(
    () => new Map(availableMovementOptions.map((opt) => [opt.id, opt.label])),
    [availableMovementOptions],
  );

  const getMovementLabel = (movementId) => movementLabelById.get(movementId) || movementId;

  useEffect(() => {
    setChartMaskedMovementIds((prev) => prev.filter((id) => selectedMovementIds.includes(id)));
  }, [selectedMovementIds]);

  const toggleChartMovementMask = useCallback((movementId) => {
    setChartMaskedMovementIds((prev) =>
      prev.includes(movementId) ? prev.filter((id) => id !== movementId) : [...prev, movementId],
    );
  }, []);

  const chartVisibleMovementIds = useMemo(
    () => selectedMovementIds.filter((id) => !chartMaskedMovementIds.includes(id)),
    [selectedMovementIds, chartMaskedMovementIds],
  );

  const chartMetricIds = selectedMetricIds.slice(0, MAX_SELECTED_METRICS);
  const primaryMetricId = chartMetricIds[0] ?? null;
  const secondaryMetricId = chartMetricIds[1] ?? null;

  const getMetricUnit = (metricId) => {
    switch (metricId) {
      case 'tonnage':
        return 'kg';
      case 'reps':
        return 'reps';
      case 'series':
        return 'séries';
      case 'failed_series':
        return 'séries';
      case 'utilization':
        return 'séances';
      case 'time_under_tension':
        return 's';
      case 'intensity':
        return '%';
      case 'avg_charge':
        return 'kg';
      case 'rpe_avg':
        return 'RPE';
      default:
        return '';
    }
  };

  const aggregateMetricForBucketMovements = useCallback(
    (bucketKey, metricId, movementIdsList) => {
      if (!aggregation || !metricId) return null;
      if (!movementIdsList?.length) return null;

      const values = [];
      movementIdsList.forEach((movementId) => {
        const v = aggregation.metricsByBucketMovement?.[bucketKey]?.[movementId]?.[metricId];
        if (v === null || v === undefined || !Number.isFinite(Number(v))) return;
        values.push(Number(v));
      });

      if (!values.length) return null;

      const sumMetricIds = new Set(['tonnage', 'reps', 'series', 'failed_series', 'utilization', 'time_under_tension']);
      if (sumMetricIds.has(metricId)) {
        return values.reduce((acc, n) => acc + n, 0);
      }

      return values.reduce((acc, n) => acc + n, 0) / values.length;
    },
    [aggregation],
  );

  const chartPrimaryValues = useMemo(() => {
    if (!aggregation || !primaryMetricId) return [];
    const buckets = aggregation.buckets || [];
    return buckets.map((b) =>
      aggregateMetricForBucketMovements(b.key, primaryMetricId, chartVisibleMovementIds),
    );
  }, [aggregation, primaryMetricId, aggregateMetricForBucketMovements, chartVisibleMovementIds]);

  const chartSecondaryValues = useMemo(() => {
    if (!aggregation || !secondaryMetricId) return null;
    const buckets = aggregation.buckets || [];
    return buckets.map((b) =>
      aggregateMetricForBucketMovements(b.key, secondaryMetricId, chartVisibleMovementIds),
    );
  }, [aggregation, secondaryMetricId, aggregateMetricForBucketMovements, chartVisibleMovementIds]);

  /** Une série par mouvement sélectionné (même ordre que les chips) — pour surbrillance au survol. */
  const perMovementPrimaryValues = useMemo(() => {
    if (!aggregation || !primaryMetricId) return null;
    const buckets = aggregation.buckets || [];
    return selectedMovementIds.map((movementId) =>
      buckets.map((b) => {
        const v = aggregation.metricsByBucketMovement?.[b.key]?.[movementId]?.[primaryMetricId];
        if (v === null || v === undefined || !Number.isFinite(Number(v))) return null;
        return Number(v);
      }),
    );
  }, [aggregation, primaryMetricId, selectedMovementIds]);

  const perMovementSecondaryValues = useMemo(() => {
    if (!aggregation || !secondaryMetricId) return null;
    const buckets = aggregation.buckets || [];
    return selectedMovementIds.map((movementId) =>
      buckets.map((b) => {
        const v = aggregation.metricsByBucketMovement?.[b.key]?.[movementId]?.[secondaryMetricId];
        if (v === null || v === undefined || !Number.isFinite(Number(v))) return null;
        return Number(v);
      }),
    );
  }, [aggregation, secondaryMetricId, selectedMovementIds]);

  const movementLabels = useMemo(
    () => selectedMovementIds.map((mid) => getMovementLabel(mid)),
    [selectedMovementIds, movementLabelById],
  );
  const hasPeriodData = Boolean(aggregation?.buckets?.length);
  const periodMetricSummary = useMemo(() => {
    if (!aggregation?.buckets?.length) return [];

    const sumMetricIds = new Set(['tonnage', 'reps', 'series', 'failed_series', 'utilization', 'time_under_tension']);
    const rows = [];
    const buckets = aggregation.buckets || [];

    chartMetricIds.forEach((metricId) => {
      const values = [];

      buckets.forEach((bucket) => {
        chartVisibleMovementIds.forEach((movementId) => {
          const v = aggregation.metricsByBucketMovement?.[bucket.key]?.[movementId]?.[metricId];
          if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
            values.push(Number(v));
          }
        });
      });

      if (!values.length) {
        rows.push({ metricId, value: null, pctChange: null });
        return;
      }

      const value = sumMetricIds.has(metricId)
        ? values.reduce((acc, n) => acc + n, 0)
        : values.reduce((acc, n) => acc + n, 0) / values.length;

      let firstBucketVal = null;
      let lastBucketVal = null;
      for (let i = 0; i < buckets.length; i += 1) {
        const v = aggregateMetricForBucketMovements(buckets[i].key, metricId, chartVisibleMovementIds);
        if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
          firstBucketVal = Number(v);
          break;
        }
      }
      for (let i = buckets.length - 1; i >= 0; i -= 1) {
        const v = aggregateMetricForBucketMovements(buckets[i].key, metricId, chartVisibleMovementIds);
        if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
          lastBucketVal = Number(v);
          break;
        }
      }

      const pctChange = evolutionPercentFromFirstLast(firstBucketVal, lastBucketVal);

      rows.push({ metricId, value, pctChange });
    });

    return rows;
  }, [aggregation, chartMetricIds, chartVisibleMovementIds, aggregateMetricForBucketMovements]);

  const tableBucketsWithValues = useMemo(() => {
    const buckets = aggregation?.buckets || [];
    if (!buckets.length) return [];

    return buckets.filter((bucket) =>
      selectedMovementIds.some((movementId) =>
        selectedMetricIds.some((metricId) => {
          const v = aggregation.metricsByBucketMovement?.[bucket.key]?.[movementId]?.[metricId];
          return v !== null && v !== undefined && Number.isFinite(Number(v));
        }),
      ),
    );
  }, [aggregation, selectedMovementIds, selectedMetricIds]);

  const tablePeriodTotalsByMovement = useMemo(() => {
    if (!aggregation || !tableBucketsWithValues.length) return {};

    const sumMetricIds = new Set(['tonnage', 'reps', 'series', 'failed_series', 'utilization', 'time_under_tension']);
    const totals = {};

    selectedMovementIds.forEach((movementId) => {
      totals[movementId] = {};
      selectedMetricIds.forEach((metricId) => {
        const values = tableBucketsWithValues
          .map((bucket) => {
            const v = aggregation.metricsByBucketMovement?.[bucket.key]?.[movementId]?.[metricId];
            if (v === null || v === undefined || !Number.isFinite(Number(v))) return null;
            return Number(v);
          })
          .filter((v) => v !== null);

        if (!values.length) {
          totals[movementId][metricId] = null;
          return;
        }

        totals[movementId][metricId] = sumMetricIds.has(metricId)
          ? values.reduce((acc, n) => acc + n, 0)
          : values.reduce((acc, n) => acc + n, 0) / values.length;
      });
    });

    return totals;
  }, [aggregation, tableBucketsWithValues, selectedMovementIds, selectedMetricIds]);

  const filteredMovementOptions = useMemo(() => {
    const search = movementSearchTerm.trim().toLowerCase();
    return availableMovementOptions.filter((opt) => {
      if (!movementMatchesTagFilters(opt.tags, movementTagFilters)) return false;
      if (!search) return true;
      if (opt.label.toLowerCase().includes(search)) return true;
      return (opt.tags || []).some((t) => {
        const s = String(t).toLowerCase();
        return s.includes(search) || normalizeTagName(t).includes(search);
      });
    });
  }, [movementSearchTerm, movementTagFilters, availableMovementOptions]);

  const filteredMetricOptions = useMemo(() => {
    const search = metricSearchTerm.trim().toLowerCase();
    if (!search) return metricOptions;
    return metricOptions.filter(opt => opt.label.toLowerCase().includes(search));
  }, [metricSearchTerm]);

  const renderSelectionPills = (options, selectedIds, setSelectedIds, colorFn, maxCount = null) => {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const selected = selectedIds.includes(opt.id);
          const disabled = maxCount !== null && !selected && selectedIds.length >= maxCount;
          const color = colorFn(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (disabled) return;
                if (selected) {
                  setSelectedIds(selectedIds.filter(x => x !== opt.id));
                } else {
                  setSelectedIds([...selectedIds, opt.id]);
                }
              }}
              className="px-3 py-2 rounded-full text-xs border-[0.5px] transition-colors"
              style={{
                backgroundColor: selected ? `${color}22` : 'rgba(0,0,0,0.35)',
                borderColor: selected ? `${color}55` : 'rgba(255,255,255,0.10)',
                color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMovementDropdown = () => {
    const selectedLabels = selectedMovementIds.map(getMovementLabel);
    const triggerText =
      selectedLabels.length ? `Exercices (${selectedLabels.length})` : 'Exercices';

    return (
      <div className="flex flex-col gap-2">
        <DropdownMenu
          open={isMovementDropdownOpen}
          onOpenChange={(open) => {
            setIsMovementDropdownOpen(open);
            if (!open) {
              setMovementSearchTerm('');
              setMovementTagFilters([]);
              setIsMovementTagFilterOpen(false);
            }
          }}
          modal={false}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group relative font-extralight py-2 px-[15px] rounded-[10px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground text-sm w-full overflow-hidden focus:outline-none focus-visible:outline-none"
              style={{
                color: isMovementDropdownOpen || selectedMovementIds.length ? '#D48459' : 'rgba(250, 250, 250, 0.75)',
                fontWeight: '400',
              }}
            >
              <span
                className={`absolute inset-0 rounded-[10px] transition-[background-color] duration-200 ${
                  isMovementDropdownOpen || selectedMovementIds.length
                    ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                    : 'bg-[rgba(0,0,0,0.5)] group-hover:bg-[rgba(0,0,0,0.6)]'
                }`}
                aria-hidden
              />
              <span
                className="relative z-10"
                style={{
                  fontSize: '14px',
                  fontWeight: isMovementDropdownOpen || selectedMovementIds.length ? '400' : 'inherit',
                  flex: '1',
                  whiteSpace: 'nowrap',
                }}
              >
                {triggerText}
              </span>
              <ChevronDown
                className="h-4 w-4 transition-transform relative z-10"
                style={{ transform: isMovementDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={8}
            disablePortal={true}
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl p-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="pt-2 px-2 pb-2 space-y-2" onPointerDown={(e) => e.stopPropagation()}>
              <div className="px-1 text-[10px] font-light text-white/40">
                Jusqu&apos;à {MAX_SELECTED_MOVEMENTS} exercices
              </div>
              <div className="relative flex w-full items-center gap-2">
                <input
                  type="text"
                  placeholder="Rechercher un exercice..."
                  value={movementSearchTerm}
                  onChange={(e) => setMovementSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="min-w-0 flex-1 px-3 py-2 bg-input border border-border rounded-[10px] text-xs font-light text-foreground placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                />
                {movementTagPool.length > 0 && (
                  <TagFilterDropdown
                    tags={movementTagPool}
                    selectedTags={movementTagFilters}
                    onTagsChange={setMovementTagFilters}
                    placeholder="Rechercher un tag..."
                    isOpen={isMovementTagFilterOpen}
                    onOpenChange={setIsMovementTagFilterOpen}
                    triggerVariant="iconOnly"
                    className="shrink-0"
                  />
                )}
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto flex flex-col gap-[2px] -mr-1 pr-1">
              {filteredMovementOptions.map(opt => {
                const isChecked = selectedMovementIds.includes(opt.id);
                const atMaxMovements =
                  !isChecked && selectedMovementIds.length >= MAX_SELECTED_MOVEMENTS;
                const tags = opt.tags || [];
                const visibleTags = tags.slice(0, 3);
                const tagOverflow = tags.length > 3 ? tags.length - 3 : 0;

                return (
                  <DropdownMenuCheckboxItem
                    key={opt.id}
                    checked={isChecked}
                    disabled={atMaxMovements}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                      const nextChecked = Boolean(checked);
                      if (nextChecked) {
                        setSelectedMovementIds(prev => {
                          if (prev.includes(opt.id)) return prev;
                          if (prev.length >= MAX_SELECTED_MOVEMENTS) return prev;
                          return [...prev, opt.id];
                        });
                      } else {
                        setSelectedMovementIds(prev => prev.filter(x => x !== opt.id));
                      }
                    }}
                    className="[&>span:first-child]:hidden w-full px-2.5 py-2 pl-2.5 pr-2 text-left text-sm text-white transition-colors flex items-start gap-3 cursor-pointer rounded-md font-light data-[state=checked]:text-[#D48459] data-[state=checked]:font-normal"
                    style={
                      isChecked
                        ? { backgroundColor: 'rgba(212, 132, 89, 0.2)' }
                        : undefined
                    }
                  >
                    <div
                      className={`w-4 h-4 min-w-4 min-h-4 shrink-0 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-[#d4845a] border-[#d4845a]'
                          : 'bg-transparent border-white/20'
                      }`}
                      aria-hidden
                    >
                      {isChecked && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-2.5 h-2.5 text-white" fill="currentColor">
                          <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.2 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,45%)] items-center gap-2">
                      <span
                        className={`min-w-0 truncate font-normal ${tags.length === 0 ? 'col-span-2' : ''}`}
                      >
                        {opt.label}
                      </span>
                      {tags.length > 0 && (
                        <div className="flex min-w-0 justify-center overflow-hidden">
                          <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                            {visibleTags.map((tag) => (
                              <span
                                key={`${opt.id}-${tag}`}
                                className="rounded-full px-2 py-1 text-[10px] font-light leading-tight"
                                style={getTagColor(tag, movementTagColorMap)}
                              >
                                {tag}
                              </span>
                            ))}
                            {tagOverflow > 0 && (
                              <span className="text-[10px] font-light text-white/45">+{tagOverflow}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
              {filteredMovementOptions.length === 0 && (
                <div className="px-2.5 py-2 text-xs text-white/40 font-light">
                  Aucun exercice trouvé
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderMetricDropdown = () => {
    const triggerText =
      selectedMetricIds.length ? `Mesures (${selectedMetricIds.length})` : 'Mesures';

    return (
      <div className="flex flex-col gap-2">
        <DropdownMenu
          open={isMetricDropdownOpen}
          onOpenChange={(open) => {
            setIsMetricDropdownOpen(open);
            if (!open) setMetricSearchTerm('');
          }}
          modal={false}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group relative font-extralight py-2 px-[15px] rounded-[10px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground text-sm w-full overflow-hidden focus:outline-none focus-visible:outline-none"
              style={{
                color: isMetricDropdownOpen || selectedMetricIds.length ? '#D48459' : 'rgba(250, 250, 250, 0.75)',
                fontWeight: '400',
              }}
            >
              <span
                className={`absolute inset-0 rounded-[10px] transition-[background-color] duration-200 ${
                  isMetricDropdownOpen || selectedMetricIds.length
                    ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                    : 'bg-[rgba(0,0,0,0.5)] group-hover:bg-[rgba(0,0,0,0.6)]'
                }`}
                aria-hidden
              />
              <span
                className="relative z-10"
                style={{
                  fontSize: '14px',
                  fontWeight: isMetricDropdownOpen || selectedMetricIds.length ? '400' : 'inherit',
                  flex: '1',
                  whiteSpace: 'nowrap',
                }}
              >
                {triggerText}
              </span>
              <ChevronDown
                className="h-4 w-4 transition-transform relative z-10"
                style={{ transform: isMetricDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={8}
            disablePortal={true}
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl p-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="space-y-2 px-2 pb-2 pt-2">
              <div className="px-1 text-[10px] font-light text-white/40">
                Jusqu&apos;à {MAX_SELECTED_METRICS} mesures à la fois
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher une mesure..."
                  value={metricSearchTerm}
                  onChange={(e) => setMetricSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 bg-input border border-border rounded-[10px] text-xs font-light text-foreground placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto flex flex-col gap-[2px] -mr-1 pr-1">
            {filteredMetricOptions.map(opt => {
              const isChecked = selectedMetricIds.includes(opt.id);
              const atMaxSelection = selectedMetricIds.length >= MAX_SELECTED_METRICS;
              const disableSelectMore = !isChecked && atMaxSelection;

              return (
                <DropdownMenuCheckboxItem
                  key={opt.id}
                  checked={isChecked}
                  disabled={disableSelectMore}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) => {
                    const nextChecked = Boolean(checked);
                    if (nextChecked) {
                      setSelectedMetricIds(prev => {
                        if (prev.includes(opt.id)) return prev;
                        if (prev.length >= MAX_SELECTED_METRICS) return prev;
                        return [...prev, opt.id];
                      });
                    } else {
                      setSelectedMetricIds(prev => prev.filter(x => x !== opt.id));
                    }
                  }}
                  className="[&>span:first-child]:hidden w-full px-2.5 py-2 pl-2.5 pr-2 text-left text-sm text-white transition-colors flex items-center gap-3 cursor-pointer rounded-md font-light data-[state=checked]:text-[#D48459] data-[state=checked]:font-normal"
                  style={
                    isChecked
                      ? { backgroundColor: 'rgba(212, 132, 89, 0.2)' }
                      : undefined
                  }
                >
                  <div
                    className={`w-4 h-4 min-w-4 min-h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                      isChecked
                        ? 'bg-[#d4845a] border-[#d4845a]'
                        : 'bg-transparent border-white/20'
                    }`}
                    aria-hidden
                  >
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-2.5 h-2.5 text-white" fill="currentColor">
                        <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.2 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="font-normal">{opt.label}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
            {filteredMetricOptions.length === 0 && (
              <div className="px-2.5 py-2 text-xs text-white/40 font-light">
                Aucune mesure trouvée
              </div>
            )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderGroupByDropdown = () => {
    const groupByOptions = [
      { id: 'day', label: 'Jour' },
      { id: 'week', label: 'Semaine' },
      { id: 'month', label: 'Mois' },
      { id: 'bloc', label: 'Bloc' },
    ];

    const activeLabel = groupByOptions.find(opt => opt.id === groupBy)?.label || 'Regrouper par';

    return (
      <div className="w-full min-w-0">
      <DropdownMenu open={isGroupByDropdownOpen} onOpenChange={setIsGroupByDropdownOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group relative font-extralight py-2 px-[15px] rounded-[10px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground text-sm w-full overflow-hidden focus:outline-none focus-visible:outline-none"
            style={{
              color: 'rgba(250, 250, 250, 0.75)',
              fontWeight: '400',
            }}
          >
            <span
              className={`absolute inset-0 rounded-[10px] transition-[background-color] duration-200 ${
                isGroupByDropdownOpen
                  ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                  : 'bg-[rgba(0,0,0,0.5)] group-hover:bg-[rgba(0,0,0,0.6)]'
              }`}
              aria-hidden
            />
            <span className="relative z-10" style={{ fontSize: '14px', fontWeight: '400', flex: '1', whiteSpace: 'nowrap' }}>
              {activeLabel}
            </span>
            <ChevronDown
              className="h-4 w-4 transition-transform relative z-10"
              style={{ transform: isGroupByDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          disablePortal={true}
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl [&_span.absolute.left-2]:hidden transition-all duration-200 ease-out"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <DropdownMenuRadioGroup value={groupBy} onValueChange={(value) => {
            setGroupBy(value);
            setIsGroupByDropdownOpen(false);
          }}>
            {groupByOptions.map((opt) => {
              const isSelected = groupBy === opt.id;
              return (
                <DropdownMenuRadioItem
                  key={opt.id}
                  value={opt.id}
                  className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 text-primary font-normal'
                      : 'text-foreground font-light'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                      : {}
                  }
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '#D48459';
                        span.style.fontWeight = '400';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '';
                        span.style.fontWeight = '';
                      }
                    }
                  }}
                >
                  <span>{opt.label}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                      isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                  </svg>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    );
  };

  const renderPeriodDropdown = () => {
    const periodOptions = [
      { id: 'lastMonths', label: 'Derniers mois' },
      { id: 'block', label: 'Bloc', disabled: blockOptions.length === 0 },
      { id: 'allTime', label: 'Depuis le début' },
    ];

    const activeLabel = (() => {
      switch (periodType) {
        case 'allTime':
          return 'Depuis le début';
        case 'lastMonths':
          return `Les ${lastMonths} derniers mois`;
        case 'block':
          return 'Bloc';
        default:
          return periodOptions.find(opt => opt.id === periodType)?.label || 'Période';
      }
    })();

    return (
      <div className="w-full min-w-0">
      <DropdownMenu open={isPeriodDropdownOpen} onOpenChange={setIsPeriodDropdownOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group relative font-extralight py-2 px-[15px] rounded-[10px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground text-sm w-full overflow-hidden focus:outline-none focus-visible:outline-none"
            style={{
              color: 'rgba(250, 250, 250, 0.75)',
              fontWeight: '400',
            }}
          >
            <span
              className={`absolute inset-0 rounded-[10px] transition-[background-color] duration-200 ${
                isPeriodDropdownOpen
                  ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                  : 'bg-[rgba(0,0,0,0.5)] group-hover:bg-[rgba(0,0,0,0.6)]'
              }`}
              aria-hidden
            />
            <span className="relative z-10" style={{ fontSize: '14px', fontWeight: '400', flex: '1', whiteSpace: 'nowrap' }}>
              {activeLabel}
            </span>
            <ChevronDown
              className="h-4 w-4 transition-transform relative z-10"
              style={{ transform: isPeriodDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          disablePortal={true}
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl [&_span.absolute.left-2]:hidden transition-all duration-200 ease-out"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <DropdownMenuRadioGroup value={periodType} onValueChange={(value) => {
            setPeriodType(value);
            setIsPeriodDropdownOpen(false);
          }}>
            {periodOptions.map((opt) => {
              const isSelected = periodType === opt.id;
              const isDisabled = Boolean(opt.disabled);
              return (
                <DropdownMenuRadioItem
                  key={opt.id}
                  value={opt.id}
                  disabled={isDisabled}
                  className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 text-primary font-normal'
                      : isDisabled
                        ? 'text-foreground/35 font-light cursor-not-allowed'
                        : 'text-foreground font-light'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                      : {}
                  }
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '#D48459';
                        span.style.fontWeight = '400';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = '';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '';
                        span.style.fontWeight = '';
                      }
                    }
                  }}
                >
                  <span>{opt.label}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                      isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                  </svg>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    );
  };

  const renderBlockDropdown = () => {
    if (periodType !== 'block') return null;
    if (!blockOptions.length) {
      return (
        <div className="w-full min-w-0">
          <button
            type="button"
            disabled
            className="group relative font-extralight py-2 px-[15px] rounded-[10px] transition-colors duration-200 flex items-center gap-2 text-sm w-full overflow-hidden focus:outline-none focus-visible:outline-none cursor-not-allowed"
            style={{ color: 'rgba(250, 250, 250, 0.35)', fontWeight: '400' }}
          >
            <span className="absolute inset-0 rounded-[10px] bg-[rgba(0,0,0,0.4)]" aria-hidden />
            <span className="relative z-10" style={{ fontSize: '14px', fontWeight: '400', flex: '1', whiteSpace: 'nowrap' }}>
              Aucun bloc
            </span>
          </button>
        </div>
      );
    }
    return (
      <div className="w-full min-w-0">
      <DropdownMenu
        open={isBlockDropdownOpen}
        onOpenChange={setIsBlockDropdownOpen}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group relative font-extralight py-2 px-[15px] rounded-[10px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground text-sm w-full overflow-hidden focus:outline-none focus-visible:outline-none"
            style={{
              color: 'rgba(250, 250, 250, 0.75)',
              fontWeight: '400',
            }}
          >
            <span
              className={`absolute inset-0 rounded-[10px] transition-[background-color] duration-200 ${
                isBlockDropdownOpen
                  ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                  : 'bg-[rgba(0,0,0,0.5)] group-hover:bg-[rgba(0,0,0,0.6)]'
              }`}
              aria-hidden
            />
            <span className="relative z-10 min-w-0 truncate" style={{ fontSize: '14px', fontWeight: '400', flex: '1' }}>
              {blockPeriodTriggerLabel}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform relative z-10"
              style={{ transform: isBlockDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          disablePortal={true}
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl p-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div className="px-2.5 pb-2 pt-1.5 text-[10px] font-light text-white/40">
            Un ou plusieurs blocs
          </div>
          <div className="max-h-56 overflow-y-auto flex flex-col gap-[2px] -mr-1 pr-1">
            {blockOptions.map((opt) => {
              const isChecked = selectedBlockNumbers.includes(opt.number);
              const isCurrent = currentBlockNumber === opt.number;
              return (
                <DropdownMenuCheckboxItem
                  key={opt.id}
                  checked={isChecked}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) => {
                    const nextChecked = Boolean(checked);
                    setSelectedBlockNumbers((prev) => {
                      if (nextChecked) {
                        if (prev.includes(opt.number)) return prev;
                        return [...prev, opt.number].sort((a, b) => a - b);
                      }
                      const next = prev.filter((x) => x !== opt.number);
                      return next.length ? next : prev;
                    });
                  }}
                  className="[&>span:first-child]:hidden w-full px-2.5 py-2 pl-2.5 pr-2 text-left text-sm text-white transition-colors flex items-start gap-3 cursor-pointer rounded-md font-light data-[state=checked]:text-[#D48459] data-[state=checked]:font-normal"
                  style={
                    isChecked
                      ? { backgroundColor: 'rgba(212, 132, 89, 0.2)' }
                      : undefined
                  }
                >
                  <div
                    className={`w-4 h-4 min-w-4 min-h-4 shrink-0 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                      isChecked
                        ? 'bg-[#d4845a] border-[#d4845a]'
                        : 'bg-transparent border-white/20'
                    }`}
                    aria-hidden
                  >
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-2.5 h-2.5 text-white" fill="currentColor">
                        <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.2 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="font-normal">{opt.label}</span>
                    {isCurrent && (
                      <span className="text-[#D48459] text-[11px] font-normal mt-0.5">
                        bloc en cours
                      </span>
                    )}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    );
  };

  const renderLastMonthsDropdown = () => {
    if (periodType !== 'lastMonths') return null;
    const monthOptions = [1, 3, 6, 12];

    return (
      <div className="w-full min-w-0">
      <DropdownMenu
        open={isLastMonthsDropdownOpen}
        onOpenChange={setIsLastMonthsDropdownOpen}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group relative font-extralight py-2 px-[15px] rounded-[10px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground text-sm w-full overflow-hidden focus:outline-none focus-visible:outline-none"
            style={{
              color: 'rgba(250, 250, 250, 0.75)',
              fontWeight: '400',
            }}
          >
            <span
              className={`absolute inset-0 rounded-[10px] transition-[background-color] duration-200 ${
                isLastMonthsDropdownOpen
                  ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                  : 'bg-[rgba(0,0,0,0.5)] group-hover:bg-[rgba(0,0,0,0.6)]'
              }`}
              aria-hidden
            />
            <span className="relative z-10" style={{ fontSize: '14px', fontWeight: '400', flex: '1', whiteSpace: 'nowrap' }}>
              {lastMonths} mois
            </span>
            <ChevronDown
              className="h-4 w-4 transition-transform relative z-10"
              style={{ transform: isLastMonthsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          disablePortal={true}
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl [&_span.absolute.left-2]:hidden transition-all duration-200 ease-out"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <DropdownMenuRadioGroup
            value={String(lastMonths)}
            onValueChange={(value) => {
              setLastMonths(Number(value));
              setIsLastMonthsDropdownOpen(false);
            }}
          >
            {monthOptions.map((n) => {
              const isSelected = lastMonths === n;
              return (
                <DropdownMenuRadioItem
                  key={n}
                  value={String(n)}
                  className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 text-primary font-normal'
                      : 'text-foreground font-light'
                  }`}
                  style={isSelected ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' } : {}}
                >
                  <span>{n} mois</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                      isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                  </svg>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    );
  };

  const handleSavePreferences = () => {
    try {
      const payload = {
        selectedMovementIds,
        selectedMetricIds,
        groupBy,
        periodType,
        selectedBlockNumbers: sortedSelectedBlockNumbers,
        selectedBlockNumber: sortedSelectedBlockNumbers[0],
        lastMonths,
        viewMode,
      };
      localStorage.setItem(preferencesKey, JSON.stringify(payload));
      setSaveFeedback('Préférences sauvegardées');
      setTimeout(() => setSaveFeedback(''), 2000);
    } catch {
      setSaveFeedback('Impossible de sauvegarder');
      setTimeout(() => setSaveFeedback(''), 2000);
    }
  };

  const handleSaveAndClose = () => {
    handleSavePreferences();
    onClose?.();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      modalId="performance-analysis-modal"
      zIndex={90}
      closeOnEsc={true}
      closeOnBackdrop={true}
      size="2xl"
      className="max-w-5xl max-md:!w-[calc(100vw-2rem)] max-md:!max-w-none max-md:!h-[calc(100dvh-3.5rem)] max-md:!max-h-[calc(100dvh-3.5rem)] max-md:!mt-4 max-md:!mb-10 max-md:!min-w-0 max-md:!rounded-2xl"
      title={
        <span className="inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor" aria-hidden>
            <path d="M192 80c0-26.5 21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 352c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48l0-352zM0 272c0-26.5 21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 160c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48L0 272zM432 96l32 0c26.5 0 48 21.5 48 48l0 288c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48z"/>
          </svg>
          Analyse de performance
        </span>
      }
      titleClassName="text-xl font-normal text-white"
    >
      <div className="space-y-5">
        {/* Selections */}
        <div
          className="rounded-2xl p-5 space-y-6 max-md:p-3 max-md:space-y-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)', border: 'none' }}
        >
            <div
              className="shrink-0 flex items-center justify-between px-1"
              style={{
                paddingBottom: '12px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgb(0, 0, 0)',
                borderTopWidth: '0px',
                borderTopColor: 'rgba(0, 0, 0, 0)',
                borderTopStyle: 'none',
                borderRightWidth: '0px',
                borderRightColor: 'rgba(0, 0, 0, 0)',
                borderRightStyle: 'none',
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                borderLeftWidth: '0px',
                borderLeftColor: 'rgba(0, 0, 0, 0)',
                borderLeftStyle: 'none',
              }}
            >
              <div className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
                  <path d="M509.4 98.6c7.6-7.6 20.3-5.7 24.1 4.3 6.8 17.7 10.5 37 10.5 57.1 0 88.4-71.6 160-160 160-17.5 0-34.4-2.8-50.2-8L146.9 498.9c-28.1 28.1-73.7 28.1-101.8 0s-28.1-73.7 0-101.8L232 210.2c-5.2-15.8-8-32.6-8-50.2 0-88.4 71.6-160 160-160 20.1 0 39.4 3.7 57.1 10.5 10 3.8 11.8 16.5 4.3 24.1l-88.7 88.7c-3 3-4.7 7.1-4.7 11.3l0 41.4c0 8.8 7.2 16 16 16l41.4 0c4.2 0 8.3-1.7 11.3-4.7l88.7-88.7z"/>
                </svg>
                Paramètre d'analyse
              </div>
            </div>
            <div className="flex flex-col gap-4 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <div className="text-xs font-extralight tracking-wider text-white/50 mb-2 ml-1">Exercices</div>
                {renderMovementDropdown()}
              </div>

              <div className="w-full">
                <div className="text-xs font-extralight tracking-wider text-white/50 mb-2 ml-1">Mesures</div>
                {renderMetricDropdown()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <div className="w-full">
                <div className="text-xs font-extralight tracking-wider text-white/50 mb-2 ml-1">Regrouper par</div>
                {renderGroupByDropdown()}
              </div>

              <div className="w-full">
                <div className="text-xs font-extralight tracking-wider text-white/50 mb-2 ml-1">Période</div>
                <div className="flex gap-2 w-full min-w-0 max-md:flex-col">
                  <div className="flex-1 min-w-0">
                    {renderPeriodDropdown()}
                  </div>
                  {periodType === 'block' && (
                    <div className="flex-1 min-w-0">
                      {renderBlockDropdown()}
                    </div>
                  )}
                  {periodType === 'lastMonths' && (
                    <div className="flex-1 min-w-0">
                      {renderLastMonthsDropdown()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

            <div className="flex flex-wrap justify-between items-center gap-4 max-md:flex-col max-md:items-start max-md:gap-3">
              <div className="w-full md:w-auto flex items-center gap-3 max-md:justify-between max-md:w-full">
                <div className="text-xs font-extralight text-white/50">Vue principale</div>
                <div className="flex items-center bg-black/50 rounded-full p-1 relative">
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[var(--kaiylo-primary-hex)] shadow-sm transition-transform duration-300 ease-in-out`}
                  style={{ transform: viewMode === 'chart' ? 'translateX(0)' : 'translateX(100%)' }}
                />
                <button
                  type="button"
                  onClick={() => setViewMode('chart')}
                  className={`relative z-10 flex items-center justify-center w-24 py-1.5 text-sm font-normal rounded-full transition-colors duration-300 ${
                    viewMode === 'chart'
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Graph
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`relative z-10 flex items-center justify-center w-24 py-1.5 text-sm font-normal rounded-full transition-colors duration-300 ${
                    viewMode === 'table'
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Tableau
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        {viewMode === 'chart' && (
          <>
            <PerformanceTrendChart
              buckets={aggregation?.buckets || []}
              primaryValues={chartPrimaryValues}
              secondaryValues={chartSecondaryValues}
              primaryLabel={primaryMetricId ? getMetricLabel(primaryMetricId) : ''}
              secondaryLabel={secondaryMetricId ? getMetricLabel(secondaryMetricId) : ''}
              primaryUnit={primaryMetricId ? getMetricUnit(primaryMetricId) : ''}
              secondaryUnit={secondaryMetricId ? getMetricUnit(secondaryMetricId) : ''}
              primaryColor="#d4845a"
              secondaryColor="#a855f7"
              movementLabels={movementLabels}
              movementIds={selectedMovementIds}
              maskedMovementIds={chartMaskedMovementIds}
              onToggleMovementMask={toggleChartMovementMask}
              perMovementPrimaryValues={perMovementPrimaryValues}
              perMovementSecondaryValues={perMovementSecondaryValues}
              groupBy={groupBy}
              periodType={periodType}
              lastMonths={lastMonths}
              height={260}
            />

            {hasPeriodData ? (
              <div className="grid grid-cols-2 gap-3 w-full max-md:grid-cols-1">
                {periodMetricSummary.map(({ metricId, value, pctChange }) => (
                  <div
                    key={metricId}
                    className="relative min-w-0 overflow-hidden rounded-xl px-4 py-3 bg-black/50 border border-white/[0.03] flex items-center justify-between gap-4"
                  >
                    {/* Subtle gradient glow depending on change */}
                    {pctChange !== null && pctChange !== undefined && !Number.isNaN(pctChange) && (
                      <div 
                        className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-[18px] opacity-25 pointer-events-none"
                        style={{ background: pctChange > 0 ? '#10b981' : pctChange < 0 ? '#f43f5e' : 'transparent' }}
                      />
                    )}
                    <div className="min-w-0 flex-1 relative z-10">
                      <div className="text-[11px] font-medium text-white/40 mb-1">{getMetricLabel(metricId)}</div>
                      <div className="text-lg text-white/95 font-medium tracking-tight">
                        {formatMetricValue(metricId, value)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right relative z-10 flex flex-col items-end">
                      {pctChange === null || pctChange === undefined || Number.isNaN(pctChange) ? (
                        <div className="text-xs text-white/20 font-medium tabular-nums">—</div>
                      ) : (
                        <div
                          className={`flex items-center gap-2 px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                            pctChange > 0
                              ? 'text-lg text-emerald-400'
                              : pctChange < 0
                                ? 'text-lg text-rose-400'
                                : 'text-lg text-white/50'
                          }`}
                        >
                          {pctChange > 0 ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 576 512"
                              className="h-[1em] w-[1em] shrink-0"
                              fill="currentColor"
                              aria-hidden={true}
                            >
                              <path d="M384 160c-17.7 0-32-14.3-32-32s14.3-32 32-32l160 0c17.7 0 32 14.3 32 32l0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-82.7-169.4 169.4c-12.5 12.5-32.8 12.5-45.3 0L192 269.3 54.6 406.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160c12.5-12.5 32.8-12.5 45.3 0L320 306.7 466.7 160 384 160z" />
                            </svg>
                          ) : pctChange < 0 ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 576 512"
                              className="h-[1em] w-[1em] shrink-0"
                              fill="currentColor"
                              aria-hidden={true}
                            >
                              <path d="M384 352c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0c17.7 0 32-14.3 32-32l0-160c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 82.7-169.4-169.4c-12.5-12.5-32.8-12.5-45.3 0L192 242.7 54.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0L320 205.3 466.7 352 384 352z" />
                            </svg>
                          ) : null}
                          {pctChange > 0 ? '+' : ''}{pctChange.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl p-5 min-h-[220px] flex flex-col justify-center items-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-white/50">Aucune donnée sur la période</div>
                  <div className="text-xs text-white/30 max-w-[250px]">
                    Sélectionnez une autre période ou d'autres filtres pour analyser vos performances.
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Table */}
        {viewMode === 'table' && (
          <div className="p-0">
          <div className="overflow-x-auto rounded-2xl bg-black/50">
            <table className="min-w-full text-white/80 text-[13px] border-separate border-spacing-0">
              <thead>
                <tr className="text-left bg-white/[0.03]">
                  <th className="border-b border-white/10 px-4 py-3 text-[12px] font-normal tracking-[0.14em] text-white/50 first:rounded-tl-lg last:rounded-tr-lg">Période</th>
                  {selectedMovementIds.map(mid => (
                    <th key={mid} className="border-b border-white/10 px-4 pt-4 pb-[14px] text-[12px] font-normal tracking-[0.14em] text-white/50 last:rounded-tr-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center text-[12px] font-medium text-primary">
                          {formatMovementHeaderLabel(getMovementLabel(mid))}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableBucketsWithValues.map((bucket, index) => {
                  const weekRangeLabel =
                    groupBy === 'week' ? formatWeekRangeFromBucketKey(bucket.key) : '';
                  const weekdayLabel =
                    groupBy === 'day' ? formatWeekdayFromBucketKey(bucket.key) : '';
                  return (
                    <tr key={bucket.key} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-4 text-[12px] font-normal text-white/75 border-b border-white/5">
                        <div className="flex flex-col">
                          <span>{bucket.label}</span>
                          {weekdayLabel ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-white/50">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 256 512"
                                className="h-2.5 w-2.5 shrink-0"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                              </svg>
                              {weekdayLabel}
                            </span>
                          ) : null}
                          {weekRangeLabel ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-white/50">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 256 512"
                                className="h-2.5 w-2.5 shrink-0"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                              </svg>
                              {weekRangeLabel}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      {selectedMovementIds.map(mid => {
                        const cell = aggregation.metricsByBucketMovement[bucket.key]?.[mid];
                        return (
                          <td key={mid} className="px-4 py-4 align-top border-b border-white/5">
                            <div className="space-y-1.5 min-w-[120px]">
                              {selectedMetricIds.map(metricId => (
                                <div key={metricId} className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] font-medium tracking-wide text-white/40">{getMetricLabel(metricId).split(' ')[0]}</span>
                                  <span className="text-right text-white/90 font-medium">
                                    {formatMetricValue(metricId, cell?.[metricId])}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {tableBucketsWithValues.length > 0 && (
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-4 text-[12px] font-medium text-white/90 border-t border-white/10">
                      Total période
                    </td>
                    {selectedMovementIds.map((mid) => (
                      <td key={mid} className="px-4 py-4 align-top border-t border-white/10">
                        <div className="space-y-1.5 min-w-[120px]">
                          {selectedMetricIds.map((metricId) => (
                            <div key={metricId} className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-medium tracking-wide text-white/40">{getMetricLabel(metricId).split(' ')[0]}</span>
                              <span className="text-right text-primary font-semibold">
                                {formatMetricValue(metricId, tablePeriodTotalsByMovement?.[mid]?.[metricId])}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {!tableBucketsWithValues.length && (
                  <tr>
                    <td colSpan={1 + selectedMovementIds.length} className="px-4 py-8">
                      <div className="flex flex-col items-center justify-center text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-light text-white/45">Aucune donnée disponible</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 max-md:flex-col-reverse max-md:items-stretch">
          <div className="flex items-center md:mr-auto justify-center">
            {saveFeedback && (
              <span className="text-xs text-white/60 font-extralight">{saveFeedback}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors max-md:w-full"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors max-md:w-full"
          >
            Enregistrer & fermer
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default PerformanceAnalysisModal;

