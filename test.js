/** 边界时刻离线校验（复用 app.js 的推算逻辑） */
const path = require('path');
global.window = {};
require(path.join(__dirname, 'data.js'));
const LINE = global.window.LINE8;
const ST = LINE.stations;
const N = ST.length;

const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const isWeekend = (ts) => { const w = new Date(ts).getDay(); return w === 0 || w === 6; };

const depCache = {};
function departures(weekend) {
  const key = weekend ? 'we' : 'wd';
  if (depCache[key]) return depCache[key];
  const cfg = weekend ? LINE.service.weekend : LINE.service.weekday;
  const table = weekend ? LINE.intervals.weekend : LINE.intervals.weekday;
  const out = [];
  let t = cfg.first;
  let g = 0;
  while (t < cfg.last && g++ < 400) {
    out.push(t);
    let gap = 7;
    for (let i = 0; i < table.length; i++) { if (t < table[i].until) { gap = table[i].gap; break; } }
    t += gap;
  }
  const tail = out[out.length - 1];
  if (tail !== undefined && cfg.last - tail < 0.6) out[out.length - 1] = cfg.last;
  else out.push(cfg.last);
  depCache[key] = out;
  return out;
}

function scheduleFor(idx, dir, nowTs) {
  const off = dir === 'down' ? ST[idx].downOff : ST[idx].upOff;
  const today0 = startOfDay(nowTs);
  const list = [];
  for (let d = -1; d <= 1; d++) {
    const base = today0 + d * 86400000;
    const deps = departures(isWeekend(base + 12 * 3600000));
    for (let i = 0; i < deps.length; i++) list.push(base + (deps[i] + off) * 60000);
  }
  return list.sort((a, b) => a - b);
}

function upperBound(list, v) {
  let lo = 0, hi = list.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (list[m] <= v) lo = m + 1; else hi = m; }
  return lo;
}

const hm = (ts) => {
  const d = new Date(ts);
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
};

function check(label, y, mo, d, h, mi, idx, dir) {
  const now = new Date(y, mo - 1, d, h, mi, 0).getTime();
  const list = scheduleFor(idx, dir, now);
  const i = upperBound(list, now);
  const next = list[i];
  const prev = i > 0 ? list[i - 1] : null;
  const gap = next - now;

  const today0 = startOfDay(now);
  const nextIsToday = next < today0 + 86400000;
  const prevIsToday = prev !== null && prev >= today0;
  const firstOfToday = nextIsToday && !prevIsToday;

  let state;
  if (gap >= 3600000) state = nextIsToday ? '首班车(未开始)' : '已收班';
  else state = firstOfToday ? '首班车' : '运营中';

  console.log(
    label.padEnd(24),
    ST[idx].name.padEnd(7) + ' ' + dir.padEnd(4),
    '| 上', prev ? hm(prev) : '  -- ',
    '→ 下', hm(next),
    '| 等待', String(Math.round(gap / 60000)).padStart(4) + 'min',
    '|', state
  );
}

console.log('=== 边界时刻校验 ===');
check('周日 05:30 首班前', 2026, 10, 18, 5, 30, 17, 'down');
check('周日 07:10 首班车将至', 2026, 10, 18, 7, 10, 17, 'down');
check('周日 07:20 刚过首班', 2026, 10, 18, 7, 20, 17, 'down');
check('周日 22:50 平峰', 2026, 10, 18, 22, 50, 17, 'down');
check('周日 23:30 末班车中', 2026, 10, 18, 23, 30, 17, 'down');
check('周日 23:50 已过末班', 2026, 10, 18, 23, 50, 17, 'down');
check('周一 00:30 凌晨', 2026, 10, 19, 0, 30, 17, 'down');
check('周一 08:20 早高峰', 2026, 10, 19, 8, 20, 17, 'down');
check('周一 18:00 晚高峰', 2026, 10, 19, 18, 0, 17, 'up');
check('起点站金潭路 08:00', 2026, 10, 19, 8, 0, 0, 'down');
check('终点军运村 08:00', 2026, 10, 19, 8, 0, 25, 'up');

// 间隔合理性：连续班次差值应在 3.5~8 分钟之间
console.log('\n=== 间隔合理性 ===');
const list = scheduleFor(17, 'down', new Date(2026, 9, 19, 8, 0).getTime());
let minGap = 999, maxGap = 0, bad = 0;
for (let i = 1; i < list.length; i++) {
  const g = (list[i] - list[i - 1]) / 60000;
  if (g < 1) { bad++; continue; }
  if (g < minGap) minGap = g;
  if (g > maxGap) maxGap = g;
}
console.log('最小间隔', minGap.toFixed(1), '分钟 | 最大间隔', maxGap.toFixed(1), '分钟 | 异常(<1min)', bad);

// 工作日全天班次数
const wd = scheduleFor(17, 'down', new Date(2026, 9, 19, 8, 0).getTime());
const t0 = startOfDay(new Date(2026, 9, 19, 8, 0).getTime());
const todayWd = wd.filter((ts) => ts >= t0 + 5 * 3600000 && ts <= t0 + 25 * 3600000);
console.log('工作日全天班次:', todayWd.length, '| 首班', hm(todayWd[0]), '| 末班', hm(todayWd[todayWd.length - 1]));
