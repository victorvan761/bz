// How a pillar and a relation label are drawn, shared by the chart's columns and the flow panel's cards.
import { STEM_ELEMENT, BRANCH_ELEMENT, SHI_SHEN_NAME, type Pillar, type WuXing } from './bazi';
import type { Part } from './relations';

const ELEMENT_CLASS: Readonly<Record<WuXing, string>> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };

/** The class that gives text, and the --c variable, an element's color. */
export const el = (element: WuXing): string => `el-${ELEMENT_CLASS[element]}`;

/** An element's color, for inline styles. */
export const color = (element: WuXing): string => `var(--${ELEMENT_CLASS[element]})`;

/** The stem, and its 十神 beside it in the stem's color. The day master has none. */
export function StemCell({ pillar }: { pillar: Pillar }) {
  const cls = el(STEM_ELEMENT[pillar.stem]);
  return (
    <span className="stem-cell">
      <span className={`char ${cls}`}>{pillar.stem}</span>
      {pillar.god && <span className={`god ${cls}`} title={SHI_SHEN_NAME[pillar.god]}>{pillar.god}</span>}
    </span>
  );
}

/** The branch, and beside it each hidden stem's 十神 with the stem itself small, 本气 first. */
export function BranchCell({ pillar }: { pillar: Pillar }) {
  return (
    <span className="branch-cell">
      <span className={`char ${el(BRANCH_ELEMENT[pillar.branch])}`}>{pillar.branch}</span>
      <span className="hidden-stems">
        {pillar.hidden.map((h) => (
          <span key={h.stem} className={`hid ${el(STEM_ELEMENT[h.stem])}`} title={`${h.stem} ${SHI_SHEN_NAME[h.god]}`}>
            {h.god}
            <small>{h.stem}</small>
          </span>
        ))}
      </span>
    </span>
  );
}

/** A relation's label, its 化神 in that element's color: 合财成化. */
export function Parts({ parts }: { parts: readonly Part[] }) {
  return (
    <>
      {parts.map((p, i) => (p.element ? <span key={i} className={el(p.element)}>{p.text}</span> : p.text))}
    </>
  );
}
