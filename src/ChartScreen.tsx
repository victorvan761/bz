// The chart screen (SPEC §5): 返回 and the 十神 · 藏干 · 更多 control on top; the columns, 时 日 月 年 then the
// flows; under them the view; and the views at the bottom: 资料, 流运, 神煞, 关系.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { LEVEL_NAMES, birthText, favorable, flowColumns, type Bazi, type Flows, type Pillar } from './bazi';
import { FlowGrid } from './FlowGrid';
import { InfoView, type InfoTab } from './InfoView';
import { PillarView, inkBeside, wx, type Fav, type Mode } from './PillarView';
import { analyze, type Label, type Line } from './relations';
import { shenSha } from './shensha';
import type { BirthTime } from './time';

export type { InfoTab, Mode };
export type View = '资料' | '流运' | '神煞' | '关系';

const VIEWS: readonly View[] = ['资料', '流运', '神煞', '关系'];
const MODES: readonly Mode[] = ['十神', '藏干', '五行'];

// ── The columns ──────────────────────────────────────────────────────────────────────────────────────────────

/** One column of the chart. */
export interface Column {
  /** Unique among the columns: a flow is keyed by its level, apart from the natal pillar of the same name */
  key: string;
  /** 时 日 月 年, or the flow's level: 大运 流年 流月 流日 流时 */
  label: string;
  which: 'year' | 'month' | 'day' | 'hour' | 'flow';
  /** Flows only: 0 (大运) to 4 (流时) */
  level: number | null;
  /** Flows only: the two lines that say what is chosen, '25' over '2021'; empty while nothing is */
  big: string;
  small: string;
  /** Null for a flow level with nothing chosen */
  pillar: Pillar | null;
  /** Its place in the order of relation lines: 年 0, 月 1, 日 2, 时 3, 大运 4 … 流时 8 */
  order: number;
}

/** The chart's columns, left to right: 时 日 月 年, then the flows from 大运 down. */
export function chartColumns(chart: Bazi, flows: Flows): Column[] {
  const { year, month, day, hour } = chart.pillars;
  const natal = (which: Column['which'], label: string, pillar: Pillar, order: number): Column =>
    ({ key: which, label, which, level: null, big: '', small: '', pillar, order });
  return [
    natal('hour', '时', hour, 3),
    natal('day', '日', day, 2),
    natal('month', '月', month, 1),
    natal('year', '年', year, 0),
    ...flowColumns(chart, flows).map(({ level, item }): Column => ({
      key: `flow-${level}`,
      label: LEVEL_NAMES[level],
      which: 'flow',
      level,
      big: item?.big ?? '',
      small: item?.small ?? '',
      pillar: item?.pillar ?? null,
      order: 4 + level,
    })),
  ];
}

/** The relation lines among the columns that hold a pillar, numbered by column as the chart shows them. */
export function chartRelations(chart: Bazi, columns: readonly Column[]) {
  const at = columns.flatMap((c, i) => (c.pillar ? [i] : []));
  const rel = analyze(
    at.map((i) => ({ order: columns[i].order, stem: columns[i].pillar!.stem, branch: columns[i].pillar!.branch })),
    chart.dayMaster,
    chart.pillars.month.branch,
  );
  const renumber = (l: Line): Line => ({ ...l, members: l.members.map((m) => ({ ...m, col: at[m.col] })) });
  return { stemLines: rel.stemLines.map(renumber), branchLines: rel.branchLines.map(renumber) };
}

function ClearIcon() {
  return (
    <svg className="icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <circle cx="9" cy="9" r="8" />
      <path d="M5.8 5.8l6.4 6.4M12.2 5.8l-6.4 6.4" />
    </svg>
  );
}

interface ColumnsProps {
  chart: Bazi;
  columns: readonly Column[];
  flows: Flows;
  view: View;
  mode: Mode;
  fav: Fav;
  onShow(level: number): void;
  onClear(level: number): void;
}

/**
 * The header of a column: 时 日 月 年 in gray; a flow's level, on a purple tag while the grid lists it (but in 关系),
 * light gray while it can't be reached yet, then what is chosen there. A flow column that can be reached is a button
 * that lists its level.
 */
