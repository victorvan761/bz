// The engine (SPEC §4–§5): the reference chart from 十三行八字's App Store screenshot, then every lookup and the
// four pillars, 大运 and 起运 checked against lunar-typescript on random births, then the flows.
import { LunarUtil, Solar } from 'lunar-typescript';
import { describe, expect, it } from 'vitest';
import {
  BRANCHES, SHI_SHEN_NAME, SIXTY, STEMS, castBazi, choose, dayItems, daYunItems, flowColumns, hourItems, monthGanZhi,
  monthItems, pickAt, pillarOf, shiShen, stage, strength, xunKong, yearGanZhi, yearItems, yunText,
  type Branch, type Gender, type Stem,
} from '../src/bazi';
import type { BirthTime } from '../src/time';
import { REF } from './reference';

/** A small seeded random number generator, so the random births are the same on every run. */
function random(seed: number) {
  let s = seed >>> 0;
  return (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
}

function randomBirths(count: number, seed = 8): BirthTime[] {
  const r = random(seed);
  return Array.from({ length: count }, () => {
    const year = 1900 + r(201);
    const month = 1 + r(12);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { year, month, day: 1 + r(days), hour: r(24), minute: r(60) };
  });
}

describe('the reference chart (十三行八字, App Store screenshot 1)', () => {
  const chart = castBazi(REF, '女');
  const { year, month, day, hour } = chart.pillars;

  it('has the pillars 戊子 丙辰 戊子 辛酉 with day master 戊', () => {
    expect([year, month, day, hour].map((p) => p.ganZhi)).toEqual(['戊子', '丙辰', '戊子', '辛酉']);
    expect(chart.dayMaster).toBe('戊');
    expect(chart.qianKun).toBe('坤造');
  });

  it('writes each stem’s 十神 as the screenshot does: 年 比, 月 卩, 时 伤, none for the day master', () => {
    expect([year.god, month.god, day.god, hour.god]).toEqual(['比', '卩', null, '伤']);
  });

  it('lists hidden stems 本气 first with their 十神: 辰 比戊 官乙 财癸, 子 财癸, 酉 伤辛', () => {
    const hidden = (p: typeof year) => p.hidden.map((h) => h.god + h.stem).join(' ');
    expect(hidden(month)).toBe('比戊 官乙 财癸');
    expect(hidden(year)).toBe('财癸');
    expect(hidden(hour)).toBe('伤辛');
  });

  it('runs 大运 backward for a 坤造 born in a yang year: 乙卯 from 2012, shown at age 4', () => {
    expect(chart.yun.forward).toBe(false);
    const items = daYunItems(chart);
    expect(items[0]).toMatchObject({ label: '童限', pillar: null, big: '0', small: '2008' });
    expect(items[1]).toMatchObject({ label: '大运', big: '4', small: '2012' });
    expect(items[1].pillar?.ganZhi).toBe('乙卯');
    expect(items.slice(1).map((d) => d.pillar?.ganZhi)).toEqual(['乙卯', '甲寅', '癸丑', '壬子', '辛亥', '庚戌', '己酉', '戊申', '丁未', '丙午']);
  });

  it('shows 流年 2017–2021 as 丁酉 戊戌 己亥 庚子 辛丑, at ages 9–13', () => {
    const years = yearItems(chart, 1).filter((y) => y.value >= 2017 && y.value <= 2021);
    expect(years.map((y) => `${y.big} ${y.small} ${y.pillar?.ganZhi}`)).toEqual([
      '9 2017 丁酉', '10 2018 戊戌', '11 2019 己亥', '12 2020 庚子', '13 2021 辛丑',
    ]);
  });

  it('starts luck 4 years 8 months 1 day 6 hours after birth, on 2012-12-20', () => {
    expect(yunText(chart.yun)).toBe('出生后4年8个月1天6小时起运');
    expect(chart.yun.start).toBe('2012-12-20 00:00');
  });

  it('prints the header facts: 农历, 生肖, 胎元 命宫 身宫, the 节 around the birth', () => {
    expect(chart.lunarText).toBe('戊子年 三月十三 酉时');
    expect(chart.zodiac).toBe('鼠');
    expect([chart.taiYuan, chart.mingGong, chart.shenGong]).toEqual(['丁未', '丙辰', '甲寅']);
    expect(chart.jie.prev).toEqual({ name: '清明', time: '2008-04-04 17:45' });
    expect(chart.jie.next.name).toBe('立夏');
  });

  it('prints 纳音, 星运, 自坐 and 空亡 for each pillar', () => {
    expect([year, month, day, hour].map((p) => p.naYin)).toEqual(['霹雳火', '沙中土', '霹雳火', '石榴木']);
    expect([year, month, day, hour].map((p) => p.xingYun)).toEqual(['胎', '冠带', '胎', '死']);
    expect([year, month, day, hour].map((p) => p.ziZuo)).toEqual(['胎', '冠带', '胎', '临官']);
    expect([year, month, day, hour].map((p) => p.kong)).toEqual(['午未', '子丑', '午未', '子丑']);
  });

  it('estimates the day master 偏弱: 土 and 火 hold 40% of the points', () => {
    const s = strength(chart);
    expect(s.scores).toEqual({ 木: 0.6, 火: 1, 土: 2.2, 金: 2, 水: 2.2 });
    expect(s.support).toBeCloseTo(0.4);
    expect(s.verdict).toBe('偏弱');
  });
});

describe('the lookups, against lunar-typescript', () => {
  it('十神 for all 100 pairs of stems', () => {
    for (const d of STEMS) {
      for (const o of STEMS) {
        const want = d === o ? '比肩' : LunarUtil.SHI_SHEN[d + o];
        expect(SHI_SHEN_NAME[shiShen(d as Stem, o as Stem)], d + o).toBe(want);
      }
    }
  });

  it('十二长生 for every stem at every branch', () => {
    for (const s of STEMS) {
      for (let b = 0; b < 12; b++) {
        // lunar-typescript's own table: an offset per stem, forward for yang stems and backward for yin.
        const offset = LunarUtil.CHANG_SHENG_OFFSET[s];
        const index = STEMS.indexOf(s) % 2 === 0 ? offset + b : offset - b;
        const want = LunarUtil.CHANG_SHENG[((index % 12) + 12) % 12];
        expect(stage(s as Stem, BRANCHES[b] as Branch), s + BRANCHES[b]).toBe(want);
      }
    }
  });

  it('空亡 for all 60 干支', () => {
    for (const gz of SIXTY) expect(xunKong(gz), gz).toBe(LunarUtil.getXunKong(gz));
  });

  it('流年 and 流月 干支: the 公历 year from its 立春, months by 五虎遁', () => {
    expect([1984, 2008, 2020, 2026].map(yearGanZhi)).toEqual(['甲子', '戊子', '庚子', '丙午']);
    for (const y of [1900, 1984, 2008, 2026, 2100]) {
      for (let m = 0; m < 12; m++) {
        // Mid-month (the 20th of the 公历 month after the 节) is safely inside the 节-month.
        const month = Solar.fromYmd(m === 11 ? y + 1 : y, m === 11 ? 1 : m + 2, 20).getLunar();
        expect(monthGanZhi(yearGanZhi(y)[0] as Stem, m), `${y} month ${m}`).toBe(month.getMonthInGanZhiExact());
      }
    }
  });

  it('refuses what is not a 干支', () => {
    expect(() => pillarOf('甲丑', '甲')).toThrow('not a 干支');
    expect(() => xunKong('子甲')).toThrow('not a 干支');
  });
});

describe('四柱, 大运 and 起运 for 400 random births, against lunar-typescript', () => {
  const births = randomBirths(400);

  it('the four pillars, 纳音, 星运, 自坐 and 空亡, with either 夜子时 rule', () => {
    for (const [i, t] of births.entries()) {
      const lateZi = i % 2 === 0 ? 'next' : 'same';
      const chart = castBazi(t, i % 3 === 0 ? '男' : '女', { lateZi });
      const ec = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar().getEightChar();
      ec.setSect(lateZi === 'next' ? 1 : 2);
      const label = JSON.stringify(t) + lateZi;
      const { year, month, day, hour } = chart.pillars;
      expect([year, month, day, hour].map((p) => p.ganZhi), label).toEqual([ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()]);
      expect([year, month, day, hour].map((p) => p.naYin), label)
        .toEqual([ec.getYearNaYin(), ec.getMonthNaYin(), ec.getDayNaYin(), ec.getTimeNaYin()]);
      expect([year, month, day, hour].map((p) => p.xingYun), label)
        .toEqual([ec.getYearDiShi(), ec.getMonthDiShi(), ec.getDayDiShi(), ec.getTimeDiShi()]);
      expect([year, month, day, hour].map((p) => p.kong), label)
        .toEqual([ec.getYearXunKong(), ec.getMonthXunKong(), ec.getDayXunKong(), ec.getTimeXunKong()]);
      expect(month.hidden.map((h) => SHI_SHEN_NAME[h.god]), label).toEqual(ec.getMonthShiShenZhi());
      expect(hour.god && SHI_SHEN_NAME[hour.god], label).toBe(ec.getTimeShiShenGan());
    }
  });

  it('起运 to the minute, and ten 大运 counted on from the month pillar', () => {
    for (const [i, t] of births.entries()) {
      const gender: Gender = i % 2 === 0 ? '男' : '女';
      const chart = castBazi(t, gender);
      const yun = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar().getEightChar().getYun(gender === '男' ? 1 : 0, 2);
      const label = JSON.stringify(t) + gender;
      expect(chart.yun, label).toMatchObject({
        forward: yun.isForward(), years: yun.getStartYear(), months: yun.getStartMonth(), days: yun.getStartDay(), hours: yun.getStartHour(),
      });
      const dy = chart.daYun.filter((d) => d.pillar);
      expect(dy).toHaveLength(10);
      const step = yun.isForward() ? 1 : -1;
      const m = SIXTY.indexOf(chart.pillars.month.ganZhi);
      dy.forEach((d, k) => {
        expect(d.pillar!.ganZhi, label).toBe(SIXTY[(((m + step * (k + 1)) % 60) + 60) % 60]);
        expect(d.endYear - d.startYear, label).toBe(9);
        if (k > 0) expect(d.startYear, label).toBe(dy[k - 1].endYear + 1);
      });
      // 童限 runs from the birth year to the year before the first 大运, when there is such a year.
      if (chart.daYun[0].pillar === null) {
        expect(chart.daYun[0].startYear).toBe(t.year);
        expect(chart.daYun[0].endYear).toBe(dy[0].startYear - 1);
      } else {
        expect(dy[0].startYear).toBe(t.year);
      }
    }
  });
});

describe('the flows', () => {
  const chart = castBazi(REF, '女');

  it('流月 start at their 节, from 立春 to 小寒 of the next 公历 year', () => {
    const months = monthItems(chart, 2020);
    expect(months.map((m) => m.big)).toEqual(['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']);
    expect(months[0].small).toBe('2/4');
    expect(months[11].small).toBe('1/5');
    expect(months.map((m) => m.pillar?.ganZhi)).toEqual(
      ['戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑'],
    );
  });

  it('流日 are the days from a 节 up to the next one, with their day pillars', () => {
    for (let m = 0; m < 12; m++) {
      const days = dayItems(chart, 2020, m);
      expect(days.length, `month ${m}`).toBeGreaterThanOrEqual(29);
      expect(days.length, `month ${m}`).toBeLessThanOrEqual(32);
    }
    // 2020's 辰月 runs from 清明 (4月4日) to the day before 立夏 (5月5日).
    const chen = dayItems(chart, 2020, 2);
    expect([chen[0].small + chen[0].big, chen.at(-1)!.small + chen.at(-1)!.big]).toEqual(['4月4', '5月4']);
    expect(chen[0].pillar?.ganZhi).toBe(Solar.fromYmd(2020, 4, 4).getLunar().getDayInGanZhi());
    // 丑月 runs into the next 公历 year, up to the day before 立春.
    expect(dayItems(chart, 2020, 11).at(-1)).toMatchObject({ small: '2月', big: '2' });
  });

  it('流时 run 子 … 亥, their stems by 五鼠遁 from the day’s stem', () => {
    const hours = hourItems(chart, 2020, 2, 0); // 2020-04-04, 丁丑日
    expect(hours.map((h) => h.pillar?.ganZhi)).toEqual(
      ['庚子', '辛丑', '壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥'],
    );
    expect(hours.map((h) => h.small).slice(0, 3)).toEqual(['23–01', '01–03', '03–05']);
  });

  it('picks the moment’s 流年 (turning at 立春), 流月 (at each 节), day and 时辰', () => {
    expect(pickAt(chart, { year: 2020, month: 4, day: 18, hour: 18, minute: 0 })).toEqual({ dayun: 1, year: 2020, month: 2, day: 14, hour: 9 });
    // 2021-02-03 is before 立春: still 流年 2020, 丑月.
    expect(pickAt(chart, { year: 2021, month: 2, day: 3, hour: 0, minute: 30 })).toMatchObject({ year: 2020, month: 11, hour: 0 });
    // 23:30 is the 子 hour.
    expect(pickAt(chart, { year: 2021, month: 2, day: 4, hour: 23, minute: 30 }).hour).toBe(0);
    // Before birth: the first year of the chart, from its first month.
    expect(pickAt(chart, { year: 1990, month: 6, day: 1, hour: 12, minute: 0 })).toMatchObject({ dayun: 0, year: 2008, month: 0, day: 0 });
    // After the last 大运 (2102–2111): its last year.
    const last = chart.daYun.at(-1)!;
    expect(last.endYear).toBe(2111);
    expect(pickAt(chart, { year: 2150, month: 6, day: 1, hour: 12, minute: 0 })).toMatchObject({ dayun: chart.daYun.length - 1, year: 2111 });
  });

  it('choosing a 大运 keeps the year if it is one of its years, else takes its first; the day stays in its month', () => {
    const pick = pickAt(chart, { year: 2020, month: 4, day: 18, hour: 18, minute: 0 });
    expect(choose(chart, pick, 'dayun', 2)).toMatchObject({ dayun: 2, year: 2022 });
    expect(choose(chart, pick, 'dayun', 1)).toEqual(pick);
    expect(choose(chart, { ...pick, day: 30 }, 'month', 0).day).toBe(dayItems(chart, 2020, 0).length - 1);
    expect(choose(chart, pick, 'year', 2015)).toMatchObject({ dayun: 1, year: 2015 });
  });

  it('the chart’s flow columns run from the panel’s level up to 大运', () => {
    const pick = pickAt(chart, { year: 2020, month: 4, day: 18, hour: 18, minute: 0 });
    expect(flowColumns(chart, 'dayun', pick).map((c) => c.label)).toEqual(['大运']);
    expect(flowColumns(chart, 'year', pick).map((c) => `${c.label}${c.pillar?.ganZhi}`)).toEqual(['流年庚子', '大运乙卯']);
    expect(flowColumns(chart, 'hour', pick).map((c) => c.label)).toEqual(['流时', '流日', '流月', '流年', '大运']);
    expect(flowColumns(chart, 'hour', pick)[0].pillar?.ganZhi).toBe('丁酉'); // 2020-04-18 is a 辛卯 day: its 酉时 is 丁酉
  });
});
