import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_HEIGHT = 260;
const VIEW_W = 400;

/** Exercise name chips — match Kaiylo primary accent (tags, selected dropdown rows) */
const MOVEMENT_LABEL_CHIP_CLASS =
  'inline-flex max-w-full min-w-0 items-center truncate rounded-full bg-primary/20 px-3 py-1 text-xs font-light text-primary';

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function getBucketCenterX(index, totalBuckets) {
  if (totalBuckets <= 1) return VIEW_W / 2;
  const groupWidth = VIEW_W / totalBuckets;
  return index * groupWidth + groupWidth / 2;
}

/**
 * Points pour tracer une courbe continue : les trous (semaine/jour sans mesure)
 * sont comblés par interpolation linéaire entre la mesure précédente et la suivante.
 * Les marqueurs (ellipses) restent uniquement sur les vraies mesures.
 */
function buildBridgedLinePoints(values, height, totalBuckets) {
  const n = values?.length ?? 0;
  if (!n || totalBuckets < 1) return [];

  let first = -1;
  for (let i = 0; i < n; i += 1) {
    const v = values[i];
    if (v !== null && v !== undefined && isFiniteNumber(v)) {
      first = i;
      break;
    }
  }
  if (first === -1) return [];

  let last = -1;
  for (let i = n - 1; i >= 0; i -= 1) {
    const v = values[i];
    if (v !== null && v !== undefined && isFiniteNumber(v)) {
      last = i;
      break;
    }
  }
  if (last < first) return [];

  const out = [];
  for (let k = first; k <= last; k += 1) {
    const v = values[k];
    if (v !== null && v !== undefined && isFiniteNumber(v)) {
      out.push({
        x: getBucketCenterX(k, totalBuckets),
        y: height - v,
      });
      continue;
    }

    let p = k - 1;
    while (
      p >= first &&
      (values[p] === null || values[p] === undefined || !isFiniteNumber(values[p]))
    ) {
      p -= 1;
    }
    let q = k + 1;
    while (
      q <= last &&
      (values[q] === null || values[q] === undefined || !isFiniteNumber(values[q]))
    ) {
      q += 1;
    }
    if (p < first || q > last) continue;

    const vp = values[p];
    const vq = values[q];
    const t = (k - p) / (q - p);
    const vInterp = vp + t * (vq - vp);
    out.push({
      x: getBucketCenterX(k, totalBuckets),
      y: height - vInterp,
    });
  }

  return out;
}

/**
 * Spline cubique monotone en X (Steffen / d3-shape curveMonotoneX).
 * Interpole tous les points, évite les sursauts et les cuspides typiques des splines Cardinale/Catmull-Rom.
 */
function sign(x) {
  return x < 0 ? -1 : 1;
}

