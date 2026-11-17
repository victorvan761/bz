// 刑冲会合 (SPEC §6): the relations between the chart's columns, as 十三行八字 draws them. Lines join characters
// across columns, stems above the pillars and branches below; pair relations name two whole pillars (伏吟, 反吟,
// 双合, 克会 …); 天地合 marks a pillar whose stem combines with its own branch. Pure, like the engine.
import {
  BRANCH_ELEMENT, CONTROLS, GENERATES, HIDDEN, STEM_ELEMENT, group, isYang, shiShen,
  type Branch, type Stem, type WuXing,
} from './bazi';

/** One column of the chart as the relations see it. */
export interface RelColumn {
  /** What a pair relation calls this column from another: 流年, 大运, 时柱, 日柱, 月柱, 年柱 */
  name: string;
  stem: Stem;
  branch: Branch;
}

/** A piece of a label. The 十神 a combination turns into is drawn in its element's color. */
export interface Part {
  text: string;
  element?: WuXing;
}

export type LineKind = '合' | '冲' | '三合' | '半合' | '拱' | '三会' | '三刑' | '刑' | '自刑' | '暗合';

export interface Member {
  col: number;
  char: Stem | Branch;
  element: WuXing;
}

export interface Line {
  level: 'stem' | 'branch';
  kind: LineKind;
  parts: Part[];
  /** Left to right, by column */
  members: Member[];
  /** How many pairs this line stands for: one character with several columns of the same other character */
  count: number;
  /** 冲: the column of the character under attack, which the arrow points at */
  toward?: number;
}

export interface PairRelation {
  /** The left column, which the relation is listed under */
  col: number;
  /** The other column, to the right */
  other: number;
  /** 伏吟, 反吟, 双合, or a stem relation then a branch relation: 克会, 合刑, 同会 … */
  name: string;
  /** The other column is named first when its stem overcomes this one's: 月柱 克会 */
  otherFirst: boolean;
}

export interface Relations {
  /** Sorted from the pillars outward: the rightmost first */
  stemLines: Line[];
  branchLines: Line[];
  pairs: PairRelation[];
  /** Columns whose stem combines with their branch's 本气: 天地合 */
  selfCombined: number[];
}

// ── The tables ───────────────────────────────────────────────────────────────────────────────────────────────

/** 天干五合 and what each turns into. */
const STEM_HE: Readonly<Record<string, WuXing>> = { 甲己: '土', 乙庚: '金', 丙辛: '水', 丁壬: '木', 戊癸: '火' };
/** 天干相冲: the first is the one attacked. */
const STEM_CHONG = ['甲庚', '乙辛', '丙壬', '丁癸'];
/** 地支六合 */
const BRANCH_HE: Readonly<Record<string, WuXing>> = { 子丑: '土', 寅亥: '木', 卯戌: '火', 辰酉: '金', 巳申: '水', 午未: '土' };
/** 地支六冲 */
const BRANCH_CHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
/** 三合局: the middle branch is the 帝旺, which a 半合 must hold; the two ends 拱 it. */
const SAN_HE: readonly (readonly [string, WuXing])[] = [['申子辰', '水'], ['亥卯未', '木'], ['寅午戌', '火'], ['巳酉丑', '金']];
/** 三会方局 */
const SAN_HUI: readonly (readonly [string, WuXing])[] = [['寅卯辰', '木'], ['巳午未', '火'], ['申酉戌', '金'], ['亥子丑', '水']];
/** 三刑: all three, or any two of them */
const SAN_XING: readonly (readonly [string, string])[] = [['寅巳申', '无恩之刑'], ['丑戌未', '恃势之刑']];
const ZI_MAO = '子卯';
/** 自刑: the same branch twice */
const ZI_XING = '辰午酉亥';
/** 地支暗合: their main hidden stems combine */
const AN_HE = ['寅丑', '卯申', '午亥'];

/** The table's key for two characters in either order, or undefined. */
const pairIn = (keys: Iterable<string>, a: string, b: string): string | undefined => {
  for (const k of keys) if (k === a + b || k === b + a) return k;
  return undefined;
};

