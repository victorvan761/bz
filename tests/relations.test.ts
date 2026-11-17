// 刑冲会合 (SPEC §6): the reference chart's 关系 view and its five 流年 cards, read off 十三行八字's App Store
// screenshot, then each kind of relation on its own.
import { describe, expect, it } from 'vitest';
import type { Branch, Stem } from '../src/bazi';
import {
  analyze, branchRelation, cardEntries, pairName, stemRelation, transforms,
  type CardEntry, type Line, type RelColumn,
} from '../src/relations';

const col = (name: string, gz: string): RelColumn => ({ name, stem: gz[0] as Stem, branch: gz[1] as Branch });

/** The natal pillars of the reference chart, 时 日 月 年 as the chart puts them, right of the flows. */
const NATAL = [col('时柱', '辛酉'), col('日柱', '戊子'), col('月柱', '丙辰'), col('年柱', '戊子')];
const DAY_MASTER: Stem = '戊';
const MONTH: Branch = '辰';

/** A line as one string: its members, label and count, '辛2-丙4 合财成化'. */
const show = (l: Line) =>
  `${l.members.map((m) => `${m.char}${m.col}`).join('-')} ${l.parts.map((p) => p.text).join('')}${l.count > 1 ? ` ×${l.count}` : ''}`;

/** A card entry as the card prints it: '月柱 克会', '○冲', '●2 合比成化'. */
const entry = (e: CardEntry) => {
  if (e.type === 'pair') return e.otherFirst ? `${e.other} ${e.name}` : `${e.name} ${e.other}`;
  if (e.type === 'self') return e.name;
  return `${e.level === 'stem' ? '○' : '●'}${e.count > 1 ? `${e.count} ` : ''}${e.parts.map((p) => p.text).join('')}`;
};

describe('the reference chart in the 关系 view: 流年 庚子, 大运 乙卯, 辛酉 戊子 丙辰 戊子', () => {
  const cols = [col('流年', '庚子'), col('大运', '乙卯'), ...NATAL];
  const rel = analyze(cols, DAY_MASTER, MONTH);

  it('draws the stem lines the screenshot draws, nearest the pillars first: 辛合丙, 乙冲辛, 庚合乙', () => {
    expect(rel.stemLines.map(show)).toEqual(['辛2-丙4 合财成化', '乙1-辛2 冲', '庚0-乙1 合伤成化']);
    // 辛 attacks 乙: the arrow points at 乙's column.
    expect(rel.stemLines[1].toward).toBe(1);
  });

  it('colors the 化神 by its element: 财 in water, 伤 in metal', () => {
    expect(rel.stemLines[0].parts).toEqual([{ text: '合' }, { text: '财', element: '水' }, { text: '成化' }]);
    expect(rel.stemLines[2].parts[1]).toEqual({ text: '伤', element: '金' });
  });

  it('draws the branch lines, nearest the pillars first, folding 卯 无礼之刑 with both natal 子 into one line of 2', () => {
    expect(rel.branchLines.map(show)).toEqual([
      '辰4-子5 半合财成化',
      '子3-辰4 半合财成化',
      '酉2-辰4 合伤成化',
      '卯1-酉2 冲',
      '卯1-子3-子5 无礼之刑 ×2',
      '子0-卯1 无礼之刑',
      '子0-辰4 半合财成化',
    ]);
    // 酉 attacks 卯.
    expect(rel.branchLines[3].toward).toBe(1);
  });

  it('names the pairs as the screenshot does, under the left column', () => {
    const named = rel.pairs.map((p) => `${cols[p.col].name}: ${p.otherFirst ? `${cols[p.other].name} ${p.name}` : `${p.name} ${cols[p.other].name}`}`);
    expect(named).toEqual(['流年: 月柱 克会', '流年: 合刑 大运', '大运: 时柱 反吟', '时柱: 双合 月柱', '日柱: 伏吟 年柱']);
  });

  it('marks 天地合 on both 戊子 pillars', () => {
    expect(rel.selfCombined).toEqual([3, 5]);
  });
});

