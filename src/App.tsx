// The app: what it remembers, as a pure reducer, and the browser glue around its two screens (history, focus, the
// clock the 时空起盘 card and 虚岁 read).
import { useEffect, useReducer, useRef, useState } from 'react';
import {
  NO_FLOWS, castBazi, choose, clearFrom, showLevel, step,
  type Bazi, type Flows, type Gender, type Settings,
} from './bazi';
import { ChartScreen, type InfoTab, type Mode, type View } from './ChartScreen';
import { InputScreen } from './InputScreen';
import { parseInput } from './time';

// ── What the app remembers ───────────────────────────────────────────────────────────────────────────────────

/** What a chart is cast from. A chart's history entry keeps it, for Forward and reload. */
export interface Entry {
  /** 'YYYY-MM-DDTHH:mm', a real minute from 1900 to 2100 */
  input: string;
  gender: Gender;
  lateZi: Settings['lateZi'];
}

export interface AppState {
  screen: 'input' | 'chart';
  /** The input screen's choices */
  input: string;
  gender: Gender;
  lateZi: Settings['lateZi'];
  /** What the last chart was cast from: the input screen's choices, or the present minute for 时空起盘 */
  cast: Entry | null;
  /** The last chart; it stays when the user goes back */
  chart: Bazi | null;
  mode: Mode;
  view: View;
  infoTab: InfoTab;
  flows: Flows;
}

export type Action =
  /** A time confirmed in the date picker */
  | { type: 'setInput'; value: string }
  | { type: 'setGender'; gender: Gender }
  | { type: 'setLateZi'; lateZi: Settings['lateZi'] }
  /** 起盘: the input screen's choices */
  | { type: 'cast' }
  /** 时空起盘: the present minute */
  | { type: 'castNow'; now: string }
  /** A chart's history entry, on Forward or after a reload */
  | { type: 'open'; entry: Entry }
  | { type: 'back' }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setView'; view: View }
  | { type: 'setInfoTab'; tab: InfoTab }
  /** A cell chosen in the 流运 grid */
  | { type: 'choose'; level: number; value: number }
  /** A flow column tapped: the grid lists its level */
  | { type: 'showLevel'; level: number }
  /** ⊗ under a flow column */
  | { type: 'clear'; level: number }
  /** The strip's ^ (-1) or ˅ (1) */
  | { type: 'step'; delta: 1 | -1 };

/** `now` must be a real minute from 1900 to 2100, as clockInput gives. */
export const initialState = (now: string): AppState => ({
  screen: 'input',
  input: now,
  gender: '男',
  lateZi: 'next',
  cast: null,
  chart: null,
  mode: '十神',
  view: '资料',
  infoTab: '基本资料',
  flows: NO_FLOWS,
});

const sameEntry = (a: Entry, b: Entry) => a.input === b.input && a.gender === b.gender && a.lateZi === b.lateZi;

/** The chart for an entry, opened on 资料 in the 十神 mode with no flow chosen; null if its time isn't a real one. */
function castEntry(state: AppState, entry: Entry): AppState | null {
  const time = parseInput(entry.input);
  if (!time) return null;
  const chart = castBazi(time, entry.gender, { lateZi: entry.lateZi });
  return { ...state, cast: entry, chart, screen: 'chart', mode: '十神', view: '资料', infoTab: '基本资料', flows: NO_FLOWS };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setInput':
      return parseInput(action.value) ? { ...state, input: action.value } : state;
    case 'setGender':
      return { ...state, gender: action.gender };
    case 'setLateZi':
      return { ...state, lateZi: action.lateZi };
    case 'cast':
      return castEntry(state, { input: state.input, gender: state.gender, lateZi: state.lateZi }) ?? state;
    case 'castNow':
      return castEntry(state, { input: action.now, gender: state.gender, lateZi: state.lateZi }) ?? state;
    case 'open': {
      // On Forward the chart is usually still here: show it as it was. After a reload, cast it again.
      if (state.chart && state.cast && sameEntry(state.cast, action.entry)) return { ...state, screen: 'chart' };
      const { gender, lateZi } = action.entry;
      return castEntry({ ...state, gender, lateZi }, action.entry) ?? { ...state, screen: 'input' };
    }
    case 'back':
      return { ...state, screen: 'input' };
    case 'setMode':
      return { ...state, mode: action.mode };
    case 'setView':
      return { ...state, view: action.view };
    case 'setInfoTab':
      return { ...state, infoTab: action.tab };
    case 'choose':
      return { ...state, flows: choose(state.flows, action.level, action.value) };
    case 'showLevel':
      return { ...state, flows: showLevel(state.flows, action.level) };
    case 'clear':
      return { ...state, flows: clearFrom(state.flows, action.level) };
    case 'step':
      return state.chart ? { ...state, flows: step(state.chart, state.flows, action.delta) } : state;
  }
}