function slope3Monotone(x0, y0, x1, y1, x2, y2) {
  const h0 = x1 - x0;
  const h1 = x2 - x1;
  const s0 = h0 !== 0 ? (y1 - y0) / h0 : h1 !== 0 ? (y2 - y1) / h1 : 0;
  const s1 = h1 !== 0 ? (y2 - y1) / h1 : h0 !== 0 ? (y1 - y0) / h0 : 0;
  const sum = h0 + h1;
  const p = sum !== 0 ? (s0 * h1 + s1 * h0) / sum : 0;
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

function slope2Monotone(x0, y0, x1, y1, t) {
  const h = x1 - x0;
  return h ? (3 * (y1 - y0) / h - t) / 2 : t;
}

function emitMonotoneBezier(dRef, x0, y0, x1, y1, t0, t1) {
  const dx = (x1 - x0) / 3;
  dRef.d += ` C ${x0 + dx} ${y0 + dx * t0}, ${x1 - dx} ${y1 - dx * t1}, ${x1} ${y1}`;
}

function buildMonotoneXPath(points) {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y}`;
  }
  if (points.length === 2) {
    const [a, b] = points;
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }

  const dRef = { d: '' };
  let _x0;
  let _y0;
  let _x1;
  let _y1;
  let _t0;
  let _point = 0;

  for (let i = 0; i < points.length; i += 1) {
    const x = points[i].x;
    const y = points[i].y;
    if (i > 0 && x === _x1 && y === _y1) continue;

    let t1 = NaN;
    switch (_point) {
      case 0:
        _point = 1;
        _x0 = x;
        _y0 = y;
        dRef.d = `M ${x} ${y}`;
        break;
      case 1:
        _point = 2;
        _x1 = x;
        _y1 = y;
        break;
      case 2: {
        _point = 3;
        t1 = slope3Monotone(_x0, _y0, _x1, _y1, x, y);
        _t0 = slope2Monotone(_x0, _y0, _x1, _y1, t1);
        emitMonotoneBezier(dRef, _x0, _y0, _x1, _y1, _t0, t1);
        _x0 = _x1;
        _y0 = _y1;
        _x1 = x;
        _y1 = y;
        _t0 = t1;
        break;
      }
      default: {
        t1 = slope3Monotone(_x0, _y0, _x1, _y1, x, y);
        emitMonotoneBezier(dRef, _x0, _y0, _x1, _y1, _t0, t1);
        _x0 = _x1;
        _y0 = _y1;
        _x1 = x;
        _y1 = y;
        _t0 = t1;
        break;
      }
    }
  }

  if (_point === 2) {
    dRef.d += ` L ${_x1} ${_y1}`;
  } else if (_point === 3) {
    emitMonotoneBezier(dRef, _x0, _y0, _x1, _y1, _t0, slope2Monotone(_x0, _y0, _x1, _y1, _t0));
  }

  return dRef.d;
}

function formatAxisValue(n) {
  if (n === null || n === undefined) return '—';
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return '—';

  const abs = Math.abs(num);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return num.toLocaleString('fr-FR', { maximumFractionDigits: digits });
}

function getNiceStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / (10 ** exponent);
  let niceFraction;

  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * (10 ** exponent);
}

function getAxisScaleMax(maxValue) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 0;
  const step = getNiceStep(maxValue / 4);
  return step * 4;
}

function formatTooltipDateLabel(bucket, groupBy) {
  const rawLabel = String(bucket?.label || '');
  const baseLabel = groupBy === 'week'
    ? rawLabel.replace(/^Sem\.\s*/i, 'Semaine ')
    : rawLabel;
  const key = String(bucket?.key || '');
  if (groupBy === 'day') {
    if (!key) return baseLabel;
    const date = new Date(`${key}T00:00:00`);
    if (Number.isNaN(date.getTime())) return baseLabel;
    const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return `${weekday} · ${baseLabel}`;
  }
  if (groupBy === 'week') {
    return baseLabel;
  }
  return baseLabel;
}

function formatTooltipDateSubLabel(bucket, groupBy) {
  if (groupBy !== 'week') return '';
  const key = String(bucket?.key || '');
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
    year: 'numeric',
  });
  return `${startLabel} - ${endLabel}`;
}

const PerformanceTrendChart = ({
  buckets = [],
  primaryValues = [],
  secondaryValues = null,
  primaryLabel = '',
  secondaryLabel = '',
  primaryUnit = '',
  secondaryUnit = '',
  primaryColor = '#d4845a',
  secondaryColor = '#a855f7',
  height = DEFAULT_HEIGHT,
  groupBy = 'week',
  movementLabels = [],
  movementIds = [],
  maskedMovementIds = [],
  onToggleMovementMask = null,
  perMovementPrimaryValues = null,
  perMovementSecondaryValues = null,
  periodType = 'block',
  lastMonths = 3,
}) => {
  const uid = useId();
  const barGradientId = `${uid}-bar`;
  const lineGradientId = `${uid}-line`;
  const lineGlowId = `${uid}-line-glow`;
  const n = buckets.length;
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredLineIdx, setHoveredLineIdx] = useState(null);
  const [hoveredMovementId, setHoveredMovementId] = useState(null);
  const [hasPointInteracted, setHasPointInteracted] = useState(false);
  const svgRef = useRef(null);
  const [svgRect, setSvgRect] = useState({ width: VIEW_W, height });

  const maskedMovementSet = useMemo(
    () => new Set(Array.isArray(maskedMovementIds) ? maskedMovementIds : []),
    [maskedMovementIds],
  );

  const { maxPrimary, maxSecondary } = useMemo(() => {
    const primVals = (primaryValues || []).filter(v => v !== null && v !== undefined && isFiniteNumber(v));
    const secVals = (secondaryValues || []).filter(v => v !== null && v !== undefined && isFiniteNumber(v));

    const computedMaxPrimary = primVals.length ? Math.max(...primVals) : 0;
    const computedMaxSecondary = secVals.length ? Math.max(...secVals) : 0;

    return {
      maxPrimary: computedMaxPrimary,
      maxSecondary: computedMaxSecondary,
    };
  }, [primaryValues, secondaryValues]);

  const primaryScaleMax = getAxisScaleMax(maxPrimary);
  const secondaryScaleMax = getAxisScaleMax(maxSecondary);
  const safeMaxSecondary = secondaryScaleMax > 0 ? secondaryScaleMax : 1;
  const normalizedSecondary = useMemo(
    () => (secondaryValues
      ? (secondaryValues || []).map(v => {
          if (v === null || v === undefined || !isFiniteNumber(v)) return null;
          return (v / safeMaxSecondary) * height;
        })
      : []),
    [secondaryValues, safeMaxSecondary, height],
  );

  /** Même période / métriques / buckets / exercices sélectionnés → pas de remontage du graphique (ex. masque chip). */
  const structureKey = useMemo(
    () =>
      [
        groupBy,
        primaryLabel,
        secondaryLabel,
        String(height),
        buckets.map(b => b.key).join(','),
        (movementIds || []).filter(Boolean).join(','),
      ].join('|'),
    [groupBy, primaryLabel, secondaryLabel, height, buckets, movementIds],
  );

  const prevStructureKeyRef = useRef(null);
  const prevValuesSigRef = useRef(null);
  const valuesSig = `${(primaryValues || []).join(',')}|${(secondaryValues || []).join(',')}`;
  const structureUnchanged =
    prevStructureKeyRef.current !== null && prevStructureKeyRef.current === structureKey;
  const valuesChanged =
    prevValuesSigRef.current !== null && prevValuesSigRef.current !== valuesSig;
  /** Même axe / période, mais nouvelles valeurs (ex. masque d’un exo) → pas de spring / sweep rejoué. */
  const instantSeriesUpdate = structureUnchanged && valuesChanged;

  prevStructureKeyRef.current = structureKey;
  prevValuesSigRef.current = valuesSig;

  useEffect(() => {
    setHoveredBar(null);
    setHoveredPoint(null);
    setHoveredLineIdx(null);
    setHoveredMovementId(null);
  }, [groupBy, buckets, primaryValues]);

  useEffect(() => {
    if (hoveredMovementId && maskedMovementSet.has(hoveredMovementId)) {
      setHoveredMovementId(null);
    }
  }, [maskedMovementSet, hoveredMovementId]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;

    const updateRect = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSvgRect({ width: rect.width, height: rect.height });
      }
    };

    updateRect();

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateRect);
      observer.observe(el);
    } else {
      window.addEventListener('resize', updateRect);
    }

    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', updateRect);
    };
  }, [height]);

  /** Radii in CSS px; user-space radii undo non-uniform viewBox stretch (preserveAspectRatio="none"). */
  const pointRadiusPx = 3;
  const pointHitRadiusPx = 10;
  const xScale = svgRect.width / VIEW_W;
  const yScale = svgRect.height / Math.max(height, 1);
  const pointRx = pointRadiusPx / Math.max(xScale, 0.0001);
  const pointRy = pointRadiusPx / Math.max(yScale, 0.0001);
  const pointHitRx = pointHitRadiusPx / Math.max(xScale, 0.0001);
  const pointHitRy = pointHitRadiusPx / Math.max(yScale, 0.0001);

  if (n === 0) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      >
        {movementLabels?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {movementLabels.map((label) => (
              <div key={label} className={MOVEMENT_LABEL_CHIP_CLASS}>
                {label}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="text-xs font-extralight text-white/40">Aucune donnée sur la période</div>
          </div>
        </div>

        <div className="relative w-full" style={{ height }}>
          <div className="flex items-center justify-center h-full text-white/50 text-sm">
            Aucune donnée sur la période
          </div>
        </div>

        <div className="mt-3 flex justify-between text-[10px] text-white/40">
          <div className="text-white/40">—</div>
          <div />
        </div>
      </div>
    );
  }

  const primVals = primaryValues || [];
  const secVals = secondaryValues || [];

  const primHasAny = primVals.some(v => v !== null && v !== undefined && isFiniteNumber(v));
  const secHasAny = secondaryValues ? secVals.some(v => v !== null && v !== undefined && isFiniteNumber(v)) : false;

  const paddingTop = 14;
  const baseline = height;
  const usableH = Math.max(1, baseline - paddingTop);
  const groupWidth = VIEW_W / Math.max(1, n);
  const barWidth = groupWidth * 0.65;
  const safeMaxPrimary = primaryScaleMax > 0 ? primaryScaleMax : 1;

  const movementHighlightRowIdx =
    hoveredMovementId && Array.isArray(movementIds) && movementIds.length
      ? movementIds.indexOf(hoveredMovementId)
      : -1;
  const hasMovementBarHighlight =
    movementHighlightRowIdx >= 0 &&
    Array.isArray(perMovementPrimaryValues) &&
    perMovementPrimaryValues.length > movementHighlightRowIdx;

  const bucketMovementContributesPrimary = (bucketIdx) => {
    if (!hasMovementBarHighlight) return true;
    const v = perMovementPrimaryValues[movementHighlightRowIdx]?.[bucketIdx];
    return v !== null && v !== undefined && isFiniteNumber(v);
  };

  const bucketMovementContributesSecondary = (bucketIdx) => {
    if (
      movementHighlightRowIdx < 0 ||
      !Array.isArray(perMovementSecondaryValues) ||
      perMovementSecondaryValues.length <= movementHighlightRowIdx
    ) {
      return true;
    }
    const v = perMovementSecondaryValues[movementHighlightRowIdx]?.[bucketIdx];
    return v !== null && v !== undefined && isFiniteNumber(v);
  };

  const hasMovementLineHighlight =
    movementHighlightRowIdx >= 0 &&
    Array.isArray(perMovementSecondaryValues) &&
    perMovementSecondaryValues.length > movementHighlightRowIdx;
  const lineMutedForMovement = Boolean(hoveredMovementId && hasMovementLineHighlight);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
    >
      {movementLabels?.length > 0 && (
        <div className="mt-3 mb-12 flex flex-wrap items-center justify-center gap-2">
          {movementLabels.map((label, idx) => {
            const mid = movementIds?.[idx];
            const isMasked = mid != null && maskedMovementSet.has(mid);
            const chipActive = mid != null && !isMasked && hoveredMovementId === mid;
            const chipClass = `${MOVEMENT_LABEL_CHIP_CLASS} select-none transition-[background-color,opacity] duration-200 ${
              isMasked
                ? 'cursor-pointer opacity-45 bg-white/[0.06] text-white/45 ring-0 hover:bg-white/[0.10] hover:opacity-[0.72]'
                : `cursor-pointer ${chipActive ? 'bg-primary/35' : 'hover:bg-primary/28'}`
            }`;

            const hoverHandlers = {
              onMouseEnter: () => {
                if (mid == null) return;
                if (isMasked) {
                  setHoveredMovementId(null);
                  return;
                }
                if (!perMovementPrimaryValues && !perMovementSecondaryValues) return;
                setHoveredMovementId(mid);
              },
              onMouseLeave: () => setHoveredMovementId(null),
            };

            if (onToggleMovementMask && mid != null) {
              return (
                <div
                  key={mid}
                  role="button"
                  tabIndex={0}
                  title={isMasked ? 'Afficher dans le graphique' : 'Masquer du graphique'}
                  aria-pressed={isMasked}
                  className={`${chipClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45`}
                  {...hoverHandlers}
                  onClick={() => onToggleMovementMask(mid)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleMovementMask(mid);
                    }
                  }}
                >
                  {label}
                </div>
              );
            }

            return (
              <div key={mid ?? `${idx}-${label}`} className={chipClass} {...hoverHandlers}>
                {label}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        {/* Left Y axis (primary) */}
        <div className="w-[56px] flex flex-col justify-between text-[10px] text-white/40">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
            const v = primaryScaleMax * ratio;
            const txt = formatAxisValue(v);
            return <div key={idx}>{primaryUnit ? `${txt} ${primaryUnit}` : txt}</div>;
          })}
        </div>

        {/* Chart area */}
        <div className="relative w-full">
          <svg
            ref={svgRef}
            width="100%"
            height={height}
            viewBox={`0 0 ${VIEW_W} ${height}`}
            preserveAspectRatio="none"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.25" />
              </linearGradient>
              {/* Horizontal gradient along chart width — used for secondary line + points */}
              <linearGradient
                id={lineGradientId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1={height / 2}
                x2={VIEW_W}
                y2={height / 2}
              >
                <stop offset="0%" stopColor={secondaryColor} stopOpacity="1" />
                <stop offset="100%" stopColor="#0F66C9" stopOpacity="1" />
              </linearGradient>
              <filter id={lineGlowId} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="tight" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="wide" />
                <feColorMatrix
                  in="wide"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.45 0"
                  result="wideDim"
                />
                <feMerge>
                  <feMergeNode in="wideDim" />
                  <feMergeNode in="tight" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <mask id={`${uid}-sweep`}>
                <motion.rect
                  key={structureKey}
                  x="-100"
                  y="-200"
                  height={height + 400}
                  fill="white"
                  initial={{ width: 0 }}
                  animate={{ width: VIEW_W + 200 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
              </mask>
            </defs>
            <AnimatePresence mode="wait">
              <motion.g
                key={structureKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = height - ratio * height;
              return (
                <line
                  key={idx}
                  x1="0"
                  y1={y}
                  x2={VIEW_W}
                  y2={y}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Bars for primary metric */}
            {primHasAny && buckets.map((b, bucketIdx) => {
              const raw = primVals[bucketIdx] ?? null;
              if (raw === null || raw === undefined || !isFiniteNumber(raw)) return null;
              const ratio = Math.max(0, raw / safeMaxPrimary);
              const barH = ratio * usableH;
              const x = bucketIdx * groupWidth + (groupWidth - barWidth) / 2;
              const y = baseline - barH;
              const isBarHovered = hoveredBar?.key === b.key;
              const contributesHere = bucketMovementContributesPrimary(bucketIdx);
              const dimmedByMovement = hasMovementBarHighlight && !contributesHere;
              const scaleActive = isBarHovered && !dimmedByMovement;
              const barOpacity = dimmedByMovement ? 0.26 : isBarHovered ? 1 : 0.9;
              const movementEmphasis =
                hasMovementBarHighlight && contributesHere && !dimmedByMovement;
              const barStroke =
                dimmedByMovement
                  ? 'transparent'
                  : movementEmphasis
                    ? 'rgba(255,255,255,0.28)'
                    : isBarHovered
                      ? 'rgba(255,255,255,0.35)'
                      : 'transparent';
              const barStrokeW =
                dimmedByMovement ? 0 : movementEmphasis ? 0.9 : isBarHovered ? 1 : 0;
              return (
                <g
                  key={b.key}
                  style={{
                    transform: scaleActive
                      ? 'translateY(-5px) scale(1.06, 1.08)'
                      : 'translateY(0) scale(1, 1)',
                    transformOrigin: '50% 100%',
                    transformBox: 'fill-box',
                    transition: 'transform 0.32s cubic-bezier(0.34, 1.35, 0.64, 1)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => {
                    const valueText = primaryUnit ? `${formatAxisValue(raw)} ${primaryUnit}` : formatAxisValue(raw);
                    setHoveredBar({
                      key: b.key,
                      label: formatTooltipDateLabel(b, groupBy),
                      subLabel: formatTooltipDateSubLabel(b, groupBy),
                      valueText,
                      x: x + barWidth / 2,
                      y,
                    });
                  }}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <motion.rect
                    x={x}
                    initial={{ height: 0, y: baseline }}
                    animate={{ height: barH, y: y }}
                    transition={
                      instantSeriesUpdate
                        ? { duration: 0 }
                        : {
                            type: 'spring',
                            bounce: 0.2,
                            duration: 0.35,
                            delay: groupBy === 'day' ? 0 : bucketIdx * 0.015,
                          }
                    }
                    width={barWidth}
                    rx="2"
                    fill={`url(#${barGradientId})`}
                    opacity={barOpacity}
                    stroke={barStroke}
                    strokeWidth={barStrokeW}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      transition: 'opacity 0.22s ease, stroke 0.22s ease',
                    }}
                  />
                </g>
              );
            })}

            {/* Line for secondary metric */}
            {secondaryValues && secHasAny && (
              <>
                {(() => {
                  const linePoints = buildBridgedLinePoints(normalizedSecondary, height, n);
                  const d = buildMonotoneXPath(linePoints);
                  const isLineHovered = hoveredLineIdx === 0;
                  return (
                    <>
                      {linePoints.length > 0 && (
                        <g
                          shapeRendering="geometricPrecision"
                          mask={`url(#${uid}-sweep)`}
                          style={{
                            opacity: lineMutedForMovement ? 0.4 : 1,
                            transition: 'opacity 0.22s ease',
                          }}
                        >
                          {/* Aura douce sous la courbe */}
                          <motion.path
                            d={d}
                            fill="none"
                            stroke="rgba(255,255,255,0.14)"
                            strokeWidth={isLineHovered ? '6.5' : '5.5'}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            opacity="0.95"
                            style={{
                              transition: 'stroke-width 220ms ease',
                              pointerEvents: 'none',
                            }}
                          />
                          <motion.path
                            d={d}
                            fill="none"
                            stroke={`url(#${lineGradientId})`}
                            strokeWidth={isLineHovered ? '3.25' : '2.65'}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            filter={`url(#${lineGlowId})`}
                            opacity={isLineHovered ? '1' : '0.99'}
                            style={{
                              transform: isLineHovered ? 'translateY(-1px)' : 'translateY(0)',
                              transformOrigin: '50% 50%',
                              transformBox: 'fill-box',
                              transition: 'stroke-width 220ms ease, opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                              pointerEvents: 'none',
                            }}
                          />
                          {/* Reflet fin sur le dessus de la courbe */}
                          <motion.path
                            d={d}
                            fill="none"
                            stroke="rgba(255,255,255,0.35)"
                            strokeWidth={isLineHovered ? '1.05' : '0.85'}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            opacity={isLineHovered ? '0.95' : '0.75'}
                            style={{
                              transform: isLineHovered ? 'translateY(-1px)' : 'translateY(0)',
                              transformOrigin: '50% 50%',
                              transformBox: 'fill-box',
                              transition: 'stroke-width 220ms ease, opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                              pointerEvents: 'none',
                            }}
                          />
                          <path
                            d={d}
                            fill="none"
                            stroke="transparent"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredLineIdx(0)}
                            onMouseLeave={() => setHoveredLineIdx(null)}
                          />
                        </g>
                      )}
                      {/* Points */}
                      {(normalizedSecondary || []).map((v, i) => {
                        if (v === null || v === undefined || !isFiniteNumber(v)) return null;
                        const x = getBucketCenterX(i, n);
                        const y = height - v;
                        const pointKey = buckets[i]?.key ?? `${i}`;
                        const isPointHovered = hoveredPoint?.key === pointKey;
                        const secPointDimmed =
                          hasMovementLineHighlight && !bucketMovementContributesSecondary(i);
                        const pointOpacity = secPointDimmed ? 0.14 : isPointHovered ? 1 : 0.95;
                        return (
                          <React.Fragment key={i}>
                            <motion.ellipse
                              cx={x}
                              cy={y}
                              rx={pointRx * 2}
                              ry={pointRy * 2}
                              fill={`url(#${lineGradientId})`}
                              animate={{ opacity: isPointHovered && !secPointDimmed ? 0.34 : 0 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              style={{ pointerEvents: 'none' }}
                            />
                            <motion.ellipse
                              cx={x}
                              cy={y}
                              initial={{ rx: 0, ry: 0, opacity: 0 }}
                              animate={{
                                rx: isPointHovered ? pointRx * 1.35 : pointRx,
                                ry: isPointHovered ? pointRy * 1.35 : pointRy,
                                opacity: pointOpacity,
                              }}
                              transition={
                                instantSeriesUpdate
                                  ? { duration: 0 }
                                  : hasPointInteracted
                                    ? { type: 'tween', duration: 0.14, ease: 'easeOut' }
                                  : {
                                      type: 'spring',
                                      bounce: 0.5,
                                      duration: 0.6,
                                      delay: 0.4 + i * 0.04,
                                    }
                              }
                              fill={`url(#${lineGradientId})`}
                              stroke="rgba(0,0,0,0.35)"
                              strokeWidth={isPointHovered ? '1.35' : '1'}
                              vectorEffect="non-scaling-stroke"
                            />
                            <ellipse
                              cx={x}
                              cy={y}
                              rx={pointHitRx}
                              ry={pointHitRy}
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => {
                                setHasPointInteracted(true);
                                const rawSecondary = secVals[i];
                                if (rawSecondary === null || rawSecondary === undefined || !isFiniteNumber(rawSecondary)) return;
                                const valueText = secondaryUnit
                                  ? `${formatAxisValue(rawSecondary)} ${secondaryUnit}`
                                  : formatAxisValue(rawSecondary);
                                setHoveredPoint({
                                  key: pointKey,
                                  label: formatTooltipDateLabel(buckets[i], groupBy),
                                  subLabel: formatTooltipDateSubLabel(buckets[i], groupBy),
                                  metricLabel: secondaryLabel || 'Mesure',
                                  valueText,
                                  x,
                                  y,
                                });
                              }}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                          </React.Fragment>
                        );
                      })}
                    </>
                  );
                })()}
              </>
            )}
              </motion.g>
            </AnimatePresence>
          </svg>
          {hoveredBar && (
            <div
              className="absolute pointer-events-none z-20 min-w-[150px] overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(10,10,12,0.78)] px-3 py-2.5 backdrop-blur-[10px]"
              style={{
                left: `${(hoveredBar.x / VIEW_W) * 100}%`,
                top: `${Math.max(6, hoveredBar.y - 10)}px`,
                transform: 'translate(-50%, -100%)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              }}
            >
              <div className="text-[11px] text-white/75 font-light">{hoveredBar.label}</div>
              {hoveredBar.subLabel ? (
                <div className="mt-0.5 text-[10px] text-white/45 font-light">{hoveredBar.subLabel}</div>
              ) : null}
              <div className="mt-1.5 border-t border-white/10 pt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <span className="text-[14px] text-white font-medium tabular-nums">{hoveredBar.valueText}</span>
                </div>
              </div>
            </div>
          )}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-20 min-w-[150px] overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(10,10,12,0.78)] px-3 py-2.5 backdrop-blur-[10px]"
              style={{
                left: `${(hoveredPoint.x / VIEW_W) * 100}%`,
                top: `${Math.max(6, hoveredPoint.y - 12)}px`,
                transform: 'translate(-50%, -100%)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              }}
            >
              <div className="min-w-0">
                <div className="text-[11px] text-white/75 font-light">{hoveredPoint.label}</div>
                {hoveredPoint.subLabel ? (
                  <div className="mt-0.5 text-[10px] text-white/45 font-light">{hoveredPoint.subLabel}</div>
                ) : null}
              </div>
              <div className="mt-1.5 border-t border-white/10 pt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                  <span className="text-[14px] text-white font-medium tabular-nums">{hoveredPoint.valueText}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Y axis (secondary) */}
        {secondaryLabel && secHasAny ? (
          <div className="w-[56px] flex flex-col justify-between text-[10px] text-white/40">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
              const v = secondaryScaleMax * ratio;
              const txt = formatAxisValue(v);
              return <div key={idx}>{secondaryUnit ? `${txt} ${secondaryUnit}` : txt}</div>;
            })}
          </div>
        ) : (
          <div className="w-[56px]" />
        )}
      </div>

      {/* X labels aligned with bars */}
      <div className="mt-3 flex gap-3">
        <div className="w-[56px]" />
        <div className="relative w-full h-4">
          {buckets.map((b, i) => {
            const isMonthlyRangeWeeklyView =
              groupBy === 'week' &&
              periodType === 'lastMonths';
            const weekLabelStep =
              Number(lastMonths) === 12 ? 3 : Number(lastMonths) === 6 ? 2 : 1;
            const shouldShow =
              isMonthlyRangeWeeklyView && weekLabelStep > 1
                ? i % weekLabelStep === 0 || i === buckets.length - 1
                : groupBy === 'week' || groupBy === 'month' || groupBy === 'bloc'
                  ? true
                  : i === 0 ||
                    i === buckets.length - 1 ||
                    (buckets.length > 4 && (i === Math.floor(buckets.length / 3) || i === Math.floor((2 * buckets.length) / 3)));
            const barCenterX = i * groupWidth + groupWidth / 2;
            const leftPercent = (barCenterX / VIEW_W) * 100;
            return (
              <div
                key={b.key}
                className={`absolute -translate-x-1/2 text-[10px] font-light whitespace-nowrap ${shouldShow ? 'text-white/75 opacity-100' : 'opacity-0'}`}
                style={{ left: `${leftPercent}%` }}
              >
                {b.label}
              </div>
            );
          })}
        </div>
        <div className="w-[56px]" />
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-extralight text-white/40">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: primaryColor }}
            aria-hidden
          />
          <span className="min-w-0">{primaryLabel}</span>
        </div>
        {secondaryLabel && secHasAny && (
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${secondaryColor}, #0F66C9)`,
              }}
              aria-hidden
            />
            <span className="min-w-0">{secondaryLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTrendChart;

