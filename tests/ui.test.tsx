// The screens (SPEC §3, §5), rendered to static markup: the screenshots' chart in each view and mode, the flow grid
// at each level, the input screen, and the reducer behind them. tests/html.ts parses the markup, so no DOM is needed.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initialState, reducer, type AppState } from '../src/App';
import { NO_FLOWS, castBazi, type Flows } from '../src/bazi';
import { ChartScreen, MoreSheet, chartColumns, type InfoTab, type Mode, type View } from '../src/ChartScreen';
import { InputScreen } from '../src/InputScreen';
import { clockLine, dateLine } from '../src/time';
import { field, findAll, hasClass, parseHtml, text, textRuns, type El } from './html';
import { SHOT, SHOT_NOW } from './reference';

const render = (el: ReactElement) => parseHtml(renderToStaticMarkup(el));
const noop = () => {};
const chart = castBazi(SHOT, '男');

interface Shown {
  view?: View;
  mode?: Mode;
  flows?: Flows;
  infoTab?: InfoTab;
}

function chartScreen({ view = '资料', mode = '十神', flows = NO_FLOWS, infoTab = '基本资料' }: Shown = {}) {
  return render(
    <ChartScreen
      chart={chart} now={SHOT_NOW} mode={mode} view={view} infoTab={infoTab} flows={flows}
      onBack={noop} onMode={noop} onView={noop} onInfoTab={noop}
      onChoose={noop} onShowLevel={noop} onClear={noop} onStep={noop}
    />,
  );
}

const byClass = (scope: El, c: string) => findAll(scope, (e) => hasClass(e, c));
const pressed = (scope: El) => findAll(scope, (e) => e.attrs['aria-pressed'] === 'true').map(text);
const colsOf = (page: El) => byClass(field(page, 'cols'), 'col');
const heads = (page: El) => byClass(field(page, 'cols'), 'col-head').map((h) => textRuns(h).join(' '));
/** Each column's stem (or branch) with what stands at its right: '辛伤', '午印劫'; '' for an empty flow column. */
const part = (page: El, which: 'p-stem' | 'p-branch') =>
  colsOf(page).map((c) => byClass(c, which).map(text).join(''));
/** The color classes of a column's characters: its stem or branch first, then what stands beside it. */
const inks = (scope: El) =>
  findAll(scope, (e) => hasClass(e, 'p-char') || hasClass(e, 'p-ann')).map((e) => (e.attrs.class ?? '').split(' ').filter((c) => /^(ink|wx)-/.test(c)).join());

describe('the chart screen’s frame (SPEC §5.1)', () => {
  const page = chartScreen();

  it('has 返回, the 十神 · 藏干 · 更多 control and the four views, opening on 资料 in the 十神 mode', () => {
    expect(text(field(page, 'back'))).toBe('返回');
    expect(byClass(field(page, 'modes'), 'seg').map(text)).toEqual(['十神', '藏干', '更多']);
    expect(pressed(field(page, 'modes'))).toEqual(['十神']);
    expect(byClass(field(page, 'views'), 'seg').map(text)).toEqual(['资料', '流运', '神煞', '关系']);
    expect(pressed(field(page, 'views'))).toEqual(['资料']);
  });

  it('selects no segment in the 五行 mode, which 更多 offers', () => {
    expect(pressed(field(chartScreen({ mode: '五行' }), 'modes'))).toEqual([]);
    const sheet = render(<MoreSheet mode="五行" onPick={noop} onCancel={noop} />);
    expect(byClass(sheet, 'sheet-btn').map(text)).toEqual(['十神', '藏干', '五行', '取消']);
    expect(pressed(sheet)).toEqual(['五行']);
  });
});

