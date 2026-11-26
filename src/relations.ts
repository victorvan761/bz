// 刑冲会合 (SPEC §6): the lines the 关系 view draws between the chart's columns, stems above the pillars and branches
// below, each with its label: 冲, 刑, 合水(才)不化 … Pure, like the engine.
import {
  BRANCH_ELEMENT, GENERATES, HIDDEN, STEM_ELEMENT, shiShen,
  type Branch, type ShiShen, type Stem, type WuXing,
} from './bazi';

/** One column of the chart as the relations see it. */
export interface RelColumn {
  /** Its place in the order of lines: 年 0, 月 1, 日 2, 时 3, 大运 4, 流年 5, 流月 6, 流日 7, 流时 8 */
  order: number;
  stem: Stem;
  branch: Branch;
}

export type LineKind = '冲' | '刑' | '三刑' | '合' | '三合' | '半合' | '三会' | '拱' | '暗合';

/** A character a line joins, and the column it stands in (its index among the columns given). */
export interface Member {
  col: number;
  char: Stem | Branch;
}

/**
 * A line's label: its word, and for a combination the element it turns into (化神), that element's 十神 against
 * the day master, and whether it turns (成化 or 不化). '合水(才)不化'.
 */
export interface Label {
  word: string;
  element?: WuXing;
  god?: ShiShen;
  result?: '成化' | '不化';
}

export interface Line {
  level: 'stem' | 'branch';
  kind: LineKind;
  /** Left to right, by column */
  members: Member[];
  label: Label;
}

export interface Relations {
  /** Top to bottom, in the order of SPEC §6.2 */
  stemLines: Line[];
  branchLines: Line[];
}

// ── The tables ───────────────────────────────────────────────────────────────────────────────────────────────

/** 天干五合 and what each turns into. */
const STEM_HE: Readonly<Record<string, WuXing>> = { 甲己: '土', 乙庚: '金', 丙辛: '水', 丁壬: '木', 戊癸: '火' };
/** 天干相冲 */
const STEM_CHONG = ['甲庚', '乙辛', '丙壬', '丁癸'];
/** 地支六合: 午未 turns into 火, as 十三行八字 labels it */
const BRANCH_HE: Readonly<Record<string, WuXing>> = { 子丑: '土', 寅亥: '木', 卯戌: '火', 辰酉: '金', 巳申: '水', 午未: '火' };
/** 地支六冲 */
const BRANCH_CHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
/** 三合局: the middle branch is the 帝旺, which a 半合 must hold; the two ends without it 拱 it. */
const SAN_HE: readonly (readonly [string, WuXing])[] = [['申子辰', '水'], ['亥卯未', '木'], ['寅午戌', '火'], ['巳酉丑', '金']];
/** 三会方局 */
const SAN_HUI: readonly (readonly [string, WuXing])[] = [['寅卯辰', '木'], ['巳午未', '火'], ['申酉戌', '金'], ['亥子丑', '水']];
/** 三刑: all three, or any two of them */
const SAN_XING = ['寅巳申', '丑戌未'];
/** 无礼之刑 */
const ZI_MAO = '子卯';
/** 自刑: the same branch twice */
const ZI_XING = '辰午酉亥';
/** 地支暗合: their main hidden stems combine */
const AN_HE = ['寅丑', '卯申', '午亥'];

/** The order of kinds among lines of the same later column (SPEC §6.2). */
const KIND_ORDER: readonly LineKind[] = ['冲', '刑', '三刑', '合', '三合', '半合', '三会', '拱', '暗合'];

/** The natal 年 and 时 never relate (SPEC §6.1): their orders. */
const YEAR = 0;
const HOUR = 3;

/** The 化神's stem whose 十神 the label names: the yang one for a stem 合, the yin one for a branch combination. */
const YANG_STEM: Readonly<Record<WuXing, Stem>> = { 木: '甲', 火: '丙', 土: '戊', 金: '庚', 水: '壬' };
const YIN_STEM: Readonly<Record<WuXing, Stem>> = { 木: '乙', 火: '丁', 土: '己', 金: '辛', 水: '癸' };

/** The table's key for two characters in either order, or undefined. */
const pairIn = (keys: Iterable<string>, a: string, b: string): string | undefined => {
  for (const k of keys) if (k === a + b || k === b + a) return k;
  return undefined;
};

// ── Labels ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Whether a combination turns into its element (成化) or not (不化): it does when the month branch holds that
 * element among its hidden stems, or the month branch's own element produces it.
 */
export function transforms(element: WuXing, monthBranch: Branch): boolean {
  return HIDDEN[monthBranch].some((s) => STEM_ELEMENT[s] === element) || GENERATES[BRANCH_ELEMENT[monthBranch]] === element;
}

function huaLabel(word: string, element: WuXing, level: Line['level'], dayMaster: Stem, monthBranch: Branch, withResult = true): Label {
  const god = shiShen(dayMaster, (level === 'stem' ? YANG_STEM : YIN_STEM)[element]);
  return withResult ? { word, element, god, result: transforms(element, monthBranch) ? '成化' : '不化' } : { word, element, god };
}

/** The label as text: '合水(才)不化', or without the 十神 for the 藏干 and 五行 modes: '合水不化'. */
export function labelText(label: Label, withGod = true): string {
  return `${label.word}${label.element ?? ''}${withGod && label.god ? `(${label.god})` : ''}${label.result ?? ''}`;
}

// ── Lines ────────────────────────────────────────────────────────────────────────────────────────────────────

