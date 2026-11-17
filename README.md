# 八字排盘 · Bazi Chart

A small web app that casts a 八字 (four pillars) chart and draws it the way the iOS app 十三行八字 does, in 简体中文: each pillar with its 十神 and 藏干 in the colors of the five elements, the 刑冲会合 between columns drawn as lines, and a panel of 大运 · 流年 · 流月 · 流日 · 流时 cards that add their columns to the chart. It is a static site with no server behind it. Added to an iPhone or iPad home screen, it opens full screen and works with no network.

Live at <https://victorvan761.github.io/bz/>.

This is a prototype, built alongside [qmdj](https://github.com/victorvan761/qmdj) (奇门排盘) on the same stack and with the same offline copy and repository rules. It is not affiliated with 十三行八字 or its makers.

## Using it

1. Open the site in Safari on the iPhone or iPad, then Share → 添加到主屏幕. From then on it opens from its icon, online or not.
2. Choose 男 · 乾造 or 女 · 坤造, tap the time to choose the birth minute on the wheels (公历 or 农历), and choose how to read 夜子时 (23:00–23:59): as the next day (the default) or the same day. The four pillars show under the choices as you go. 现在 sets the time to now.
3. Tap 排盘. The chart opens on 关系; 大盘 adds the birth facts, 纳音, 星运, 自坐 and 空亡; 神煞 lists each column's stars.
4. The panel at the bottom starts at today. Tap a tab (流时 流日 流月 流年 大运) to choose a level, and a card to choose a 大运, year, month, day or hour: the chart shows the chosen flows in front of the four pillars, with every relation they make. The clock goes back to today; the chevron folds the panel away. 关闭, or the browser's back, returns to the input screen.

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
  bazi.ts               a birth minute in, the whole chart out; the flows (大运 … 流时) and what is chosen
  relations.ts          刑冲会合: lines, pair names, 天地合, and what each flow card lists
  shensha.ts            神煞
  time.ts               the birth minute as text, and the 1900–2100 range
  wheels.ts             the date picker's five wheels as plain data, in 公历 and 农历 (from qmdj)
  App.tsx               what the app remembers, and its ties to the browser: history, focus
  InputScreen.tsx       the first screen
  DatePicker.tsx        the sheet of wheels (from qmdj)
  ChartScreen.tsx       the chart: 大盘 · 关系 · 神煞
  FlowPanel.tsx         the flow panel and its cards
  PillarView.tsx        a stem or branch in its element's color
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

**The engine** is pure. `castBazi(time, gender, settings)` reads the time as Beijing wall-clock time and returns a `Bazi`: the four pillars with their 十神, 藏干, 纳音, 星运, 自坐 and 空亡, the 节 around the birth, 起运 to the minute, 童限 and ten 大运, 胎元, 命宫 and 身宫. The calendar itself comes from [lunar-typescript](https://github.com/6tail/lunar-typescript); everything after that is a lookup in a table. The flow lists (`daYunItems` … `hourItems`) and the `Pick` that says which item is chosen at each level are plain data too ([src/bazi.ts](src/bazi.ts)).

**The relations** are worked out between whatever columns the chart shows ([src/relations.ts](src/relations.ts)): 合 and 冲 between stems; 六合, 冲, 三合, 半合, 拱, 三会, 三刑, 无礼之刑, 自刑 and 暗合 between branches. A combination's label names what it turns into by its 十神 group, 合财成化 or 合印不化, and says whether it 成化 by the month branch. Two pillars that relate in both stem and branch get a name under the left one: 伏吟, 反吟, 双合, or a stem relation and a branch relation such as 克会. A flow card lists the same relations for its own pillar against the columns above it.

**The screens** only draw what the engine returns. The layout is drawn 390 units wide, and one CSS variable sets the size of a unit, as in qmdj. The relation lines put their labels on the line just after the first character, as 十三行八字 does, and move them past the last character when the next one is too close.

**The offline copy** is the same service worker as qmdj's, under its own cache names: the build puts the list of every file and a version that hashes them all in front of [src/sw.js](src/sw.js). On the device it downloads those files once and then answers the app's requests from that copy. A new build downloads in the background and takes over the next time the app is opened.

## How it is kept correct

- **The reference chart.** 十三行八字's App Store screenshot shows 坤造 2008-04-18 18:00: 戊子 丙辰 戊子 辛酉, 大运 乙卯 from 2012, 流年 庚子. The tests check its pillars, 十神, 藏干 and 大运, every line, pair name and 天地合 the screenshot draws, and the relations listed on its five 流年 cards (2017–2021).
- **Against lunar-typescript.** 400 seeded random births, with either 夜子时 rule: the four pillars, 纳音, 十二长生, 空亡, 起运 to the minute and the ten 大运. Every 十神 and 十二长生 pairing, all 60 空亡.
- **The flows.** 流月 start at their 节, 流日 run from one 节 to the next, 流时 follow 五鼠遁, and "today" turns the year at 立春 and the month at each 节.
- **The screens.** Each tab of the reference chart renders the same text and colors, at every flow level, through `renderToStaticMarkup`.
- **The offline copy.** The service worker runs in the tests against a fake network, and the real build is checked for a complete file list.

### Not computed yet

Some things 十三行八字 shows are not in the prototype (SPEC §6.5, §9): 隔角 拱 (its 2018 card lists 隔角拱才), 六害 and 六破, 真太阳时 and birthplaces, saved charts, and interpretation text. Several 神煞 differ between schools; [src/shensha.ts](src/shensha.ts) names the rule each one follows.

## Publishing

Every push and pull request runs the typecheck, the tests and the build on GitHub Actions. A push to `main` that passes is published to GitHub Pages. An installed copy downloads a new build in the background when it is opened with a network, and switches to it the next time it is opened.

Whatever reaches `main` reaches every installed copy, so the way there is guarded as in qmdj:

- **`main`** takes changes only as pull requests whose `build` check passed. It can't be pushed to directly, force-pushed or deleted.
- **The workflow** runs only GitHub's own actions, each pinned to a commit, because a tag can be moved to other code.
- **npm** never runs a dependency's install scripts and never chooses a release under 7 days old ([.npmrc](.npmrc)).
- **Dependabot** proposes updates once a month as pull requests.

The first two are settings of the repository on GitHub. The tests check the rest, and that the dev server listens on this machine only.
