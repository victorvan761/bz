// The engine: castBazi turns a birth minute and a gender into the whole 八字 chart (SPEC §4), and the flow lists
// (大运 流年 流月 流日 流时) give the columns the flow panel can add to it (SPEC §5).
// It is pure: no clock reads, no DOM, no React. Every value is the Chinese term the chart shows.
//
// Top to bottom: the chart's shape, the tables, the lookups, castBazi, then the flows.
import { LunarUtil, Solar } from 'lunar-typescript';
import { MAX_YEAR, MIN_YEAR, type BirthTime } from './time';

// ── The chart ────────────────────────────────────────────────────────────────────────────────────────────────

export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水';
export type Gender = '男' | '女';
/** 十神, one character each, as 十三行八字 writes them beside a stem: 比 劫 食 伤 才 财 杀 官 卩 印 */
export type ShiShen = '比' | '劫' | '食' | '伤' | '才' | '财' | '杀' | '官' | '卩' | '印';
/** The five 十神 groups, by the character a combination's label names its 化神 with: 合财成化, 半合伤成化 */
export type Group = '比' | '伤' | '财' | '官' | '印';

/** The two calendar choices 十三行八字 offers. The input screen sets the first; the second is fixed. */
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
  /** 0 is 童限, the years before the first 大运; 1–10 are the 大运 */
  index: number;
  /** Null for 童限 */
  pillar: Pillar | null;
  startYear: number;
  endYear: number;
}

export interface Bazi {
  /** The minute the chart was cast for, Beijing wall-clock time */
  time: BirthTime;
  gender: Gender;
  settings: Settings;
  /** 乾造 for a man, 坤造 for a woman */
  qianKun: '乾造' | '坤造';
  /** '2008年4月18日 18:00' */
  solarText: string;
  /** '戊子年 三月十三 酉时' */
  lunarText: string;
  /** 生肖 of the 年柱: '鼠' */
  zodiac: string;
  dayMaster: Stem;
  pillars: Record<PillarKey, Pillar>;
  /** 胎元 命宫 身宫, as 干支 */
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  /** The 节 before and after the birth, with their times 'YYYY-MM-DD HH:mm' */
  jie: { prev: { name: string; time: string }; next: { name: string; time: string } };
  /** 起运: how long after birth the first 大运 starts (precise: 3 days to a year), and when */
  yun: { forward: boolean; years: number; months: number; days: number; hours: number; start: string };
  /** 童限 (when it has years) and ten 大运 */
  daYun: DaYun[];
  /** The 公历 year of birth: ages count from it, as 十三行八字 shows them (2020 − 2008 = 12) */
  birthYear: number;
}

// ── The tables ───────────────────────────────────────────────────────────────────────────────────────────────

export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

/** The 60 干支 in cycle order: 甲子, 乙丑 … 癸亥. */
export const SIXTY: readonly string[] = Array.from({ length: 60 }, (_, n) => STEMS[n % 10] + BRANCHES[n % 12]);

export const STEM_ELEMENT: Readonly<Record<Stem, WuXing>> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export const BRANCH_ELEMENT: Readonly<Record<Branch, WuXing>> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 藏干, 本气 first. */
export const HIDDEN: Readonly<Record<Branch, readonly Stem[]>> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'],
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

/** The 十神 group of an element for a day master: what a combination that turns into it is named after. */
export function group(day: Stem, element: WuXing): Group {
  const d = STEM_ELEMENT[day];
  if (element === d) return '比';
  if (GENERATES[d] === element) return '伤';
  if (CONTROLS[d] === element) return '财';
  if (CONTROLS[element] === d) return '官';
  return '印';
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
    naYin: LunarUtil.NAYIN[ganZhi],
    xingYun: stage(dayMaster, branch),
    ziZuo: stage(stem, branch),
    kong: xunKong(ganZhi),
  };
}

/** The 干支 of a 公历 year's 流年, which starts at that year's 立春: 2020 → 庚子. */
export const yearGanZhi = (year: number): string => SIXTY[mod(year - 4, 60)];

