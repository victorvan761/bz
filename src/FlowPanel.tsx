// The flow panel (SPEC §5): tabs for 流时 流日 流月 流年 大运, and a row of cards, the latest on the left as the
// columns run. Each card shows its pillar and how it meets the columns above it and the four pillars.
import { useLayoutEffect, useRef } from 'react';
import { LEVELS, LEVEL_NAME, chosenAt, flowColumns, itemsAt, type Bazi, type FlowItem, type FlowLevel, type Pick } from './bazi';
import { BranchCell, Parts, StemCell, el } from './PillarView';
import { cardEntries, type CardEntry, type RelColumn } from './relations';

/** The columns a card at this level is read against: the chosen flows above it, then 时 日 月 年. */
function contextOf(chart: Bazi, level: FlowLevel, pick: Pick): RelColumn[] {
  const { year, month, day, hour } = chart.pillars;
  const above = flowColumns(chart, level, pick)
    .slice(1)
    .flatMap((f) => (f.pillar ? [{ name: f.label, stem: f.pillar.stem, branch: f.pillar.branch }] : []));
  const natal = ([['时柱', hour], ['日柱', day], ['月柱', month], ['年柱', year]] as const)
    .map(([name, p]) => ({ name, stem: p.stem, branch: p.branch }));
  return [...above, ...natal];
}

function Entry({ entry }: { entry: CardEntry }) {
  if (entry.type !== 'line') {
    const name = <span className="pair-name">{entry.name}</span>;
    const other = entry.type === 'pair' && <span className="pair-other">{entry.other}</span>;
    return <span className="ce">{entry.type === 'pair' && entry.otherFirst ? <>{other}{name}</> : <>{name}{other}</>}</span>;
  }
  return (
    <span className="ce">
      <i className={`mark ${entry.level} ${el(entry.element)}`} aria-label={entry.level === 'stem' ? '天干' : '地支'} />
      {entry.count > 1 && <span className="badge">{entry.count}</span>}
      <Parts parts={entry.parts} />
    </span>
  );
}

function Card({ item, chosen, context, chart, onChoose }: {
  item: FlowItem;
  chosen: boolean;
  context: RelColumn[];
  chart: Bazi;
  onChoose(): void;
}) {
  const p = item.pillar;
  const entries = p
    ? cardEntries([{ name: item.label, stem: p.stem, branch: p.branch }, ...context], chart.dayMaster, chart.pillars.month.branch)
    : [];
  return (
    <button type="button" className="flow-card" aria-pressed={chosen} data-value={item.value} onClick={onChoose}>
      <span className="card-head">
        <span className="big">{item.big}</span>
        <span className="small">{item.small}</span>
      </span>
      {p ? (
        <span className="card-pillar">
          <StemCell pillar={p} />
          <BranchCell pillar={p} />
        </span>
      ) : (
        <span className="card-pillar tong">童限</span>
      )}
      <span className="card-rels">{entries.map((e, i) => <Entry key={i} entry={e} />)}</span>
    </button>
  );
}

function ClockIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  );
}

export interface FlowPanelProps {
  chart: Bazi;
  level: FlowLevel;
  pick: Pick;
  open: boolean;
  onLevel(level: FlowLevel): void;
  onChoose(level: FlowLevel, value: number): void;
  onToday(): void;
  onToggle(): void;
}

export function FlowPanel({ chart, level, pick, open, onLevel, onChoose, onToday, onToggle }: FlowPanelProps) {
  const items = itemsAt(chart, level, pick);
  const chosen = chosenAt(chart, level, pick).value;
  const context = contextOf(chart, level, pick);
  const row = useRef<HTMLDivElement>(null);

  // Keep the chosen card in view, in the middle of the row when the row can scroll that far.
  useLayoutEffect(() => {
    const box = row.current;
    const card = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!box || !card) return;
    box.scrollLeft = card.offsetLeft - (box.clientWidth - card.offsetWidth) / 2;
  }, [level, chosen, items.length, open]);

  return (
    <section className={`flow-panel${open ? '' : ' closed'}`} aria-label="流运">
      <div className="flow-bar">
        <button type="button" className="icon-btn" aria-label="回到今天" data-k="today" onClick={onToday}>
          <ClockIcon />
        </button>
        <div className="flow-tabs" role="group" aria-label="流运层级">
          {LEVELS.map((l) => (
            <button key={l} type="button" className="flow-tab" data-k={`level-${l}`} aria-pressed={l === level} onClick={() => onLevel(l)}>
              {LEVEL_NAME[l]}
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn" aria-label={open ? '收起' : '展开'} aria-expanded={open} onClick={onToggle}>
          <ChevronIcon up={!open} />
        </button>
      </div>
      {open && (
        <div className="flow-cards" ref={row} data-k="cards">
          {[...items].reverse().map((item) => (
            <Card
              key={item.value}
              item={item}
              chosen={item.value === chosen}
              context={context}
              chart={chart}
              onChoose={() => onChoose(level, item.value)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
