// 刑冲会合 (SPEC §6): the lines of the screenshots' chart in the 关系 view, natal alone and with 大运 丁酉 and
// 流年 丁未 or 丙午, then the App Store chart with 大运 乙卯 and 流年 庚子, then each kind of relation on its own.
import { describe, expect, it } from 'vitest';
import type { Branch, Stem } from '../src/bazi';
import { analyze, labelText, transforms, type Line, type RelColumn } from '../src/relations';

/** A column with its place in the order of lines: 年 0, 月 1, 日 2, 时 3, 大运 4, 流年 5, 流月 6, 流日 7, 流时 8. */
const col = (order: number, gz: string): RelColumn => ({ order, stem: gz[0] as Stem, branch: gz[1] as Branch });

/** A line as one string: its characters with their columns (as the chart shows them, left to right), then its label. */
const show = (l: Line, withGod = true) => `${l.members.map((m) => `${m.char}${m.col}`).join('-')} ${labelText(l.label, withGod)}`;

/** The screenshots' natal pillars as the chart shows them: 时 日 月 年. */
const SHOT_NATAL = [col(3, '辛酉'), col(2, '戊子'), col(1, '甲午'), col(0, '丙子')];

describe('the screenshots’ chart: 辛酉 戊子 甲午 丙子, day master 戊, month 午', () => {
  const rel = (...flows: string[]) => analyze([...SHOT_NATAL, ...flows.map((gz, i) => col(4 + i, gz))], '戊', '午');

  it('draws the natal 冲 alone: 午冲子 (月 年) and 子冲午 (日 月); not 年 丙 with 时 辛, nor 子酉 破', () => {
    const { stemLines, branchLines } = rel();
    expect(stemLines).toEqual([]);
    expect(branchLines.map((l) => show(l))).toEqual(['午2-子3 冲', '子1-午2 冲']);
  });

  it('with 大运 丁酉 and 流年 丁未: 酉刑酉, and 午未 合火(印)成化 (but no line for 子未 害)', () => {
    const { stemLines, branchLines } = rel('丁酉', '丁未');
    expect(stemLines).toEqual([]);
    expect(branchLines.map((l) => show(l))).toEqual(['午2-子3 冲', '子1-午2 冲', '酉0-酉4 刑', '午2-未5 合火(印)成化']);
  });

  it('with 大运 丁酉 and 流年 丙午: 辛丙 合水(才)不化 above, and every line below in the screenshot’s order', () => {
    const { stemLines, branchLines } = rel('丁酉', '丙午');
    expect(stemLines.map((l) => show(l))).toEqual(['辛0-丙5 合水(才)不化']);
    expect(branchLines.map((l) => show(l))).toEqual([
      '午2-子3 冲', '子1-午2 冲', '酉0-酉4 刑', '子3-午5 冲', '子1-午5 冲', '午2-午5 刑',
    ]);
  });

  it('keeps the 化神 and its 十神 apart for coloring, and leaves the 十神 out in the 藏干 and 五行 modes', () => {
    const [he] = rel('丁酉', '丙午').stemLines;
    expect(he.kind).toBe('合');
    expect(he.label).toEqual({ word: '合', element: '水', god: '才', result: '不化' });
    expect(labelText(he.label, false)).toBe('合水不化');
    expect(rel('丁酉', '丙午').branchLines[0].label).toEqual({ word: '冲' });
  });
});

describe('the App Store chart: 辛酉 戊子 丙辰 戊子, 大运 乙卯, 流年 庚子 (day master 戊, month 辰)', () => {
  const cols = [col(3, '辛酉'), col(2, '戊子'), col(1, '丙辰'), col(0, '戊子'), col(4, '乙卯'), col(5, '庚子')];
  const { stemLines, branchLines } = analyze(cols, '戊', '辰');

  it('draws 辛丙 合, 辛乙 冲 and 乙庚 合 above', () => {
    expect(stemLines.map((l) => show(l))).toEqual(['辛0-丙2 合水(才)成化', '辛0-乙4 冲', '乙4-庚5 合金(食)成化']);
  });

  it('draws every pair below, one line each: 子 刑 卯 from two columns is two lines', () => {
    expect(branchLines.map((l) => show(l))).toEqual([
      '辰2-子3 半合水(财)成化',
      '子1-辰2 半合水(财)成化',
      '酉0-辰2 合金(伤)成化',
      '酉0-卯4 冲',
      '子3-卯4 刑',
      '子1-卯4 刑',
      '卯4-子5 刑',
      '辰2-子5 半合水(财)成化',
    ]);
  });
});