describe('the columns (SPEC §5.2)', () => {
  it('shows 时 日 月 年, then 大运 tagged and 流年 not yet reachable', () => {
    const page = chartScreen();
    expect(heads(page)).toEqual(['时', '日', '月', '年', '大运', '流年']);
    expect(byClass(page, 'tag').map(text)).toEqual(['大运']);
    expect(byClass(page, 'off').map(text)).toEqual(['流年']);
    expect(byClass(page, 'clear')).toEqual([]);
  });

  it('writes each stem with its 十神, each branch with its 藏干’s 十神, and 空 under 午', () => {
    const page = chartScreen();
    expect(part(page, 'p-stem')).toEqual(['辛伤', '戊', '甲杀', '丙卩', '', '']);
    expect(part(page, 'p-branch')).toEqual(['酉伤', '子财', '午印劫', '子财', '', '']);
    expect(colsOf(page).map((c) => byClass(c, 'kong').length)).toEqual([0, 0, 1, 0, 0, 0]);
  });

  it('colors stems and branches by 喜忌, blue or red, and what stands beside them the other way', () => {
    const [hour, day, month] = colsOf(chartScreen());
    expect(inks(hour)).toEqual(['ink-red', 'ink-blue', 'ink-red', 'ink-blue']);
    expect(inks(day)).toEqual(['ink-blue', 'ink-red', 'ink-blue']);
    expect(inks(month)).toEqual(['ink-blue', 'ink-red', 'ink-blue', 'ink-red', 'ink-red']);
  });

  it('in the 藏干 mode, writes the stems alone and the branches with their 藏干', () => {
    const page = chartScreen({ mode: '藏干' });
    expect(part(page, 'p-stem')).toEqual(['辛', '戊', '甲', '丙', '', '']);
    expect(part(page, 'p-branch')).toEqual(['酉辛', '子癸', '午丁己', '子癸', '', '']);
    expect(inks(colsOf(page)[2])).toEqual(['ink-blue', 'ink-blue', 'ink-red', 'ink-red']);
  });

  it('in the 五行 mode, writes each element beside its character in 五色', () => {
    const page = chartScreen({ mode: '五行' });
    expect(part(page, 'p-stem')).toEqual(['辛金', '戊土', '甲木', '丙火', '', '']);
    expect(part(page, 'p-branch')).toEqual(['酉金', '子水', '午火', '子水', '', '']);
    expect(inks(colsOf(page)[0])).toEqual(['ink-red', 'wx-metal', 'ink-red', 'wx-metal']);
    expect(inks(colsOf(page)[2])).toEqual(['ink-blue', 'wx-wood', 'ink-blue', 'wx-fire']);
  });

  it('names a chosen flow by its age and year, with ⊗ to clear it, and tags the level the grid lists', () => {
    const page = chartScreen({ view: '流运', flows: { chosen: [2], level: 1 } });
    expect(heads(page)).toEqual(['时', '日', '月', '年', '大运 25 2021', '流年']);
    expect(part(page, 'p-stem').slice(4)).toEqual(['丁印', '']);
    expect(byClass(page, 'tag').map(text)).toEqual(['流年']);
    expect(byClass(page, 'clear').map((b) => b.attrs['aria-label'])).toEqual(['清除大运']);
  });

  it('adds a column for each finer level chosen or listed', () => {
    const page = chartScreen({ view: '流运', flows: { chosen: [2, 2026, 9, 17], level: 4 } });
    expect(heads(page)).toEqual(['时', '日', '月', '年', '大运 25 2021', '流年 30 2026', '流月 立冬 7/11', '流日 24/11', '流时']);
    expect(byClass(page, 'tag').map(text)).toEqual(['流时']);
    const hour = chartScreen({ view: '流运', flows: { chosen: [2, 2026, 9, 17, 1], level: 4 } });
    expect(heads(hour).at(-1)).toBe('流时 丑 1 - 3');
  });

  it('keys every column apart, so a 流年 never takes the 年柱’s place when the flows change', () => {
    for (const flows of [NO_FLOWS, { chosen: [2], level: 1 }, { chosen: [2, 2026, 9, 17, 3], level: 4 }]) {
      const keys = chartColumns(chart, flows).map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('资料 (SPEC §4.4)', () => {
  it('lists the 基本资料 and the estimate', () => {
    const page = chartScreen();
    expect(pressed(field(page, 'info-tabs'))).toEqual(['基本资料']);
    expect(byClass(field(page, 'info'), 'info-row').map((r) => textRuns(r).join(' '))).toEqual([
      '基本资料 阳男 肖鼠 虚岁 31',
      '出生日期 1996年 6月20日 下午6:00 酉时 农历 一九九六年 五月初五',
      '交大运 出生后 5年 5个月 20天 起运 逢辛丙年 大雪后 3天 交大运',
    ]);
    expect(text(field(page, 'estimate'))).toBe('系统估算：身弱 (得令，失地，失势)');
  });

  it('lists 命宫 身宫 胎元 胎息 with their 纳音', () => {
    const page = chartScreen({ infoTab: '命身胎息' });
    expect(pressed(field(page, 'info-tabs'))).toEqual(['命身胎息']);
    expect(byClass(field(page, 'info'), 'info-row').map((r) => textRuns(r).join(' '))).toEqual([
      '命宫 庚寅 松柏木', '身宫 壬辰 长流水', '胎元 乙酉 泉中水', '胎息 癸丑 桑柘木',
    ]);
  });
});

describe('流运 (SPEC §5.3)', () => {
  const grid = (flows: Flows) => {
    const page = chartScreen({ view: '流运', flows });
    const cells = byClass(field(page, 'grid'), 'grid-cell');
    return {
      page,
      perRow: field(page, 'grid').attrs['data-per-row'],
      cells,
      heads: cells.map((c) => byClass(c, 'cell-head').map((h) => textRuns(h).join(' ')).join()),
      pillars: cells.map((c) => byClass(c, 'p-char').map(text).join('')),
      strip: findAll(page, (e) => e.attrs['data-k'] === 'strip'),
    };
  };

  it('lists the ten 大运, five to a row, with no strip', () => {
    const g = grid(NO_FLOWS);
    expect(g.perRow).toBe('5');
    expect(g.heads).toEqual(['5 2001', '15 2011', '25 2021', '35 2031', '45 2041', '55 2051', '65 2061', '75 2071', '85 2081', '95 2091']);
    expect(g.pillars).toEqual(['乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯', '甲辰']);
    expect(g.cells.map((c) => c.attrs['aria-pressed'])).toEqual(Array(10).fill('false'));
    expect(g.strip).toEqual([]);
  });

  it('lists a 大运’s years, its 交运 year gray, with the 大运’s ages in the strip', () => {
    const g = grid({ chosen: [2], level: 1 });
    expect(g.heads).toEqual(['25 2021', '26 2022', '27 2023', '28 2024', '29 2025', '30 2026', '31 2027', '32 2028', '33 2029', '34 2030']);
    expect(g.cells.map((c) => hasClass(c, 'jiao-yun'))).toEqual([true, false, false, false, false, false, false, false, false, false]);
    expect(g.cells[0].attrs.style).toMatch(/--jy:\s*0\.8469/);
    expect(textRuns(byClass(g.strip[0], 'strip-text')[0])).toEqual(['25', '|', '34', '岁']);
    expect(byClass(g.strip[0], 'strip-btn').map((b) => b.attrs['aria-label'])).toEqual(['上一大运', '下一大运']);
  });

  it('tints the chosen cell of the listed level', () => {
    const g = grid({ chosen: [2, 2026], level: 1 });
    expect(g.cells.filter((c) => c.attrs['aria-pressed'] === 'true').map((c) => c.attrs['data-value'])).toEqual(['2026']);
    expect(g.cells.filter((c) => hasClass(c, 'chosen')).map((c) => c.attrs['data-value'])).toEqual(['2026']);
  });

  it('lists a year’s twelve months, six to a row, each by its 节 and date', () => {
    const g = grid({ chosen: [2, 2026], level: 2 });
    expect(g.perRow).toBe('6');
    expect(g.heads.slice(0, 3)).toEqual(['立春 4/2', '惊蛰 5/3', '清明 5/4']);
    expect(g.heads.at(-1)).toBe('小寒 5/1');
    expect(textRuns(byClass(g.strip[0], 'strip-text')[0])).toEqual(['30', '岁']);
    expect(byClass(g.strip[0], 'strip-btn').map((b) => b.attrs['aria-label'])).toEqual(['上一流年', '下一流年']);
  });

  it('lists a month’s days by date, and a day’s thirteen 时辰', () => {
    const days = grid({ chosen: [2, 2026, 9], level: 3 });
    expect(days.cells).toHaveLength(30);
    expect([days.heads[0], days.heads[17]]).toEqual(['7/11', '24/11']);
    expect(days.pillars[17]).toBe('壬寅');
    expect(textRuns(byClass(days.strip[0], 'strip-text')[0])).toEqual(['立', '冬']);
    const hours = grid({ chosen: [2, 2026, 9, 17], level: 4 });
    expect(hours.heads).toHaveLength(13);
    expect([hours.heads[0], hours.heads[1], hours.heads[12]]).toEqual(['子 0 - 1', '丑 1 - 3', '子 23 - 24']);
    expect(textRuns(byClass(hours.strip[0], 'strip-text')[0])).toEqual(['24', '/', '11']);
  });
});

describe('神煞 (SPEC §5.4, §7)', () => {
  it('lists 星运, 自坐 and the stars under each column: the screenshot with 大运 丁酉 and 流年 丙午', () => {
    const page = chartScreen({ view: '神煞', flows: { chosen: [2, 2026], level: 1 } });
    expect(byClass(field(page, 'cols'), 'sha-list').map(textRuns)).toEqual([
      ['死', '坐临官', '月德合', '天喜', '天喜', '咸池', '咸池'],
      ['胎', '坐胎', '将星', '六秀日', '飞刃', '九丑'],
      ['帝旺', '坐死', '灾煞', '羊刃'],
      ['胎', '坐胎', '月德', '将星', '飞刃'],
      ['死', '坐长生', '天喜', '天喜', '咸池', '咸池'],
      ['帝旺', '坐帝旺', '月德', '灾煞', '羊刃'],
    ]);
  });
});

describe('关系 (SPEC §6)', () => {
  const lines = (page: El, k: string) => byClass(field(page, k), 'rel-row');
  const labels = (page: El, k: string) => lines(page, k).map((r) => text(byClass(r, 'rel-label')[0]));

  it('draws the natal 冲 alone, and tags no level', () => {
    const page = chartScreen({ view: '关系' });
    expect(labels(page, 'stem-lines')).toEqual([]);
    expect(labels(page, 'branch-lines')).toEqual(['冲', '冲']);
    expect(byClass(page, 'tag')).toEqual([]);
  });

  it('draws the screenshot’s lines with 大运 丁酉 and 流年 丙午, a dot on each character', () => {
    const page = chartScreen({ view: '关系', flows: { chosen: [2, 2026], level: 1 } });
    expect(labels(page, 'stem-lines')).toEqual(['合水(才)不化']);
    expect(labels(page, 'branch-lines')).toEqual(['冲', '冲', '刑', '冲', '冲', '刑']);
    const [he] = lines(page, 'stem-lines');
    expect(byClass(he, 'rel-dot').map((d) => [text(d), d.attrs['data-col'], hasClass(d, 'ring')])).toEqual([['辛', '0', true], ['丙', '5', true]]);
    const [chong] = lines(page, 'branch-lines');
    expect(byClass(chong, 'rel-dot').map((d) => [text(d), d.attrs['data-col'], hasClass(d, 'ring')])).toEqual([['午', '2', false], ['子', '3', false]]);
  });

  it('colors the 化神 and its 十神 as it colors what stands beside a character, and leaves the 十神 out in 藏干 and 五行', () => {
    const flows: Flows = { chosen: [2, 2026], level: 1 };
    const [he] = lines(chartScreen({ view: '关系', flows }), 'stem-lines');
    expect(byClass(he, 'ink-blue').map(text)).toEqual(['水', '才']);
    expect(labels(chartScreen({ view: '关系', flows, mode: '藏干' }), 'stem-lines')).toEqual(['合水不化']);
    const [wx] = lines(chartScreen({ view: '关系', flows, mode: '五行' }), 'stem-lines');
    expect(text(byClass(wx, 'rel-label')[0])).toBe('合水不化');
    expect(byClass(wx, 'wx-water').map(text)).toEqual(['水']);
  });
});

describe('the input screen (SPEC §3)', () => {
  const page = render(
    <InputScreen
      value="1996-06-20T18:00" gender="男" lateZi="next" now="2026-11-25T12:20"
      onChange={noop} onGender={noop} onLateZi={noop} onCast={noop} onCastNow={noop}
    />,
  );

  it('shows the birth minute on two lines, the pressed choices, and 起盘', () => {
    expect(text(field(page, 'title'))).toBe('八字排盘');
    expect(pressed(field(page, 'gender'))).toEqual(['男']);
    expect(textRuns(field(page, 'birth'))).toEqual(['1996年 6月20日', '下午6:00 酉时']);
    expect(pressed(field(page, 'late-zi'))).toEqual(['算次日']);
    expect(text(field(page, 'cast'))).toBe('起盘');
  });

  it('shows the present moment’s pillars, 时 日 月 年 from the left, on the 时空起盘 card', () => {
    const card = field(page, 'cast-now');
    expect(text(field(card, 'now-stems'))).toBe('戊癸己丙');
    expect(text(field(card, 'now-branches'))).toBe('午卯亥午');
    expect(textRuns(field(card, 'now-text'))).toEqual(['现在是', '2026年 11月25日', '下午12:20 午时']);
    expect(text(byClass(card, 'now-label')[0])).toBe('时空起盘');
  });

  it('writes the time on a 12-hour clock with its 时辰', () => {
    const t = (hour: number, minute: number) => ({ year: 2026, month: 1, day: 5, hour, minute });
    expect(dateLine(t(0, 5))).toBe('2026年 1月5日');
    expect([t(0, 5), t(11, 59), t(12, 0), t(13, 0), t(23, 30)].map(clockLine)).toEqual(
      ['上午12:05 子时', '上午11:59 午时', '下午12:00 午时', '下午1:00 未时', '下午11:30 子时'],
    );
  });
});

describe('the reducer', () => {
  const start = (): AppState => initialState('1996-06-20T18:00');

  it('starts on the input screen: 男, 算次日, at the given minute', () => {
    expect(start()).toMatchObject({ screen: 'input', input: '1996-06-20T18:00', gender: '男', lateZi: 'next', chart: null });
  });

  it('casts the chart and opens it on 资料, in the 十神 mode, with no flow chosen, every time', () => {
    let s = reducer(start(), { type: 'cast' });
    expect(s.screen).toBe('chart');
    expect(s.chart?.pillars.day.ganZhi).toBe('戊子');
    expect([s.view, s.mode, s.infoTab, s.flows]).toEqual(['资料', '十神', '基本资料', NO_FLOWS]);
    s = reducer(s, { type: 'setView', view: '关系' });
    s = reducer(s, { type: 'setMode', mode: '五行' });
    s = reducer(s, { type: 'setInfoTab', tab: '命身胎息' });
    s = reducer(s, { type: 'choose', level: 0, value: 2 });
    expect([s.view, s.mode, s.infoTab, s.flows]).toEqual(['关系', '五行', '命身胎息', { chosen: [2], level: 1 }]);
    s = reducer(reducer(s, { type: 'back' }), { type: 'cast' });
    expect([s.view, s.mode, s.infoTab, s.flows]).toEqual(['资料', '十神', '基本资料', NO_FLOWS]);
  });

  it('时空起盘 casts the present minute, leaving the birth minute as it was', () => {
    const s = reducer(start(), { type: 'castNow', now: '2026-11-25T12:20' });
    expect([s.chart?.pillars.year.ganZhi, s.chart?.pillars.hour.ganZhi]).toEqual(['丙午', '戊午']);
    expect(s.input).toBe('1996-06-20T18:00');
    expect(s.cast).toEqual({ input: '2026-11-25T12:20', gender: '男', lateZi: 'next', now: true });
  });

  it('keeps only real times from the date picker', () => {
    expect(reducer(start(), { type: 'setInput', value: '2008-02-30T10:00' }).input).toBe('1996-06-20T18:00');
    expect(reducer(start(), { type: 'setInput', value: '2008-02-29T10:00' }).input).toBe('2008-02-29T10:00');
  });

  it('chooses flows, lists a level again, steps and clears', () => {
    let s = reducer(start(), { type: 'cast' });
    s = reducer(s, { type: 'choose', level: 0, value: 2 });
    s = reducer(s, { type: 'choose', level: 1, value: 2026 });
    expect(s.flows).toEqual({ chosen: [2, 2026], level: 2 });
    s = reducer(s, { type: 'showLevel', level: 0 });
    expect(s.flows).toEqual({ chosen: [2, 2026], level: 0 });
    s = reducer(s, { type: 'showLevel', level: 1 });
    s = reducer(s, { type: 'step', delta: 1 });
    expect(s.flows).toEqual({ chosen: [3], level: 1 });
    s = reducer(s, { type: 'clear', level: 0 });
    expect(s.flows).toEqual(NO_FLOWS);
  });

  it('opens a history entry: the same chart as it was, or a new cast', () => {
    const s = reducer(reducer(start(), { type: 'cast' }), { type: 'setView', view: '神煞' });
    const back = reducer(s, { type: 'back' });
    const same = reducer(back, { type: 'open', entry: { input: '1996-06-20T18:00', gender: '男', lateZi: 'next' } });
    expect([same.screen, same.chart, same.view]).toEqual(['chart', s.chart, '神煞']);
    const other = reducer(back, { type: 'open', entry: { input: '2008-04-18T18:00', gender: '女', lateZi: 'next' } });
    expect([other.chart?.pillars.year.ganZhi, other.gender, other.view]).toEqual(['戊子', '女', '资料']);
    const broken = reducer(back, { type: 'open', entry: { input: 'nonsense', gender: '女', lateZi: 'next' } });
    expect(broken.screen).toBe('input');
  });

  it('after a reload, puts the reopened chart’s choices back on the input screen: the birth minute unless 时空起盘 cast it', () => {
    // A reload starts from the present minute, then opens the chart's history entry.
    const reloaded = initialState('2026-11-25T12:20');
    const birth = reducer(reloaded, { type: 'open', entry: { input: '2008-04-18T18:00', gender: '女', lateZi: 'same' } });
    expect(reducer(birth, { type: 'back' })).toMatchObject({ screen: 'input', input: '2008-04-18T18:00', gender: '女', lateZi: 'same' });
    const now = reducer(reloaded, { type: 'open', entry: { input: '2026-11-24T09:00', gender: '女', lateZi: 'same', now: true } });
    expect([now.screen, now.chart?.time.day, now.chart?.time.hour]).toEqual(['chart', 24, 9]);
    expect(reducer(now, { type: 'back' })).toMatchObject({ screen: 'input', input: '2026-11-25T12:20', gender: '女', lateZi: 'same' });
  });
});
