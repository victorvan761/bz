// 资料 (SPEC §4.4, §5.4): the tabs 基本资料 and 命身胎息 on a gray bar, then the chosen tab's rows.
import { birthText, estimateText, jiaoYunText, naYin, profileText, yunText, type Bazi } from './bazi';
import type { BirthTime } from './time';

export type InfoTab = '基本资料' | '命身胎息';

const TABS: readonly InfoTab[] = ['基本资料', '命身胎息'];

/** A row: its name on the left, one or more lines of value on the right. */
function Row({ name, lines }: { name: string; lines: readonly string[] }) {
  return (
    <div className="info-row">
      <dt>{name}</dt>
      <dd>
        {lines.map((line) => (
          <span key={line} className="info-line">{line}</span>
        ))}
      </dd>
    </div>
  );
}

export interface InfoViewProps {
  chart: Bazi;
  /** The present moment, for 虚岁 */
  now: BirthTime;
  tab: InfoTab;
  onTab(tab: InfoTab): void;
}

export function InfoView({ chart, now, tab, onTab }: InfoViewProps) {
  return (
    <section className="info-view" aria-label="资料">
      <div className="info-tabs" role="group" aria-label="资料" data-k="info-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className="info-tab" aria-pressed={tab === t} onClick={() => onTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === '基本资料' ? (
        <>
          <dl className="info" data-k="info">
            <Row name="基本资料" lines={[profileText(chart, now)]} />
            <Row name="出生日期" lines={[birthText(chart), `农历 ${chart.lunarDate}`]} />
            <Row name="交大运" lines={[yunText(chart.yun), jiaoYunText(chart)]} />
          </dl>
          <p className="estimate" data-k="estimate">{estimateText(chart)}</p>
        </>
      ) : (
        <dl className="info" data-k="info">
          {([['命宫', chart.mingGong], ['身宫', chart.shenGong], ['胎元', chart.taiYuan], ['胎息', chart.taiXi]] as const).map(
            ([name, ganZhi]) => <Row key={name} name={name} lines={[`${ganZhi} ${naYin(ganZhi)}`]} />,
          )}
        </dl>
      )}
    </section>
  );
}