describe('each relation, for a 戊 day master in a 辰 month', () => {
  const rel = (gzs: string[]) => analyze(gzs.map((gz, i) => col(i, gz)), '戊', '辰');
  const branchLines = (gzs: string[]) => rel(gzs).branchLines.map((l) => show(l));
  const stemLines = (gzs: string[]) => rel(gzs).stemLines.map((l) => show(l));

  it('三合 when all three branches stand, instead of their 半合 and 拱', () => {
    expect(branchLines(['甲申', '丙子', '戊辰'])).toEqual(['申0-子1-辰2 三合水(财)成化']);
    expect(branchLines(['甲申', '丙子'])).toEqual(['申0-子1 半合水(财)成化']);
    expect(branchLines(['甲申', '戊辰'])).toEqual(['申0-辰1 拱水(财)']);
  });

  it('三会 when all three branches of a direction stand', () => {
    expect(branchLines(['甲寅', '乙卯', '丙辰'])).toEqual(['寅0-卯1-辰2 三会木(官)成化']);
  });

  it('三刑 for 寅巳申 together, instead of their pair 刑; 刑 for two of them, for 子卯, and for 辰午酉亥 twice', () => {
    expect(branchLines(['甲寅', '乙巳', '丙申'])).toEqual(['寅0-申2 冲', '寅0-巳1-申2 三刑', '巳1-申2 合水(财)成化']);
    expect(branchLines(['甲寅', '乙巳'])).toEqual(['寅0-巳1 刑']);
    expect(branchLines(['乙丑', '甲戌'])).toEqual(['丑0-戌1 刑']);
    expect(branchLines(['甲子', '乙卯'])).toEqual(['子0-卯1 刑']);
    expect(branchLines(['甲午', '丙午'])).toEqual(['午0-午1 刑']);
    expect(branchLines(['甲子', '丙子'])).toEqual([]);
  });

  it('暗合 for 寅丑, 卯申 and 午亥', () => {
    expect(branchLines(['丙寅', '丁丑'])).toEqual(['寅0-丑1 暗合']);
    expect(branchLines(['乙卯', '甲申'])).toEqual(['卯0-申1 暗合']);
    expect(branchLines(['庚午', '辛亥'])).toEqual(['午0-亥1 暗合']);
  });

  it('no line for 六害 or 六破', () => {
    expect(branchLines(['丙子', '丁未'])).toEqual([]);
    expect(branchLines(['丙子', '丁酉'])).toEqual([]);
    expect(branchLines(['乙卯', '丙辰'])).toEqual([]);
    expect(branchLines(['乙卯', '甲午'])).toEqual([]);
  });

  it('a stem 合 names its yang 化神 stem, a branch 合 its yin one: 甲己 合土(比), 子丑 合土(劫)', () => {
    expect(stemLines(['甲子', '己丑'])).toEqual(['甲0-己1 合土(比)成化']);
    expect(branchLines(['甲子', '己丑'])).toEqual(['子0-丑1 合土(劫)成化']);
  });

  it('stem 冲: 甲庚, 乙辛, 丙壬, 丁癸', () => {
    expect(stemLines(['甲子', '庚午'])).toEqual(['甲0-庚1 冲']);
    expect(stemLines(['丙子', '壬辰'])).toEqual(['丙0-壬1 冲']);
    expect(stemLines(['甲子', '戊辰'])).toEqual([]);
  });

  it('never relates the natal 年 and 时, but relates every other two columns, flows among themselves too', () => {
    // 时 甲午, 年 丙子, 大运 戊子: 时 午 冲 大运 子, but not 年 子.
    expect(analyze([col(3, '甲午'), col(0, '丙子'), col(4, '戊子')], '戊', '辰').branchLines.map((l) => show(l))).toEqual(['午0-子2 冲']);
    expect(analyze([col(4, '乙卯'), col(5, '辛酉')], '戊', '辰').branchLines.map((l) => show(l))).toEqual(['卯0-酉1 冲']);
    expect(analyze([col(3, '辛酉'), col(0, '丙子')], '戊', '午').stemLines).toEqual([]);
  });

  it('never joins the natal 年 and 时 in a group either: it leaves out the 时, else the 年, or draws pairs', () => {
    const lines = (cols: RelColumn[]) => analyze(cols, '戊', '辰').branchLines.map((l) => show(l));
    // 时 辰, 月 子, 年 申: 申子辰 needs both 年 and 时, so two 半合 stand, and no 拱 between 年 and 时.
    expect(lines([col(3, '甲辰'), col(1, '丙子'), col(0, '戊申')])).toEqual(['子1-申2 半合水(财)成化', '辰0-子1 半合水(财)成化']);
    // 时 申, 日 辰, 月 子, 年 申: whole without the 时, whose 申 keeps its own 半合 and 拱.
    expect(lines([col(3, '甲申'), col(2, '丙辰'), col(1, '戊子'), col(0, '庚申')])).toEqual([
      '辰1-子2-申3 三合水(财)成化', '申0-子2 半合水(财)成化', '申0-辰1 拱水(财)',
    ]);
    // 时 申, 月 巳, 年 寅: no 三刑, nor 寅 冲 申; 刑 for 寅巳 and for 巳申.
    expect(lines([col(3, '甲申'), col(1, '乙巳'), col(0, '戊寅')])).toEqual([
      '巳1-寅2 刑', '申0-巳1 刑', '申0-巳1 合水(财)成化',
    ]);
  });

  it('orders the lines by their later column, then by kind, then by their earlier column', () => {
    // 流年 子 against 年 卯 (刑), 月 午 (冲) and 日 辰 (半合): 冲, 刑, 半合.
    const cols = [col(2, '甲辰'), col(1, '甲午'), col(0, '丁卯'), col(5, '丙子')];
    expect(analyze(cols, '戊', '辰').branchLines.map((l) => show(l))).toEqual(['午1-子3 冲', '卯2-子3 刑', '辰0-子3 半合水(财)成化']);
  });

  it('成化 when the month branch holds or produces the 化神 (SPEC §6.1)', () => {
    expect(transforms('水', '辰')).toBe(true); // 辰 holds 癸
    expect(transforms('金', '辰')).toBe(true); // 土 produces 金
    expect(transforms('火', '辰')).toBe(false);
    expect(transforms('火', '午')).toBe(true); // 午 holds 丁
    expect(transforms('水', '午')).toBe(false);
    expect(transforms('木', '申')).toBe(false);
  });
});