/**
 * Whether a combination turns into its element (成化) or not (不化): it does when the month branch holds that
 * element among its hidden stems, or the month branch's own element produces it (SPEC §6.3).
 */
export function transforms(element: WuXing, monthBranch: Branch): boolean {
  return HIDDEN[monthBranch].some((s) => STEM_ELEMENT[s] === element) || GENERATES[BRANCH_ELEMENT[monthBranch]] === element;
}

const huaParts = (word: string, element: WuXing, dayMaster: Stem, monthBranch: Branch): Part[] => [
  { text: word },
  { text: group(dayMaster, element), element },
  { text: transforms(element, monthBranch) ? '成化' : '不化' },
];

// ── Lines ────────────────────────────────────────────────────────────────────────────────────────────────────

const stemMember = (cols: readonly RelColumn[], col: number): Member =>
  ({ col, char: cols[col].stem, element: STEM_ELEMENT[cols[col].stem] });
const branchMember = (cols: readonly RelColumn[], col: number): Member =>
  ({ col, char: cols[col].branch, element: BRANCH_ELEMENT[cols[col].branch] });

/** Every pair of columns, left one first. */
function* pairsOf(n: number): Generator<[number, number]> {
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) yield [i, j];
}

function stemLinesOf(cols: readonly RelColumn[], dayMaster: Stem, monthBranch: Branch): Line[] {
  const lines: Line[] = [];
  for (const [i, j] of pairsOf(cols.length)) {
    const a = cols[i].stem;
    const b = cols[j].stem;
    const members = [stemMember(cols, i), stemMember(cols, j)];
    const he = pairIn(Object.keys(STEM_HE), a, b);
    if (he) lines.push({ level: 'stem', kind: '合', parts: huaParts('合', STEM_HE[he], dayMaster, monthBranch), members, count: 1 });
    const chong = pairIn(STEM_CHONG, a, b);
    if (chong) lines.push({ level: 'stem', kind: '冲', parts: [{ text: '冲' }], members, count: 1, toward: a === chong[0] ? i : j });
  }
  return lines;
}

/** The columns holding each branch of a group, or null if one of them is missing. */
function groupColumns(cols: readonly RelColumn[], branches: string): number[][] | null {
  const at = [...branches].map((b) => cols.flatMap((c, i) => (c.branch === b ? [i] : [])));
  return at.every((list) => list.length > 0) ? at : null;
}

function branchLinesOf(cols: readonly RelColumn[], dayMaster: Stem, monthBranch: Branch): Line[] {
  const lines: Line[] = [];
  const whole = (kind: LineKind, parts: Part[], at: number[][]) =>
    lines.push({ level: 'branch', kind, parts, count: 1, members: at.flat().sort((x, y) => x - y).map((c) => branchMember(cols, c)) });

  // Whole groups of three come first; a group that is whole isn't also counted in pairs.
  const wholeSanHe = new Set<string>();
  for (const [branches, element] of SAN_HE) {
    const at = groupColumns(cols, branches);
    if (at) { wholeSanHe.add(branches); whole('三合', huaParts('三合', element, dayMaster, monthBranch), at); }
  }
  for (const [branches, element] of SAN_HUI) {
    const at = groupColumns(cols, branches);
    if (at) whole('三会', huaParts('三会', element, dayMaster, monthBranch), at);
  }
  const wholeSanXing = new Set<string>();
  for (const [branches] of SAN_XING) {
    const at = groupColumns(cols, branches);
    if (at) { wholeSanXing.add(branches); whole('三刑', [{ text: '三刑' }], at); }
  }

  for (const [i, j] of pairsOf(cols.length)) {
    const a = cols[i].branch;
    const b = cols[j].branch;
    const members = [branchMember(cols, i), branchMember(cols, j)];
    const pair = (kind: LineKind, parts: Part[], toward?: number) =>
      lines.push({ level: 'branch', kind, parts, members, count: 1, ...(toward === undefined ? {} : { toward }) });

    if (a === b) {
      if (ZI_XING.includes(a)) pair('自刑', [{ text: '自刑' }]);
      continue;
    }
    const chong = pairIn(BRANCH_CHONG, a, b);
    if (chong) {
      // The arrow points at the branch whose element the other overcomes: 酉 attacks 卯. 丑未 and 辰戌 are both 土.
      const ea = BRANCH_ELEMENT[a];
      const eb = BRANCH_ELEMENT[b];
      pair('冲', [{ text: '冲' }], CONTROLS[eb] === ea ? i : CONTROLS[ea] === eb ? j : undefined);
    }
    const he = pairIn(Object.keys(BRANCH_HE), a, b);
    if (he) pair('合', huaParts('合', BRANCH_HE[he], dayMaster, monthBranch));
    for (const [branches, element] of SAN_HE) {
      if (wholeSanHe.has(branches) || !branches.includes(a) || !branches.includes(b)) continue;
      const middle = branches[1] as Branch;
      if (a === middle || b === middle) pair('半合', huaParts('半合', element, dayMaster, monthBranch));
      else pair('拱', [{ text: '拱' }, { text: shiShen(dayMaster, HIDDEN[middle][0]), element: BRANCH_ELEMENT[middle] }]);
    }
    if (pairIn([ZI_MAO], a, b)) pair('刑', [{ text: '无礼之刑' }]);
    for (const [branches, name] of SAN_XING) {
      if (!wholeSanXing.has(branches) && branches.includes(a) && branches.includes(b)) pair('刑', [{ text: name }]);
    }
    if (pairIn(AN_HE, a, b)) pair('暗合', [{ text: '暗合' }]);
  }
  return lines;
}

