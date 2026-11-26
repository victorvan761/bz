// The engine: castBazi turns a birth minute and a gender into the whole 八字 chart (SPEC §4), and the flows (大运
// 流年 流月 流日 流时) give the columns and the grid the chart screen adds to it (SPEC §5.3).
// It is pure: no clock reads, no DOM, no React. Every value is the Chinese term the chart shows.
//
// Top to bottom: the chart's shape, the tables, the lookups, castBazi and the texts of 资料, 旺衰 and 喜忌, then
// the flows and how they are chosen.
import { LunarUtil, Solar } from 'lunar-typescript';
import { MAX_YEAR, MIN_YEAR, clockLine, dateLine, type BirthTime } from './time';

// ── The chart ────────────────────────────────────────────────────────────────────────────────────────────────

export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水';
export type Gender = '男' | '女';
/** 十神, one character each, as 十三行八字 writes them beside a stem: 比 劫 食 伤 才 财 杀 官 卩 印 */
export type ShiShen = '比' | '劫' | '食' | '伤' | '才' | '财' | '杀' | '官' | '卩' | '印';
/** 喜忌: the part an element plays for the day master (SPEC §4.5) */
export type XiJi = '用' | '喜' | '闲' | '忌' | '仇';

/** The calendar choice the input screen offers. */
export interface Settings {
  /** 夜子时 (23:00–23:59): 'next' puts it on the next day's 日柱 (23:00 换日); 'same' keeps the calendar day's. */
  lateZi: 'next' | 'same';
}

export const DEFAULTS: Readonly<Settings> = Object.freeze({ lateZi: 'next' });

export interface HiddenStem {
  stem: Stem;
  god: ShiShen;
}

/** One 干支 pillar, with everything the chart prints about it. */
export interface Pillar {
  ganZhi: string;
  stem: Stem;
  branch: Branch;
  /** The stem's 十神 against the day master; null for the day master itself */
  god: ShiShen | null;
  /** 藏干, 本气 first, each with its 十神 */
  hidden: readonly HiddenStem[];
  /** 纳音: '霹雳火' */
  naYin: string;
  /** 星运: the day master's 十二长生 stage at this branch */
  xingYun: string;
  /** 自坐: this stem's own stage at its branch */
  ziZuo: string;
  /** 空亡: the two branches this pillar's 旬 leaves out, '午未' */
  kong: string;
}

export type PillarKey = 'year' | 'month' | 'day' | 'hour';

export interface DaYun {
  /** 0 to 9 */
  index: number;
  pillar: Pillar;
  startYear: number;
  endYear: number;
}

export interface Bazi {
  /** The minute the chart was cast for, Beijing wall-clock time */
  time: BirthTime;
  gender: Gender;
  settings: Settings;
  /** 阳 or 阴, by the 年干 */
  yinYang: '阳' | '阴';
  /** 生肖 of the 年支: '鼠' */
  zodiac: string;
  dayMaster: Stem;
  pillars: Record<PillarKey, Pillar>;
  /** 日空: the two branches the 日柱's 旬 leaves out, marked 空 wherever they stand: '午未' */
  dayKong: string;
  /** 命宫 身宫 胎元 胎息, as 干支 */
  mingGong: string;
  shenGong: string;
  taiYuan: string;
  taiXi: string;
  /** The 农历 year of birth, which 虚岁 counts from (it turns at 春节) */
  lunarYear: number;
  /** The 农历 date of birth: '一九九六年 五月初五' */
  lunarDate: string;
  /** 起运: how long after birth the first 大运 starts (precise: 3 days to a year), and when, 'YYYY-MM-DD HH:mm' */
  yun: { forward: boolean; years: number; months: number; days: number; hours: number; start: string };
  /** 交运: the stem of the year it falls in and the stem that combines with it, the 节 before it, the days since */
  jiaoYun: { stems: readonly [Stem, Stem]; jie: string; days: number };
  /** Ten 大运, from the first */
  daYun: DaYun[];
  /** The 公历 year of birth: ages count from it, as 十三行八字 shows them (2026 − 1996 = 30) */
  birthYear: number;
}

