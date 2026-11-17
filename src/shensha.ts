// 神煞 (SPEC §7): which stars a column carries, looked up from the natal chart's 日干, 年干, 月支, 年支 and 日支.
// Schools differ on many of these; each table below names the rule it follows. Pure, like the engine.
import { BRANCHES, xunKong, type Bazi, type Branch, type Pillar, type Stem } from './bazi';

/** Branches by stem, in 甲 … 癸 order: '丑未' means either. */
type ByStem = readonly string[];
/** By the 三合 group of a branch: 申子辰, 亥卯未, 寅午戌, 巳酉丑 */
type ByGroup = Readonly<Record<'水' | '木' | '火' | '金', Branch>>;

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const byStem = (table: ByStem, stem: Stem) => table[STEMS.indexOf(stem)];

/** 天乙贵人: 甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎. By 日干 or 年干. */
const TIAN_YI: ByStem = ['丑未', '子申', '亥酉', '亥酉', '丑未', '子申', '丑未', '寅午', '卯巳', '卯巳'];
/** 太极贵人, by 日干 or 年干. */
const TAI_JI: ByStem = ['子午', '子午', '卯酉', '卯酉', '辰戌丑未', '辰戌丑未', '寅亥', '寅亥', '巳申', '巳申'];
/** 文昌贵人, by 日干 or 年干. */
const WEN_CHANG: ByStem = ['巳', '午', '申', '酉', '申', '酉', '亥', '子', '寅', '卯'];
/** 国印贵人, by 日干 or 年干. */
const GUO_YIN: ByStem = ['戌', '亥', '丑', '寅', '丑', '寅', '辰', '巳', '未', '申'];
/** 禄神, by 日干. */
const LU: ByStem = ['寅', '卯', '巳', '午', '巳', '午', '申', '酉', '亥', '子'];
/** 羊刃, by 日干: 禄 + 1 for every stem. */
const YANG_REN: ByStem = ['卯', '辰', '午', '未', '午', '未', '酉', '戌', '子', '丑'];
/** 红艳煞, by 日干. */
const HONG_YAN: ByStem = ['午', '午', '寅', '未', '辰', '辰', '戌', '酉', '子', '申'];
/** 金舆, by 日干. */
const JIN_YU: ByStem = ['辰', '巳', '未', '申', '未', '申', '戌', '亥', '丑', '寅'];

/** 天德贵人 by 月支, 寅 … 丑: a stem or a branch. */
const TIAN_DE = '丁申壬辛亥甲癸寅丙乙巳庚';
/** 天德合 by 月支, 寅 … 丑. */
const TIAN_DE_HE = '壬巳丁丙寅己戊亥辛庚申乙';
/** 月德贵人 and 月德合 by the 三合 group of 月支. */
const YUE_DE: Readonly<Record<'水' | '木' | '火' | '金', Stem>> = { 水: '壬', 木: '甲', 火: '丙', 金: '庚' };
const YUE_DE_HE: Readonly<Record<'水' | '木' | '火' | '金', Stem>> = { 水: '丁', 木: '己', 火: '辛', 金: '乙' };

/** By 年支 or 日支's 三合 group. */
const YI_MA: ByGroup = { 水: '寅', 木: '巳', 火: '申', 金: '亥' };
const TAO_HUA: ByGroup = { 水: '酉', 木: '子', 火: '卯', 金: '午' };
const HUA_GAI: ByGroup = { 水: '辰', 木: '未', 火: '戌', 金: '丑' };
const JIANG_XING: ByGroup = { 水: '子', 木: '卯', 火: '午', 金: '酉' };
const JIE_SHA: ByGroup = { 水: '巳', 木: '申', 火: '亥', 金: '寅' };
const ZAI_SHA: ByGroup = { 水: '午', 木: '酉', 火: '子', 金: '卯' };
const WANG_SHEN: ByGroup = { 水: '亥', 木: '寅', 火: '巳', 金: '申' };

/** 孤辰 and 寡宿 by the 方 of 年支: 亥子丑 → 寅/戌, 寅卯辰 → 巳/丑, 巳午未 → 申/辰, 申酉戌 → 亥/未. */
const GU_GUA: readonly (readonly [string, Branch, Branch])[] = [
  ['亥子丑', '寅', '戌'], ['寅卯辰', '巳', '丑'], ['巳午未', '申', '辰'], ['申酉戌', '亥', '未'],
];

/** Pillars that are 神煞 of the day pillar itself. */
const KUI_GANG = ['庚辰', '庚戌', '壬辰', '戊戌'];
const YIN_CHA_YANG_CUO = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
const GU_LUAN = ['甲寅', '乙巳', '丙午', '丁巳', '戊午', '戊申', '辛亥', '壬子'];
const SHI_E_DA_BAI = ['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥'];
/** 天赦: 春戊寅，夏甲午，秋戊申，冬甲子, by the season of 月支. */
const TIAN_SHE: Readonly<Record<string, string>> = { 寅卯辰: '戊寅', 巳午未: '甲午', 申酉戌: '戊申', 亥子丑: '甲子' };

