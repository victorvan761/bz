// The engine (SPEC §4–§5): the two reference charts (the screenshots' and the App Store's), every lookup and the
// four pillars, 大运 and 起运 checked against lunar-typescript on random births, then the flows and how they are
// chosen.
import { LunarUtil, Solar } from 'lunar-typescript';
import { describe, expect, it } from 'vitest';
import {
  BRANCHES, NO_FLOWS, SHI_SHEN_NAME, SIXTY, STEMS, birthText, castBazi, choose, clearFrom, dayItems, daYunItems,
  estimateText, favorable, flowColumns, hourItems, jiaoYunText, monthGanZhi, monthItems, naYin, pillarOf,
  profileText, sanDe, shiShen, showLevel, stage, step, stripLines, xiJi, xunKong, yearGanZhi, yearItems, yunText,
  type Branch, type Flows, type FlowItem, type Gender, type Stem,
} from '../src/bazi';
import type { BirthTime } from '../src/time';
import { REF, SHOT, SHOT_NOW } from './reference';

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

/** An item as the grid prints it: its two lines and its pillar, '25 2021 辛丑'. */
const cell = (item: FlowItem) => [item.big, item.small, item.pillar.ganZhi].filter(Boolean).join(' ');

describe('the screenshots’ chart: 男 1996-06-20 18:00', () => {
  const chart = castBazi(SHOT, '男');
  const { year, month, day, hour } = chart.pillars;

  it('has the pillars 丙子 甲午 戊子 辛酉 with day master 戊', () => {
    expect([year, month, day, hour].map((p) => p.ganZhi)).toEqual(['丙子', '甲午', '戊子', '辛酉']);
    expect(chart.dayMaster).toBe('戊');
  });

  it('writes the 十神 the 十神 mode shows: 卩 杀 伤 beside the stems, 午 印 劫, 子 财, 酉 伤', () => {
    expect([year.god, month.god, day.god, hour.god]).toEqual(['卩', '杀', null, '伤']);
    const hidden = (p: typeof year) => p.hidden.map((h) => h.god + h.stem).join(' ');
    expect([hidden(year), hidden(month), hidden(day), hidden(hour)]).toEqual(['财癸', '印丁 劫己', '财癸', '伤辛']);
  });

  it('has the 基本资料 the 资料 view shows', () => {
    expect(profileText(chart, SHOT_NOW)).toBe('阳男 肖鼠 虚岁 31');
    expect(birthText(chart)).toBe('1996年 6月20日 下午6:00 酉时');
    expect(chart.lunarDate).toBe('一九九六年 五月初五');
    expect(yunText(chart.yun)).toBe('出生后 5年 5个月 20天 起运');
    expect(jiaoYunText(chart)).toBe('逢辛丙年 大雪后 3天 交大运');
    expect(chart.yun.start).toBe('2001-12-10 18:00');
  });

  it('counts 虚岁 by the 农历 year: 30 before 春节 2026, 31 from it', () => {
    expect(profileText(chart, { year: 2026, month: 2, day: 16, hour: 12, minute: 0 })).toBe('阳男 肖鼠 虚岁 30');
    expect(profileText(chart, { year: 2026, month: 2, day: 17, hour: 12, minute: 0 })).toBe('阳男 肖鼠 虚岁 31');
  });

  it('has 命宫 身宫 胎元 胎息 with their 纳音', () => {
    const four = [chart.mingGong, chart.shenGong, chart.taiYuan, chart.taiXi];
    expect(four).toEqual(['庚寅', '壬辰', '乙酉', '癸丑']);
    expect(four.map(naYin)).toEqual(['松柏木', '长流水', '泉中水', '桑柘木']);
  });

  it('estimates 身弱 (得令，失地，失势)', () => {
    expect(sanDe(chart)).toEqual({ ling: true, di: false, shi: false, strong: false });
    expect(estimateText(chart)).toBe('系统估算：身弱 (得令，失地，失势)');
  });

  it('takes 印 as 用神: 火 用, 木 喜, 土 闲, 水 忌, 金 仇', () => {
    expect(xiJi(chart)).toEqual({ 火: '用', 木: '喜', 土: '闲', 水: '忌', 金: '仇' });
  });

  it('colors the characters as the screenshots do: 戊 甲 午 丙 blue, 辛 酉 子 red', () => {
    const fav = favorable(chart);
    const blue = (c: string) => (fav[(STEMS.includes(c) ? stemEl(c) : branchEl(c))] ? 'blue' : 'red');
    expect([...'辛戊甲丙'].map(blue)).toEqual(['red', 'blue', 'blue', 'blue']);
    expect([...'酉子午子'].map(blue)).toEqual(['red', 'red', 'blue', 'red']);
  });

  it('writes 星运, 自坐 and 空 as the 神煞 view does', () => {
    expect([hour, day, month, year].map((p) => p.xingYun)).toEqual(['死', '胎', '帝旺', '胎']);
    expect([hour, day, month, year].map((p) => p.ziZuo)).toEqual(['临官', '胎', '死', '胎']);
    expect(chart.dayKong).toBe('午未');
  });

  it('lists ten 大运 from 乙未 at 5 (2001), without 童限', () => {
    expect(daYunItems(chart).map(cell)).toEqual([
      '5 2001 乙未', '15 2011 丙申', '25 2021 丁酉', '35 2031 戊戌', '45 2041 己亥',
      '55 2051 庚子', '65 2061 辛丑', '75 2071 壬寅', '85 2081 癸卯', '95 2091 甲辰',
    ]);
  });

  it('lists the ten years of 大运 丁酉, 2021 (its 交运 year) gray up to 交运', () => {
    const years = yearItems(chart, 2);
    expect(years.map(cell)).toEqual([
      '25 2021 辛丑', '26 2022 壬寅', '27 2023 癸卯', '28 2024 甲辰', '29 2025 乙巳',
      '30 2026 丙午', '31 2027 丁未', '32 2028 戊申', '33 2029 己酉', '34 2030 庚戌',
    ]);
    // 交运 on 2021-12-10 (大雪 + 3 days): 310 of the 366 days from 立春 2021 to 立春 2022. The screenshot's gray
    // stops at 146 of the cell's 172 pixels.
    expect(years[0].jiaoYun).toBeCloseTo(310 / 366, 6);
    expect(years.slice(1).map((y) => y.jiaoYun)).toEqual(Array(9).fill(undefined));
    // 2025 乙巳: 巳 hides 丙 戊 庚, so its 十神 stack reads 卩 比 食 (lunar-typescript lists 丙 庚 戊).
    expect(years[4].pillar.hidden.map((h) => h.stem + h.god)).toEqual(['丙卩', '戊比', '庚食']);
  });

  it('lists the twelve months of 2026 from 立春, dated day/month', () => {
    expect(monthItems(chart, 2026).map(cell)).toEqual([
      '立春 4/2 庚寅', '惊蛰 5/3 辛卯', '清明 5/4 壬辰', '立夏 5/5 癸巳', '芒种 5/6 甲午', '小暑 7/7 乙未',
      '立秋 7/8 丙申', '白露 7/9 丁酉', '寒露 8/10 戊戌', '立冬 7/11 己亥', '大雪 7/12 庚子', '小寒 5/1 辛丑',
    ]);
  });

  it('lists the days of 立冬 2026, 7/11 to 6/12, with 24/11 壬寅', () => {
    const days = dayItems(chart, 2026, 9);
    expect(days).toHaveLength(30);
    expect([days[0], days[9], days[17], days[29]].map(cell)).toEqual(['7/11 乙酉', '16/11 甲午', '24/11 壬寅', '6/12 甲寅']);
    expect(days.every((d) => d.big === '')).toBe(true);
  });

  it('lists thirteen 时辰 on 2026-11-24: 子 0 - 1 to 子 23 - 24, the last 子 with the next day’s stem', () => {
    const hours = hourItems(chart, 2026, 9, 17);
    expect(hours.map((h) => `${h.big} ${h.small}`)).toEqual([
      '子 0 - 1', '丑 1 - 3', '寅 3 - 5', '卯 5 - 7', '辰 7 - 9', '巳 9 - 11', '午 11 - 13',
      '未 13 - 15', '申 15 - 17', '酉 17 - 19', '戌 19 - 21', '亥 21 - 23', '子 23 - 24',
    ]);
    expect(hours.map((h) => h.pillar.ganZhi)).toEqual(
      ['庚子', '辛丑', '壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子'],
    );
  });
});