/** Every pair of columns that may relate, left one first: all but the natal 年 and 时. */
function* pairsOf(cols: readonly RelColumn[]): Generator<[number, number]> {
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const orders = [cols[i].order, cols[j].order];
      if (orders.includes(YEAR) && orders.includes(HOUR)) continue;
      yield [i, j];
    }
  }
}

function stemLinesOf(cols: readonly RelColumn[], dayMaster: Stem, monthBranch: Branch): Line[] {
  const lines: Line[] = [];
  for (const [i, j] of pairsOf(cols)) {
    const a = cols[i].stem;
    const b = cols[j].stem;
    const members = [{ col: i, char: a }, { col: j, char: b }];
    const he = pairIn(Object.keys(STEM_HE), a, b);
    if (he) lines.push({ level: 'stem', kind: '合', members, label: huaLabel('合', STEM_HE[he], 'stem', dayMaster, monthBranch) });
    if (pairIn(STEM_CHONG, a, b)) lines.push({ level: 'stem', kind: '冲', members, label: { word: '冲' } });
  }
  return lines;
}

/** Whether the columns at `at` hold every branch of a group. */
const holdsAll = (cols: readonly RelColumn[], at: readonly number[], branches: string) =>
  [...branches].every((b) => at.some((i) => cols[i].branch === b));

/**
 * The columns a whole group joins: every column holding one of its branches, if all of them stand somewhere; else
 * null. Like a pair, a group never joins the natal 年 and 时: it leaves out the 时 if it stays whole without it, else
 * the 年, and isn't whole if it needs both.
 */
function wholeGroup(cols: readonly RelColumn[], branches: string): number[] | null {
  const at = cols.flatMap((c, i) => (branches.includes(c.branch) ? [i] : []));
  if (!holdsAll(cols, at, branches)) return null;
  const year = at.find((i) => cols[i].order === YEAR);
  const hour = at.find((i) => cols[i].order === HOUR);
  if (year === undefined || hour === undefined) return at;
  for (const left of [hour, year]) {
    const rest = at.filter((i) => i !== left);
    if (holdsAll(cols, rest, branches)) return rest;
  }
  return null;
}

function branchLinesOf(cols: readonly RelColumn[], dayMaster: Stem, monthBranch: Branch): Line[] {
  const lines: Line[] = [];
  const add = (kind: LineKind, at: number[], label: Label) =>
    lines.push({ level: 'branch', kind, label, members: at.map((col) => ({ col, char: cols[col].branch })) });

  // Whole groups of three first. A whole 三合 or 三刑 replaces the pair lines among the columns it joins.
  const whole = new Map<string, number[]>();
  const inWhole = (branches: string, i: number, j: number) => {
    const at = whole.get(branches);
    return at !== undefined && at.includes(i) && at.includes(j);
  };
  for (const [branches, element] of SAN_HE) {
    const at = wholeGroup(cols, branches);
    if (at) {
      whole.set(branches, at);
      add('三合', at, huaLabel('三合', element, 'branch', dayMaster, monthBranch));
    }
  }
  for (const [branches, element] of SAN_HUI) {
    const at = wholeGroup(cols, branches);
    if (at) add('三会', at, huaLabel('三会', element, 'branch', dayMaster, monthBranch));
  }
  for (const branches of SAN_XING) {
    const at = wholeGroup(cols, branches);
    if (at) {
      whole.set(branches, at);
      add('三刑', at, { word: '三刑' });
    }
  }

  for (const [i, j] of pairsOf(cols)) {
    const a = cols[i].branch;
    const b = cols[j].branch;
    const pair = (kind: LineKind, label: Label) => add(kind, [i, j], label);
    if (a === b) {
      if (ZI_XING.includes(a)) pair('刑', { word: '刑' });
      continue;
    }
    if (pairIn(BRANCH_CHONG, a, b)) pair('冲', { word: '冲' });
    const he = pairIn(Object.keys(BRANCH_HE), a, b);
    if (he) pair('合', huaLabel('合', BRANCH_HE[he], 'branch', dayMaster, monthBranch));
    for (const [branches, element] of SAN_HE) {
      if (inWhole(branches, i, j) || !branches.includes(a) || !branches.includes(b)) continue;
      if (a === branches[1] || b === branches[1]) pair('半合', huaLabel('半合', element, 'branch', dayMaster, monthBranch));
      else pair('拱', huaLabel('拱', element, 'branch', dayMaster, monthBranch, false));
    }
    if (pairIn([ZI_MAO], a, b)) pair('刑', { word: '刑' });
    for (const branches of SAN_XING) {
      if (!inWhole(branches, i, j) && branches.includes(a) && branches.includes(b)) pair('刑', { word: '刑' });
    }
    if (pairIn(AN_HE, a, b)) pair('暗合', { word: '暗合' });
  }
  return lines;
}

/**
 * Top to bottom (SPEC §6.2): by the later of the columns a line joins, counting 年 月 日 时 大运 流年 流月 流日 流时;
 * then by kind; then by the earlier column.
 */
function sorted(lines: Line[], cols: readonly RelColumn[]): Line[] {
  const orders = (l: Line) => l.members.map((m) => cols[m.col].order);
  const later = (l: Line) => Math.max(...orders(l));
  const earlier = (l: Line) => Math.min(...orders(l));
  return lines.sort((a, b) => later(a) - later(b) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || earlier(a) - earlier(b));
}

/** The lines among columns given left to right, judged against the natal day master and month branch. */
export function analyze(cols: readonly RelColumn[], dayMaster: Stem, monthBranch: Branch): Relations {
  return {
    stemLines: sorted(stemLinesOf(cols, dayMaster, monthBranch), cols),
    branchLines: sorted(branchLinesOf(cols, dayMaster, monthBranch), cols),
  };
}
