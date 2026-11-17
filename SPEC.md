# 八字排盘 App — Build Spec

The contract the app is built against: what it shows, the rules behind each value, and what is still open. Keep it current when a rule changes.

## 1 · Overview & scope

A prototype that draws a 八字 chart the way the iOS app 十三行八字 (Firm 13 Limited) does, in 简体中文 only. The reference is 十三行八字's App Store listing: its first screenshot shows a whole chart in the 关系 view with its 流年 cards, and the tests are built on it (坤造 2008-04-18 18:00, §4).

| Area | What the prototype ships |
| --- | --- |
| Input screen | 性别, the birth minute on a wheel picker (公历 or 农历), the 夜子时 rule, a live 四柱 preview, 排盘 and 现在 (§3) |
| Chart screen | Three tabs over the same columns: 关系 (刑冲会合 lines, pair names, 天地合), 大盘 (birth facts, 纳音, 星运, 自坐, 空亡), 神煞 (§4.5) |
| Flow panel | 流时 · 流日 · 流月 · 流年 · 大运 tabs; a row of cards, each listing its relations; the chosen flows become columns of the chart (§5) |
| Offline | Installs to the iPhone or iPad home screen and opens with no network (§8) |

Out of scope: 真太阳时 and birthplaces, time zones, saved or named charts, 隔角 拱 and 六害 · 六破 (§6.5), interpretation text, a second language.

## 2 · Layout

- Mobile-first: the screens are drawn 390 units wide, after 十三行八字 on a 390 pt iPhone. One unit (`--u`) is 1 px on a phone and grows to 1.5 px on an iPad, until the column fills the width; the content column is centered beyond that. `src/styles.css` holds every size in units.
- Colors of the five elements, for every stem, branch, 十神, dot and line: 木 `#3c9a4b`, 火 `#e0433a`, 土 `#8f6a4b`, 金 `#cf9216`, 水 `#3576d4`. The accent (buttons, tabs, the icon) is purple `#7b3a96`.
- The date picker is qmdj's, unchanged: a sheet the app draws itself with five wheels (年 月 日 时 分) in 公历 or 农历, 1900–2100. `src/wheels.ts` holds what each wheel lists as plain data.

## 3 · Input screen

| Element | Behavior |
| --- | --- |
| Title | 八字排盘 (the app's own name; 十三行八字 is the reference app's) |
| 性别 | 男 · 乾造 or 女 · 坤造. It sets the chart's 乾造/坤造 and the direction of 大运 (§4.3). Default 男 |
| 出生时间 | The chosen minute as `2008年04月18日 18:00`; a tap opens the date picker. It starts at the current time. On a narrow phone the text shrinks to fit |
| 夜子时 | 算次日 (default) or 算当日: whether 23:00–23:59 takes the next day's 日柱 (§4.1) |
| Preview | The four pillars for the current choices, 年 月 日 时 |
| Note | 按北京时间排盘，不作真太阳时校正。起运按出生到节气的分钟数精确计算。 |
| 排盘 | Casts the chart and opens it. The chart gets its own browser history entry, so the back gesture returns here, and a reload shows the chart again |
| 现在 | Sets the time to now |

## 4 · The chart

`castBazi(time, gender, settings)` in `src/bazi.ts`. Pure; the calendar comes from lunar-typescript 1.8.6.

The reference chart: 坤造 2008-04-18 18:00 → 年 戊子 · 月 丙辰 · 日 戊子 · 时 辛酉, day master 戊; 大运 run backward, 乙卯 from 2012 at age 4.

### 4.1 Calendar

- The time is Beijing wall-clock time, with no 真太阳时 or daylight-saving correction.
- 年柱 changes at the exact 立春 instant, 月柱 at the exact instant of each 节.
- 日柱 at night: 算次日 puts 23:00–23:59 on the next day (lunar-typescript sect 1); 算当日 keeps the calendar day's 日柱 with the next day's 子时 stem (sect 2). 时柱 is the same either way.

### 4.2 Each pillar

| Value | Rule |
| --- | --- |
| 十神 | Of each stem against the day master, written as one character beside it: 比 劫 食 伤 才 财 杀 官 卩 印 (卩 is 偏印). The day master has none |
| 藏干 | Stacked at the branch's right, 本气 first, each with its 十神: 辰 → 比戊 官乙 财癸 |
| 纳音 | lunar-typescript's table |
| 星运 | The day master's 十二长生 stage at this branch |
| 自坐 | This pillar's stem's own stage at its branch |
| 空亡 | The two branches this pillar's 旬 leaves out |

十二长生 runs forward from the 长生 branch for yang stems and backward for yin stems; 戊 follows 丙 and 己 follows 丁.