function ColumnHead({ column, flows, view, onShow }: { column: Column } & Pick<ColumnsProps, 'flows' | 'view' | 'onShow'>) {
  const { level } = column;
  if (level === null) {
    return (
      <div className="col-head">
        <span className="col-label">{column.label}</span>
      </div>
    );
  }
  const tagged = view !== '关系' && flows.level === level;
  const reachable = level <= flows.chosen.length;
  const body = (
    <>
      <span className={`col-label${tagged ? ' tag' : ''}${reachable ? '' : ' off'}`}>{column.label}</span>
      {column.big && <span className="col-big">{column.big}</span>}
      {column.small && <span className="col-small">{column.small}</span>}
    </>
  );
  if (!reachable) return <div className="col-head">{body}</div>;
  return (
    <button type="button" className="col-head" aria-current={tagged ? 'true' : undefined} onClick={() => onShow(level)}>
      {body}
    </button>
  );
}

function Columns({ chart, columns, flows, view, mode, fav, onShow, onClear }: ColumnsProps) {
  return (
    <div className="cols" data-k="cols" style={{ '--n': columns.length } as CSSProperties}>
      {columns.map((c) => {
        const { level } = c;
        return (
          <div key={c.key} className={`col ${level === null ? 'natal' : 'flow'}`} data-col={c.key}>
            <div className="col-top">
              <ColumnHead column={c} flows={flows} view={view} onShow={onShow} />
              {c.pillar && <PillarView pillar={c.pillar} mode={mode} fav={fav} kong={chart.dayKong.includes(c.pillar.branch)} />}
              {view !== '关系' && level !== null && level < flows.chosen.length && (
                <button type="button" className="clear" aria-label={`清除${c.label}`} onClick={() => onClear(level)}>
                  <ClearIcon />
                </button>
              )}
            </div>
            {view === '神煞' && c.pillar && (
              <div className="sha-list">
                <span className="xing">{c.pillar.xingYun}</span>
                <span className="xing">坐{c.pillar.ziZuo}</span>
                {shenSha(chart, c.pillar, c.which).map((s, i) => (
                  <span key={i} className={s.length > 3 ? 'sha long' : 'sha'}>{s}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 关系 ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** 冲 and 刑 are drawn dark green; the 合 family light green. */
const CLASH: readonly string[] = ['冲', '刑', '三刑'];

/**
 * A line's label: its word, then for a combination the 化神 and its 十神 in the colors of what stands beside a
 * character (五色 in the 五行 mode), and 成化 or 不化. The 十神 is the 十神 mode's only.
 */
function LabelView({ label, mode, fav }: { label: Label; mode: Mode; fav: Fav }) {
  const cls = label.element ? (mode === '五行' ? wx(label.element) : inkBeside(fav, label.element)) : undefined;
  return (
    <span className="rel-label">
      {label.word}
      {label.element && <b className={cls}>{label.element}</b>}
      {mode === '十神' && label.god && (
        <>
          (<b className={cls}>{label.god}</b>)
        </>
      )}
      {label.result && <small>{label.result}</small>}
    </span>
  );
}

/** One relation: a line from its first character to its last, a dot on each, and the label above its middle. */
function RelRow({ line, mode, fav }: { line: Line; mode: Mode; fav: Fav }) {
  const from = line.members[0].col;
  const to = line.members[line.members.length - 1].col;
  return (
    <div
      className={`rel-row ${CLASH.includes(line.kind) ? 'clash' : 'combine'}`}
      data-kind={line.kind}
      style={{ '--from': from, '--to': to } as CSSProperties}
    >
      <span className="rel-seg" />
      {line.members.map((m) => (
        <span
          key={m.col}
          className={`rel-dot ${line.level === 'stem' ? 'ring' : 'filled'}`}
          data-col={m.col}
          style={{ '--at': m.col } as CSSProperties}
        >
          {m.char}
        </span>
      ))}
      <LabelView label={line.label} mode={mode} fav={fav} />
    </div>
  );
}

function RelLines({ k, lines, mode, fav }: { k: string; lines: readonly Line[]; mode: Mode; fav: Fav }) {
  return (
    <div className="rel-lines" data-k={k}>
      {lines.map((line) => (
        <RelRow key={line.members.map((m) => m.col).join() + line.kind} line={line} mode={mode} fav={fav} />
      ))}
    </div>
  );
}

// ── 更多 ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The sheet 更多 opens: 十神, 藏干, 五行, then 取消. */
export function MoreSheet({ mode, onPick, onCancel }: { mode: Mode; onPick(mode: Mode): void; onCancel(): void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };
  return (
    <div className="more-layer" onKeyDown={onKeyDown}>
      <div className="more-backdrop" onClick={onCancel} />
      <div className="more-sheet" role="dialog" aria-modal="true" aria-label="更多">
        <div className="more-group">
          {MODES.map((m, i) => (
            <button
              key={m}
              ref={i === 0 ? first : undefined}
              type="button"
              className="sheet-btn"
              aria-pressed={mode === m}
              onClick={() => onPick(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <button type="button" className="sheet-btn cancel" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

// ── The screen ───────────────────────────────────────────────────────────────────────────────────────────────

export interface ChartScreenProps {
  chart: Bazi;
  /** The present moment, for 虚岁 */
  now: BirthTime;
  mode: Mode;
  view: View;
  infoTab: InfoTab;
  flows: Flows;
  /** The chart's heading, which takes focus when the chart opens */
  headingRef?: Ref<HTMLHeadingElement>;
  onBack(): void;
  onMode(mode: Mode): void;
  onView(view: View): void;
  onInfoTab(tab: InfoTab): void;
  onChoose(level: number, value: number): void;
  onShowLevel(level: number): void;
  onClear(level: number): void;
  onStep(delta: 1 | -1): void;
}

export function ChartScreen(props: ChartScreenProps) {
  const { chart, mode, view, flows } = props;
  const [more, setMore] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const fav = favorable(chart);
  const columns = chartColumns(chart, flows);

  // When the sheet closes, focus goes back to 更多.
  const wasMore = useRef(false);
  useEffect(() => {
    if (wasMore.current && !more) moreButton.current?.focus();
    wasMore.current = more;
  }, [more]);

  /** A flow column tapped: the grid lists its level. */
  const show = (level: number) => {
    props.onShowLevel(level);
    if (view !== '流运') props.onView('流运');
  };
  const cols = (
    <Columns chart={chart} columns={columns} flows={flows} view={view} mode={mode} fav={fav} onShow={show} onClear={props.onClear} />
  );

  let body;
  if (view === '关系') {
    const rel = chartRelations(chart, columns);
    body = (
      <div className="cols-scroll rel-scroll">
        <div className="rel-view" style={{ '--n': columns.length } as CSSProperties}>
          <div className="col-bgs" aria-hidden="true">
            {columns.map((c) => (
              <span key={c.key} className={`col-bg ${c.level === null ? 'natal' : 'flow'}`} />
            ))}
          </div>
          <RelLines k="stem-lines" lines={rel.stemLines} mode={mode} fav={fav} />
          {cols}
          <RelLines k="branch-lines" lines={rel.branchLines} mode={mode} fav={fav} />
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="cols-scroll">{cols}</div>
        {view === '资料' && <InfoView chart={chart} now={props.now} tab={props.infoTab} onTab={props.onInfoTab} />}
        {view === '流运' && <FlowGrid chart={chart} flows={flows} mode={mode} fav={fav} onChoose={props.onChoose} onStep={props.onStep} />}
      </>
    );
  }

  return (
    <div className="screen chart-screen" data-view={view}>
      <div className="chart-frame" inert={more}>
        <header className="chart-top">
          <button type="button" className="back" data-k="back" onClick={props.onBack}>返回</button>
          <div className="segmented modes" role="group" aria-label="显示" data-k="modes">
            {(['十神', '藏干'] as const).map((m) => (
              <button key={m} type="button" className="seg" aria-pressed={mode === m} onClick={() => props.onMode(m)}>
                {m}
              </button>
            ))}
            <button type="button" className="seg" ref={moreButton} aria-haspopup="dialog" onClick={() => setMore(true)}>
              更多
            </button>
          </div>
          <span className="top-side" />
        </header>
        <h1 className="sr-only" ref={props.headingRef} tabIndex={-1}>
          {chart.gender === '男' ? '乾造' : '坤造'} {birthText(chart)}
        </h1>
        <main className="chart-main">{body}</main>
        <nav className="chart-bottom" aria-label="视图">
          <div className="segmented views" role="group" data-k="views">
            {VIEWS.map((v) => (
              <button key={v} type="button" className="seg" aria-pressed={view === v} onClick={() => props.onView(v)}>
                {v}
              </button>
            ))}
          </div>
        </nav>
      </div>
      {more && (
        <MoreSheet
          mode={mode}
          onPick={(m) => {
            setMore(false);
            props.onMode(m);
          }}
          onCancel={() => setMore(false)}
        />
      )}
    </div>
  );
}