function groupOf(branch: Branch): '水' | '木' | '火' | '金' {
  if ('申子辰'.includes(branch)) return '水';
  if ('亥卯未'.includes(branch)) return '木';
  if ('寅午戌'.includes(branch)) return '火';
  return '金';
}

/** The order the 神煞 tab lists them in: 贵人 first. */
export const SHEN_SHA_ORDER = [
  '天乙贵人', '太极贵人', '天德贵人', '天德合', '月德贵人', '月德合', '文昌贵人', '国印贵人', '禄神', '金舆', '天医',
  '将星', '驿马', '华盖', '桃花', '红鸾', '天喜', '天赦', '魁罡', '羊刃', '红艳煞', '劫煞', '灾煞', '亡神', '孤辰', '寡宿',
  '阴差阳错', '孤鸾煞', '十恶大败', '空亡',
] as const;

export type ShenSha = (typeof SHEN_SHA_ORDER)[number];

/**
 * The 神煞 of one column: a natal pillar ('year' … 'hour') or a flow column ('flow'). Flow columns get the stars
 * that look up a stem or a branch; the stars that name a whole day pillar are the natal 日柱's only.
 */
export function shenSha(bazi: Bazi, pillar: Pillar, which: 'year' | 'month' | 'day' | 'hour' | 'flow'): ShenSha[] {
  const { year, month, day } = bazi.pillars;
  const found = new Set<ShenSha>();
  const has = (name: ShenSha, ok: boolean) => ok && found.add(name);
  const b = pillar.branch;
  const s = pillar.stem;

  for (const base of [day.stem, year.stem]) {
    has('天乙贵人', byStem(TIAN_YI, base).includes(b));
    has('太极贵人', byStem(TAI_JI, base).includes(b));
    has('文昌贵人', byStem(WEN_CHANG, base) === b);
    has('国印贵人', byStem(GUO_YIN, base) === b);
  }
  has('禄神', byStem(LU, day.stem) === b);
  has('羊刃', byStem(YANG_REN, day.stem) === b);
  has('红艳煞', byStem(HONG_YAN, day.stem) === b);
  has('金舆', byStem(JIN_YU, day.stem) === b);

  const m = (BRANCHES.indexOf(month.branch) + 10) % 12; // 寅 = 0
  has('天德贵人', TIAN_DE[m] === s || TIAN_DE[m] === b);
  has('天德合', TIAN_DE_HE[m] === s || TIAN_DE_HE[m] === b);
  has('月德贵人', YUE_DE[groupOf(month.branch)] === s);
  has('月德合', YUE_DE_HE[groupOf(month.branch)] === s);
  has('天医', BRANCHES[(BRANCHES.indexOf(month.branch) + 11) % 12] === b);

  for (const base of [year.branch, day.branch]) {
    const g = groupOf(base);
    has('驿马', YI_MA[g] === b);
    has('桃花', TAO_HUA[g] === b);
    has('华盖', HUA_GAI[g] === b);
    has('将星', JIANG_XING[g] === b);
    has('劫煞', JIE_SHA[g] === b);
    has('灾煞', ZAI_SHA[g] === b);
    has('亡神', WANG_SHEN[g] === b);
  }
  const [, gu, gua] = GU_GUA.find(([fang]) => fang.includes(year.branch))!;
  has('孤辰', gu === b);
  has('寡宿', gua === b);
  const hongLuan = BRANCHES[(15 - BRANCHES.indexOf(year.branch)) % 12] as Branch; // 子 → 卯, 丑 → 寅 …
  has('红鸾', hongLuan === b);
  has('天喜', BRANCHES[(BRANCHES.indexOf(hongLuan) + 6) % 12] === b);

  if (which === 'day') {
    const gz = pillar.ganZhi;
    has('魁罡', KUI_GANG.includes(gz));
    has('阴差阳错', YIN_CHA_YANG_CUO.includes(gz));
    has('孤鸾煞', GU_LUAN.includes(gz));
    has('十恶大败', SHI_E_DA_BAI.includes(gz));
    const season = Object.keys(TIAN_SHE).find((k) => k.includes(month.branch))!;
    has('天赦', TIAN_SHE[season] === gz);
  }
  // 空亡: the branch is one the day pillar's 旬 leaves out (日空). The day pillar itself never is.
  has('空亡', which !== 'day' && xunKong(day.ganZhi).includes(b));

  return SHEN_SHA_ORDER.filter((name) => found.has(name));
}
