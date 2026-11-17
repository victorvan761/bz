// The input screen (SPEC §3): 性别, the birth time and its wheel picker, the 夜子时 rule, then 排盘.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref, type RefObject } from 'react';
import { castBazi, type Gender, type Settings } from './bazi';
import { DatePicker } from './DatePicker';
import { parseInput } from './time';

/** '2008-04-18T18:00' as the field prints it: 2008年04月18日 18:00. */
const fieldText = (value: string): string => value.replace(/^(\d+)-(\d+)-(\d+)T(.+)$/, '$1年$2月$3日 $4');

const MIN_FONT_PX = 10;

/** Shrinks an element's text until it fits its box, down to 10 px, so a narrow phone shows the whole time. */
function useFitText(ref: RefObject<HTMLElement | null>, text: string): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '';
      if (el.scrollWidth <= el.clientWidth) return;
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth && size > MIN_FONT_PX) {
        size = Math.max(MIN_FONT_PX, size - 0.5);
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    return () => observer.disconnect();
  }, [ref, text]);
}

function CalendarIcon() {
  return (
    <svg className="icon calendar-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" />
    </svg>
  );
}

/** A row of two buttons, one pressed. */
function Choice<T extends string>({ label, options, value, onChange, k }: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange(value: T): void;
  k: string;
}) {
  return (
    <div className="choice" role="group" aria-label={label} data-k={k}>
      {options.map(([option, text]) => (
        <button key={option} type="button" className="choice-btn" aria-pressed={value === option} onClick={() => onChange(option)}>
          {text}
        </button>
      ))}
    </div>
  );
}

const GENDERS = [['男', '男 · 乾造'], ['女', '女 · 坤造']] as const;
const LATE_ZI = [['next', '算次日'], ['same', '算当日']] as const;

export interface InputScreenProps {
  /** The birth minute as 'YYYY-MM-DDTHH:mm', always a real one from 1900 to 2100 */
  value: string;
  gender: Gender;
  lateZi: Settings['lateZi'];
  /** 排盘, for focus to return to after going back */
  castRef?: Ref<HTMLButtonElement>;
  onChange(value: string): void;
  onGender(gender: Gender): void;
  onLateZi(lateZi: Settings['lateZi']): void;
  onCast(): void;
  onNow(): void;
}

export function InputScreen({ value, gender, lateZi, castRef, onChange, onGender, onLateZi, onCast, onNow }: InputScreenProps) {
  const [picking, setPicking] = useState(false);
  const field = useRef<HTMLButtonElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const text = fieldText(value);
  useFitText(time, text);

  // The four pillars of the time as it stands, so the effect of the 夜子时 rule shows before casting.
  const pillars = useMemo(() => {
    const t = parseInput(value);
    if (!t) return '';
    const { year, month, day, hour } = castBazi(t, gender, { lateZi }).pillars;
    return [year, month, day, hour].map((p) => p.ganZhi).join(' ');
  }, [value, gender, lateZi]);

  // When the wheels close, focus goes back to the field that opened them.
  const wasPicking = useRef(false);
  useEffect(() => {
    if (wasPicking.current && !picking) field.current?.focus();
    wasPicking.current = picking;
  }, [picking]);

  return (
    <div className="screen input-screen">
      <header className="band" />
      {/* Behind the wheels the screen is out of reach, for the keyboard and screen readers too. */}
      <main className="input-main" inert={picking}>
        <section className="card input-card">
          <h1 className="title">八字排盘</h1>
          <div className="fields">
            <div className="field">
              <span className="label" id="gender-label">性别：</span>
              <Choice label="性别" k="gender" options={GENDERS} value={gender} onChange={onGender} />
            </div>
            <div className="field">
              <span className="label" id="picker-label">出生时间：</span>
              <button
                type="button"
                className="picker"
                ref={field}
                aria-labelledby="picker-label picker-text"
                aria-haspopup="dialog"
                onClick={() => setPicking(true)}
              >
                <span className="picker-text" id="picker-text" data-k="picker" ref={time}>{text}</span>
                <CalendarIcon />
              </button>
            </div>
            <div className="field">
              <span className="label">夜子时：</span>
              <Choice label="夜子时（23:00–23:59）的日柱" k="late-zi" options={LATE_ZI} value={lateZi} onChange={onLateZi} />
            </div>
            <div className="field">
              <span className="label">四柱：</span>
              <span className="value pillars-preview" data-k="preview">{pillars}</span>
            </div>
          </div>
          <p className="note">按北京时间排盘，不作真太阳时校正。起运按出生到节气的分钟数精确计算。</p>
        </section>
        <button type="button" className="btn primary" ref={castRef} onClick={onCast}>排盘</button>
        <button type="button" className="btn secondary" onClick={onNow}>现在</button>
      </main>
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
