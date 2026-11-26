// 流运 (SPEC §5.3): the grid of the listed level's items, five or six to a row, and from 流年 down a strip at its
// right that names the level above and steps it with ^ and ˅.
import type { CSSProperties } from 'react';
import { LEVEL_NAMES, itemsAt, stripLines, type Bazi, type Flows } from './bazi';
import { PillarView, type Fav, type Mode } from './PillarView';

function Chevron({ up }: { up: boolean }) {
  return (
    <svg className="icon chevron" viewBox="0 0 18 10.5" aria-hidden="true" focusable="false">
      <path d={up ? 'M1 9.5 9 1.5l8 8' : 'M1 1l8 8 8-8'} />
    </svg>
  );
}

export interface FlowGridProps {
  chart: Bazi;
  flows: Flows;
  mode: Mode;
  fav: Fav;
  onChoose(level: number, value: number): void;
  onStep(delta: 1 | -1): void;
}

export function FlowGrid({ chart, flows, mode, fav, onChoose, onStep }: FlowGridProps) {
  const { level, chosen } = flows;
  const items = itemsAt(chart, level, chosen);
  const perRow = level <= 1 ? 5 : 6;
  const strip = stripLines(chart, flows);
  const above = LEVEL_NAMES[level - 1];

  return (
    <section className="flow-view" aria-label={LEVEL_NAMES[level]}>
      <div
        className={`grid level-${level}`}
        data-k="grid"
        data-per-row={perRow}
        style={{ '--per-row': perRow, '--rows': Math.ceil(items.length / perRow) } as CSSProperties}
      >
        {items.map((item) => {
          const isChosen = chosen[level] === item.value;
          return (
            <button
              key={item.value}
              type="button"
              className={`grid-cell${item.jiaoYun ? ' jiao-yun' : ''}${isChosen ? ' chosen' : ''}`}
              data-value={item.value}
              style={item.jiaoYun ? ({ '--jy': item.jiaoYun } as CSSProperties) : undefined}
              aria-pressed={isChosen}
              onClick={() => onChoose(level, item.value)}
            >
              <span className="cell-head">
                {item.big && <span className="cell-big">{item.big}</span>}
                <span className="cell-small">{item.small}</span>
              </span>
              <PillarView pillar={item.pillar} mode={mode} fav={fav} kong={chart.dayKong.includes(item.pillar.branch)} />
            </button>
          );
        })}
      </div>
      {strip && (
        <div className="strip" data-k="strip">
          <button type="button" className="strip-btn" aria-label={`上一${above}`} onClick={() => onStep(-1)}>
            <Chevron up />
          </button>
          <span className="strip-text">
            {strip.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </span>
          <button type="button" className="strip-btn" aria-label={`下一${above}`} onClick={() => onStep(1)}>
            <Chevron up={false} />
          </button>
        </div>
      )}
    </section>
  );
}
