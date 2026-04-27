/**
 * Utility functions for usage tracking calculations.
 * Used by Chat titlebar for usage display.
 */

// Constants for projection dampening
const ACTIVE_HOURS_PER_DAY = 14; // Assume 10hr sleep/inactive gap per day
const MIN_HOURS_FOR_FULL_PROJECTION = 24; // Trust linear projections after this threshold

export type TrackingStatus = 'under' | 'on-track' | 'over';
export type BudgetStatus = 'under' | 'on-track' | 'over';
export type ProjectionConfidence = 'low' | 'medium' | 'high';

export type TrackingInfo = {
  elapsedHours: number;
  remainingHours: number;
  timeProgress: number;
  projectedUsage: number;
  status: TrackingStatus;
  // Exhaustion analytics (when projected > 100%)
  exhaustsInHours?: number;
  exhaustionTime?: Date;
  recommendedBreakHours?: number;
  // Near-limit warning (when projected 95-100%)
  isNearLimit?: boolean;
  // Daily budget (backward calculation)
  dailyBudget: number; // % we should use per day to hit 100%
  currentDailyRate: number; // % we're actually using per day
  budgetStatus: BudgetStatus;
  budgetDelta: number; // How much over/under budget (positive = over)
  // Projection confidence
  projectionConfidence: ProjectionConfidence;
  // Daily target tracking
  todayTarget: number; // Cumulative % we should hit by end of today
  todayRemaining: number; // How much more we can use today (positive = room left)
};

/**
 * Calculate tracking info for a usage period.
 * Determines if usage is under, on-track, or over the expected rate.
 */
export function calculateTracking(
  utilization: number,
  resetsAt: string | null,
  periodHours: number
): TrackingInfo | null {
  if (!resetsAt) return null;

  const resetDate = new Date(resetsAt);
  const now = new Date();
  const remainingMs = resetDate.getTime() - now.getTime();

  if (remainingMs <= 0) return null;

  const remainingHours = remainingMs / (1000 * 60 * 60);
  const elapsedHours = periodHours - remainingHours;
  const timeProgress = (elapsedHours / periodHours) * 100;

  // Determine projection confidence based on data collected
  let projectionConfidence: ProjectionConfidence;
  if (elapsedHours < 6) {
    projectionConfidence = 'low';
  } else if (elapsedHours < MIN_HOURS_FOR_FULL_PROJECTION) {
    projectionConfidence = 'medium';
  } else {
    projectionConfidence = 'high';
  }

  // Calculate usage rate and projected usage with dampening for early periods
  const usageRate = elapsedHours > 0 ? utilization / elapsedHours : 0;

  // Dampened projection: use effective active hours instead of full calendar hours
  // When < 24h elapsed, assume 14 active hours/day to avoid wild extrapolations
  // Only apply dampening for multi-day periods (>= 24h) where early extrapolation is unreliable
  let effectivePeriodHours: number;
  if (periodHours < 24) {
    // Short periods (like 5-hour sessions): use linear projection, no dampening
    effectivePeriodHours = periodHours;
  } else if (elapsedHours < MIN_HOURS_FOR_FULL_PROJECTION) {
    // Multi-day periods with little data: apply dampening
    const periodDays = periodHours / 24;
    effectivePeriodHours = periodDays * ACTIVE_HOURS_PER_DAY;
  } else {
    // After 24h, trust the actual usage pattern
    effectivePeriodHours = periodHours;
  }

  const projectedUsage = usageRate * effectivePeriodHours;

  let status: TrackingStatus;
  if (utilization <= timeProgress * 0.8) {
    status = 'under';
  } else if (utilization <= timeProgress * 1.2) {
    status = 'on-track';
  } else {
    status = 'over';
  }

  // Calculate daily budget (backward approach)
  // How much % should we use per day to perfectly hit 100%?
  const remainingPercent = 100 - utilization;
  const remainingDays = remainingHours / 24;
  const dailyBudget = remainingDays > 0 ? remainingPercent / remainingDays : 0;

  // Calculate current daily rate (what we're actually using)
  const elapsedDays = elapsedHours / 24;
  const currentDailyRate = elapsedDays > 0 ? utilization / elapsedDays : 0;

  // Determine budget status
  let budgetStatus: BudgetStatus;
  const budgetDelta = currentDailyRate - dailyBudget;
  if (budgetDelta < -2) {
    // More than 2% under budget per day
    budgetStatus = 'under';
  } else if (budgetDelta <= 2) {
    // Within ±2% of budget
    budgetStatus = 'on-track';
  } else {
    // More than 2% over budget per day
    budgetStatus = 'over';
  }

  // Calculate daily target (end of current day cumulative target)
  // Which day are we in? Day 1 = first 24h, Day 2 = next 24h, etc.
  const periodDays = periodHours / 24;
  const currentDayNumber = Math.min(Math.ceil(elapsedHours / 24) || 1, periodDays);
  const todayTarget = (currentDayNumber / periodDays) * 100;
  const todayRemaining = todayTarget - utilization; // positive = room left

  // Calculate exhaustion analytics
  const isNearLimit = projectedUsage >= 95 && projectedUsage <= 100;
  let exhaustsInHours: number | undefined;
  let exhaustionTime: Date | undefined;
  let recommendedBreakHours: number | undefined;

  if (projectedUsage > 100 && usageRate > 0 && utilization < 100) {
    const hoursToExhaustion = (100 - utilization) / usageRate;
    exhaustsInHours = hoursToExhaustion;
    exhaustionTime = new Date(now.getTime() + hoursToExhaustion * 60 * 60 * 1000);
    recommendedBreakHours = remainingHours - hoursToExhaustion;
    // Ensure break recommendation is positive
    if (recommendedBreakHours < 0) recommendedBreakHours = 0;
  }

  return {
    elapsedHours,
    remainingHours,
    timeProgress,
    projectedUsage,
    status,
    exhaustsInHours,
    exhaustionTime,
    recommendedBreakHours,
    isNearLimit,
    dailyBudget,
    currentDailyRate,
    budgetStatus,
    budgetDelta,
    projectionConfidence,
    todayTarget,
    todayRemaining
  };
}

/**
 * Format hours into a human-readable string.
 */
export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  const days = Math.floor(h / 24);
  const hours = Math.round(h % 24);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/**
 * Format hours into hours and minutes string (e.g., "2h 30m" or "45m").
 */
export function formatHoursMinutes(h: number): string {
  if (h < 0) return '0m';
  const totalMinutes = Math.round(h * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format a Date to a time string (e.g., "10:15 PM").
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
