// How a pillar is drawn in the chart's columns and the flow grid (SPEC §5.2): the stem over the branch, each with
// what the mode puts at its right, in the 喜忌 colors or in 五色; 空 under a branch the 日柱's 旬 leaves out.
import { BRANCH_ELEMENT, SHI_SHEN_NAME, STEM_ELEMENT, type Pillar, type WuXing } from './bazi';

/** What stands beside each stem and branch: 十神, 藏干 or 五行 (更多 offers the third). */
export type Mode = '十神' | '藏干' | '五行';

/** Whether each element is favorable, as `favorable` in bazi.ts gives it. */
export type Fav = Readonly<Record<WuXing, boolean>>;

const WX_CLASS: Readonly<Record<WuXing, string>> = { 木: 'wx-wood', 火: 'wx-fire', 土: 'wx-earth', 金: 'wx-metal', 水: 'wx-water' };

/** The class that draws an element's character in 五色. */
export const wx = (element: WuXing): string => WX_CLASS[element];

/** The class for a stem or a branch of an element: blue when it is favorable, red when not. */
export const ink = (fav: Fav, element: WuXing): string => (fav[element] ? 'ink-blue' : 'ink-red');

/** The class for what stands beside one (a 十神, a 藏干, a 化神): the other color of the two. */
export const inkBeside = (fav: Fav, element: WuXing): string => (fav[element] ? 'ink-red' : 'ink-blue');

interface Side {
  text: string;
  cls: string;
  title?: string;
}

/** What the mode puts beside the stem and beside the branch. */
function sides(pillar: Pillar, mode: Mode, fav: Fav): { stem: Side[]; branch: Side[] } {
  const stemElement = STEM_ELEMENT[pillar.stem];
  const branchElement = BRANCH_ELEMENT[pillar.branch];
  switch (mode) {
    case '十神':
      return {
        stem: pillar.god ? [{ text: pillar.god, cls: inkBeside(fav, stemElement), title: SHI_SHEN_NAME[pillar.god] }] : [],
        branch: pillar.hidden.map((h) => ({
          text: h.god, cls: inkBeside(fav, STEM_ELEMENT[h.stem]), title: `${h.stem} ${SHI_SHEN_NAME[h.god]}`,
        })),
      };
    case '藏干':
      return { stem: [], branch: pillar.hidden.map((h) => ({ text: h.stem, cls: inkBeside(fav, STEM_ELEMENT[h.stem]) })) };
    case '五行':
      return {
        stem: [{ text: stemElement, cls: wx(stemElement) }],
        branch: [{ text: branchElement, cls: wx(branchElement) }],
      };
  }
}

function SideStack({ items }: { items: Side[] }) {
  if (items.length === 0) return null;
  return (
    <span className="p-side">
      {items.map((s, i) => (
        <span key={i} className={`p-ann ${s.cls}`} title={s.title}>{s.text}</span>
      ))}
    </span>
  );
}

export interface PillarViewProps {
  pillar: Pillar;
  mode: Mode;
  fav: Fav;
  /** Whether its branch is one the 日柱's 旬 leaves out */
  kong: boolean;
}

/** A pillar. Spans throughout, so it can sit inside a grid cell's button. */
export function PillarView({ pillar, mode, fav, kong }: PillarViewProps) {
  const s = sides(pillar, mode, fav);
  return (
    <span className="pillar">
      <span className="p-stem">
        <span className={`p-char ${ink(fav, STEM_ELEMENT[pillar.stem])}`}>{pillar.stem}</span>
        <SideStack items={s.stem} />
      </span>
      <span className="p-branch">
        <span className={`p-char ${ink(fav, BRANCH_ELEMENT[pillar.branch])}`}>{pillar.branch}</span>
        <SideStack items={s.branch} />
      </span>
      {kong && <span className="kong" title="空亡">空</span>}
    </span>
  );
}
