import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  parseISO,
  differenceInDays,
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns';
import type { AnalyticsFilterState, ComparisonDateRanges } from '../types';

export function calculateDateRanges(filter: AnalyticsFilterState): ComparisonDateRanges {
  const today = new Date();
  let currentStart: Date;
  let currentEnd: Date;

  switch (filter.preset) {
    case '7d':
      currentStart = startOfDay(subDays(today, 6));
      currentEnd = endOfDay(today);
      break;
    case '30d':
      currentStart = startOfDay(subDays(today, 29));
      currentEnd = endOfDay(today);
      break;
    case '90d':
      currentStart = startOfDay(subDays(today, 89));
      currentEnd = endOfDay(today);
      break;
    case 'this_month':
      currentStart = startOfDay(startOfMonth(today));
      currentEnd = endOfDay(today);
      break;
    case 'last_month': {
      const prevMonth = subMonths(today, 1);
      currentStart = startOfDay(startOfMonth(prevMonth));
      currentEnd = endOfDay(endOfMonth(prevMonth));
      break;
    }
    case 'custom':
      currentStart = filter.startDate ? startOfDay(parseISO(filter.startDate)) : startOfDay(subDays(today, 29));
      currentEnd = filter.endDate ? endOfDay(parseISO(filter.endDate)) : endOfDay(today);
      break;
    default:
      currentStart = startOfDay(subDays(today, 29));
      currentEnd = endOfDay(today);
  }

  // Ensure currentEnd >= currentStart
  if (currentEnd < currentStart) {
    currentEnd = endOfDay(currentStart);
  }

  // Calculate day length
  const durationDays = Math.max(1, differenceInDays(currentEnd, currentStart) + 1);

  // Calculate previous period with identical duration
  const priorEnd = endOfDay(subDays(currentStart, 1));
  const priorStart = startOfDay(subDays(priorEnd, durationDays - 1));

  return {
    current: {
      startDate: currentStart,
      endDate: currentEnd,
      label: `${format(currentStart, 'MMM dd, yyyy')} – ${format(currentEnd, 'MMM dd, yyyy')}`
    },
    prior: {
      startDate: priorStart,
      endDate: priorEnd,
      label: `${format(priorStart, 'MMM dd, yyyy')} – ${format(priorEnd, 'MMM dd, yyyy')}`
    },
    durationDays
  };
}

export function isDateInInterval(dateStr: string, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return isWithinInterval(d, { start, end });
  } catch {
    return false;
  }
}

export function computeDelta(current: number, prior: number): { percent: number; isPositive: boolean; isNeutral: boolean } {
  if (prior === 0) {
    if (current === 0) return { percent: 0, isPositive: true, isNeutral: true };
    return { percent: 100, isPositive: true, isNeutral: false };
  }
  const diff = current - prior;
  const pct = (diff / Math.abs(prior)) * 100;
  return {
    percent: Math.round(pct * 10) / 10,
    isPositive: pct >= 0,
    isNeutral: pct === 0
  };
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Math.round(val));
}

export function formatCompactINR(val: number): string {
  if (Math.abs(val) >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  if (Math.abs(val) >= 1000) {
    return `₹${(val / 1000).toFixed(1)} k`;
  }
  return `₹${Math.round(val)}`;
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(val));
}
