# 八字排盘 App — Build Spec

The contract the app is built against: what it shows, the rules behind each value, and what is still open. Keep it current when a rule changes.

## 1 · Overview & scope

A prototype that draws a 八字 chart the way the iOS app 十三行八字 (Firm 13 Limited) does, in 简体中文 only. It follows the version in 29 screenshots of one chart, 男 1996-06-20 18:00 (丙子 甲午 戊子 辛酉), taken on 2026-11-25: the chart in its four views (资料, 流运, 神煞, 关系), in the 十神, 藏干 and 五行 modes, with 大运 · 流年 · 流月 · 流日 · 流时 chosen. The tests are built on it (§4), and on the chart of 十三行八字's App Store screenshot (坤造 2008-04-18 18:00), which anchors the engine.

| Area | What the prototype ships |
| --- | --- |
| Input screen | 男 or 女, the birth minute on a wheel picker, the 夜子时 rule, 起盘; and 时空起盘, which casts the present moment (§3) |
| Chart screen | The four pillars and the chosen flows as columns, in the 十神, 藏干 or 五行 mode, over one of four views: 资料, 流运, 神煞, 关系 (§5) |
| Flows | 大运 → 流年 → 流月 → 流日 → 流时, chosen one level at a time in the 流运 view's grid (§5.3) |
| Offline | Installs to the iPhone or iPad home screen and opens with no network (§8) |

Out of scope: 储存, 记录 and 设定 (the input screen's tab bar and the chart's gear), the 年表 tab of 资料, the 纳音 · 玄空 · 干支 modes, the landscape layout, 真太阳时 and birthplaces, interpretation text, a second language. The date picker stays the app's own (qmdj's wheels), not 十三行八字's.

## 2 · Layout

- Mobile-first: the screens are drawn 390 units wide, after 十三行八字 on a 390 pt iPhone. One unit (`--u`) is 1 px on a phone and grows to 1.5 px on an iPad, until the column fills the width; the content column is centered beyond that. `src/styles.css` holds every size in units.
- The chart's columns share the width: six of them fit, 12 units in from each edge, so each is 61 units wide on a 390-unit screen and a little narrower on a 375 pt phone. More columns scroll sideways.
- Colors, as measured in the screenshots:

| What | Color |
| --- | --- |
| 喜 · 用 · 闲 (favorable, §4.5): a stem or branch | blue `#2b4bda` |
| 忌 · 仇 (unfavorable): a stem or branch | red `#c8051b` |
| 十神, 藏干 and a combination's 化神 | the other one of the two: a favorable element's 十神 is red, an unfavorable one's blue |
| 五行 mode, 五色 | 木 `#0a8a48`, 火 `#c9292e`, 土 `#ba9d74`, 金 white outlined in gray, 水 black |
| Accent: 返回, 起盘, the chosen level's tag, the strip's chevrons, 系统估算 | purple `#8800a3` |
| 冲 and 刑 lines | dark green `#016637` |
| 合 lines (and 三合, 半合, 三会, 拱, 暗合) | light green `#34a84a` |
| Natal columns · flow columns | `#f5f5f5` · white |
| A chosen grid cell · the 交运 year's cell | `#f3e9f8` · `#cccccc` |
| 星运 and 自坐 · 神煞 | brown `#946436` · gray `#505050` |

- The date picker is qmdj's, unchanged: a sheet the app draws itself with five wheels (年 月 日 时 分) in 公历 or 农历, 1900–2100. `src/wheels.ts` holds what each wheel lists as plain data.

## 3 · Input screen

From the top, as grouped rows on a light gray page:

| Element | Behavior |
| --- | --- |
| Title | 八字排盘 (the app's own name; 十三行八字's reads 十三行八字 快速起盘) |
| 男 · 女 | A segmented control. It sets the direction of 大运 (§4.3). Default 男 |
| 出生日期 | The chosen minute on two lines at the right, `1996年 6月20日` over `下午6:00 酉时`, and a chevron; a tap opens the date picker. It starts at the current minute |
| 夜子时 | 算次日 (default) or 算当日: whether 23:00–23:59 takes the next day's 日柱 (§4.1). Not in the screenshots, which show no setting for it; kept from the earlier version |
| 起盘 | Casts the chart and opens it. The chart gets its own browser history entry, so the back gesture returns here, and a reload shows the chart again |
| 时空起盘 | A card with the present moment's four pillars (时 日 月 年 from the left, stems over branches, in gray) and `现在是` / `2026年 11月25日` / `下午12:20 午时`. A tap casts the present minute for the chosen 男 or 女 |

