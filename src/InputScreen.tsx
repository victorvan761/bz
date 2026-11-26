// The input screen (SPEC §3): 男 or 女, the birth minute and its wheel picker, the 夜子时 rule, 起盘; and the
// 时空起盘 card, which casts the present minute.
import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { castBazi, type Gender, type Settings } from './bazi';
import { DatePicker } from './DatePicker';
import { clockLine, dateLine, parseInput } from './time';

/** A segmented control: buttons in a row, one pressed. */
function Segmented<T extends string>({ label, options, value, onChange, k }: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange(value: T): void;
  k: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label} data-k={k}>
      {options.map(([option, text]) => (
        <button key={option} type="button" className="seg" aria-pressed={value === option} onClick={() => onChange(option)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Chevron() {
  return (
    <svg className="icon row-chevron" viewBox="0 0 14 22" aria-hidden="true" focusable="false">
      <path d="M2 2l10 9-10 9" />
    </svg>
  );
}

const GENDERS = [['男', '男'], ['女', '女']] as const;
const LATE_ZI = [['next', '算次日'], ['same', '算当日']] as const;

export interface InputScreenProps {
  /** The birth minute as 'YYYY-MM-DDTHH:mm', always a real one from 1900 to 2100 */
  value: string;
  gender: Gender;
  lateZi: Settings['lateZi'];
  /** The present minute, as 'YYYY-MM-DDTHH:mm', for the 时空起盘 card */
  now: string;
  /** 起盘, for focus to return to after going back */
  castRef?: Ref<HTMLButtonElement>;
  onChange(value: string): void;
  onGender(gender: Gender): void;
  onLateZi(lateZi: Settings['lateZi']): void;
  onCast(): void;
  onCastNow(): void;
}

export function InputScreen({ value, gender, lateZi, now, castRef, onChange, onGender, onLateZi, onCast, onCastNow }: InputScreenProps) {
  const [picking, setPicking] = useState(false);
  const field = useRef<HTMLButtonElement>(null);
  const birth = parseInput(value);
  const present = parseInput(now);

  // The present moment's pillars, 时 日 月 年 from the left as the card shows them.
  const pillars = useMemo(() => {
    const t = parseInput(now);
    if (!t) return null;
    const { year, month, day, hour } = castBazi(t, gender, { lateZi }).pillars;
    return [hour, day, month, year];
  }, [now, gender, lateZi]);

  // When the wheels close, focus goes back to the row that opened them.
  const wasPicking = useRef(false);
  useEffect(() => {
    if (wasPicking.current && !picking) field.current?.focus();
    wasPicking.current = picking;
  }, [picking]);

  return (
    <div className="screen input-screen">
      {/* Behind the wheels the screen is out of reach, for the keyboard and screen readers too. */}
      <div className="input-frame" inert={picking}>
        <header className="input-top">
          <h1 className="input-title" data-k="title">八字排盘</h1>
        </header>
        <main className="input-main">
          <section className="group">
            <div className="group-row gender-row">
              <Segmented label="性别" k="gender" options={GENDERS} value={gender} onChange={onGender} />
            </div>
            <button
              type="button"
              className="group-row birth-row"
              ref={field}
              aria-haspopup="dialog"
              onClick={() => setPicking(true)}
            >
              <span className="row-label">出生日期</span>
              <span className="birth-value" data-k="birth">
                {birth && <span>{dateLine(birth)}</span>}
                {birth && <span>{clockLine(birth)}</span>}
              </span>
              <Chevron />
            </button>
            <div className="group-row late-zi-row">
              <span className="row-label">夜子时</span>
              <Segmented label="夜子时（23:00–23:59）的日柱" k="late-zi" options={LATE_ZI} value={lateZi} onChange={onLateZi} />
            </div>
            <button type="button" className="group-row cast-row" data-k="cast" ref={castRef} onClick={onCast}>起盘</button>
          </section>

          <button type="button" className="group now-card" data-k="cast-now" onClick={onCastNow}>
            {pillars && (
              <span className="now-pillars" aria-hidden="true">
                <span className="now-line" data-k="now-stems">{pillars.map((p) => p.stem).join('')}</span>
                <span className="now-line" data-k="now-branches">{pillars.map((p) => p.branch).join('')}</span>
              </span>
            )}
            {present && (
              <span className="now-text" data-k="now-text">
                <span>现在是</span>
                <span>{dateLine(present)}</span>
                <span>{clockLine(present)}</span>
              </span>
            )}
            <span className="now-label">时空起盘</span>
          </button>
        </main>
      </div>
      {picking && (
        <DatePicker
          value={value}
          onCancel={() => setPicking(false)}
          onConfirm={(picked) => {
            setPicking(false);
            onChange(picked);
          }}
        />
      )}
    </div>
  );
}