/** The 干支 of month m (0 = 寅月 … 11 = 丑月) of a 流年, by 五虎遁 from the year's stem. */
export function monthGanZhi(yearStem: Stem, m: number): string {
  const first = ((STEMS.indexOf(yearStem) % 5) * 2 + 2) % 10;
  return STEMS[(first + m) % 10] + BRANCHES[(2 + m) % 12];
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateText = (s: Solar) => `${s.getYear()}-${pad(s.getMonth())}-${pad(s.getDay())}`;
const minuteText = (s: Solar) => `${dateText(s)} ${pad(s.getHour())}:${pad(s.getMinute())}`;

// ── castBazi ─────────────────────────────────────────────────────────────────────────────────────────────────

/** How many 大运 the chart lists after 童限. */
export const DA_YUN_COUNT = 10;

/** The 时辰 a clock hour falls in: 0 = 子 (23:00–00:59) … 11 = 亥. */
export const shiChenIndex = (hour: number): number => Math.floor((hour + 1) / 2) % 12;

/**
 * The chart for a birth minute, read as Beijing wall-clock time with no 真太阳时 correction. 年柱 and 月柱 switch
 * at the exact 立春 and 节 instants; 日柱 follows `settings.lateZi` from 23:00.
 */
export function castBazi(time: BirthTime, gender: Gender, settings: Settings = DEFAULTS): Bazi {
  const { year, month, day, hour, minute } = time;
  if (year < MIN_YEAR || year > MAX_YEAR) throw new RangeError(`year ${year} is outside ${MIN_YEAR}–${MAX_YEAR}`);
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(settings.lateZi === 'next' ? 1 : 2);

  const dayMaster = ec.getDayGan() as Stem;
  const pillars: Record<PillarKey, Pillar> = {
    year: pillarOf(ec.getYear(), dayMaster),
    month: pillarOf(ec.getMonth(), dayMaster),
    day: pillarOf(ec.getDay(), dayMaster, true),
    hour: pillarOf(ec.getTime(), dayMaster),
  };

  // 起运, counted to the minute: 3 days to a year, 1 day to 4 months, 2 hours to 10 days.
  const yun = ec.getYun(gender === '男' ? 1 : 0, 2);
  const daYun: DaYun[] = yun
    .getDaYun(DA_YUN_COUNT + 1)
    .map((d) => ({
      index: d.getIndex(),
      pillar: d.getIndex() === 0 ? null : pillarOf(d.getGanZhi(), dayMaster),
      startYear: d.getStartYear(),
      endYear: d.getEndYear(),
    }))
    // 童限 has no years when the first 大运 starts in the year of birth.
    .filter((d) => d.endYear >= d.startYear);

  const prev = lunar.getPrevJie();
  const next = lunar.getNextJie();
  const yearBranch = pillars.year.branch;
  return {
    time,
    gender,
    settings,
    qianKun: gender === '男' ? '乾造' : '坤造',
    solarText: `${year}年${month}月${day}日 ${pad(hour)}:${pad(minute)}`,
    lunarText: `${ec.getYear()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
    zodiac: ZODIAC[BRANCHES.indexOf(yearBranch)],
    dayMaster,
    pillars,
    taiYuan: ec.getTaiYuan(),
    mingGong: ec.getMingGong(),
    shenGong: ec.getShenGong(),
    jie: {
      prev: { name: prev.getName(), time: minuteText(prev.getSolar()) },
      next: { name: next.getName(), time: minuteText(next.getSolar()) },
    },
    yun: {
      forward: yun.isForward(),
      years: yun.getStartYear(),
      months: yun.getStartMonth(),
      days: yun.getStartDay(),
      hours: yun.getStartHour(),
      start: minuteText(yun.getStartSolar()),
    },
    daYun,
    birthYear: year,
  };
}

/** 起运 in words: '4年8个月1天6小时后起运'. Parts that are 0 are left out. */
export function yunText({ years, months, days, hours }: Bazi['yun']): string {
  const parts = [[years, '年'], [months, '个月'], [days, '天'], [hours, '小时']] as const;
  const said = parts.filter(([n]) => n > 0).map(([n, unit]) => `${n}${unit}`).join('');
  return said ? `出生后${said}起运` : '出生即起运';
}

// ── 五行 and 旺衰 ─────────────────────────────────────────────────────────────────────────────────────────────

export const ELEMENTS: readonly WuXing[] = ['木', '火', '土', '金', '水'];

/** How much each hidden stem of a branch weighs: 本气 most. */
const HIDDEN_WEIGHTS: Readonly<Record<number, readonly number[]>> = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };

/**
 * A rough 旺衰 estimate (SPEC §4.4): the seven characters other than the day master, each worth 1, a branch shared
 * among its hidden stems; the month branch counts twice (得令). The day master is 偏强 when 比劫 and 印 hold 55% or
 * more of the 8 points, 偏弱 at 45% or less.
 */
export function strength(bazi: Bazi): { scores: Record<WuXing, number>; support: number; verdict: '偏强' | '中和' | '偏弱' } {
  const scores: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const { year, month, day, hour } = bazi.pillars;
  for (const p of [year, month, hour]) scores[STEM_ELEMENT[p.stem]] += 1;
  for (const p of [year, month, day, hour]) {
    const weight = p === month ? 2 : 1;
    const shares = HIDDEN_WEIGHTS[p.hidden.length];
    p.hidden.forEach((h, i) => (scores[STEM_ELEMENT[h.stem]] += weight * shares[i]));
  }
  const self = STEM_ELEMENT[bazi.dayMaster];
  const mother = ELEMENTS.find((e) => GENERATES[e] === self)!;
  const total = ELEMENTS.reduce((sum, e) => sum + scores[e], 0);
  const support = (scores[self] + scores[mother]) / total;
  for (const e of ELEMENTS) scores[e] = Math.round(scores[e] * 10) / 10;
  return { scores, support, verdict: support >= 0.55 ? '偏强' : support <= 0.45 ? '偏弱' : '中和' };
}

// ── The flows (SPEC §5) ──────────────────────────────────────────────────────────────────────────────────────
// Five levels, coarse to fine: 大运 → 流年 → 流月 → 流日 → 流时. A Pick says which item is chosen at each level;
// the chart shows the chosen items from the panel's level up to 大运, in front of the four pillars.

export type FlowLevel = 'dayun' | 'year' | 'month' | 'day' | 'hour';

/** The panel's tabs, left to right, as 十三行八字 orders them. */
export const LEVELS: readonly FlowLevel[] = ['hour', 'day', 'month', 'year', 'dayun'];
export const LEVEL_NAME: Readonly<Record<FlowLevel, string>> = {
  hour: '流时', day: '流日', month: '流月', year: '流年', dayun: '大运',
};

/** What is chosen at each level. `dayun` indexes Bazi.daYun; `day` counts days from the month's 节. */
export interface Pick {
  dayun: number;
  year: number;
  /** 0 = 寅月 (from 立春) … 11 = 丑月 (from 小寒) */
  month: number;
  day: number;
  /** 0 = 子 … 11 = 亥 */
  hour: number;
}

export interface FlowItem {
  level: FlowLevel;
  /** What choosing this item sets the level's pick to */
  value: number;
  /** Shown large at the card's top right: an age, a 节, a day of the month, an hour */
  big: string;
  /** Shown small under it: a year, a date, a month, an hour range */
  small: string;
  /** The column's name in the chart */
  label: string;
  /** Null for 童限, which has no 干支 */
  pillar: Pillar | null;
}

/** The 公历 date a 节 falls on, and its name: month m's 节 of the 流年 `year` (小寒 falls in January after it). */
function jieDate(year: number, m: number): { name: string; solar: Solar } {
  const jie = Solar.fromYmd(m === 11 ? year + 1 : year, m === 11 ? 1 : m + 2, 20).getLunar().getPrevJie();
  if (jie.getName() !== JIE_NAMES[m]) throw new Error(`expected ${JIE_NAMES[m]} before the 20th, found ${jie.getName()}`);
  return { name: jie.getName(), solar: jie.getSolar() };
}

/** The days of month m of a 流年: from the date of its 节 up to the day before the next 节. */
function monthDays(year: number, m: number): Solar[] {
  const start = jieDate(year, m).solar;
  const end = m === 11 ? jieDate(year + 1, 0).solar : jieDate(year, m + 1).solar;
  const first = Solar.fromYmd(start.getYear(), start.getMonth(), start.getDay());
  const count = Solar.fromYmd(end.getYear(), end.getMonth(), end.getDay()).subtract(first);
  return Array.from({ length: count }, (_, i) => first.next(i));
}

export function daYunItems(bazi: Bazi): FlowItem[] {
  return bazi.daYun.map((d, i) => ({
    level: 'dayun',
    value: i,
    big: String(d.startYear - bazi.birthYear),
    small: String(d.startYear),
    label: d.pillar ? '大运' : '童限',
    pillar: d.pillar,
  }));
}

export function yearItems(bazi: Bazi, dayun: number): FlowItem[] {
  const { startYear, endYear } = bazi.daYun[dayun];
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => {
    const year = startYear + i;
    return {
      level: 'year', value: year, big: String(year - bazi.birthYear), small: String(year), label: '流年',
      pillar: pillarOf(yearGanZhi(year), bazi.dayMaster),
    };
  });
}

export function monthItems(bazi: Bazi, year: number): FlowItem[] {
  const yearStem = stemOf(yearGanZhi(year));
  return JIE_NAMES.map((_, m) => {
    const { name, solar } = jieDate(year, m);
    return {
      level: 'month', value: m, big: name, small: `${solar.getMonth()}/${solar.getDay()}`, label: '流月',
      pillar: pillarOf(monthGanZhi(yearStem, m), bazi.dayMaster),
    };
  });
}

export function dayItems(bazi: Bazi, year: number, month: number): FlowItem[] {
  return monthDays(year, month).map((solar, i) => ({
    level: 'day', value: i, big: String(solar.getDay()), small: `${solar.getMonth()}月`, label: '流日',
    pillar: pillarOf(solar.getLunar().getDayInGanZhi(), bazi.dayMaster),
  }));
}

export function hourItems(bazi: Bazi, year: number, month: number, day: number): FlowItem[] {
  const date = monthDays(year, month)[day];
  return Array.from({ length: 12 }, (_, i) => {
    const from = mod(2 * i - 1, 24);
    const solar = Solar.fromYmdHms(date.getYear(), date.getMonth(), date.getDay(), i === 0 ? 0 : from, 0, 0);
    return {
      level: 'hour', value: i, big: pad(from), small: `${pad(from)}–${pad((from + 2) % 24)}`, label: '流时',
      pillar: pillarOf(solar.getLunar().getTimeInGanZhi(), bazi.dayMaster),
    };
  });
}

/** The items the panel lists at a level, for what is picked at the levels above it. */
export function itemsAt(bazi: Bazi, level: FlowLevel, pick: Pick): FlowItem[] {
  switch (level) {
    case 'dayun': return daYunItems(bazi);
    case 'year': return yearItems(bazi, pick.dayun);
    case 'month': return monthItems(bazi, pick.year);
    case 'day': return dayItems(bazi, pick.year, pick.month);
    case 'hour': return hourItems(bazi, pick.year, pick.month, pick.day);
  }
}

const PICK_KEY: Readonly<Record<FlowLevel, keyof Pick>> = { dayun: 'dayun', year: 'year', month: 'month', day: 'day', hour: 'hour' };

/** The item chosen at a level. */
export function chosenAt(bazi: Bazi, level: FlowLevel, pick: Pick): FlowItem {
  const items = itemsAt(bazi, level, pick);
  return items.find((item) => item.value === pick[PICK_KEY[level]]) ?? items[0];
}

/** The flow columns the chart shows in front of the four pillars, left to right: the panel's level up to 大运. */
export function flowColumns(bazi: Bazi, level: FlowLevel, pick: Pick): FlowItem[] {
  return LEVELS.slice(LEVELS.indexOf(level)).map((l) => chosenAt(bazi, l, pick));
}

/** The 大运 a year falls in: the one whose years hold it, else the first or the last. */
function daYunOf(bazi: Bazi, year: number): number {
  const i = bazi.daYun.findIndex((d) => year >= d.startYear && year <= d.endYear);
  return i >= 0 ? i : year < bazi.daYun[0].startYear ? 0 : bazi.daYun.length - 1;
}

/** A pick with every level inside the lists above it: the year inside its 大运, the day inside its month. */
function settle(bazi: Bazi, pick: Pick): Pick {
  const dy = bazi.daYun[Math.min(Math.max(pick.dayun, 0), bazi.daYun.length - 1)];
  const dayun = bazi.daYun.indexOf(dy);
  const year = Math.min(Math.max(pick.year, dy.startYear), dy.endYear);
  const month = Math.min(Math.max(pick.month, 0), 11);
  const days = monthDays(year, month).length;
  return { dayun, year, month, day: Math.min(Math.max(pick.day, 0), days - 1), hour: Math.min(Math.max(pick.hour, 0), 11) };
}

/** The pick after choosing an item at a level. Choosing a 大运 keeps the year if it is one of that 大运's. */
export function choose(bazi: Bazi, pick: Pick, level: FlowLevel, value: number): Pick {
  if (level === 'dayun') {
    const dy = bazi.daYun[value];
    const year = pick.year >= dy.startYear && pick.year <= dy.endYear ? pick.year : dy.startYear;
    return settle(bazi, { ...pick, dayun: value, year });
  }
  return settle(bazi, { ...pick, [PICK_KEY[level]]: value });
}

/**
 * The pick for a moment: its 流年 (the year turns at 立春), 流月 (at each 节), day and 时辰, inside the chart's
 * 大运. A moment before birth or after the last 大运 picks the nearest year the chart has.
 */
export function pickAt(bazi: Bazi, now: BirthTime): Pick {
  const lunar = Solar.fromYmdHms(now.year, now.month, now.day, now.hour, now.minute, 0).getLunar();
  const year = lunar.getYearInGanZhiExact() === yearGanZhi(now.year) ? now.year : now.year - 1;
  const month = mod(BRANCHES.indexOf(lunar.getMonthZhiExact()) - 2, 12);
  const today = `${now.year}-${pad(now.month)}-${pad(now.day)}`;
  const day = Math.max(0, monthDays(year, month).findIndex((s) => dateText(s) === today));
  const first = bazi.daYun[0].startYear;
  const last = bazi.daYun[bazi.daYun.length - 1].endYear;
  const inChart = Math.min(Math.max(year, first), last);
  const pick = { dayun: daYunOf(bazi, inChart), year: inChart, month, day, hour: shiChenIndex(now.hour) };
  // Outside the chart's years, the moment's month and day mean nothing: start that year at its first.
  return settle(bazi, inChart === year ? pick : { ...pick, month: 0, day: 0 });
}