### 4.3 起运 and 大运

- Direction: 顺排 for a man born in a yang year or a woman born in a yin year, 逆排 otherwise.
- 起运 counts the minutes from birth to the next 节 (顺) or back to the last one (逆): 3 days make a year, 1 day 4 months, 2 hours 10 days (lunar-typescript Yun sect 2). Written as 出生后4年8个月1天6小时起运.
- 交运: the date the first 大运 starts; every tenth year after it, on the same date, the next one starts.
- Ten 大运, stepping through the 60 干支 from the 月柱. Before the first, 童限 runs from the birth year (left out when the first 大运 starts in the birth year).
- Ages are counted as the year minus the birth year, as 十三行八字 shows them: 大运 乙卯 at 4 (2012), 流年 2020 at 12.

### 4.4 Facts and 旺衰

The 大盘 tab adds: 农历 and 生肖, the 节 before and after the birth with their times, 起运 with its direction, 交运, 胎元 · 命宫 · 身宫, and the 五行 tally with a 旺衰 estimate. The estimate is the app's own, a rough one: the seven characters other than the day master are worth 1 each, a branch shared among its 藏干 (one: 1; two: 0.7 0.3; three: 0.6 0.3 0.1), and the month branch counts twice. The day master is 偏强 when its own element and the one that produces it hold 55% or more, 偏弱 at 45% or less, else 中和.

### 4.5 The chart screen

- Top bar: 关闭 (back to the input screen), the tabs 大盘 · 关系 · 神煞 (default 关系), and 乾造/坤造. Under it, the heading: 坤造 2008年4月18日 18:00 · 戊子年 三月十三 酉时.
- Columns, left to right: the chosen flows from the panel's level up to 大运 (§5), then 时 日 月 年, the 年柱 on the right as in 十三行八字. A flow column's head shows its big and small text (an age over a year, a 节 over a date …) over its name; 童限 shows 童 限 in place of a pillar.
- Each column: the stem with its 十神 at its upper right, the branch with its 藏干 at its right, each in its element's color.
- 关系: the stem lines above the pillars, the branch lines below the pair names (§6). 大盘: the facts card above, and 纳音 · 星运 · 自坐 · 空亡 rows below. 神煞: each column's stars (§7), the auspicious ones in the accent color.
- With more columns than fit (流时 shows nine), the chart scrolls sideways.

## 5 · The flows

### 5.1 Levels and cards

| Level | One card per | Big · small | Pillar |
| --- | --- | --- | --- |
| 大运 | 童限 and each 大运 | age · start year | the 大运 |
| 流年 | each year of the chosen 大运 | age · year | the 流年, which starts at that year's 立春: 2020 → 庚子 |
| 流月 | the twelve months of the chosen 流年, 立春 to 小寒 | 节 · its date | by 五虎遁 from the 流年's stem |
| 流日 | each day from the month's 节 up to the next 节 | day · month | that day's 日柱 |
| 流时 | the twelve 时辰 of the chosen day, 子 to 亥 | start hour · range | by 五鼠遁 |

Cards run right to left, as the columns do: the latest on the left. The chosen card is outlined and scrolled into the middle of the row.

### 5.2 What is chosen

- The panel opens at 流年 on today: the 流年 that holds today (it turns at 立春), the month by its 节, the day, and the 时辰. A today outside the chart's years picks the nearest year it has, at its first month and day.
- Choosing a card sets that level. Choosing a 大运 keeps the chosen year if it is one of that 大运's years, else takes its first. A day past the end of a shorter month becomes that month's last day.
- The clock button goes back to today; the chevron folds the panel away and back.

### 5.3 A card's list

Each card lists how its own pillar meets the columns it is read against: the chosen flows above its level, then 时 日 月 年. In order:

1. Pair names with another column (§6.4), the other column's name in gray: 月柱 克会, 合刑 大运.
2. 天地合, when its stem combines with its own branch.
3. Its stem's lines, each marked ○ in its stem's color, then its branch's lines, marked ●. Within each: 冲, 三刑, 刑, 自刑, 三合, 半合, 三会, 合, 暗合, 拱, then the nearest column first. A folded line shows its count: ● 2 合比成化.

The reference chart's cards, against 大运 乙卯 and the four pillars:

| 流年 | Card |
| --- | --- |
| 2021 辛丑 | 同会 时柱 · ○冲 · ○合财成化 · ●半合伤成化 · ●2 合比成化 |
| 2020 庚子 | 月柱 克会 · 合刑 大运 · ○合伤成化 · ●无礼之刑 · ●半合财成化 |
| 2019 己亥 | 大运 克会 · ●半合官成化 |
| 2018 戊戌 | ●冲 · ●合印不化 (十三行八字 also lists 隔角拱才: §6.5) |
| 2017 丁酉 | 克刑 时柱 · ●冲 · ●自刑 · ●合伤成化 |

