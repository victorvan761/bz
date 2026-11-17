# 八字排盘 · Bazi Chart

A static web app that draws a 八字 (four pillars) chart the way the iOS app 十三行八字 does: the pillars with their 十神 and 藏干, the 刑冲会合 lines between columns, and the 大运 · 流年 · 流月 · 流日 · 流时 panel. 简体中文 only. It is a sibling of `../qmdj` (奇门排盘) and shares its stack, offline copy and repository rules. README.md is the tour for people.

## Where things are

- `SPEC.md`: the contract. §4 for the engine, §5 for the flows, §6 for 刑冲会合, §7 for 神煞, §2–§3 for the screens, §9 for open questions.
- `src/bazi.ts`: the pure engine, in one file: the chart's types, the tables, the lookups, `castBazi`, 旺衰, then the flow lists and picks. 四柱, 节, 起运 and 大运 come from lunar-typescript; everything after that is a table lookup.
- `src/relations.ts`: 刑冲会合 between any columns: the lines (stems above, branches below), the pair names (伏吟, 反吟, 双合, 克会 …), 天地合, and what a flow card lists. Pure.
- `src/shensha.ts`: the 神煞 tables and `shenSha`. Pure.
- `src/time.ts`: the birth minute as `YYYY-MM-DDTHH:mm`, and the 1900–2100 range.
- `src/wheels.ts`, `src/DatePicker.tsx`: the date picker, copied from qmdj (its five wheels as pure data, in 公历 or 农历, and the sheet that draws them).
- `src/App.tsx`: the pure app reducer, and the browser glue (history, focus). `src/InputScreen.tsx`, `src/ChartScreen.tsx` and `src/FlowPanel.tsx` are the screens, with their 中文 text written where it is shown. `src/PillarView.tsx` draws a stem or a branch in its element's color. `src/styles.css` holds every style. `src/main.tsx` is the only place that reads the clock or registers the service worker.
- `src/sw.js`, `vite.config.ts`, `public/`: the offline copy and the home-screen install (SPEC §8). `vite.config.ts` writes `dist/sw.js` at build time. `.github/workflows/deploy.yml` tests every push and publishes `main` to GitHub Pages.
- `.npmrc`, `.github/dependabot.yml`: the dependency rules. npm never runs a dependency's install scripts and never chooses a release under 7 days old. Dependabot proposes updates as pull requests, once a month.
- `tests/`: the Vitest suite, one file per area. `tests/reference.ts` holds the reference birth (十三行八字's App Store screenshot). `tests/html.ts` parses `renderToStaticMarkup` output, so UI tests need no DOM. `tests/hardening.test.ts` checks the security rules that live in files.
- `tools/make-icons.mjs`: draws the home-screen icons in `public/`.

## How to work here

- Work test-first. The reference chart (坤造 2008-04-18 18:00 → 戊子 丙辰 戊子 辛酉) and its five 流年 cards are read off 十三行八字's screenshot; they must keep passing.
- Keep the engine, `relations.ts` and `shensha.ts` pure: no clock reads, no DOM, no React. Their values are the Chinese terms the chart shows.
- Run the full test suite and the typecheck before calling anything done. After a change to a screen or to `src/styles.css`, also look at the chart in the browser at 375 and 390 px wide: the suite runs in Node and can't see layout. The relation lines move their labels by measuring, so check a chart with relations between adjacent columns.
- A change to `src/sw.js` or to the step that writes it reaches installed phones without anyone watching. Keep such changes small, and try the result with `npm run preview`.
- `main` takes changes only as pull requests whose `build` check passed, and a merge ships to installed phones. Workflows may use only GitHub's own actions (`actions/*`, `github/*`), each pinned to a commit SHA with its version in a comment. Both are settings of the repository on GitHub, not files.
- To install a release under 7 days old on purpose, pass `--min-release-age=0`.
- When an open question in SPEC §9 is answered, update SPEC.md, change the rule, and add the answer as a test.

## Commands

Node 24 lives at `~/.local/node/bin`, which isn't on the PATH. Run `export PATH="$HOME/.local/node/bin:$PATH"` first.

- `npm test`: the whole Vitest suite (reference chart, 400 random births against lunar-typescript, relations, 神煞, flows, wheels, UI, offline copy, security settings).
- `npm run typecheck`: strict TypeScript over `src`, `tests` and `vite.config.ts`.
- `npm run dev`: dev server, also `bz-dev` in `.claude/launch.json` (port 5182). It listens on this machine only. To open it from a real phone on the same Wi-Fi, run `npm run dev -- --host` for that session.
- `npm run build`: static site in `dist/` (relative paths, no network requests beyond its own files).
- `npm run preview`: serves `dist/`, also `bz-preview` (port 5183). The only local way to try the offline copy: the dev server has no service worker.
- `node tools/make-icons.mjs`: redraws the home-screen icons in `public/`.
