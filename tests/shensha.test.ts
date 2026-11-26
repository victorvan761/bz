// 神煞 (SPEC §7): the screenshots' chart and its two flows, the App Store chart, the stars that name a day pillar,
// and the order every column lists its stars in.
import { Solar } from 'lunar-typescript';
import { describe, expect, it } from 'vitest';
import { castBazi, pillarOf } from '../src/bazi';
import { SHEN_SHA_ORDER, shenSha } from '../src/shensha';
import { REF, SHOT } from './reference';

describe('the screenshots’ chart: 丙子 甲午 戊子 辛酉', () => {
  const chart = castBazi(SHOT, '男');
  const { year, month, day, hour } = chart.pillars;

  it('lists the stars the 神煞 view shows, but 学堂 and 学士 (SPEC §9 Q5)', () => {
    expect(shenSha(chart, hour, 'hour')).toEqual(['月德合', '天喜', '天喜', '咸池', '咸池']);
    expect(shenSha(chart, day, 'day')).toEqual(['将星', '六秀日', '飞刃', '九丑']);
    expect(shenSha(chart, month, 'month')).toEqual(['灾煞', '羊刃']);
    expect(shenSha(chart, year, 'year')).toEqual(['月德', '将星', '飞刃']);
  });

  it('reads the flows against the natal chart: 大运 丁酉, 流年 丙午', () => {
    expect(shenSha(chart, pillarOf('丁酉', chart.dayMaster), 'flow')).toEqual(['天喜', '天喜', '咸池', '咸池']);
    expect(shenSha(chart, pillarOf('丙午', chart.dayMaster), 'flow')).toEqual(['月德', '灾煞', '羊刃']);
  });
});

describe('the App Store chart: 戊子 丙辰 戊子 辛酉', () => {
  const chart = castBazi(REF, '女');
  const { year, month, day, hour } = chart.pillars;

  it('finds 将星 and 飞刃 on the 子 pillars, 太极 华盖 华盖 红艳 on 丙辰, 天喜 and 咸池 twice on 辛酉', () => {
    expect(shenSha(chart, year, 'year')).toEqual(['将星', '飞刃']);
    expect(shenSha(chart, month, 'month')).toEqual(['太极', '华盖', '华盖', '红艳']);
    expect(shenSha(chart, day, 'day')).toEqual(['将星', '六秀日', '飞刃', '九丑']);
    expect(shenSha(chart, hour, 'hour')).toEqual(['天喜', '天喜', '咸池', '咸池']);
  });

  it('reads 大运 乙卯 as 天医, and 红鸾 from both 子', () => {
    expect(shenSha(chart, pillarOf('乙卯', chart.dayMaster), 'flow')).toEqual(['天医', '红鸾', '红鸾']);
  });
});

/** A chart whose day pillar is `ganZhi`: the first such day from the given date, at noon. */
function dayPillar(ganZhi: string, year = 2000, month = 1) {
  let s = Solar.fromYmd(year, month, 1);
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

  it('六秀日, 九丑, 阴差阳错, 孤鸾 and 十恶大败', () => {
    const wuZi = dayPillar('戊子');
    expect(shenSha(wuZi, wuZi.pillars.day, 'day')).toEqual(expect.arrayContaining(['六秀日', '九丑']));
    expect(shenSha(wuZi, wuZi.pillars.day, 'flow')).not.toContain('六秀日');
    const c1 = dayPillar('丙子');
    expect(shenSha(c1, c1.pillars.day, 'day')).toContain('阴差阳错');
    const c2 = dayPillar('甲寅');
    expect(shenSha(c2, c2.pillars.day, 'day')).toContain('孤鸾');
    const c3 = dayPillar('甲辰');
    expect(shenSha(c3, c3.pillars.day, 'day')).toContain('十恶大败');
  });

  it('天赦 for 甲午 in a summer month', () => {
    const chart = dayPillar('甲午', 2000, 6);
    expect('巳午未').toContain(chart.pillars.month.branch);
    expect(shenSha(chart, chart.pillars.day, 'day')).toContain('天赦');
  });

  it('lists no 空亡: the chart marks 空 under the branch instead', () => {
    const chart = castBazi(SHOT, '男');
    expect(shenSha(chart, pillarOf('甲午', chart.dayMaster), 'flow')).not.toContain('空亡');
  });
});

describe('every chart', () => {
  it('lists its stars in the view’s order; only a star found from both 年支 and 日支 comes twice', () => {
    const twice = ['红鸾', '天喜', '咸池', '驿马', '华盖'];
    for (let y = 1950; y <= 2050; y += 7) {
      const chart = castBazi({ year: y, month: (y % 12) + 1, day: 15, hour: y % 24, minute: 0 }, y % 2 ? '男' : '女');
      for (const key of ['year', 'month', 'day', 'hour'] as const) {
        const found = shenSha(chart, chart.pillars[key], key);
        const at = found.map((s) => SHEN_SHA_ORDER.indexOf(s));
        expect(at.every((n) => n >= 0), `${y} ${key}`).toBe(true);
        expect(at, `${y} ${key}`).toEqual([...at].sort((a, b) => a - b));
        for (const s of new Set(found)) {
          const n = found.filter((f) => f === s).length;
          expect(n, `${y} ${key} ${s}`).toBeLessThanOrEqual(twice.includes(s) ? 2 : 1);
        }
      }
    }
  });
});