// ── The two screens, and the browser around them ─────────────────────────────────────────────────────────────
// Each cast pushes one history entry holding what it was cast from, so the back gesture returns to the input
// screen like 返回, and Forward or a reload shows that chart again.

const CHART_ENTRY = 'bazi-chart';

/** The entry a history state holds, or null for the input screen's. */
function entryIn(state: unknown): Entry | null {
  const e = (state as Record<string, unknown> | null)?.[CHART_ENTRY] as Partial<Entry> | undefined;
  if (!e || typeof e.input !== 'string' || (e.gender !== '男' && e.gender !== '女')) return null;
  return { input: e.input, gender: e.gender, lateZi: e.lateZi === 'same' ? 'same' : 'next' };
}

/** How often the app reads the clock again, for the 时空起盘 card and 虚岁. */
const TICK_MS = 10_000;

export interface AppProps {
  initial: AppState;
  /** The device clock's current minute as 'YYYY-MM-DDTHH:mm' */
  now(): string;
}

export function App({ initial, now }: AppProps) {
  // A reload keeps the current history entry: on a chart's entry, show that chart again.
  const [state, dispatch] = useReducer(reducer, initial, (s) => {
    const entry = entryIn(window.history.state);
    return entry ? reducer(s, { type: 'open', entry }) : s;
  });
  const [clock, setClock] = useState(now);
  const castButton = useRef<HTMLButtonElement>(null);
  const chartHeading = useRef<HTMLHeadingElement>(null);
  const shownScreen = useRef(state.screen);

  useEffect(() => {
    const id = window.setInterval(() => setClock(now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [now]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const entry = entryIn(e.state);
      dispatch(entry ? { type: 'open', entry } : { type: 'back' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Each screen replaces the other, taking the focused button with it. Move focus onto the new screen, as a page load
  // would: to the chart's heading after a cast, to 起盘 after going back. The first screen leaves focus alone.
  useEffect(() => {
    if (shownScreen.current === state.screen) return;
    shownScreen.current = state.screen;
    (state.screen === 'chart' ? chartHeading : castButton).current?.focus();
  }, [state.screen]);

  /** Opens a chart and keeps what it was cast from in its own history entry, for Forward and reload. */
  const open = (entry: Entry, action: Action) => {
    dispatch(action);
    window.history.pushState({ [CHART_ENTRY]: entry }, '');
    window.scrollTo(0, 0);
  };

  if (state.screen === 'chart' && state.chart) {
    return (
      <ChartScreen
        chart={state.chart}
        now={parseInput(clock) ?? state.chart.time}
        mode={state.mode}
        view={state.view}
        infoTab={state.infoTab}
        flows={state.flows}
        headingRef={chartHeading}
        onBack={() => {
          // Show the input screen first, so a quick second tap can't reach this button again and go back twice.
          dispatch({ type: 'back' });
          if (entryIn(window.history.state)) window.history.back(); // leave the chart's entry too
        }}
        onMode={(mode) => dispatch({ type: 'setMode', mode })}
        onView={(view) => dispatch({ type: 'setView', view })}
        onInfoTab={(tab) => dispatch({ type: 'setInfoTab', tab })}
        onChoose={(level, value) => dispatch({ type: 'choose', level, value })}
        onShowLevel={(level) => dispatch({ type: 'showLevel', level })}
        onClear={(level) => dispatch({ type: 'clear', level })}
        onStep={(delta) => dispatch({ type: 'step', delta })}
      />
    );
  }

  return (
    <InputScreen
      value={state.input}
      gender={state.gender}
      lateZi={state.lateZi}
      now={clock}
      castRef={castButton}
      onChange={(value) => dispatch({ type: 'setInput', value })}
      onGender={(gender) => dispatch({ type: 'setGender', gender })}
      onLateZi={(lateZi) => dispatch({ type: 'setLateZi', lateZi })}
      onCast={() => open({ input: state.input, gender: state.gender, lateZi: state.lateZi }, { type: 'cast' })}
      onCastNow={() => {
        const minute = now();
        setClock(minute);
        open({ input: minute, gender: state.gender, lateZi: state.lateZi }, { type: 'castNow', now: minute });
      }}
    />
  );
}
