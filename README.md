# 八字排盘 · Bazi Chart

A small web app that casts a 八字 (four pillars) chart and draws it the way the iOS app 十三行八字 does, in 简体中文: each pillar with its 十神 or 藏干 beside it, colored by 喜忌; a grid of 大运 · 流年 · 流月 · 流日 · 流时 to choose from, each choice adding its column to the chart; each column's 神煞; and the 刑冲会合 between columns drawn as lines. It is a static site with no server behind it. Added to an iPhone or iPad home screen, it opens full screen and works with no network.

Live at <https://victorvan761.github.io/bz/>.

This is a prototype, built alongside [qmdj](https://github.com/victorvan761/qmdj) (奇门排盘) on the same stack and with the same offline copy and repository rules. It is not affiliated with 十三行八字 or its makers.

## Using it

1. Open the site in Safari on the iPhone or iPad, then Share → 添加到主屏幕. From then on it opens from its icon, online or not.
2. Choose 男 or 女, tap 出生日期 to choose the birth minute on the wheels (公历 or 农历), and choose how to read 夜子时 (23:00–23:59): 算次日 (the default) or 算当日. Tap 起盘. Or tap the 时空起盘 card, which shows the present moment's pillars, to cast the present minute.
3. The chart shows 时 日 月 年, then 大运 and 流年. The top bar sets what stands beside each stem and branch: 十神, 藏干, or 五行 under 更多. The bottom bar sets the view: 资料 (基本资料, 命身胎息), 流运, 神煞 or 关系.
4. In 流运, tap a 大运 to list its years, a year for its months, a month for its days, a day for its 时辰: each choice fills its column. The strip at the right steps the level above with ^ and ˅. Tap a column's header to list its level again, and ⊗ under it to clear it. 返回, or the browser's back, returns to the input screen.

## Working on it

You need Node 22.12 or newer.

```
npm install
npm run dev         # dev server
npm test            # every test
npm run typecheck   # strict TypeScript
npm run build       # the static site, in dist/
npm run preview     # serves dist/: the only local way to try the offline copy
```

## What is where

```
SPEC.md                 what the app must do: screens, rules, tables, open questions
src/
  bazi.ts               a birth minute in, the whole chart out; 喜忌; the flows (大运 … 流时) and choosing them
  relations.ts          刑冲会合: one line per relation, its label, and the order they are drawn in
  shensha.ts            神煞
  time.ts               the birth minute as text, the 1900–2100 range, and the date and clock lines
  wheels.ts             the date picker's five wheels as plain data, in 公历 and 农历 (from qmdj)
  App.tsx               what the app remembers, and its ties to the browser: history, focus
  InputScreen.tsx       the first screen, and the 时空起盘 card
  DatePicker.tsx        the sheet of wheels (from qmdj)
  ChartScreen.tsx       the chart: its bars, columns, 神煞 lists, 关系 lines and the 更多 sheet
  InfoView.tsx          资料: 基本资料 and 命身胎息
  FlowGrid.tsx          流运: the grid of one level, and the strip that steps the level above
  PillarView.tsx        a pillar: stem over branch, each with its 十神, 藏干 or 五行, in the 喜忌 colors
  styles.css            every style
  main.tsx              starts the app
  sw.js                 the service worker that keeps the offline copy
tests/                  the test suite: engine, relations, 神煞, wheels, screens, offline copy, security settings
tools/make-icons.mjs    draws the home-screen icons in public/
public/                 the icons and the web app manifest
vite.config.ts          build settings, and the step that writes dist/sw.js
.npmrc                  what npm may install: no install scripts, no release under 7 days old
.github/workflows/      tests every push and publishes main to GitHub Pages
.github/dependabot.yml  proposes dependency updates as pull requests, once a month
```

## How it works

**The engine** is pure. `castBazi(time, gender, settings)` reads the time as Beijing wall-clock time and returns a `Bazi`: the four pillars with their 十神, 藏干, 纳音, 星运, 自坐 and 空亡, 起运 to the minute and 交运, ten 大运, and 命宫, 身宫, 胎元 and 胎息. The calendar itself comes from [lunar-typescript](https://github.com/6tail/lunar-typescript); everything after that is a lookup in a table. The flow lists (`daYunItems` … `hourItems`) are plain data too, and so is `Flows`: what is chosen at each level and which level the grid lists, changed only by `choose`, `showLevel`, `clearFrom` and `step` ([src/bazi.ts](src/bazi.ts)).

**The colors** follow 喜忌, as 十三行八字's do. The engine estimates 旺衰 by 三得 (得令, 得地, 得势), takes 印 as 用神 for a weak day master and 财 for a strong one, and from that finds which elements are favorable. A favorable element's stem or branch is blue and an unfavorable one's red; the 十神 or 藏干 beside it takes the other color. The estimate fits every character in the screenshots (SPEC §4.5).

**The relations** are worked out between whatever columns the chart shows ([src/relations.ts](src/relations.ts)): 合 and 冲 between stems; 六合, 冲, 刑, 三刑, 三合, 半合, 拱, 三会 and 暗合 between branches. As in the screenshots, 害 and 破 have no line, and the natal 年 and 时 never relate. Each relation is its own line, in the order 十三行八字 draws them. A combination's label names what it turns into and that element's 十神, and says whether it 成化 by the month branch: 合水(才)不化, 合火(印)成化.

**The screens** only draw what the engine returns. The layout is drawn 390 units wide, with sizes measured off the screenshots, and one CSS variable sets the size of a unit, as in qmdj. Six columns fit the width; more scroll sideways.

**The offline copy** is the same service worker as qmdj's, under its own cache names: the build puts the list of every file and a version that hashes them all in front of [src/sw.js](src/sw.js). On the device it downloads those files once and then answers the app's requests from that copy. A new build downloads in the background and takes over the next time the app is opened.

## How it is kept correct

- **The screenshots' chart.** 29 screenshots of 十三行八字 show 男 1996-06-20 18:00 (丙子 甲午 戊子 辛酉) in every view and mode. The tests check its pillars, 十神, 藏干 and colors, its 基本资料 and 命身胎息, the 大运, 流年 and 流月 grids, each column's 神煞, and every 关系 line and label with 大运 丁酉 and 流年 2026 chosen.
- **The App Store chart.** 十三行八字's App Store screenshot shows 坤造 2008-04-18 18:00 (戊子 丙辰 戊子 辛酉): the tests check its pillars, 大运, 神煞 and relation lines.
- **Against lunar-typescript.** 400 seeded random births, with either 夜子时 rule: the four pillars, 纳音, 十二长生, 空亡, 命宫 身宫 胎元 胎息, 起运 to the minute, 交运 and the ten 大运. Every 十神 and 十二长生 pairing, all 60 空亡. Where the two apps differ, the tests follow 十三行八字: 巳 hides 丙 戊 庚.
- **The flows.** 流年 turn at 立春, 流月 start at their 节, 流日 run from one 节 to the next, 流时 follow 五鼠遁. Choosing, stepping and clearing keep what is chosen consistent from 大运 down.
- **The screens.** Each view and mode of the screenshots' chart renders the same text and colors through `renderToStaticMarkup`, and the reducer is tested on its own.
- **The offline copy.** The service worker runs in the tests against a fake network, and the real build is checked for a complete file list.

### Not in the prototype

Some things 十三行八字 shows are left out (SPEC §1, §9): 学堂 and 学士 among the 神煞, whose rule isn't known yet; saved charts (储存, 记录) and 设定; the 年表 tab; the 纳音 · 玄空 · 干支 modes; the landscape layout; 真太阳时 and birthplaces. Several 神煞 differ between schools; [src/shensha.ts](src/shensha.ts) names the rule each one follows.

## Publishing

Every push and pull request runs the typecheck, the tests and the build on GitHub Actions. A push to `main` that passes is published to GitHub Pages. An installed copy downloads a new build in the background when it is opened with a network, and switches to it the next time it is opened.

Whatever reaches `main` reaches every installed copy, so the way there is guarded as in qmdj:

- **`main`** takes changes only as pull requests whose `build` check passed. It can't be pushed to directly, force-pushed or deleted.
- **The workflow** runs only GitHub's own actions, each pinned to a commit, because a tag can be moved to other code.
- **npm** never runs a dependency's install scripts and never chooses a release under 7 days old ([.npmrc](.npmrc)).
- **Dependabot** proposes updates once a month as pull requests.

The first two are settings of the repository on GitHub. The tests check the rest, and that the dev server listens on this machine only.