// ── The tables ───────────────────────────────────────────────────────────────────────────────────────────────

export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

/** The 60 干支 in cycle order: 甲子, 乙丑 … 癸亥. */
export const SIXTY: readonly string[] = Array.from({ length: 60 }, (_, n) => STEMS[n % 10] + BRANCHES[n % 12]);

export const ELEMENTS: readonly WuXing[] = ['木', '火', '土', '金', '水'];

export const STEM_ELEMENT: Readonly<Record<Stem, WuXing>> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export const BRANCH_ELEMENT: Readonly<Record<Branch, WuXing>> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 藏干, 本气 first. */
export const HIDDEN: Readonly<Record<Branch, readonly Stem[]>> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'],
  午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

/** 五行 相生 and 相克: what each element produces, and what it overcomes. */
export const GENERATES: Readonly<Record<WuXing, WuXing>> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
export const CONTROLS: Readonly<Record<WuXing, WuXing>> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export const SHI_SHEN_NAME: Readonly<Record<ShiShen, string>> = {
  比: '比肩', 劫: '劫财', 食: '食神', 伤: '伤官', 才: '偏财', 财: '正财', 杀: '七杀', 官: '正官', 卩: '偏印', 印: '正印',
};

/** 十二长生, in order from 长生. */
export const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;

/** Each stem's 长生 branch. 戊 follows 丙 and 己 follows 丁 (火土同宫). */
const CHANG_SHENG: Readonly<Record<Stem, Branch>> = {
  甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯',
};

/** 生肖, by 年支. */
const ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪';

/** The 节 that start the twelve months, from 寅月 (立春) to 丑月 (小寒). */
export const JIE_NAMES = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'] as const;

// ── Lookups ──────────────────────────────────────────────────────────────────────────────────────────────────

/** a mod n, never negative. */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

export const isYang = (stem: Stem): boolean => STEMS.indexOf(stem) % 2 === 0;

export const stemOf = (ganZhi: string) => ganZhi[0] as Stem;
export const branchOf = (ganZhi: string) => ganZhi[1] as Branch;

/** The stem a stem combines with (天干五合): 甲己, 乙庚, 丙辛, 丁壬, 戊癸. */
export const heStem = (stem: Stem): Stem => STEMS[(STEMS.indexOf(stem) + 5) % 10] as Stem;

/** The 十神 of `other` for a day master. */
export function shiShen(day: Stem, other: Stem): ShiShen {
  const d = STEM_ELEMENT[day];
  const o = STEM_ELEMENT[other];
  const same = isYang(day) === isYang(other);
  if (o === d) return same ? '比' : '劫';
  if (GENERATES[d] === o) return same ? '食' : '伤';
  if (CONTROLS[d] === o) return same ? '才' : '财';
  if (CONTROLS[o] === d) return same ? '杀' : '官';
  return same ? '卩' : '印';
}

/** A stem's 十二长生 stage at a branch: forward from its 长生 branch for yang stems, backward for yin stems. */
export function stage(stem: Stem, branch: Branch): string {
  const from = BRANCHES.indexOf(CHANG_SHENG[stem]);
  const at = BRANCHES.indexOf(branch);
  return STAGES[mod(isYang(stem) ? at - from : from - at, 12)];
}

/** 空亡: the two branches the 旬 of a 干支 leaves out (甲子旬 → 戌亥). */
export function xunKong(ganZhi: string): string {
  const n = SIXTY.indexOf(ganZhi);
  if (n < 0) throw new RangeError(`not a 干支: ${ganZhi}`);
  const first = BRANCHES.indexOf(SIXTY[n - (n % 10)][1]);
  return BRANCHES[(first + 10) % 12] + BRANCHES[(first + 11) % 12];
}

