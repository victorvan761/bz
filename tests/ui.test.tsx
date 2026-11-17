// The screens (SPEC §3–§5), rendered to static markup: what the reference chart shows in each tab and at each flow
// level, the input screen, and the reducer behind them. tests/html.ts parses the markup, so no DOM is needed.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initialState, reducer, type AppState } from '../src/App';
import { castBazi, pickAt, type FlowLevel } from '../src/bazi';
import { ChartScreen, chartColumns, type View } from '../src/ChartScreen';
import { InputScreen } from '../src/InputScreen';
import { field, findAll, hasClass, parseHtml, text, textRuns, type El } from './html';
import { REF } from './reference';

const render = (el: ReactElement) => parseHtml(renderToStaticMarkup(el));
const noop = () => {};
const NOW = { year: 2020, month: 4, day: 18, hour: 18, minute: 0 };

function chartScreen(view: View, level: FlowLevel = 'year') {
  const chart = castBazi(REF, '女');
  return render(
    <ChartScreen
      chart={chart} view={view} level={level} pick={pickAt(chart, NOW)} panelOpen
      onBack={noop} onView={noop} onLevel={noop} onChoose={noop} onToday={noop} onTogglePanel={noop}
    />,
  );
}

/** The text of each cell in a row of the chart. */
const cells = (row: El) => row.children.filter((c): c is El => typeof c !== 'string').map(text);
const byClass = (scope: El, c: string) => findAll(scope, (e) => hasClass(e, c));

describe('the chart in the 关系 tab, 流年 2020 chosen', () => {
  const page = chartScreen('relations');

  it('heads the columns 流年 and 大运 with their ages and years, then 时 日 月 年', () => {
    const heads = byClass(page, 'head').map((h) => textRuns(h).join(' '));
    expect(heads).toEqual(['12 2020 流年', '4 2012 大运', '时', '日', '月', '年']);
  });

  it('writes the stems with their 十神 and the branches with their hidden stems', () => {
    expect(cells(field(page, 'stems'))).toEqual(['庚食', '乙官', '辛伤', '戊', '丙卩', '戊比']);
    expect(cells(field(page, 'branches'))).toEqual(['子财癸', '卯官乙', '酉伤辛', '子财癸', '辰比戊官乙财癸', '子财癸']);
  });

  it('colors each character by its element', () => {
    const chars = byClass(field(page, 'stems'), 'char');
    expect(chars.map((c) => c.attrs.class)).toEqual(
      ['char el-metal', 'char el-wood', 'char el-metal', 'char el-earth', 'char el-fire', 'char el-earth'],
    );
  });

  it('draws the stem lines above, farthest first, and the branch lines below, nearest first', () => {
    const labels = (k: string) => byClass(field(page, k), 'rel-label').map(text);
    expect(labels('stem-lines')).toEqual(['合伤成化', '冲', '合财成化']);
    expect(labels('branch-lines')).toEqual(['半合财成化', '半合财成化', '合伤成化', '冲', '2无礼之刑', '无礼之刑', '半合财成化']);
  });

  it('puts a dot on every character a line joins, filled for branches', () => {
    const rows = byClass(field(page, 'branch-lines'), 'line-row');
    expect(byClass(rows[4], 'dot').map(text)).toEqual(['卯', '子', '子']);
    expect(rows[3].attrs['data-kind']).toBe('冲');
    expect(byClass(rows[3], 'arrow').map(text)).toEqual(['‹']); // 酉 attacks 卯, to its left
  });

  it('lists the pair relations under the left column, and 天地合 under both 戊子', () => {
    expect(cells(field(page, 'pairs'))).toEqual(['月柱克会合刑大运', '时柱反吟', '双合月柱', '伏吟年柱天地合', '', '天地合']);
  });
});

describe('the flow panel', () => {
  const cards = (level: FlowLevel) => byClass(chartScreen('relations', level), 'flow-card');

  it('lists the 大运’s years latest first, with 2020 chosen, each with its relations', () => {
    const years = cards('year');
    expect(years.map((c) => c.attrs['data-value'])).toEqual(
      ['2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012'],
    );
    expect(years.filter((c) => c.attrs['aria-pressed'] === 'true').map((c) => c.attrs['data-value'])).toEqual(['2020']);
    const rels = (c: El) => byClass(c, 'ce').map(text);
    expect(rels(years[0])).toEqual(['同会时柱', '冲', '合财成化', '半合伤成化', '2合比成化']);
    expect(rels(years[1])).toEqual(['月柱克会', '合刑大运', '合伤成化', '无礼之刑', '半合财成化']);
  });

  it('lists 童限 and ten 大运 at the 大运 level, and the chart then shows the 大运 alone before the pillars', () => {
    const dayun = cards('dayun');
    expect(dayun).toHaveLength(11);
    expect(textRuns(dayun.at(-1)!).slice(0, 3)).toEqual(['0', '2008', '童限']);
    const page = chartScreen('relations', 'dayun');
    expect(byClass(page, 'head').map((h) => textRuns(h).join(' '))).toEqual(['4 2012 大运', '时', '日', '月', '年']);
  });

  it('keys every column apart, so a 流年 never takes the 年柱’s place when the flows change', () => {
    const chart = castBazi(REF, '女');
    for (const level of ['hour', 'day', 'month', 'year', 'dayun'] as const) {
      const keys = chartColumns(chart, level, pickAt(chart, NOW)).map((c) => c.key);
      expect(new Set(keys).size, level).toBe(keys.length);
    }
  });

  it('adds 流月, 流日 and 流时 columns at the finer levels', () => {
    const page = chartScreen('relations', 'hour');
    expect(byClass(page, 'col-label').map(text)).toEqual(['流时', '流日', '流月', '流年', '大运', '时', '日', '月', '年']);
    expect(cards('month').map((c) => textRuns(c)[0])).toEqual(
      ['小寒', '大雪', '立冬', '寒露', '白露', '立秋', '小暑', '芒种', '立夏', '清明', '惊蛰', '立春'],
    );
  });
});

