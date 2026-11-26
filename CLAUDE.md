# 八字排盘 · Bazi Chart

A static web app that draws a 八字 (four pillars) chart the way the iOS app 十三行八字 does: the four pillars and the chosen flows as columns, in the 十神, 藏干 or 五行 mode, over four views: 资料, 流运 (the grid where 大运 · 流年 · 流月 · 流日 · 流时 are chosen), 神煞 and 关系 (the 刑冲会合 lines). 简体中文 only. It is a sibling of `../qmdj` (奇门排盘) and shares its stack, offline copy and repository rules. README.md is the tour for people.

## Where things are

- `SPEC.md`: the contract. §2 for the layout and colors, §3 for the input screen, §4 for the engine and the reference charts, §5 for the chart screen and the flows, §6 for 刑冲会合, §7 for 神煞, §9 for open questions.
- `src/bazi.ts`: the pure engine, in one file: the chart's types, the tables, the lookups, `castBazi`, the 基本资料 texts, 旺衰 and 喜忌, then the flow lists and the choosing (`choose`, `showLevel`, `clearFrom`, `step`). 四柱, 节, 起运 and 大运 come from lunar-typescript; everything after that is a table lookup.
- `src/relations.ts`: 刑冲会合 between any columns: one line per relation (stems above the pillars, branches below), its label (冲, 刑, 合水(才)不化 …), and the order they are drawn in. Pure.
- `src/shensha.ts`: the 神煞 tables and `shenSha`. Pure.
- `src/time.ts`: the birth minute as `YYYY-MM-DDTHH:mm`, the 1900–2100 range, and the date and clock lines the screens show.
- `src/wheels.ts`, `src/DatePicker.tsx`: the date picker, copied from qmdj (its five wheels as pure data, in 公历 or 农历, and the sheet that draws them).
- `src/App.tsx`: the pure app reducer, and the browser glue (history, focus). The screens, with their 中文 text written where it is shown:
  - `src/InputScreen.tsx`: 男 · 女, 出生日期, 夜子时, 起盘, and the 时空起盘 card.
  - `src/ChartScreen.tsx`: the bars, the columns and their headers, the 神煞 lists, the 关系 lines, and the 更多 sheet.
  - `src/InfoView.tsx`: 资料. `src/FlowGrid.tsx`: 流运's grid and the strip beside it.
  - `src/PillarView.tsx`: a pillar, the stem over the branch, each with what the mode puts at its right, in the 喜忌 colors or 五色.
- `src/styles.css` holds every style, in units of `--u` measured off the screenshots (2.372 pixels to the unit). `src/main.tsx` is the only place that reads the clock or registers the service worker.
- `src/sw.js`, `vite.config.ts`, `public/`: the offline copy and the home-screen install (SPEC §8). `vite.config.ts` writes `dist/sw.js` at build time. `.github/workflows/deploy.yml` tests every push and publishes `main` to GitHub Pages.
- `.npmrc`, `.github/dependabot.yml`: the dependency rules. npm never runs a dependency's install scripts and never chooses a release under 7 days old. Dependabot proposes updates as pull requests, once a month.
- `tests/`: the Vitest suite, one file per area. `tests/reference.ts` holds the reference births: `SHOT`, the chart in the 29 screenshots this version follows (with `SHOT_NOW`, when they were taken), and `REF`, the chart in 十三行八字's App Store screenshot. `tests/html.ts` parses `renderToStaticMarkup` output, so UI tests need no DOM. `tests/hardening.test.ts` checks the security rules that live in files.
- `tools/make-icons.mjs`: draws the home-screen icons in `public/`.

## How to work here

- Work test-first. Two charts are read off 十三行八字 and must keep passing: the screenshots' chart (男 1996-06-20 18:00 → 丙子 甲午 戊子 辛酉), whose pillars, colors, 基本资料, flow grids, 神煞 and 关系 lines the tests check, and the App Store chart (坤造 2008-04-18 18:00 → 戊子 丙辰 戊子 辛酉), which anchors the engine and the relation lines.
- Where 十三行八字 and lunar-typescript differ, follow 十三行八字 and say so in SPEC.md and the test: 巳 hides 丙 戊 庚 (SPEC §4.2).
- Keep the engine, `relations.ts` and `shensha.ts` pure: no clock reads, no DOM, no React. Their values are the Chinese terms the chart shows.
- Run the full test suite and the typecheck before calling anything done. After a change to a screen or to `src/styles.css`, also look at the chart in the browser at 375 and 390 px wide: the suite runs in Node and can't see layout. A relation's label sits above the middle of its line and can be wider than the line, so check the screenshots' chart with 大运 丁酉 and 流年 2026 chosen, in 关系, where lines join adjacent columns.
- A change to `src/sw.js` or to the step that writes it reaches installed phones without anyone watching. Keep such changes small, and try the result with `npm run preview`.
- `main` takes changes only as pull requests whose `build` check passed, and a merge ships to installed phones. Workflows may use only GitHub's own actions (`actions/*`, `github/*`), each pinned to a commit SHA with its version in a comment. Both are settings of the repository on GitHub, not files.
- To install a release under 7 days old on purpose, pass `--min-release-age=0`.
- When an open question in SPEC §9 is answered, update SPEC.md, change the rule, and add the answer as a test.

## Commands

Node 24 lives at `~/.local/node/bin`, which isn't on the PATH. Run `export PATH="$HOME/.local/node/bin:$PATH"` first.

- `npm test`: the whole Vitest suite (the two reference charts, 400 random births against lunar-typescript, relations, 神煞, flows, wheels, UI, offline copy, security settings).
- `npm run typecheck`: strict TypeScript over `src`, `tests` and `vite.config.ts`.
- `npm run dev`: dev server, also `bz-dev` in `.claude/launch.json` (port 5182). It listens on this machine only. To open it from a real phone on the same Wi-Fi, run `npm run dev -- --host` for that session.
- `npm run build`: static site in `dist/` (relative paths, no network requests beyond its own files).
- `npm run preview`: serves `dist/`, also `bz-preview` (port 5183). The only local way to try the offline copy: the dev server has no service worker.
- `node tools/make-icons.mjs`: redraws the home-screen icons in `public/`.