const labelOf = (line: Line) => line.parts.map((p) => p.text).join('');

/**
 * Folds pair lines that share their left character and label and whose right characters are the same: 卯 无礼之刑
 * 子, with 子 in two columns, is one line with a count of 2 (SPEC §6.2).
 */
function fold(lines: Line[]): Line[] {
  const out: Line[] = [];
  const byKey = new Map<string, Line>();
  for (const line of lines) {
    if (line.members.length !== 2) {
      out.push(line);
      continue;
    }
    const [left, right] = line.members;
    const key = `${line.level} ${labelOf(line)} ${left.col} ${right.char} ${line.toward === left.col ? 'L' : line.toward === undefined ? '' : 'R'}`;
    const seen = byKey.get(key);
    if (seen) {
      seen.members.push(right);
      seen.count += 1;
    } else {
      const copy = { ...line, members: [...line.members] };
      byKey.set(key, copy);
      out.push(copy);
    }
  }
  return out;
}

const leftOf = (line: Line) => line.members[0].col;
const rightOf = (line: Line) => line.members[line.members.length - 1].col;

/** From the pillars outward: relations among the rightmost columns sit nearest the pillars. */
const outward = (a: Line, b: Line) => leftOf(b) - leftOf(a) || rightOf(a) - rightOf(b);

// ── Pairs ────────────────────────────────────────────────────────────────────────────────────────────────────

/** How two stems meet: the same, 合, 冲, or 克 (one overcomes the other, both yang or both yin). */
export function stemRelation(a: Stem, b: Stem): '同' | '合' | '冲' | '克' | null {
  if (a === b) return '同';
  if (pairIn(Object.keys(STEM_HE), a, b)) return '合';
  if (pairIn(STEM_CHONG, a, b)) return '冲';
  const ea = STEM_ELEMENT[a];
  const eb = STEM_ELEMENT[b];
  if (isYang(a) === isYang(b) && (CONTROLS[ea] === eb || CONTROLS[eb] === ea)) return '克';
  return null;
}

/** How two branches meet, the strongest first: the same (自刑 for 辰午酉亥), 冲, 合, 会 (半合), 刑. */
export function branchRelation(a: Branch, b: Branch): '同' | '冲' | '合' | '会' | '刑' | null {
  if (a === b) return ZI_XING.includes(a) ? '刑' : '同';
  if (pairIn(BRANCH_CHONG, a, b)) return '冲';
  if (pairIn(Object.keys(BRANCH_HE), a, b)) return '合';
  if (SAN_HE.some(([g]) => g.includes(a) && g.includes(b) && (a === g[1] || b === g[1]))) return '会';
  if (pairIn([ZI_MAO], a, b) || SAN_XING.some(([g]) => g.includes(a) && g.includes(b))) return '刑';
  return null;
}

