export type PeriodicityVerdict =
  | { isPeriodic: true; intervalDays: number; confidence: number }
  | { isPeriodic: false; intervalDays: null; confidence: number };

/**
 * Decide whether a sequence of charge dates for one merchant cluster looks
 * like a recurring subscription.
 *
 * TODO (week 2, core of the project): this is the naive first pass -
 * mean/stddev of day-gaps against known billing intervals (weekly,
 * monthly, quarterly, annual) with a tolerance band. It will under-detect
 * real subscriptions with:
 *   - a skipped billing cycle (card declined, retried next month)
 *   - a free trial that converts to paid at a different amount/date offset
 *   - calendar-month billing where gaps legitimately vary 28-31 days
 * and will over-detect on coincidentally-regular one-off purchases (e.g.
 * buying the same brand of coffee every ~30 days at a cafe). Both failure
 * modes need a hand-labeled eval set (see eval/) to catch before trusting
 * this, and are exactly the cases that should fall into the "ambiguous"
 * confidence band and get routed to the LLM classifier instead of being
 * decided here.
 */
export function detectPeriodicity(chargeDates: Date[]): PeriodicityVerdict {
  if (chargeDates.length < 2) {
    return { isPeriodic: false, intervalDays: null, confidence: 0 };
  }

  const sorted = [...chargeDates].sort((a, b) => a.getTime() - b.getTime());
  const gapsDays: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    gapsDays.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
  }

  const mean = gapsDays.reduce((sum, g) => sum + g, 0) / gapsDays.length;
  const variance = gapsDays.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gapsDays.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;

  // Snap the observed mean gap to the nearest known billing interval.
  const KNOWN_INTERVALS_DAYS = [7, 14, 30, 91, 365];
  const nearestInterval = KNOWN_INTERVALS_DAYS.reduce((closest, interval) =>
    Math.abs(interval - mean) < Math.abs(closest - mean) ? interval : closest,
  );
  const intervalDeviation = Math.abs(nearestInterval - mean) / nearestInterval;

  const isPeriodic = coefficientOfVariation < 0.2 && intervalDeviation < 0.15;
  const confidence = isPeriodic ? 1 - (coefficientOfVariation + intervalDeviation) / 2 : 0;

  return isPeriodic
    ? { isPeriodic: true, intervalDays: nearestInterval, confidence }
    : { isPeriodic: false, intervalDays: null, confidence };
}