describe('the 神煞 and 大盘 tabs', () => {
  it('神煞 lists each column’s stars', () => {
    const page = chartScreen('shensha');
    expect(cells(field(page, 'shensha'))).toEqual(['将星', '天医红鸾', '桃花天喜', '将星', '太极贵人华盖红艳煞', '将星']);
  });

  it('大盘 adds the birth facts, and 纳音 星运 自坐 空亡 for every column', () => {
    const page = chartScreen('table');
    const info = textRuns(field(page, 'info'));
    expect(info).toContain('出生后4年8个月1天6小时起运（逆排）');
    expect(info).toContain('胎元 丁未 · 命宫 丙辰 · 身宫 甲寅');
    expect(cells(field(page, 'detail-纳音'))).toEqual(['壁上土', '大溪水', '石榴木', '霹雳火', '沙中土', '霹雳火']);
    expect(cells(field(page, 'detail-星运'))).toEqual(['胎', '沐浴', '死', '胎', '冠带', '胎']);
  });

  it('the heading names the chart', () => {
    expect(text(field(chartScreen('relations'), 'heading'))).toBe('坤造 2008年4月18日 18:00 · 戊子年 三月十三 酉时');
  });
});

describe('the input screen', () => {
  const page = render(
    <InputScreen value="2008-04-18T23:30" gender="女" lateZi="same" onChange={noop} onGender={noop} onLateZi={noop} onCast={noop} onNow={noop} />,
  );

  it('shows the time, the pressed choices and the pillars they give', () => {
    expect(text(field(page, 'picker'))).toBe('2008年04月18日 23:30');
    const pressed = (k: string) => findAll(field(page, k), (e) => e.attrs['aria-pressed'] === 'true').map(text);
    expect(pressed('gender')).toEqual(['女 · 坤造']);
    expect(pressed('late-zi')).toEqual(['算当日']);
    // 夜子时 kept on the calendar day: 戊子日, with the next day's 子时 stem.
    expect(text(field(page, 'preview'))).toBe('戊子 丙辰 戊子 甲子');
  });
});

describe('the reducer', () => {
  const start = (): AppState => ({ ...initialState('2008-04-18T18:00'), gender: '女' });

  it('casts the chart on the screen’s time, with the flows of now', () => {
    const s = reducer(start(), { type: 'cast', now: '2020-04-18T18:00' });
    expect(s.screen).toBe('chart');
    expect(s.chart?.pillars.day.ganZhi).toBe('戊子');
    expect(s.pick).toEqual({ dayun: 1, year: 2020, month: 2, day: 14, hour: 9 });
  });

  it('keeps only real times from the date picker', () => {
    expect(reducer(start(), { type: 'setInput', value: '2008-02-30T10:00' }).input).toBe('2008-04-18T18:00');
    expect(reducer(start(), { type: 'setInput', value: '2008-02-29T10:00' }).input).toBe('2008-02-29T10:00');
  });

  it('chooses cards, goes back to today, and keeps the chart when going back', () => {
    let s = reducer(start(), { type: 'cast', now: '2020-04-18T18:00' });
    s = reducer(s, { type: 'choose', level: 'dayun', value: 3 });
    expect(s.pick).toMatchObject({ dayun: 3, year: 2032 });
    s = reducer(s, { type: 'today', now: '2020-04-18T18:00' });
    expect(s.pick).toMatchObject({ dayun: 1, year: 2020 });
    const back = reducer(s, { type: 'back' });
    expect([back.screen, back.chart]).toEqual(['input', s.chart]);
  });

  it('opens a history entry: the same chart as it was, or a new cast', () => {
    const s = reducer(start(), { type: 'cast', now: '2020-04-18T18:00' });
    const back = reducer(s, { type: 'back' });
    const same = reducer(back, { type: 'open', entry: { input: '2008-04-18T18:00', gender: '女', lateZi: 'next' }, now: '2030-01-01T00:00' });
    expect(same.chart).toBe(s.chart);
    const other = reducer(back, { type: 'open', entry: { input: '1990-01-01T08:00', gender: '男', lateZi: 'next' }, now: '2020-04-18T18:00' });
    expect(other.chart?.pillars.year.ganZhi).toBe('己巳');
    expect(other.gender).toBe('男');
  });
});