## 6 · 刑冲会合

`src/relations.ts`, between whatever columns the chart shows, judged against the natal day master and month branch.

### 6.1 Lines

| Between | Relation | Label |
| --- | --- | --- |
| Stems | 五合: 甲己 土, 乙庚 金, 丙辛 水, 丁壬 木, 戊癸 火 | 合 + 化神 + 成化/不化 (§6.3) |
| Stems | 冲: 甲庚, 乙辛, 丙壬, 丁癸 | 冲, with an arrow at the one attacked (甲, 乙, 丙, 丁) |
| Branches | 六合: 子丑 土, 寅亥 木, 卯戌 火, 辰酉 金, 巳申 水, 午未 土 | 合 + 化神 + 成化/不化 |
| Branches | 六冲: 子午, 丑未, 寅申, 卯酉, 辰戌, 巳亥 | 冲, with an arrow at the branch whose element the other overcomes (酉 attacks 卯); none for 丑未 and 辰戌 |
| Branches | 三合 申子辰 水, 亥卯未 木, 寅午戌 火, 巳酉丑 金, all three present | 三合 + 化神 + 成化/不化 |
| Branches | Two of a 三合 with its middle (帝旺) branch | 半合 + 化神 + 成化/不化 |
| Branches | The two ends of a 三合 without the middle | 拱 + the 十神 of the middle branch's 本气: 申辰 拱子 → 拱财 |
| Branches | 三会 寅卯辰 木, 巳午未 火, 申酉戌 金, 亥子丑 水, all three | 三会 + 化神 + 成化/不化 |
| Branches | 三刑 寅巳申 or 丑戌未, all three | 三刑 |
| Branches | Two of 寅巳申 / 丑戌未 | 无恩之刑 / 恃势之刑 |
| Branches | 子卯 | 无礼之刑 |
| Branches | The same branch twice, for 辰 午 酉 亥 | 自刑 (other repeated branches are no relation) |
| Branches | 暗合: 寅丑, 卯申, 午亥 | 暗合 |

A whole 三合 or 三刑 replaces the pair lines of its own branches. Each line joins its characters with a dot on each (hollow for stems, filled for branches), colored from the first character's element to the last's; 冲 lines are dashed.

### 6.2 Folding and order

- Pair lines that share their level, label, left column, right character and arrow direction fold into one line with a count: 卯 无礼之刑 子, with 子 in two columns, is one line marked 2.
- Lines run from the pillars outward: the line whose left column is furthest right sits nearest the pillars, then by the right column. Stem lines stack upward from the pillars, branch lines downward.
- The label sits on the line just after the first character. When the next character is too close for it (adjacent columns on a phone), it moves past the last character, or else before the first, so that it covers no character and no arrow.

### 6.3 化神 and 成化

- A combination's label names what it turns into by its 十神 group against the day master, in that element's color: 比 (the same element), 伤 (what the day master produces), 财 (what it overcomes), 官 (what overcomes it), 印 (what produces it). For the 戊 day master, 丙辛 合水 is 合财.
- It 成化 when the month branch holds that element among its 藏干, or the month branch's own element produces it; else 不化. With 辰 as the month branch: 水 (辰 holds 癸) and 金 (土 produces 金) 成化, 火 不化. This rule fits all five of the screenshot's cards; see §9.

### 6.4 Pair names and 天地合

- Two columns that relate in both stem and branch get a name, listed under the left column with the other column's name in gray:
  - Stems: 同 (the same stem), 合, 冲, or 克 (one overcomes the other, both yang or both yin).
  - Branches: 同 (the same branch; 刑 for 辰午酉亥), 冲, 合 (六合), 会 (a 半合), or 刑 (子卯, or two of a 三刑).
  - Names: 伏吟 for 同 and 同; 反吟 for 冲 or 克 with 冲; 双合 for 合 and 合; no name for another stem relation with the same branch; otherwise the two in order, as 克会, 合刑, 同会.
  - When the stems 冲 or 克 and the other column's stem is the one that overcomes, the other column is named first: 月柱 克会.
  - Under each column, the nearest column to the natal chart first.
- 天地合: a pillar whose stem combines with its own branch's 本气 (丁亥, 戊子, 辛巳, 壬午 …), written under that column.

### 6.5 Not computed

