// The chart screen (SPEC §4): 关闭 and the 大盘 · 关系 · 神煞 tabs on top, the columns (flows in front of the four
// pillars, the year pillar on the right as 十三行八字 draws it), and the flow panel at the bottom.
import { useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import {
  ELEMENTS, STEM_ELEMENT, flowColumns, strength, yunText,
  type Bazi, type FlowLevel, type Pick, type Pillar,
} from './bazi';
import { FlowPanel } from './FlowPanel';
import { BranchCell, Parts, StemCell, color, el } from './PillarView';
import { analyze, type Line, type PairRelation, type RelColumn } from './relations';
import { shenSha } from './shensha';

export type View = 'table' | 'relations' | 'shensha';

const VIEWS: readonly (readonly [View, string])[] = [['table', '大盘'], ['relations', '关系'], ['shensha', '神煞']];

/** One column of the chart. */
export interface Column {
  /** Unique among the columns: a flow is keyed by its level, apart from the natal pillar of the same name. */
  key: string;
  /** The header: 流年, 大运, 童限, 时, 日, 月, 年 */
  label: string;
  /** Flows only: an age, a 节, a day … over a year or a date */
  big?: string;
  small?: string;
  /** What a pair relation calls this column: 流年, 大运, 时柱 … */
  name: string;
  /** Null for 童限 */
  pillar: Pillar | null;
  which: 'year' | 'month' | 'day' | 'hour' | 'flow';
}

/** The chart's columns, left to right: the chosen flows from the panel's level up to 大运, then 时 日 月 年. */
export function chartColumns(chart: Bazi, level: FlowLevel, pick: Pick): Column[] {
  const { year, month, day, hour } = chart.pillars;
  return [
    ...flowColumns(chart, level, pick).map((f): Column => ({
      key: `flow-${f.level}`, label: f.label, big: f.big, small: f.small, name: f.label, pillar: f.pillar, which: 'flow',
    })),
    { key: 'hour', label: '时', name: '时柱', pillar: hour, which: 'hour' },
    { key: 'day', label: '日', name: '日柱', pillar: day, which: 'day' },
    { key: 'month', label: '月', name: '月柱', pillar: month, which: 'month' },
    { key: 'year', label: '年', name: '年柱', pillar: year, which: 'year' },
  ];
}

/** The relations among the columns that have a pillar, with their column numbers as the chart counts them. */
export function chartRelations(chart: Bazi, columns: readonly Column[]) {
  const at = columns.flatMap((c, i) => (c.pillar ? [i] : []));
  const cols: RelColumn[] = at.map((i) => ({ name: columns[i].name, stem: columns[i].pillar!.stem, branch: columns[i].pillar!.branch }));
  const rel = analyze(cols, chart.dayMaster, chart.pillars.month.branch);
  const line = (l: Line): Line => ({
    ...l,
    members: l.members.map((m) => ({ ...m, col: at[m.col] })),
    ...(l.toward === undefined ? {} : { toward: at[l.toward] }),
  });
  return {
    stemLines: rel.stemLines.map(line),
    branchLines: rel.branchLines.map(line),
    pairs: rel.pairs.map((p): PairRelation => ({ ...p, col: at[p.col], other: at[p.other] })),
    selfCombined: rel.selfCombined.map((i) => at[i]),
  };
}

const x = (col: number, n: number) => `${((col + 0.5) / n) * 100}%`;

/** From a dot's center to what sits beside it: the dot's radius and a little air (styles.css .dot). */
const BESIDE = 12.5;

/** Where a line's label goes: on the line after its first character, after its last, or before its first. */
type Place = 'start' | 'end' | 'before';

/**
 * One relation drawn across the columns: a line from its first character to its last, a dot on each, and the
 * label on the line just after the first dot, as 十三行八字 draws it. Where the next dot is too close for the label
 * (adjacent columns on a phone), the label moves past the last dot, or else before the first, so that it never
 * covers a character or the 冲 arrow; the arrow sits on the stretch of line the label leaves between the first two.
 */
function LineRow({ line, n }: { line: Line; n: number }) {
  const first = line.members[0];
  const last = line.members[line.members.length - 1];
  const second = line.members[1];
  const attacker = line.toward === first.col ? second : first;
  const row = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place>('start');
  const shape = `${line.members.map((m) => m.col).join()}/${n}/${line.count}/${line.parts.map((p) => p.text).join('')}`;

  useLayoutEffect(() => {
    const box = row.current;
    if (!box) return;
    const measure = () => {
      const [label, gap, dot] = ['.rel-label', '.gap', '.dot'].map((s) => box.querySelector<HTMLElement>(s));
      if (!label || !gap || !dot) return;
      const arrow = box.querySelector<HTMLElement>('.arrow');
      const width = box.clientWidth;
      const center = (col: number) => ((col + 0.5) / n) * width;
      const beside = dot.offsetWidth / 2 + 1;
      const wide = label.offsetWidth;
      if (wide + (arrow ? arrow.offsetWidth * 2 : 4) <= gap.clientWidth) setPlace('start');
      else if (center(last.col) + beside + wide <= width) setPlace('end');
      else if (center(first.col) - beside - wide >= 0) setPlace('before');
      else setPlace('start');
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(box);
    return () => watch.disconnect();
  }, [shape, n, first.col, last.col]);

  const beside = `${BESIDE} * var(--u)`;
  const segment = {
    left: x(first.col, n),
    width: `${((last.col - first.col) / n) * 100}%`,
    '--from': color(first.element),
    '--to': color(last.element),
  } as CSSProperties;
  const gap = { left: `calc(${x(first.col, n)} + ${beside})`, width: `calc(${((second.col - first.col) / n) * 100}% - 2 * ${beside})` };
  const outside = place === 'end'
    ? { left: `calc(${x(last.col, n)} + ${beside})` }
    : { right: `calc(${((n - first.col - 0.5) / n) * 100}% + ${beside})` };
  const label = (
    <span className="rel-label">
      {line.count > 1 && <span className="badge">{line.count}</span>}
      <Parts parts={line.parts} />
    </span>
  );
  return (
    <div className={`line-row ${line.level}`} data-kind={line.kind} data-place={place} ref={row}>
      <span className={`seg${line.kind === '冲' ? ' dashed' : ''}`} style={segment} />
      {line.members.map((m) => (
        <span key={m.col} className={`dot ${el(m.element)}`} style={{ left: x(m.col, n) }}>{m.char}</span>
      ))}
      <span className="gap" style={gap}>
        {place === 'start' && label}
        {line.toward !== undefined && (
          <span className="arrow-slot">
            <span className={`arrow ${el(attacker.element)}`} aria-hidden="true">{line.toward === first.col ? '‹' : '›'}</span>
          </span>
        )}
      </span>
      {place !== 'start' && <span className="label-out" style={outside}>{label}</span>}
    </div>
  );
}

function PairText({ name, other, otherFirst }: { name: string; other?: string; otherFirst?: boolean }) {
  const n = <span className="pair-name">{name}</span>;
  const o = other && <span className="pair-other">{other}</span>;
  return <span className="pair">{otherFirst ? <>{o}{n}</> : <>{n}{o}</>}</span>;
}

const GOOD = /贵人|德|禄|喜|赦|金舆|天医|将星/;

/** The rows the 大盘 tab adds under the pillars, each with a caption above it. */
const DETAIL_ROWS: readonly (readonly [string, (p: Pillar) => string])[] = [
  ['纳音', (p) => p.naYin],
  ['星运', (p) => p.xingYun],
  ['自坐', (p) => p.ziZuo],
  ['空亡', (p) => p.kong],
];

function InfoCard({ chart }: { chart: Bazi }) {
  const { scores, verdict } = strength(chart);
  const [startDate] = chart.yun.start.split(' ');
  const [y, m, d] = startDate.split('-').map(Number);
  const yearStem = '甲乙丙丁戊己庚辛壬癸'[((y - 4) % 10 + 10) % 10];
  const rows: [string, string][] = [
    ['农历', `${chart.lunarText} · 属${chart.zodiac}`],
    ['节气', `${chart.jie.prev.name} ${chart.jie.prev.time} 后，${chart.jie.next.name} ${chart.jie.next.time} 前`],
    ['起运', `${yunText(chart.yun)}（${chart.yun.forward ? '顺排' : '逆排'}）`],
    ['交运', `${y}年${m}月${d}日交运，此后每逢${yearStem}年${m}月${d}日换运`],
    ['胎命', `胎元 ${chart.taiYuan} · 命宫 ${chart.mingGong} · 身宫 ${chart.shenGong}`],
    ['五行', `${ELEMENTS.map((e) => `${e}${scores[e]}`).join(' ')} · 日主${chart.dayMaster}${STEM_ELEMENT[chart.dayMaster]}${verdict}`],
  ];
  return (
    <dl className="info" data-k="info">
      {rows.map(([k, v]) => (
        <div key={k} className="info-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface ChartScreenProps {
  chart: Bazi;
  view: View;
  level: FlowLevel;
  pick: Pick;
  panelOpen: boolean;
  /** The chart's heading, which takes focus when the chart opens */
  headingRef?: Ref<HTMLHeadingElement>;
  onBack(): void;
  onView(view: View): void;
  onLevel(level: FlowLevel): void;
  onChoose(level: FlowLevel, value: number): void;
  onToday(): void;
  onTogglePanel(): void;
}

export function ChartScreen(props: ChartScreenProps) {
  const { chart, view, level, pick, headingRef } = props;
  const columns = chartColumns(chart, level, pick);
  const n = columns.length;
  const rel = chartRelations(chart, columns);
  const pairsUnder = (i: number) => rel.pairs.filter((p) => p.col === i);

  return (
    <div className="screen chart-screen">
      <header className="topbar">
        <button type="button" className="close" onClick={props.onBack}>关闭</button>
        <div className="topbar-center">
          <div className="segmented" role="group" aria-label="显示">
            {VIEWS.map(([v, text]) => (
              <button key={v} type="button" className="seg-btn" data-k={`view-${v}`} aria-pressed={view === v} onClick={() => props.onView(v)}>
                {text}
              </button>
            ))}
          </div>
        </div>
        <span className="topbar-side">{chart.qianKun}</span>
      </header>

      <main className="chart-main">
        <h1 className="chart-heading" ref={headingRef} tabIndex={-1} data-k="heading">
          <span className="qiankun">{chart.qianKun}</span> {chart.solarText}
          <span className="lunar"> · {chart.lunarText}</span>
        </h1>
        {view === 'table' && <InfoCard chart={chart} />}

        <div className="chart-scroll">
          <div className={`chart view-${view}`} style={{ '--n': n } as CSSProperties} data-k="chart">
            {view === 'relations' && (
              <div className="lines above" data-k="stem-lines">
                {[...rel.stemLines].reverse().map((l, i) => <LineRow key={i} line={l} n={n} />)}
              </div>
            )}

            <div className="row heads">
              {columns.map((c) => (
                <div key={c.key} className={`head${c.which === 'flow' ? ' flow' : ''}`} data-col={c.key}>
                  {c.big !== undefined && <span className="big">{c.big}</span>}
                  {c.small !== undefined && <span className="small">{c.small}</span>}
                  <span className="col-label">{c.label}</span>
                </div>
              ))}
            </div>
            <div className="row stems" data-k="stems">
              {columns.map((c) => (
                <div key={c.key} className="cell">{c.pillar ? <StemCell pillar={c.pillar} /> : <span className="empty">童</span>}</div>
              ))}
            </div>
            <div className="row branches" data-k="branches">
              {columns.map((c) => (
                <div key={c.key} className="cell">{c.pillar ? <BranchCell pillar={c.pillar} /> : <span className="empty">限</span>}</div>
              ))}
            </div>

            {view === 'relations' && (
              <>
                <div className="row pairs" data-k="pairs">
                  {columns.map((c, i) => (
                    <div key={c.key} className="cell">
                      {pairsUnder(i).map((p) => (
                        <PairText key={p.other} name={p.name} other={columns[p.other].name} otherFirst={p.otherFirst} />
                      ))}
                      {rel.selfCombined.includes(i) && <PairText name="天地合" />}
                    </div>
                  ))}
                </div>
                <div className="lines below" data-k="branch-lines">
                  {rel.branchLines.map((l, i) => <LineRow key={i} line={l} n={n} />)}
                </div>
              </>
            )}

            {view === 'shensha' && (
              <div className="row shensha" data-k="shensha">
                {columns.map((c) => (
                  <div key={c.key} className="cell">
                    {c.pillar && shenSha(chart, c.pillar, c.which).map((s) => (
                      <span key={s} className={`sha${GOOD.test(s) ? ' good' : ''}`}>{s}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {view === 'table' && DETAIL_ROWS.map(([caption, value]) => (
              <div key={caption} className="detail">
                <div className="caption">{caption}</div>
                <div className="row" data-k={`detail-${caption}`}>
                  {columns.map((c) => <div key={c.key} className="cell">{c.pillar ? value(c.pillar) : '—'}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <FlowPanel
        chart={chart}
        level={level}
        pick={pick}
        open={props.panelOpen}
        onLevel={props.onLevel}
        onChoose={props.onChoose}
        onToday={props.onToday}
        onToggle={props.onTogglePanel}
      />
    </div>
  );
}
