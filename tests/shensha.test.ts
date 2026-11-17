// 神煞 (SPEC §7): the reference chart, the stars that name a day pillar, and the rule tables' shapes.
import { Solar } from 'lunar-typescript';
import { describe, expect, it } from 'vitest';
import { castBazi, pillarOf } from '../src/bazi';
import { SHEN_SHA_ORDER, shenSha } from '../src/shensha';
import { REF } from './reference';

describe('the reference chart: 戊子 丙辰 戊子 辛酉', () => {
  const chart = castBazi(REF, '女');
  const { year, month, day, hour } = chart.pillars;

  it('finds 将星 on the 子 pillars, 太极贵人 华盖 红艳煞 on 丙辰, 桃花 天喜 on 辛酉', () => {
    expect(shenSha(chart, year, 'year')).toEqual(['将星']);
    expect(shenSha(chart, month, 'month')).toEqual(['太极贵人', '华盖', '红艳煞']);
    expect(shenSha(chart, day, 'day')).toEqual(['将星']);
    expect(shenSha(chart, hour, 'hour')).toEqual(['桃花', '天喜']);
  });

  it('reads flow columns against the natal chart: 大运 乙卯 is 天医 and 红鸾', () => {
    expect(shenSha(chart, pillarOf('乙卯', chart.dayMaster), 'flow')).toEqual(['天医', '红鸾']);
  });

  it('marks a flow branch that the day pillar’s 旬 leaves out as 空亡: 午 and 未 for 戊子', () => {
    expect(shenSha(chart, pillarOf('甲午', chart.dayMaster), 'flow')).toContain('空亡');
    expect(shenSha(chart, pillarOf('乙未', chart.dayMaster), 'flow')).toContain('空亡');
  });
});

/** A chart whose day pillar is `ganZhi`: the first such day from 2000-01-01, at noon. */
function dayPillar(ganZhi: string) {
  let s = Solar.fromYmd(2000, 1, 1);
  while (s.getLunar().getDayInGanZhi() !== ganZhi) s = s.next(1);
  return castBazi({ year: s.getYear(), month: s.getMonth(), day: s.getDay(), hour: 12, minute: 0 }, '男');
}

describe('stars of the day pillar itself', () => {
  it('魁罡 for 庚辰 庚戌 壬辰 戊戌, on the day pillar only', () => {
    for (const gz of ['庚辰', '庚戌', '壬辰', '戊戌']) {
      const chart = dayPillar(gz);
      expect(shenSha(chart, chart.pillars.day, 'day'), gz).toContain('魁罡');
      expect(shenSha(chart, chart.pillars.day, 'flow'), gz).not.toContain('魁罡');
    }
  });

  it('阴差阳错, 孤鸾煞 and 十恶大败', () => {
    const c1 = dayPillar('丙子');
    expect(shenSha(c1, c1.pillars.day, 'day')).toContain('阴差阳错');
    const c2 = dayPillar('甲寅');
    expect(shenSha(c2, c2.pillars.day, 'day')).toContain('孤鸾煞');
    const c3 = dayPillar('甲辰');
    expect(shenSha(c3, c3.pillars.day, 'day')).toContain('十恶大败');
  });

  it('never marks the day pillar itself 空亡', () => {
    const chart = dayPillar('甲子');
    expect(shenSha(chart, chart.pillars.day, 'day')).not.toContain('空亡');
  });
});

describe('every chart', () => {
  it('lists its stars in the tab’s order, each once', () => {
    for (let y = 1950; y <= 2050; y += 7) {
      const chart = castBazi({ year: y, month: (y % 12) + 1, day: 15, hour: y % 24, minute: 0 }, '男');
      for (const key of ['year', 'month', 'day', 'hour'] as const) {
        const found = shenSha(chart, chart.pillars[key], key);
        expect(found).toEqual(SHEN_SHA_ORDER.filter((s) => found.includes(s)));
        expect(new Set(found).size).toBe(found.length);
      }
    }
  });
});
