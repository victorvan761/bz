// The app: what it remembers, as a pure reducer, and the browser glue around its two screens (history, focus).
import { useEffect, useReducer, useRef } from 'react';
import { castBazi, choose, pickAt, type Bazi, type FlowLevel, type Gender, type Pick, type Settings } from './bazi';
import { ChartScreen, type View } from './ChartScreen';
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

export interface AppState extends Entry {
  screen: 'input' | 'chart';
  /** The last cast chart; it stays when the user goes back */
  chart: Bazi | null;
  /** The chart's tab: 大盘, 关系 or 神煞 */
  view: View;
  /** The flow panel's tab */
  level: FlowLevel;
  /** What the flow panel has chosen at each level, for `chart` */
  pick: Pick | null;
  /** Whether the flow panel shows its cards */
  panelOpen: boolean;
}

export type Action =
  /** A time confirmed in the date picker */
  | { type: 'setInput'; value: string }
  | { type: 'setGender'; gender: Gender }
  | { type: 'setLateZi'; lateZi: Settings['lateZi'] }
  /** 排盘. `now` decides which 大运, 流年 … the panel starts on. */
  | { type: 'cast'; now: string }
  /** A chart's history entry, on Forward or after a reload */
  | { type: 'open'; entry: Entry; now: string }
  | { type: 'back' }
  | { type: 'setView'; view: View }
  | { type: 'setLevel'; level: FlowLevel }
  /** A card chosen in the flow panel */
  | { type: 'choose'; level: FlowLevel; value: number }
  /** The panel's clock: back to the 大运, 流年 … of `now` */
  | { type: 'today'; now: string }
  | { type: 'togglePanel' };

/** `now` must be a real minute from 1900 to 2100, as clockInput gives. */
export const initialState = (now: string): AppState => ({
  screen: 'input',
  input: now,
  gender: '男',
  lateZi: 'next',
  chart: null,
  view: 'relations',
  level: 'year',
  pick: null,
  panelOpen: true,
});

const entryOf = ({ input, gender, lateZi }: Entry): Entry => ({ input, gender, lateZi });
const sameEntry = (a: Entry, b: Entry) => a.input === b.input && a.gender === b.gender && a.lateZi === b.lateZi;

/** The chart for an entry, shown with the flows of `now`; null if the entry's time isn't a real one. */
function cast(state: AppState, entry: Entry, now: string): AppState | null {
  const time = parseInput(entry.input);
  const clock = parseInput(now);
  if (!time || !clock) return null;
  const chart = castBazi(time, entry.gender, { lateZi: entry.lateZi });
  return { ...state, ...entryOf(entry), chart, pick: pickAt(chart, clock), screen: 'chart' };
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
      return cast(state, state, action.now) ?? state;
    case 'open':
      // On Forward the chart is usually still here: show it as it was. After a reload, cast it again.
      if (state.chart && sameEntry(state, action.entry)) return { ...state, screen: 'chart' };
      return cast(state, action.entry, action.now) ?? { ...state, screen: 'input' };
    case 'back':
      return { ...state, screen: 'input' };
    case 'setView':
      return { ...state, view: action.view };
    case 'setLevel':
      return { ...state, level: action.level, panelOpen: true };
    case 'choose':
      if (!state.chart || !state.pick) return state;
      return { ...state, pick: choose(state.chart, state.pick, action.level, action.value) };
    case 'today': {
      const clock = parseInput(action.now);
      return state.chart && clock ? { ...state, pick: pickAt(state.chart, clock) } : state;
    }
    case 'togglePanel':
      return { ...state, panelOpen: !state.panelOpen };
  }
}

// ── The two screens, and the browser around them ─────────────────────────────────────────────────────────────
// Each cast pushes one history entry holding what it was cast from, so the back gesture returns to the input
// screen like 关闭, and Forward or a reload shows that chart again.

const CHART_ENTRY = 'bazi-chart';

/** The entry a history state holds, or null for the input screen's. */
function entryIn(state: unknown): Entry | null {
  const e = (state as Record<string, unknown> | null)?.[CHART_ENTRY] as Partial<Entry> | undefined;
  if (!e || typeof e.input !== 'string' || (e.gender !== '男' && e.gender !== '女')) return null;
  return { input: e.input, gender: e.gender, lateZi: e.lateZi === 'same' ? 'same' : 'next' };
}

export interface AppProps {
  initial: AppState;
  /** The device clock's current minute as 'YYYY-MM-DDTHH:mm' */
  now(): string;
}

export function App({ initial, now }: AppProps) {
  // A reload keeps the current history entry: on a chart's entry, show that chart again.
  const [state, dispatch] = useReducer(reducer, initial, (s) => {
    const entry = entryIn(window.history.state);
    return entry ? reducer(s, { type: 'open', entry, now: now() }) : s;
  });
  const castButton = useRef<HTMLButtonElement>(null);
  const chartHeading = useRef<HTMLHeadingElement>(null);
  const shownScreen = useRef(state.screen);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const entry = entryIn(e.state);
      dispatch(entry ? { type: 'open', entry, now: now() } : { type: 'back' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [now]);

  // Each screen replaces the other, taking the focused button with it. Move focus onto the new screen, as a page load
  // would: to the chart's heading after a cast, to 排盘 after going back. The first screen leaves focus alone.
  useEffect(() => {
    if (shownScreen.current === state.screen) return;
    shownScreen.current = state.screen;
    (state.screen === 'chart' ? chartHeading : castButton).current?.focus();
  }, [state.screen]);

  if (state.screen === 'chart' && state.chart && state.pick) {
    return (
      <ChartScreen
        chart={state.chart}
        view={state.view}
        level={state.level}
        pick={state.pick}
        panelOpen={state.panelOpen}
        headingRef={chartHeading}
        onBack={() => {
          // Show the input screen first, so a quick second tap can't reach this button again and go back twice.
          dispatch({ type: 'back' });
          if (entryIn(window.history.state)) window.history.back(); // leave the chart's entry too
        }}
        onView={(view) => dispatch({ type: 'setView', view })}
        onLevel={(level) => dispatch({ type: 'setLevel', level })}
        onChoose={(level, value) => dispatch({ type: 'choose', level, value })}
        onToday={() => dispatch({ type: 'today', now: now() })}
        onTogglePanel={() => dispatch({ type: 'togglePanel' })}
      />
    );
  }

  return (
    <InputScreen
      value={state.input}
      gender={state.gender}
      lateZi={state.lateZi}
      castRef={castButton}
      onChange={(value) => dispatch({ type: 'setInput', value })}
      onGender={(gender) => dispatch({ type: 'setGender', gender })}
      onLateZi={(lateZi) => dispatch({ type: 'setLateZi', lateZi })}
      onCast={() => {
        // Cast what the screen shows, and keep it in the chart's entry for Forward and reload.
        dispatch({ type: 'cast', now: now() });
        window.history.pushState({ [CHART_ENTRY]: entryOf(state) }, '');
        window.scrollTo(0, 0);
      }}
      onNow={() => dispatch({ type: 'setInput', value: now() })}
    />
  );
}