const stemEl = (c: string) => ({ 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' })[c] as '木';
const branchEl = (c: string) =>
  ({ 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' })[c] as '木';

describe('the App Store chart: 坤造 2008-04-18 18:00', () => {
  const chart = castBazi(REF, '女');
  const { year, month, day, hour } = chart.pillars;

  it('has the pillars 戊子 丙辰 戊子 辛酉 with day master 戊', () => {
    expect([year, month, day, hour].map((p) => p.ganZhi)).toEqual(['戊子', '丙辰', '戊子', '辛酉']);
    expect(chart.dayMaster).toBe('戊');
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
    expect(daYunItems(chart).map(cell).slice(0, 3)).toEqual(['4 2012 乙卯', '14 2022 甲寅', '24 2032 癸丑']);
    expect(daYunItems(chart).map((d) => d.pillar.ganZhi)).toEqual(
      ['乙卯', '甲寅', '癸丑', '壬子', '辛亥', '庚戌', '己酉', '戊申', '丁未', '丙午'],
    );
  });

  it('shows 流年 2017–2021 as 丁酉 戊戌 己亥 庚子 辛丑, at ages 9–13', () => {
    const years = yearItems(chart, 0).filter((y) => y.value >= 2017 && y.value <= 2021);
    expect(years.map(cell)).toEqual(['9 2017 丁酉', '10 2018 戊戌', '11 2019 己亥', '12 2020 庚子', '13 2021 辛丑']);
  });

  it('starts luck 4 years 8 months 1 day after birth, on 2012-12-20, 13 days after 大雪 in a 壬 year', () => {
    expect(yunText(chart.yun)).toBe('出生后 4年 8个月 1天 起运');
    expect(chart.yun.start).toBe('2012-12-20 00:00');
    expect(jiaoYunText(chart)).toBe('逢壬丁年 大雪后 13天 交大运');
  });

  it('writes the 基本资料: 阳女, 农历 二〇〇八年 三月十三', () => {
    expect(profileText(chart, SHOT_NOW)).toBe('阳女 肖鼠 虚岁 19');
    expect(chart.lunarDate).toBe('二〇〇八年 三月十三');
    expect(birthText(chart)).toBe('2008年 4月18日 下午6:00 酉时');
  });

  it('prints 纳音, 星运, 自坐 and 空亡 for each pillar', () => {
    expect([year, month, day, hour].map((p) => p.naYin)).toEqual(['霹雳火', '沙中土', '霹雳火', '石榴木']);
    expect([year, month, day, hour].map((p) => p.xingYun)).toEqual(['胎', '冠带', '胎', '死']);
    expect([year, month, day, hour].map((p) => p.ziZuo)).toEqual(['胎', '冠带', '胎', '临官']);
    expect([year, month, day, hour].map((p) => p.kong)).toEqual(['午未', '子丑', '午未', '子丑']);
  });

  it('estimates 身强 (得令，失地，得势) and takes 财 as 用神', () => {
    expect(estimateText(chart)).toBe('系统估算：身强 (得令，失地，得势)');
    expect(xiJi(chart)).toEqual({ 水: '用', 金: '喜', 木: '闲', 土: '忌', 火: '仇' });
  });
});

describe('a 交运 before 立春 (SPEC §9 Q7): 女 1990-04-28 12:00, 交运 on 1998-01-11', () => {
  const chart = castBazi({ year: 1990, month: 4, day: 28, hour: 12, minute: 0 }, '女');

  it('falls in the 流年 before the year its 大运 lists first, by 立春', () => {
    expect(chart.yun.start).toBe('1998-01-11 12:00');
    expect(chart.daYun[0].startYear).toBe(1998);
    expect(jiaoYunText(chart)).toMatch(/^逢丁壬年 小寒后 \d+天 交大运$/);
  });

  it('grays none of the first year: that 流年 is all in the new 大运, ten years on too', () => {
    expect(yearItems(chart, 0)[0].jiaoYun).toBe(0);
    expect(yearItems(chart, 1)[0].jiaoYun).toBe(0);
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

  it('the four pillars, 纳音, 星运, 空亡 and 命宫 身宫 胎元 胎息, with either 夜子时 rule', () => {
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
      expect(chart.dayKong, label).toBe(ec.getDayXunKong());
      expect([chart.mingGong, chart.shenGong, chart.taiYuan, chart.taiXi], label)
        .toEqual([ec.getMingGong(), ec.getShenGong(), ec.getTaiYuan(), ec.getTaiXi()]);
      // 巳 hides 丙 戊 庚, as 十三行八字 lists them; lunar-typescript has 丙 庚 戊.
      const lunarGods = ec.getMonthShiShenZhi();
      expect(month.hidden.map((h) => SHI_SHEN_NAME[h.god]), label)
        .toEqual(month.branch === '巳' ? [lunarGods[0], lunarGods[2], lunarGods[1]] : lunarGods);
      expect(hour.god && SHI_SHEN_NAME[hour.god], label).toBe(ec.getTimeShiShenGan());
    }
  });

  it('起运 to the minute, 交运 after its 节, and ten 大运 counted on from the month pillar', () => {
    for (const [i, t] of births.entries()) {
      const gender: Gender = i % 2 === 0 ? '男' : '女';
      const chart = castBazi(t, gender);
      const yun = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar().getEightChar().getYun(gender === '男' ? 1 : 0, 2);
      const label = JSON.stringify(t) + gender;
      expect(chart.yun, label).toMatchObject({
        forward: yun.isForward(), years: yun.getStartYear(), months: yun.getStartMonth(), days: yun.getStartDay(), hours: yun.getStartHour(),
      });
      const start = yun.getStartSolar().getLunar();
      expect(chart.jiaoYun.stems[0], label).toBe(start.getYearGanExact());
      expect(chart.jiaoYun.jie, label).toBe(start.getPrevJie().getName());
      expect(chart.jiaoYun.days, label).toBeGreaterThanOrEqual(0);
      expect(chart.jiaoYun.days, label).toBeLessThanOrEqual(32); // a 节 month can span 32 calendar days
      expect(chart.daYun).toHaveLength(10);
      const step = yun.isForward() ? 1 : -1;
      const m = SIXTY.indexOf(chart.pillars.month.ganZhi);
      chart.daYun.forEach((d, k) => {
        expect(d.pillar.ganZhi, label).toBe(SIXTY[(((m + step * (k + 1)) % 60) + 60) % 60]);
        expect(d.endYear - d.startYear, label).toBe(9);
        if (k > 0) expect(d.startYear, label).toBe(chart.daYun[k - 1].endYear + 1);
      });
      expect(chart.daYun[0].startYear, label).toBe(yun.getStartSolar().getYear());
      const part = yearItems(chart, 0)[0].jiaoYun ?? 0;
      expect(part, label).toBeGreaterThanOrEqual(0);
      expect(part, label).toBeLessThanOrEqual(1);
    }
  });
});

describe('choosing the flows (SPEC §5.3)', () => {
  const chart = castBazi(SHOT, '男');
  const columns = (f: Flows) =>
    flowColumns(chart, f).map((c) => `${['大运', '流年', '流月', '流日', '流时'][c.level]}${c.item ? ` ${c.item.pillar.ganZhi}` : ''}`);

  it('starts with nothing chosen and the 大运 listed: the columns are 大运 and 流年', () => {
    expect(NO_FLOWS).toEqual({ chosen: [], level: 0 });
    expect(columns(NO_FLOWS)).toEqual(['大运', '流年']);
    expect(stripLines(chart, NO_FLOWS)).toBeNull();
  });

  it('chooses a 大运, then a year, each time listing the next level', () => {
    const dy = choose(NO_FLOWS, 0, 2);
    expect(dy).toEqual({ chosen: [2], level: 1 });
    expect(columns(dy)).toEqual(['大运 丁酉', '流年']);
    const yr = choose(dy, 1, 2026);
    expect(yr).toEqual({ chosen: [2, 2026], level: 2 });
    expect(columns(yr)).toEqual(['大运 丁酉', '流年 丙午', '流月']);
  });

  it('goes down to the 时辰, and stays there', () => {
    let f = choose(choose(NO_FLOWS, 0, 2), 1, 2026);
    f = choose(choose(f, 2, 9), 3, 17);
    expect(f).toEqual({ chosen: [2, 2026, 9, 17], level: 4 });
    expect(columns(f)).toEqual(['大运 丁酉', '流年 丙午', '流月 己亥', '流日 壬寅', '流时']);
    f = choose(f, 4, 12);
    expect(f).toEqual({ chosen: [2, 2026, 9, 17, 12], level: 4 });
    expect(columns(f).at(-1)).toBe('流时 壬子');
  });

  it('choosing again at a level drops what was chosen below it', () => {
    const f = choose({ chosen: [2, 2026, 9, 17], level: 1 }, 1, 2027);
    expect(f).toEqual({ chosen: [2, 2027], level: 2 });
  });

  it('lists a chosen level again, keeping its columns; ⊗ clears a level and those below', () => {
    const deep: Flows = { chosen: [2, 2026, 9], level: 3 };
    expect(showLevel(deep, 1)).toEqual({ chosen: [2, 2026, 9], level: 1 });
    expect(columns(showLevel(deep, 1))).toEqual(['大运 丁酉', '流年 丙午', '流月 己亥']);
    expect(showLevel(deep, 4)).toBe(deep); // not reachable yet
    expect(clearFrom(deep, 1)).toEqual({ chosen: [2], level: 1 });
    expect(columns(clearFrom(deep, 1))).toEqual(['大运 丁酉', '流年']);
  });

  it('names the level above in the strip: the 大运’s ages, the 流年’s age, the 流月’s 节, the 流日’s date', () => {
    expect(stripLines(chart, { chosen: [2], level: 1 })).toEqual(['25', '|', '34', '岁']);
    expect(stripLines(chart, { chosen: [2, 2026], level: 2 })).toEqual(['30', '岁']);
    expect(stripLines(chart, { chosen: [2, 2026, 9], level: 3 })).toEqual(['立', '冬']);
    expect(stripLines(chart, { chosen: [2, 2026, 9, 17], level: 4 })).toEqual(['24', '/', '11']);
  });

  it('steps the level above, crossing into the next 大运, year or month, and drops the listed level’s choice', () => {
    expect(step(chart, { chosen: [2], level: 1 }, 1)).toEqual({ chosen: [3], level: 1 });
    expect(step(chart, { chosen: [2, 2030], level: 2 }, 1)).toEqual({ chosen: [3, 2031], level: 2 });
    expect(step(chart, { chosen: [2, 2026, 11], level: 3 }, 1)).toEqual({ chosen: [2, 2027, 0], level: 3 });
    expect(step(chart, { chosen: [2, 2026, 9, 29], level: 4 }, 1)).toEqual({ chosen: [2, 2026, 10, 0], level: 4 });
    expect(step(chart, { chosen: [2, 2026, 10, 0], level: 4 }, -1)).toEqual({ chosen: [2, 2026, 9, 29], level: 4 });
    expect(step(chart, { chosen: [2, 2026, 9], level: 2 }, 1)).toEqual({ chosen: [2, 2027], level: 2 });
  });

  it('stops at the ends of the chart: the first 大运’s first year, the last 大运', () => {
    const first: Flows = { chosen: [0, 2001], level: 2 };
    expect(step(chart, first, -1)).toEqual(first);
    const last: Flows = { chosen: [9], level: 1 };
    expect(step(chart, last, 1)).toEqual(last);
    expect(step(chart, NO_FLOWS, 1)).toEqual(NO_FLOWS);
  });
});
