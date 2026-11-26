// The two reference charts.
//
// SHOT: the chart in the 29 screenshots of 十三行八字 this version follows: 男 1996-06-20 18:00, 丙子 甲午 戊子
// 辛酉, taken on 2026-11-25 (SHOT_NOW, the moment its 时空起盘 card shows).
//
// REF: the chart in 十三行八字's first App Store screenshot: 坤造 2008-04-18 18:00, 戊子 丙辰 戊子 辛酉, with 大运
// 乙卯 from 2012 (shown at age 4).
import type { BirthTime } from '../src/time';

export const SHOT: BirthTime = { year: 1996, month: 6, day: 20, hour: 18, minute: 0 };
export const SHOT_NOW: BirthTime = { year: 2026, month: 11, day: 25, hour: 12, minute: 20 };

export const REF: BirthTime = { year: 2008, month: 4, day: 18, hour: 18, minute: 0 };
