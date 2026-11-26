// Reading and writing a time: the minute a chart is cast for, as the input screen and the date picker hold it.
// Pure: no clock reads.

/** Beijing wall-clock time, to the minute. */
export interface BirthTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

/** Days in a 公历 month. */
export function daysInMonth(year: number, month: number): number {
  const leapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return month === 2 && leapYear ? 29 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Whether the time is a real minute from 1900-01-01 00:00 to 2100-12-31 23:59. */
function isRealMinute({ year, month, day, hour, minute }: BirthTime): boolean {
  return (
    [year, month, day, hour, minute].every(Number.isInteger) &&
    year >= MIN_YEAR && year <= MAX_YEAR &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= daysInMonth(year, month) &&
    hour >= 0 && hour <= 23 &&
    minute >= 0 && minute <= 59
  );
}

/** Reads 'YYYY-MM-DDTHH:mm'. Null unless it is a real minute from 1900 to 2100. */
export function parseInput(text: string): BirthTime | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const time = { year, month, day, hour, minute };
  return isRealMinute(time) ? time : null;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** The time as 'YYYY-MM-DDTHH:mm'. */
export const formatInput = ({ year, month, day, hour, minute }: BirthTime): string =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;

/** A clock reading as an input. A clock set outside 1900–2100 gets the nearest minute the field allows. */
export function clockInput(clock: BirthTime): string {
  if (clock.year < MIN_YEAR) return `${MIN_YEAR}-01-01T00:00`;
  if (clock.year > MAX_YEAR) return `${MAX_YEAR}-12-31T23:59`;
  return formatInput(clock);
}

const SHI_CHEN = '子丑寅卯辰巳午未申酉戌亥';

/** The date as the screens write it: '1996年 6月20日'. */
export const dateLine = ({ year, month, day }: BirthTime): string => `${year}年 ${month}月${day}日`;

/**
 * The time on a 12-hour clock with its 时辰, as the screens write it: '下午6:00 酉时'. Midnight is 上午12, noon
 * 下午12; 子时 runs from 23:00 to 00:59.
 */
export function clockLine({ hour, minute }: BirthTime): string {
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour < 12 ? '上午' : '下午'}${twelve}:${pad(minute)} ${SHI_CHEN[Math.floor((hour + 1) / 2) % 12]}时`;
}