describe('the reference chart’s 流年 cards, read against 大运 乙卯 and the four pillars', () => {
  const card = (gz: string) => cardEntries([col('流年', gz), col('大运', '乙卯'), ...NATAL], DAY_MASTER, MONTH).map(entry);

  it('2021 辛丑', () => {
    expect(card('辛丑')).toEqual(['同会 时柱', '○冲', '○合财成化', '●半合伤成化', '●2 合比成化']);
  });

  it('2020 庚子', () => {
    expect(card('庚子')).toEqual(['月柱 克会', '合刑 大运', '○合伤成化', '●无礼之刑', '●半合财成化']);
  });

  it('2019 己亥', () => {
    expect(card('己亥')).toEqual(['大运 克会', '●半合官成化']);
  });

  it('2018 戊戌 (the screenshot also lists 隔角拱才, which this app does not compute: SPEC §6.5)', () => {
    expect(card('戊戌')).toEqual(['●冲', '●合印不化']);
  });

  it('2017 丁酉', () => {
    expect(card('丁酉')).toEqual(['克刑 时柱', '●冲', '●自刑', '●合伤成化']);
  });
});

describe('each relation', () => {
  const lines = (gzs: string[], month: Branch = MONTH) =>
    analyze(gzs.map((gz, i) => col(String(i), gz)), DAY_MASTER, month).branchLines.map(show);

  it('三合 when all three branches stand, instead of their 半合 and 拱', () => {
    expect(lines(['甲申', '丙子', '戊辰'])).toEqual(['申0-子1-辰2 三合财成化']);
    expect(lines(['甲申', '戊辰'])).toEqual(['申0-辰1 拱财']);
  });

  it('三会 when all three branches of a direction stand', () => {
    expect(lines(['甲寅', '乙卯', '丙辰'])).toContain('寅0-卯1-辰2 三会官成化');
  });

  it('三刑 for 寅巳申 together, 无恩之刑 and 恃势之刑 for two of them', () => {
    expect(lines(['甲寅', '乙巳', '丙申'])).toContain('寅0-巳1-申2 三刑');
    expect(lines(['甲寅', '乙巳'])).toEqual(['寅0-巳1 无恩之刑']);
    expect(lines(['乙丑', '甲戌'])).toEqual(['丑0-戌1 恃势之刑']);
  });

  it('冲 with or without a direction: 子 attacks 午, while 丑未 are both 土', () => {
    const [ziWu] = analyze([col('a', '甲午'), col('b', '丙子')], DAY_MASTER, MONTH).branchLines;
    expect(ziWu.toward).toBe(0);
    const [chouWei] = analyze([col('a', '乙丑'), col('b', '丁未')], DAY_MASTER, MONTH).branchLines.filter((l) => l.kind === '冲');
    expect(chouWei.toward).toBeUndefined();
  });

  it('暗合 for 寅丑, 卯申 and 午亥', () => {
    expect(lines(['丙寅', '丁丑'])).toEqual(['寅0-丑1 暗合']);
    expect(lines(['乙卯', '甲申'])).toEqual(['卯0-申1 暗合']);
    expect(lines(['庚午', '辛亥'])).toEqual(['午0-亥1 暗合']);
  });

  it('自刑 only for 辰午酉亥 twice; other repeated branches are no relation', () => {
    expect(lines(['甲午', '丙午'])).toEqual(['午0-午1 自刑']);
    expect(lines(['甲子', '丙子'])).toEqual([]);
  });

  it('成化 when the month branch holds or produces the 化神 (SPEC §6.3)', () => {
    expect(transforms('水', '辰')).toBe(true); // 辰 holds 癸
    expect(transforms('金', '辰')).toBe(true); // 土 produces 金
    expect(transforms('火', '辰')).toBe(false);
    expect(transforms('火', '寅')).toBe(true); // 寅 holds 丙
    expect(transforms('木', '申')).toBe(false);
  });

  it('stem and branch relations for pairs, and the names they make', () => {
    expect(stemRelation('丙', '庚')).toBe('克');
    expect(stemRelation('乙', '戊')).toBeNull(); // 正官: one yin, one yang
    expect(stemRelation('甲', '庚')).toBe('冲');
    expect(stemRelation('甲', '己')).toBe('合');
    expect(branchRelation('寅', '申')).toBe('冲');
    expect(branchRelation('巳', '申')).toBe('合');
    expect(branchRelation('酉', '酉')).toBe('刑');
    expect(branchRelation('申', '辰')).toBeNull(); // 拱, not 会
    expect(pairName(col('a', '甲子'), col('b', '庚午'))).toBe('反吟');
    expect(pairName(col('a', '甲子'), col('b', '甲子'))).toBe('伏吟');
    expect(pairName(col('a', '甲子'), col('b', '己丑'))).toBe('双合');
    expect(pairName(col('a', '甲子'), col('b', '戊子'))).toBeNull(); // same branch, no 伏吟
  });
});