- 隔角 拱: the screenshot's 2018 戊戌 card lists 隔角拱才, which the prototype does not compute (its rule is §9 Q4).
- 六害 and 六破 are not drawn. The screenshot's chart has 卯辰 (害) and 子酉 (破) and draws neither, so 十三行八字 leaves them out of this view too.

## 7 · 神煞

`src/shensha.ts`. Schools differ on several of these; each table in the file names the rule it follows.

| Looked up from | Stars |
| --- | --- |
| 日干 or 年干 | 天乙贵人 (甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎), 太极贵人, 文昌贵人, 国印贵人 |
| 日干 | 禄神, 羊刃 (禄 + 1 for every stem), 红艳煞, 金舆 |
| 月支 | 天德贵人, 天德合 (a stem or a branch), 月德贵人, 月德合 (a stem), 天医 (the branch before the month's) |
| The 三合 group of 年支 or 日支 | 驿马, 桃花, 华盖, 将星, 劫煞, 灾煞, 亡神 |
| 年支 | 孤辰, 寡宿 (by its 方), 红鸾, 天喜 (opposite 红鸾) |
| The 日柱 itself | 魁罡, 阴差阳错, 孤鸾煞, 十恶大败, 天赦 (by the season of 月支) |
| 日空 | 空亡: a branch the 日柱's 旬 leaves out; never the 日柱 itself |

Flow columns get every star that looks up a stem or a branch, read against the natal chart; the stars of the 日柱 itself are the natal 日柱's only. Each column lists its stars once, in the order of the table above (贵人 first). The reference chart: 年 将星 · 月 太极贵人 华盖 红艳煞 · 日 将星 · 时 桃花 天喜; 大运 乙卯 天医 红鸾.

## 8 · Hosting & offline

As qmdj's (its SPEC §11), under this app's own names.

- Hosting: GitHub Pages at <https://victorvan761.github.io/bz/>. `.github/workflows/deploy.yml` runs the typecheck, tests and build on every push and pull request, and publishes `main` only when they pass.
- Install: open the site in Safari, then Share → 添加到主屏幕. `public/manifest.webmanifest` and `public/apple-touch-icon.png` give it the name 八字排盘, the icon (eight element-colored tiles on purple, drawn by `tools/make-icons.mjs`) and a full-screen window.
- Offline: the built `sw.js` (`src/sw.js` plus the file list `vite.config.ts` writes at build time) keeps every built file on the device and answers the app's own requests from that copy, online or not. Its caches are named `bazi <scope> <version>`, so it never touches qmdj's caches on the same origin, nor qmdj its.
- Updates: every build changes `sw.js`, since its version hashes every file. The phone downloads a new build in the background and switches to it on the next launch, never under a page that is still open. If any file fails to download, it keeps the old copy.

## 9 · Open questions

Each has the default the prototype uses. Enter the birth in 十三行八字 to settle it; a different answer means changing that rule, this spec and its tests.

| # | Question | Default | How to check |
| --- | --- | --- | --- |
| Q1 | How does 十三行八字 count 起运: to the minute, or by days and 时辰? | To the minute (§4.3); the reference chart's 2012 start matches either way | A birth an hour before a 节, e.g. 2026-11-07 16:00 (立冬 17:52): compare the 起运 text |
| Q2 | Which 夜子时 rule does it use, and can it be changed? | 算次日, with 算当日 offered | 2008-04-18 23:30: 日柱 己丑 for 算次日, 戊子 for 算当日 |
| Q3 | Is 成化 judged by the month branch alone (§6.3)? | Yes: held in its 藏干 or produced by its element | A 合 whose element neither the month branch holds nor produces, but the chart has plenty of |
| Q4 | What makes a 隔角 拱 (its 2018 card: 戌 with 子 拱 亥 → 才)? | Not computed | Charts with 戌子, 丑卯, 辰午, 未酉 in neighboring columns |
| Q5 | Does a natal pillar count its own branch for 将星, 华盖 … (the 年柱 子 is its own 将星)? | Yes | The 神煞 tab of the reference chart |
| Q6 | Which 神煞 does it list, and by which school? | §7 | The 神煞 view of a few charts |
| Q7 | Does it show 旺衰, and how? | The app's own rough estimate (§4.4) | Its 大盘 or detail views |
| Q8 | How many 大运 does it list? | 童限 and ten | Scroll its 大运 cards |

## Sources

- 十三行八字 on the App Store (<https://apps.apple.com/us/app/-/id1446211447>): its screenshots, the first of which is the reference chart
- [lunar-typescript](https://github.com/6tail/lunar-typescript) 1.8.6: 四柱, 节, 农历, 纳音, 起运 and 大运, checked against 400 random births in the tests
- [qmdj](https://github.com/victorvan761/qmdj): the stack, date picker, offline copy and repository rules