/** 纳音 of a 干支: '霹雳火'. */
export const naYin = (ganZhi: string): string => LunarUtil.NAYIN[ganZhi];

/** A pillar as the chart prints it, for a day master. `isDayMaster` leaves the stem's 十神 empty. */
export function pillarOf(ganZhi: string, dayMaster: Stem, isDayMaster = false): Pillar {
  if (!SIXTY.includes(ganZhi)) throw new RangeError(`not a 干支: ${ganZhi}`);
  const stem = stemOf(ganZhi);
  const branch = branchOf(ganZhi);
  return {
    ganZhi,
    stem,
    branch,
    god: isDayMaster ? null : shiShen(dayMaster, stem),
    hidden: HIDDEN[branch].map((s) => ({ stem: s, god: shiShen(dayMaster, s) })),
    naYin: naYin(ganZhi),
    xingYun: stage(dayMaster, branch),
    ziZuo: stage(stem, branch),
    kong: xunKong(ganZhi),
  };
}

/** The 干支 of a 公历 year's 流年, which starts at that year's 立春: 2026 → 丙午. */
export const yearGanZhi = (year: number): string => SIXTY[mod(year - 4, 60)];

/** The 干支 of month m (0 = 寅月 … 11 = 丑月) of a 流年, by 五虎遁 from the year's stem. */
export function monthGanZhi(yearStem: Stem, m: number): string {
  const first = ((STEMS.indexOf(yearStem) % 5) * 2 + 2) % 10;
  return STEMS[(first + m) % 10] + BRANCHES[(2 + m) % 12];
}

const pad = (n: number) => String(n).padStart(2, '0');
const minuteText = (s: Solar) => `${s.getYear()}-${pad(s.getMonth())}-${pad(s.getDay())} ${pad(s.getHour())}:${pad(s.getMinute())}`;
/** The calendar day of a moment, at 00:00. */
const dayOf = (s: Solar) => Solar.fromYmd(s.getYear(), s.getMonth(), s.getDay());

// ── castBazi ─────────────────────────────────────────────────────────────────────────────────────────────────

/** How many 大运 the chart lists. */
export const DA_YUN_COUNT = 10;

/**
 * The chart for a birth minute, read as Beijing wall-clock time with no 真太阳时 correction. 年柱 and 月柱 switch
 * at the exact 立春 and 节 instants; 日柱 follows `settings.lateZi` from 23:00.
 */
