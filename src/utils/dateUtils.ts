import { DateFilterType } from '../types';

/**
 * Business day helpers: midnight (00:00:00) to midnight (23:59:59)
 */

export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateInBusinessDay(dateStr: string, targetDay: Date = new Date()): boolean {
  const itemDate = new Date(dateStr);
  const start = getStartOfDay(targetDay);
  const end = getEndOfDay(targetDay);
  return itemDate >= start && itemDate <= end;
}

export function isWithinDateRange(
  dateStr: string,
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): boolean {
  const itemDate = new Date(dateStr);
  if (isNaN(itemDate.getTime())) return false;

  const now = referenceDate;
  const todayStart = getStartOfDay(now);
  const todayEnd = getEndOfDay(now);

  switch (filter) {
    case 'Today':
      return itemDate >= todayStart && itemDate <= todayEnd;

    case '7 Days': {
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // past 7 days inclusive
      return itemDate >= sevenDaysAgo && itemDate <= todayEnd;
    }

    case '1 Month': {
      const oneMonthAgo = new Date(todayStart);
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 29); // past 30 days inclusive
      return itemDate >= oneMonthAgo && itemDate <= todayEnd;
    }

    case 'Custom': {
      if (!customStart && !customEnd) return true;
      const start = customStart ? getStartOfDay(new Date(customStart)) : new Date(0);
      const end = customEnd ? getEndOfDay(new Date(customEnd)) : todayEnd;
      return itemDate >= start && itemDate <= end;
    }

    default:
      return true;
  }
}

export function getDateRangeBounds(
  filter: 'Today' | '7 Days' | '1 Month' | 'All Time' | 'Custom',
  customStart?: Date,
  customEnd?: Date,
  referenceDate: Date = new Date()
): { start?: Date; end?: Date } {
  const todayStart = getStartOfDay(referenceDate);
  const todayEnd = getEndOfDay(referenceDate);

  switch (filter) {
    case 'Today':
      return { start: todayStart, end: todayEnd };
    case '7 Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd };
    }
    case '1 Month': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd };
    }
    case 'Custom': {
      const start = customStart ? getStartOfDay(customStart) : undefined;
      const end = customEnd ? getEndOfDay(customEnd) : undefined;
      return { start, end };
    }
    case 'All Time':
    default:
      return { start: undefined, end: undefined };
  }
}

export function isDateInRange(dateStr: string, start?: Date, end?: Date): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}