## 4 · The chart

`castBazi(time, gender, settings)` in `src/bazi.ts`. Pure; the calendar comes from lunar-typescript 1.8.6.

The reference charts:

- 男 1996-06-20 18:00 (the screenshots): 年 丙子 · 月 甲午 · 日 戊子 · 时 辛酉, day master 戊; 大运 run forward, 乙未 from 2001 at age 5.
- 坤造 2008-04-18 18:00 (十三行八字's App Store screenshot): 戊子 丙辰 戊子 辛酉; 大运 run backward, 乙卯 from 2012 at age 4.

### 4.1 Calendar

- The time is Beijing wall-clock time, with no 真太阳时 or daylight-saving correction.
- 年柱 changes at the exact 立春 instant, 月柱 at the exact instant of each 节.
- 日柱 at night: 算次日 puts 23:00–23:59 on the next day (lunar-typescript sect 1); 算当日 keeps the calendar day's 日柱 with the next day's 子时 stem (sect 2). 时柱 is the same either way.

### 4.2 Each pillar

| Value | Rule |
| --- | --- |
| 十神 | Of each stem against the day master, one character: 比 劫 食 伤 才 财 杀 官 卩 印 (卩 is 偏印). The day master has none |
| 藏干 | 本气 first: 午 → 丁 己. 巳 → 丙 戊 庚, as 十三行八字 lists them (lunar-typescript has 丙 庚 戊) |
| 纳音 | lunar-typescript's table |
| 星运 | The day master's 十二长生 stage at this branch |
| 自坐 | This pillar's stem's own stage at its branch, written 坐临官 |
| 空 | A branch the 日柱's 旬 leaves out (日空): for 戊子, 午 and 未. Marked on every column and grid cell whose branch it is |

十二长生 runs forward from the 长生 branch for yang stems and backward for yin stems; 戊 follows 丙 and 己 follows 丁.

### 4.3 起运 and 大运

- Direction: 顺排 for a man born in a yang year or a woman born in a yin year, 逆排 otherwise.
- 起运 counts the minutes from birth to the next 节 (顺) or back to the last one (逆): 3 days make a year, 1 day 4 months, 2 hours 10 days (lunar-typescript Yun sect 2). The text leaves out the hours: 出生后 5年 5个月 20天 起运.
- 交运: the moment the first 大运 starts; every tenth year after it, on the same date, the next one starts. Written 逢辛丙年 大雪后 3天 交大运: the stem of the 交运 year (by 立春) and the stem it combines with, the 节 before the 交运 date, and the days since it.
- Ten 大运, stepping through the 60 干支 from the 月柱. The years before the first (童限) are not listed.
- Ages are the year minus the birth year: 大运 乙未 at 5 (2001), 流年 2026 at 30.

### 4.4 基本资料

The 资料 view's first tab, with the screenshot's values:

| Row | Value |
| --- | --- |
| 基本资料 | 阳男 肖鼠 虚岁 31: 阳 or 阴 by the 年干, 男 or 女, the 生肖 of the 年支, and the 虚岁 today (the 农历 year now, less the 农历 year of birth, plus 1) |
| 出生日期 | 1996年 6月20日 下午6:00 酉时 (12-hour time and the 时辰), then 农历 一九九六年 五月初五 |
| 交大运 | 出生后 5年 5个月 20天 起运, then 逢辛丙年 大雪后 3天 交大运 |
| (purple) | 系统估算：身弱 (得令，失地，失势) (§4.5) |

The 命身胎息 tab lists 命宫, 身宫, 胎元 and 胎息, each with its 纳音: 庚寅 松柏木, 壬辰 长流水, 乙酉 泉中水, 癸丑 桑柘木.

### 4.5 旺衰 and 喜忌

十三行八字 colors every stem and branch by 喜忌 (its App Store text: 干支颜色可依据格局喜忌自动更改). The prototype's estimate, which fits every character in the screenshots:

- 三得: 得令 when the month branch's element is the day master's or produces it; 得地 when the 年, 日 or 时 branch holds a hidden stem of the day master's element; 得势 when two or more of the 年, 月 and 时 stems are 比劫 or 印. Two or three make 身强, else 身弱.
- 用神: 印 for 身弱, 财 for 身强. Then 喜 is what produces 用, 忌 what overcomes it, 仇 what produces 忌, and 闲 the fifth element.
- 用, 喜 and 闲 are favorable (blue); 忌 and 仇 unfavorable (red). For the 戊 day master 身弱: 火 用, 木 喜, 土 闲, 水 忌, 金 仇.

## 5 · The chart screen

### 5.1 Frame

- Top bar: 返回 (back to the input screen) and a segmented control 十神 · 藏干 · 更多. 更多 opens a sheet of 十神, 藏干, 五行 and 取消. In the 五行 mode no segment is selected. 储存 is left out.
- Bottom bar: 资料 · 流运 · 神煞 · 关系, the views (§5.4). The chart opens on 资料, in the 十神 mode, with no flow chosen.
- Between them the columns: 时 日 月 年 (gray), then the flow columns (white), each with its header, its pillar, and below a dark rule the view's own content. In 关系 the columns run to the bottom bar.

### 5.2 Columns

- Natal headers: 时 日 月 年 in gray, on the line of a flow's age.
- A flow column's header has three lines: its level's name (大运 流年 流月 流日 流时), then two lines that say which item is chosen: an age over a year (大运, 流年: `25` over `2021`), a 节 over its date (流月: `立冬` over `7/11`), a date (流日: `24/11`), a 时辰 over its hours (流时: `丑` over `1 - 3`). Dates are written day/month.
- The level the 流运 grid lists has its name on a purple tag (none in 关系). A level not yet reachable has its name in light gray.
- The flow columns are 大运 and 流年, and every further level down to the one the grid lists or the last one chosen. A chosen flow column has ⊗ at its bottom, which clears that level and the ones below it.
- Each column's pillar, by mode:
  - 十神: the stem with its 十神 at its right; the branch with its 藏干's 十神 stacked at its right, 本气 first.
  - 藏干: the stem alone; the branch with its 藏干 stacked at its right.
  - 五行: the stem and the branch each with its element at its right, in 五色.
  - The stem and the branch take the 喜忌 colors, the stacked characters the other one (§2). 空 sits under the branch as a gray tag.

### 5.3 The flows

| Level | Items in the grid | Per row | First line · second line |
| --- | --- | --- | --- |
| 大运 | the ten 大运 | 5 | age · start year |
| 流年 | the ten years of the chosen 大运, the 交运 year gray for the part of it (立春 to 立春) before 交运 | 5 | age · year |
| 流月 | the twelve months of the chosen year, 立春 to 小寒 | 6 | 节 · its date |
| 流日 | each day from the month's 节 up to the next 节 | 6 | — · the date |
| 流时 | thirteen 时辰 of the chosen day: 子 0 - 1, 丑 1 - 3 … 亥 21 - 23, 子 23 - 24 | 6 | branch · hours |

- 流年 starts at its 立春 (2026 → 丙午); 流月 by 五虎遁 from the 流年's stem; 流日 is the day's 日柱; 流时 by 五鼠遁, the last 子 taking the next day's 子时 (2026-11-24: 庚子 … 辛亥, 壬子).
- Choosing a cell chooses that level's item, drops what was chosen below it, and moves the grid to the next level. The chosen cell of the listed level is tinted.
- Tapping a chosen column, or the tagged one, lists its level again.
- Right of the grid, from 流年 down, a strip names the level above and steps it with ^ (earlier) and ˅ (later): `25 | 34 岁` (the 大运's ages), `30 岁` (the 流年), `立冬` (the 流月), `24/11` (the 流日). A step crosses into the next 大运, year or month, and drops what was chosen at the listed level and below.

### 5.4 Views

- 资料: tabs 基本资料 and 命身胎息 on a gray bar, the chosen one a purple tag; then §4.4.
- 流运: the grid of §5.3.
- 神煞: under each column, 星运 and 自坐 in brown, then its 神煞 (§7), one per line.
- 关系: the 刑冲会合 of §6 drawn across the columns: stem lines above the headers, branch lines under the pillars.

## 6 · 刑冲会合

`src/relations.ts`, between the columns that hold a pillar (the natal four and the chosen flows), judged against the natal day master and month branch.

### 6.1 Lines

| Between | Relation | Label |
| --- | --- | --- |
| Stems | 五合: 甲己 土, 乙庚 金, 丙辛 水, 丁壬 木, 戊癸 火 | 合 + 化神 + (十神) + 成化/不化: 合水(才)不化 |
| Stems | 冲: 甲庚, 乙辛, 丙壬, 丁癸 | 冲 |
| Branches | 六合: 子丑 土, 寅亥 木, 卯戌 火, 辰酉 金, 巳申 水, 午未 火 | 合火(印)成化 |
| Branches | 六冲 | 冲 |
| Branches | 刑: 子卯, two of 寅巳申 or 丑戌未, the same branch twice for 辰 午 酉 亥 | 刑 |
| Branches | 三刑: 寅巳申 or 丑戌未, all three | 三刑 |
| Branches | 三合 申子辰 水, 亥卯未 木, 寅午戌 火, 巳酉丑 金, all three | 三合 + 化神 + (十神) + 成化/不化 |
| Branches | Two of a 三合 with its middle branch | 半合 + … |
| Branches | The two ends of a 三合 without its middle | 拱 + 化神 + (十神) |
| Branches | 三会 寅卯辰 木, 巳午未 火, 申酉戌 金, 亥子丑 水, all three | 三会 + … |
| Branches | 暗合: 寅丑, 卯申, 午亥 | 暗合 |

- Not drawn: 六害 and 六破 (the screenshots' 子酉 and 子未 have no line), and any relation between the natal 年 and 时 (their 丙辛 has no line, while the 流年 丙 and the 时 辛 do).
- A whole 三合 or 三刑 replaces the pair lines of its own branches.
- The 十神 in the label is the 化神's against the day master: of its yang stem for a stem 合 (水 → 壬 → 才), of its yin stem for a branch combination (火 → 丁 → 印). The 化神 and its 十神 take the 喜忌 colors of the stacked characters (in 五色 in the 五行 mode); the 藏干 and 五行 modes leave the (十神) out: 合水不化.
- It 成化 when the month branch holds that element among its 藏干, or the month branch's own element produces it; else 不化. With 午 as the month branch, 火 成化 and 水 不化.

### 6.2 Drawing

- One line per relation, never folded: 子 冲 午 from two columns is two lines.
- Order, top to bottom: by the later of the two columns, counting 年 月 日 时 大运 流年 流月 流日 流时; then 冲, 刑, 三刑, 合, 三合, 半合, 三会, 拱, 暗合; then by the earlier column. The screenshot's chart with 大运 丁酉 and 流年 丙午: 午冲子 (月 年), 子冲午 (日 月), 酉刑酉 (时 大运), 子冲午 (年 流年), 子冲午 (日 流年), 午刑午 (月 流年).
- Each line joins its characters with a dot on each: filled with a white character for a branch, a ring around the character for a stem. The label sits above the middle of the line. Rows are 35.5 units apart.

## 7 · 神煞

`src/shensha.ts`. Schools differ on several of these; each table in the file names the rule it follows.

| Looked up from | Stars |
| --- | --- |
| 日干 | 天乙 (甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎), 太极, 文昌, 国印, 禄神, 金舆, 羊刃 (禄 + 1), 飞刃 (opposite 羊刃), 红艳 |
| 月支 | 天德, 天德合, 月德, 月德合 (a stem), 天医 (the branch before the month's) |
| 年支 and again 日支 | 红鸾, 天喜, 咸池, 驿马, 华盖: once for each that finds it, so a column can list one twice |
| 年支 | 将星, 劫煞, 灾煞, 亡神 (by its 三合 group), 孤辰, 寡宿 (by its 方) |
| The natal 日柱 itself | 六秀日, 九丑, 魁罡, 阴差阳错, 孤鸾, 十恶大败, 天赦 |

Flow columns get every star but the 日柱's own. Each column lists its stars in this order: 天乙 太极 天德 天德合 月德 月德合 文昌 国印 学堂 学士 禄神 金舆 天医 红鸾 天喜 咸池 驿马 华盖 将星 六秀日 天赦 魁罡 劫煞 灾煞 亡神 羊刃 飞刃 红艳 孤辰 寡宿 九丑 阴差阳错 孤鸾 十恶大败.

The screenshots: 时 辛酉 月德合 天喜 天喜 咸池 咸池 · 日 戊子 将星 六秀日 飞刃 九丑 · 月 甲午 学士 灾煞 羊刃 · 年 丙子 月德 将星 飞刃 · 大运 丁酉 天喜 天喜 咸池 咸池 · 流年 丙午 月德 学堂 学士 灾煞 羊刃. 学堂 and 学士 are not computed (§9 Q5); everything else there is.

## 8 · Hosting & offline

As qmdj's (its SPEC §11), under this app's own names.

- Hosting: GitHub Pages at <https://victorvan761.github.io/bz/>. `.github/workflows/deploy.yml` runs the typecheck, tests and build on every push and pull request, and publishes `main` only when they pass.
- Install: open the site in Safari, then Share → 添加到主屏幕. `public/manifest.webmanifest` and `public/apple-touch-icon.png` give it the name 八字排盘, the icon (eight element-colored tiles on purple, drawn by `tools/make-icons.mjs`) and a full-screen window.
- Offline: the built `sw.js` (`src/sw.js` plus the file list `vite.config.ts` writes at build time) keeps every built file on the device and answers the app's own requests from that copy, online or not. Its caches are named `bazi <scope> <version>`, so it never touches qmdj's caches on the same origin, nor qmdj its.
- Updates: every build changes `sw.js`, since its version hashes every file. The phone downloads a new build in the background and switches to it on the next launch, never under a page that is still open. If any file fails to download, it keeps the old copy.

## 9 · Open questions

Each has the default the prototype uses. A different answer means changing that rule, this spec and its tests.

| # | Question | Default | How to check |
| --- | --- | --- | --- |
| Q1 | Is 喜忌 the 三得 estimate of §4.5 for other charts, and what is 用神 for 身强? | §4.5, 用神 财 for 身强 | A 身强 chart's colors; a chart whose 三得 is 2 to 1 |
| Q2 | Does a stem 合 always name its yang 化神 stem, and a branch combination its yin one (合水(才), 合火(印))? | Yes | A 甲己 合土 and a 子丑 合土 for the same day master |
| Q3 | How are 半合, 三合, 三会, 拱, 暗合 and a stem 冲 labeled, and do 三合 and 三刑 draw one line or three? | §6.1 | Charts with 申子辰, 寅巳申, 寅丑, 甲庚 |
| Q4 | Do the natal 年 and 时 never relate, or only some relations? Do two flows relate? | Never; yes | A chart with 年 子 and 时 午, or 流年 冲 大运 |
| Q5 | What finds 学堂 and 学士 (学士 on both 午 columns, 学堂 on the 流年 丙午 only)? | Not computed | The 神煞 view of a few charts |
| Q6 | Are 驿马 and 华盖 counted from 年支 and 日支, like 咸池 and 天喜, and 劫煞 and 亡神 from 年支 alone, like 灾煞? | §7 | Charts whose 年支 and 日支 differ |
| Q7 | The 流年 grid grays the part of the 交运 year before 交运 (the screenshots' 2021: 146 of the cell's 172 pixels, 310 of the year's 366 days, §5.3). When 交运 falls before 立春, does the gray move to the year before, which the previous 大运 lists? | No gray then: that 流年 is all in the new 大运 | A birth whose 交运 falls in January |
| Q8 | In portrait, which flow columns show once 流月 or a finer level is chosen? The screenshots show 大运 and 流年 only | All of them, scrolling sideways | Choose a 流月 on a phone held upright |
| Q9 | How does the grid lay out 流日 and 流时 in portrait, and the strip's 流日 date? | 6 per row, scrolling down; `24` `/` `11` | The 流运 view at 流日 and 流时 upright |
| Q10 | Does 虚岁 turn at 春节 or at 立春? | 春节 | The 资料 view between 立春 and 春节 |
| Q11 | Which 夜子时 rule does it use, and where is it set? | 算次日, with 算当日 offered on the input screen | 2008-04-18 23:30: 日柱 己丑 for 算次日, 戊子 for 算当日 |
| Q12 | How does 十三行八字 count 起运: to the minute, or by days and 时辰? | To the minute; both give the screenshots' 5年 5个月 20天 | A birth an hour before a 节 |

## Sources

- The 29 screenshots of 十三行八字 this version follows, 2026-11-25
- 十三行八字 on the App Store (<https://apps.apple.com/us/app/-/id1446211447>): its first screenshot is the second reference chart, and its text says the colors follow 喜忌
- [lunar-typescript](https://github.com/6tail/lunar-typescript) 1.8.6: 四柱, 节, 农历, 纳音, 起运, 大运, 命宫 身宫 胎元 胎息, checked against 400 random births in the tests
- [qmdj](https://github.com/victorvan761/qmdj): the stack, date picker, offline copy and repository rules