export function castBazi(time: BirthTime, gender: Gender, settings: Settings = DEFAULTS): Bazi {
  const { year, month, day, hour, minute } = time;
  if (year < MIN_YEAR || year > MAX_YEAR) throw new RangeError(`year ${year} is outside ${MIN_YEAR}–${MAX_YEAR}`);
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(settings.lateZi === 'next' ? 1 : 2);

  const dayMaster = ec.getDayGan() as Stem;
  const pillars: Record<PillarKey, Pillar> = {
    year: pillarOf(ec.getYear(), dayMaster),
    month: pillarOf(ec.getMonth(), dayMaster),
    day: pillarOf(ec.getDay(), dayMaster, true),
    hour: pillarOf(ec.getTime(), dayMaster),
  };

  // 起运, counted to the minute: 3 days to a year, 1 day to 4 months, 2 hours to 10 days. Index 0 of lunar-typescript's
  // list is 童限, the years before the first 大运, which the chart doesn't show.
  const yun = ec.getYun(gender === '男' ? 1 : 0, 2);
  const daYun: DaYun[] = yun
    .getDaYun(DA_YUN_COUNT + 1)
    .slice(1)
    .map((d, index) => ({ index, pillar: pillarOf(d.getGanZhi(), dayMaster), startYear: d.getStartYear(), endYear: d.getEndYear() }));

  // 交运: the stem of the year (by 立春) the first 大运 starts in, and the 节 before that moment.
  const start = yun.getStartSolar();
  const startLunar = start.getLunar();
  const jie = startLunar.getPrevJie();
  const yearStem = startLunar.getYearGanExact() as Stem;

  return {
    time,
    gender,
    settings,
    yinYang: isYang(pillars.year.stem) ? '阳' : '阴',
    zodiac: ZODIAC[BRANCHES.indexOf(pillars.year.branch)],
    dayMaster,
    pillars,
    dayKong: pillars.day.kong,
    mingGong: ec.getMingGong(),
    shenGong: ec.getShenGong(),
    taiYuan: ec.getTaiYuan(),
    taiXi: ec.getTaiXi(),
    lunarYear: lunar.getYear(),
    lunarDate: `${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    yun: {
      forward: yun.isForward(),
      years: yun.getStartYear(),
      months: yun.getStartMonth(),
      days: yun.getStartDay(),
      hours: yun.getStartHour(),
      start: minuteText(start),
    },
    jiaoYun: { stems: [yearStem, heStem(yearStem)], jie: jie.getName(), days: dayOf(start).subtract(dayOf(jie.getSolar())) },
    daYun,
    birthYear: year,
  };
}

// ── The 基本资料 texts (SPEC §4.4) ────────────────────────────────────────────────────────────────────────────

/** 虚岁 on a day: the 农历 year then, less the 农历 year of birth, plus 1. It turns at 春节. */
export function xuSui(chart: Bazi, now: BirthTime): number {
  const lunar = Solar.fromYmdHms(now.year, now.month, now.day, now.hour, now.minute, 0).getLunar();
  return lunar.getYear() - chart.lunarYear + 1;
}

/** '阳男 肖鼠 虚岁 31' */
export const profileText = (chart: Bazi, now: BirthTime): string =>
  `${chart.yinYang}${chart.gender} 肖${chart.zodiac} 虚岁 ${xuSui(chart, now)}`;

/** '1996年 6月20日 下午6:00 酉时' */
export const birthText = (chart: Bazi): string => `${dateLine(chart.time)} ${clockLine(chart.time)}`;

/** '出生后 5年 5个月 20天 起运': the hours are left out. */
export const yunText = ({ years, months, days }: Bazi['yun']): string => `出生后 ${years}年 ${months}个月 ${days}天 起运`;

/** '逢辛丙年 大雪后 3天 交大运' */
export const jiaoYunText = ({ jiaoYun: { stems, jie, days } }: Bazi): string => `逢${stems[0]}${stems[1]}年 ${jie}后 ${days}天 交大运`;

// ── 旺衰 and 喜忌 (SPEC §4.5) ─────────────────────────────────────────────────────────────────────────────────

/** 比劫 and 印: the stems that stand with the day master. */
const SUPPORT: readonly ShiShen[] = ['比', '劫', '卩', '印'];

/**
 * 三得: 得令 when the month branch's element is the day master's or produces it; 得地 when the 年, 日 or 时 branch
 * holds a hidden stem of the day master's element; 得势 when two or more of the 年, 月 and 时 stems are 比劫 or 印.
 * Two or three make the day master strong.
 */
export function sanDe(chart: Bazi): { ling: boolean; di: boolean; shi: boolean; strong: boolean } {
  const self = STEM_ELEMENT[chart.dayMaster];
  const { year, month, day, hour } = chart.pillars;
  const monthElement = BRANCH_ELEMENT[month.branch];
  const ling = monthElement === self || GENERATES[monthElement] === self;
  const di = [year, day, hour].some((p) => p.hidden.some((h) => STEM_ELEMENT[h.stem] === self));
  const shi = [year, month, hour].filter((p) => p.god !== null && SUPPORT.includes(p.god)).length >= 2;
  return { ling, di, shi, strong: [ling, di, shi].filter(Boolean).length >= 2 };
}

/** '系统估算：身弱 (得令，失地，失势)' */
export function estimateText(chart: Bazi): string {
  const { ling, di, shi, strong } = sanDe(chart);
  return `系统估算：${strong ? '身强' : '身弱'} (${ling ? '得令' : '失令'}，${di ? '得地' : '失地'}，${shi ? '得势' : '失势'})`;
}

/** The element that produces this one. */
const motherOf = (element: WuXing): WuXing => ELEMENTS.find((e) => GENERATES[e] === element)!;
/** The element that overcomes this one. */
const enemyOf = (element: WuXing): WuXing => ELEMENTS.find((e) => CONTROLS[e] === element)!;

/**
 * 喜忌: 用神 is 印 for a weak day master and 财 for a strong one; 喜 produces 用, 忌 overcomes it, 仇 produces 忌,
 * and 闲 is the fifth element.
 */
export function xiJi(chart: Bazi): Record<WuXing, XiJi> {
  const self = STEM_ELEMENT[chart.dayMaster];
  const yong = sanDe(chart).strong ? CONTROLS[self] : motherOf(self);
  const xi = motherOf(yong);
  const ji = enemyOf(yong);
  const chou = motherOf(ji);
  const roles = { [yong]: '用', [xi]: '喜', [ji]: '忌', [chou]: '仇' } as Partial<Record<WuXing, XiJi>>;
  return Object.fromEntries(ELEMENTS.map((e) => [e, roles[e] ?? '闲'])) as Record<WuXing, XiJi>;
}

/** Whether each element is favorable: 用, 喜 and 闲 are drawn blue, 忌 and 仇 red. */
export function favorable(chart: Bazi): Record<WuXing, boolean> {
  const roles = xiJi(chart);
  return Object.fromEntries(ELEMENTS.map((e) => [e, roles[e] !== '忌' && roles[e] !== '仇'])) as Record<WuXing, boolean>;
}

// ── The flows (SPEC §5.3) ────────────────────────────────────────────────────────────────────────────────────
// Five levels, coarse to fine: 0 大运, 1 流年, 2 流月, 3 流日, 4 流时. `chosen` holds what is chosen at each level from
// the top: a 大运 index, a 公历 year, a month (0 = 寅月 from 立春), a day (counted from the month's 节), a 时辰 (0–12).
// `level` is the level the 流运 grid lists, never deeper than the first one not chosen.

export const LEVEL_NAMES = ['大运', '流年', '流月', '流日', '流时'] as const;

export interface Flows {
  chosen: readonly number[];
  level: number;
}

export const NO_FLOWS: Flows = Object.freeze({ chosen: [], level: 0 });

export interface FlowItem {
  level: number;
  /** What choosing this item sets the level's choice to */
  value: number;
  /** The first line of its cell and column header: an age, a 节, a 时辰; empty for a day */
  big: string;
  /** The second: a year, a date (day/month), the hours */
  small: string;
  pillar: Pillar;
  /**
   * 流年 only, in the year its 大运 starts in: how much of that 流年 (立春 to 立春) passes before 交运, from 0 to 1. That
   * part of its cell is drawn gray.
   */
  jiaoYun?: number;
}

/** Month m's 节 of the 流年 `year`, and when it falls (小寒 falls in the January after it). */
function jieOf(year: number, m: number): { name: string; solar: Solar } {
  const jie = Solar.fromYmd(m === 11 ? year + 1 : year, m === 11 ? 1 : m + 2, 20).getLunar().getPrevJie();
  if (jie.getName() !== JIE_NAMES[m]) throw new Error(`expected ${JIE_NAMES[m]} before the 20th, found ${jie.getName()}`);
  return { name: jie.getName(), solar: jie.getSolar() };
}

/** The days of month m of a 流年: from the date of its 节 up to the day before the next 节. */
function monthDays(year: number, m: number): Solar[] {
  const first = dayOf(jieOf(year, m).solar);
  const end = dayOf(m === 11 ? jieOf(year + 1, 0).solar : jieOf(year, m + 1).solar);
  return Array.from({ length: end.subtract(first) }, (_, i) => first.next(i));
}

const dayMonth = (s: Solar) => `${s.getDay()}/${s.getMonth()}`;

export function daYunItems(chart: Bazi): FlowItem[] {
  return chart.daYun.map((d) => ({
    level: 0, value: d.index, big: String(d.startYear - chart.birthYear), small: String(d.startYear), pillar: d.pillar,
  }));
}

/**
 * How much of the 流年 a 大运 starts in passes before its 交运, from 0 to 1. The first 大运 starts on the day 起运 gives,
 * each later one ten years on; the 流年 runs from its 立春 to the next.
 */
function jiaoYunPart(chart: Bazi, daYun: number): number {
  const [y, m, d] = chart.yun.start.split(/[- :]/).map(Number);
  const day = Solar.fromYmd(y, m, d).nextYear(10 * daYun);
  const year = chart.daYun[daYun].startYear;
  const from = dayOf(jieOf(year, 0).solar);
  const part = day.subtract(from) / dayOf(jieOf(year + 1, 0).solar).subtract(from);
  return Math.min(1, Math.max(0, part));
}

export function yearItems(chart: Bazi, daYun: number): FlowItem[] {
  const { startYear, endYear } = chart.daYun[daYun];
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => {
    const year = startYear + i;
    return {
      level: 1, value: year, big: String(year - chart.birthYear), small: String(year),
      pillar: pillarOf(yearGanZhi(year), chart.dayMaster), ...(year === startYear && { jiaoYun: jiaoYunPart(chart, daYun) }),
    };
  });
}

export function monthItems(chart: Bazi, year: number): FlowItem[] {
  const yearStem = stemOf(yearGanZhi(year));
  return JIE_NAMES.map((_, m) => {
    const { name, solar } = jieOf(year, m);
    return { level: 2, value: m, big: name, small: dayMonth(solar), pillar: pillarOf(monthGanZhi(yearStem, m), chart.dayMaster) };
  });
}

export function dayItems(chart: Bazi, year: number, month: number): FlowItem[] {
  return monthDays(year, month).map((solar, i) => ({
    level: 3, value: i, big: '', small: dayMonth(solar), pillar: pillarOf(solar.getLunar().getDayInGanZhi(), chart.dayMaster),
  }));
}

/**
 * The thirteen 时辰 of a day: 子 0 - 1, 丑 1 - 3 … 亥 21 - 23, then 子 23 - 24, which takes the next day's 子时 stem
 * (五鼠遁 from the next 日干).
 */
export function hourItems(chart: Bazi, year: number, month: number, day: number): FlowItem[] {
  const date = monthDays(year, month)[day];
  return Array.from({ length: 13 }, (_, i) => {
    const from = i === 0 ? 0 : 2 * i - 1;
    const to = i === 0 ? 1 : i === 12 ? 24 : 2 * i + 1;
    const solar = Solar.fromYmdHms(date.getYear(), date.getMonth(), date.getDay(), from, 0, 0);
    return {
      level: 4, value: i, big: BRANCHES[i % 12], small: `${from} - ${to}`,
      pillar: pillarOf(solar.getLunar().getTimeInGanZhi(), chart.dayMaster),
    };
  });
}

/** The items listed at a level, for what is chosen above it. */
export function itemsAt(chart: Bazi, level: number, chosen: readonly number[]): FlowItem[] {
  switch (level) {
    case 0: return daYunItems(chart);
    case 1: return yearItems(chart, chosen[0]);
    case 2: return monthItems(chart, chosen[1]);
    case 3: return dayItems(chart, chosen[1], chosen[2]);
    default: return hourItems(chart, chosen[1], chosen[2], chosen[3]);
  }
}

/**
 * The flow columns, coarse to fine: 大运 and 流年 always, and every further level down to the one the grid lists or
 * the last one chosen. Each holds its chosen item, or null.
 */
export function flowColumns(chart: Bazi, flows: Flows): { level: number; item: FlowItem | null }[] {
  const last = Math.max(1, flows.level, flows.chosen.length - 1);
  return Array.from({ length: last + 1 }, (_, level) => ({
    level,
    item: level < flows.chosen.length
      ? itemsAt(chart, level, flows.chosen).find((i) => i.value === flows.chosen[level]) ?? null
      : null,
  }));
}

/** Choosing an item: what was chosen below its level goes, and the grid lists the next level. */
export function choose(flows: Flows, level: number, value: number): Flows {
  if (level > flows.chosen.length) return flows;
  return { chosen: [...flows.chosen.slice(0, level), value], level: Math.min(level + 1, LEVEL_NAMES.length - 1) };
}

/** Tapping a chosen column, or the one the grid lists: the grid lists its level again, and nothing is dropped. */
export const showLevel = (flows: Flows, level: number): Flows =>
  level <= flows.chosen.length ? { chosen: flows.chosen, level } : flows;

/** ⊗: clears a level and the ones below it, and the grid lists that level. */
export const clearFrom = (flows: Flows, level: number): Flows => ({ chosen: flows.chosen.slice(0, level), level });

/** The 大运 a year falls in, or -1 outside the chart's ten. */
const daYunOf = (chart: Bazi, year: number) => chart.daYun.findIndex((d) => year >= d.startYear && year <= d.endYear);

/**
 * The strip's ^ and ˅: steps what is chosen at the level above the listed one, into the next 大运, year or month
 * when it runs out, and drops what was chosen at the listed level and below. It stops at the chart's ends: the first
 * 大运's first year and the last 大运's last.
 */
export function step(chart: Bazi, flows: Flows, delta: 1 | -1): Flows {
  const c = flows.chosen;
  const inChart = (year: number) => daYunOf(chart, year) >= 0;
  let next: number[] | null = null;
  switch (flows.level - 1) {
    case 0: {
      const i = c[0] + delta;
      if (i >= 0 && i < chart.daYun.length) next = [i];
      break;
    }
    case 1: {
      const year = c[1] + delta;
      if (inChart(year)) next = [daYunOf(chart, year), year];
      break;
    }
    case 2: {
      const m = mod(c[2] + delta, 12);
      const year = c[1] + (c[2] + delta > 11 ? 1 : c[2] + delta < 0 ? -1 : 0);
      if (inChart(year)) next = [daYunOf(chart, year), year, m];
      break;
    }
    case 3: {
      let [year, m, d] = [c[1], c[2], c[3] + delta];
      if (d < 0 || d >= monthDays(year, m).length) {
        year += m + delta > 11 ? 1 : m + delta < 0 ? -1 : 0;
        m = mod(m + delta, 12);
        if (!inChart(year)) break;
        d = delta < 0 ? monthDays(year, m).length - 1 : 0;
      }
      next = [daYunOf(chart, year), year, m, d];
      break;
    }
  }
  return next ? { chosen: next, level: flows.level } : flows;
}

/**
 * What the strip right of the grid says about the level above the listed one, one line each: the 大运's ages
 * (25 | 34 岁), the 流年's age (30 岁), the 流月's 节 (立 冬), the 流日's date (24 / 11). Null for the 大运 grid.
 */
export function stripLines(chart: Bazi, flows: Flows): string[] | null {
  const c = flows.chosen;
  switch (flows.level) {
    case 0: return null;
    case 1: {
      const d = chart.daYun[c[0]];
      return [String(d.startYear - chart.birthYear), '|', String(d.endYear - chart.birthYear), '岁'];
    }
    case 2: return [String(c[1] - chart.birthYear), '岁'];
    case 3: return [...JIE_NAMES[c[2]]];
    default: {
      const day = monthDays(c[1], c[2])[c[3]];
      return [String(day.getDay()), '/', String(day.getMonth())];
    }
  }
}