/** The name 十三行八字 gives two pillars that relate in both stem and branch, or null. */
export function pairName(a: RelColumn, b: RelColumn): string | null {
  const s = stemRelation(a.stem, b.stem);
  const r = branchRelation(a.branch, b.branch);
  if (!s || !r) return null;
  if (s === '同' && r === '同') return '伏吟';
  if ((s === '冲' || s === '克') && r === '冲') return '反吟';
  if (s === '合' && r === '合') return '双合';
  if (r === '同') return null;
  return s + r;
}

function pairsAmong(cols: readonly RelColumn[]): PairRelation[] {
  const out: PairRelation[] = [];
  for (const [i, j] of pairsOf(cols.length)) {
    const name = pairName(cols[i], cols[j]);
    if (!name) continue;
    const s = stemRelation(cols[i].stem, cols[j].stem);
    const otherFirst = (s === '冲' || s === '克') && CONTROLS[STEM_ELEMENT[cols[j].stem]] === STEM_ELEMENT[cols[i].stem];
    out.push({ col: i, other: j, name, otherFirst });
  }
  // Under each column, the pillars nearest the natal chart first.
  return out.sort((x, y) => x.col - y.col || y.other - x.other);
}

/** 天地合: the stem combines with its own branch's 本气 (丁亥 戊子 辛巳 壬午). */
export const selfCombines = (c: RelColumn): boolean => pairIn(Object.keys(STEM_HE), c.stem, HIDDEN[c.branch][0]) !== undefined;

// ── All of it ────────────────────────────────────────────────────────────────────────────────────────────────

/** The relations among columns given left to right, judged against the natal day master and month branch. */
export function analyze(cols: readonly RelColumn[], dayMaster: Stem, monthBranch: Branch): Relations {
  return {
    stemLines: fold(stemLinesOf(cols, dayMaster, monthBranch)).sort(outward),
    branchLines: fold(branchLinesOf(cols, dayMaster, monthBranch)).sort(outward),
    pairs: pairsAmong(cols),
    selfCombined: cols.flatMap((c, i) => (selfCombines(c) ? [i] : [])),
  };
}

// ── A flow card's list ───────────────────────────────────────────────────────────────────────────────────────

export type CardEntry =
  | { type: 'pair'; name: string; other: string; otherFirst: boolean }
  | { type: 'self'; name: '天地合' }
  | { type: 'line'; level: 'stem' | 'branch'; kind: LineKind; parts: Part[]; count: number; element: WuXing };

const KIND_ORDER: readonly LineKind[] = ['冲', '三刑', '刑', '自刑', '三合', '半合', '三会', '合', '暗合', '拱'];

/**
 * What a flow card lists (SPEC §5.3): column 0 is the card's own pillar, the rest are the columns it is read
 * against. Pair relations first, then 天地合, then its stem's lines (○) and its branch's lines (●).
 */
export function cardEntries(cols: readonly RelColumn[], dayMaster: Stem, monthBranch: Branch): CardEntry[] {
  const rel = analyze(cols, dayMaster, monthBranch);
  const mine = (lines: Line[]) =>
    lines
      .filter((l) => l.members.some((m) => m.col === 0))
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || rightOf(a) - rightOf(b));
  const own = (line: Line) => line.members.find((m) => m.col === 0)!.element;
  return [
    ...rel.pairs
      .filter((p) => p.col === 0)
      .map((p): CardEntry => ({ type: 'pair', name: p.name, other: cols[p.other].name, otherFirst: p.otherFirst })),
    ...(rel.selfCombined.includes(0) ? [{ type: 'self', name: '天地合' } as const] : []),
    ...[...mine(rel.stemLines), ...mine(rel.branchLines)].map((l): CardEntry => ({
      type: 'line', level: l.level, kind: l.kind, parts: l.parts, count: l.count, element: own(l),
    })),
  ];
}
