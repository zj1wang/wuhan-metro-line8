/* 武汉地铁 8号线 · 下一趟 */
(function () {
  'use strict';

  const LINE = window.LINE8;
  const ST = LINE.stations;
  const N = ST.length;
  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

  const el = {
    clock: $('#clock'),
    clockDay: $('#clockDay'),
    stationName: $('#stationName'),
    stationTransfers: $('#stationTransfers'),
    stationBtn: $('#stationBtn'),
    locateBtn: $('#locateBtn'),
    locateNote: $('#locateNote'),
    segs: $$('.seg'),
    board: $('#board'),
    status: $('#status'),
    boardToward: $('#boardToward'),
    countdown: $('#countdown'),
    cdNum: $('#cdNum'),
    cdUnit: $('#cdUnit'),
    cdCaption: $('#cdCaption'),
    railProgress: $('#railProgress'),
    railDot: $('#railDot'),
    prevLabel: $('#prevLabel'),
    nextLabel: $('#nextLabel'),
    after1: $('#after1'),
    after2: $('#after2'),
    tripTime: $('#tripTime'),
    ttToggle: $('#timetableToggle'),
    ttBody: $('#timetableBody'),
    ttGrid: $('#ttGrid'),
    ttScroll: $('#ttScroll'),
    ttMeta: $('#ttMeta'),
    infoToggle: $('#infoToggle'),
    infoBody: $('#infoBody'),
    calibVal: $('#calibVal'),
    sheetMask: $('#sheetMask'),
    sheetList: $('#stationList'),
    search: $('#stationSearch'),
    toast: $('#toast'),
  };

  /* ─────────────── 状态 ─────────────── */
  const state = {
    idx: 17,            // 街道口
    dir: 'down',        // down = 开往军运村
    calib: 0,           // 校准秒数
    distances: null,    // 定位后的各站距离（米）
  };

  try {
    const savedCalib = parseInt(localStorage.getItem('line8.calib'), 10);
    if (!isNaN(savedCalib)) state.calib = savedCalib;

    // 记住上次看的站点与方向：手机上手动选一次，下次打开还是它
    const savedIdx = parseInt(localStorage.getItem('line8.idx'), 10);
    if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < ST.length) state.idx = savedIdx;
    const savedDir = localStorage.getItem('line8.dir');
    if (savedDir === 'down' || savedDir === 'up') state.dir = savedDir;
  } catch (e) { /* 隐私模式下忽略 */ }

  function savePrefs() {
    try {
      localStorage.setItem('line8.idx', String(state.idx));
      localStorage.setItem('line8.dir', state.dir);
    } catch (e) { /* ignore */ }
  }

  /* ─────────────── 时间工具 ─────────────── */
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function isWeekend(ts) {
    const w = new Date(ts).getDay();
    return w === 0 || w === 6;
  }

  /* ─────────────── 时刻表推演 ───────────────
     取两端起点站首班发车时间 + 分时段行车间隔，逐班累加，
     再叠加"起点站 → 本站"的运行分钟偏移，得到本站到站时刻。 */

  const depCache = {};

  function departures(weekend) {
    const key = weekend ? 'we' : 'wd';
    if (depCache[key]) return depCache[key];

    const cfg = weekend ? LINE.service.weekend : LINE.service.weekday;
    const table = weekend ? LINE.intervals.weekend : LINE.intervals.weekday;

    const out = [];
    let t = cfg.first;
    while (t < cfg.last) {
      out.push(t);
      let gap = 7;
      for (let i = 0; i < table.length; i++) {
        if (t < table[i].until) { gap = table[i].gap; break; }
      }
      t += gap;
    }
    // 确保末班车存在；若循环已生成几乎相同的一班则替换，避免出现 0 间隔的重复班次
    const tail = out[out.length - 1];
    if (tail !== undefined && cfg.last - tail < 0.6) out[out.length - 1] = cfg.last;
    else out.push(cfg.last);

    depCache[key] = out;
    return out;
  }

  let schedCache = { key: null, list: null };

  function scheduleFor(idx, dir, nowTs) {
    const key = idx + '|' + dir + '|' + startOfDay(nowTs);
    if (schedCache.key === key) return schedCache.list;

    const off = dir === 'down' ? ST[idx].downOff : ST[idx].upOff;
    const today0 = startOfDay(nowTs);
    const list = [];

    // 覆盖昨天 / 今天 / 明天，兼容跨零点的末班车与凌晨查首班
    for (let d = -1; d <= 1; d++) {
      const base = today0 + d * 86400000;
      const deps = departures(isWeekend(base + 12 * 3600000));
      for (let i = 0; i < deps.length; i++) {
        list.push(base + (deps[i] + off) * 60000);
      }
    }
    list.sort((a, b) => a - b);

    schedCache = { key: key, list: list };
    return list;
  }

  function upperBound(list, v) {
    let lo = 0, hi = list.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (list[m] <= v) lo = m + 1;
      else hi = m;
    }
    return lo;
  }

  function fmtHM(ts, nowTs) {
    const d = new Date(ts);
    const nd = new Date(nowTs);
    const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    const same = d.getFullYear() === nd.getFullYear()
      && d.getMonth() === nd.getMonth()
      && d.getDate() === nd.getDate();
    return same ? hm : '次日 ' + hm;
  }

  /* ─────────────── 计算某个方向的候车信息 ─────────────── */
  function computeInfo(idx, dir, now) {
    const terminalIdx = dir === 'down' ? N - 1 : 0;
    const isTerminal = idx === terminalIdx;

    if (isTerminal) {
      return { valid: false };
    }

    const list = scheduleFor(idx, dir, now);
    const i = upperBound(list, now);
    const next = list[i];
    const prev = i > 0 ? list[i - 1] : null;
    const gap = next - now;

    // 下一趟是否为"今日首班"：下一班在今天，而上一班不属今天
    const today0 = startOfDay(now);
    const nextIsToday = next < today0 + 86400000;
    const prevIsToday = prev !== null && prev >= today0;
    const firstOfToday = nextIsToday && !prevIsToday;

    const tripMin = dir === 'down'
      ? ST[N - 1].downOff - ST[idx].downOff
      : ST[0].upOff - ST[idx].upOff;

    return {
      valid: true,
      next: next,
      prev: prev,
      gap: gap,
      firstOfToday: firstOfToday,
      after1: list[i + 1] || null,
      after2: list[i + 2] || null,
      tripMin: tripMin,
      closed: gap >= 3600000,
    };
  }

  /* ─────────────── 渲染 ─────────────── */
  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function transferHTML(arr) {
    return arr.map((n) =>
      '<span class="tline" style="background:' + (LINE.transferColors[n] || '#8898A4') + '">' + n + '</span>'
    ).join('');
  }

  function renderStationHeader() {
    const s = ST[state.idx];
    setText(el.stationName, s.name);
    el.stationTransfers.innerHTML = transferHTML(s.transfers);
  }

  let lastCdKey = '';
  let lastStatus = '';

  function setStatus(kind) {
    if (lastStatus === kind) return;
    lastStatus = kind;
    el.status.classList.toggle('is-closed', kind === 'closed');
    el.status.classList.toggle('is-first', kind === 'first');
    el.status.innerHTML = '<i></i>' + (kind === 'open' ? '运营中' : kind === 'first' ? '首班车' : '已收班');
  }

  function render() {
    const now = Date.now() + state.calib * 1000;
    const d = new Date(now);

    setText(el.clock, pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()));
    setText(el.clockDay, (d.getMonth() + 1) + '/' + d.getDate() + ' ' + WEEK[d.getDay()]);

    const infos = {
      down: computeInfo(state.idx, 'down', now),
      up: computeInfo(state.idx, 'up', now),
    };

    // 方向按钮
    el.segs.forEach(function (btn) {
      const dir = btn.dataset.dir;
      const info = infos[dir];
      const eta = btn.querySelector('.seg-eta');

      btn.classList.toggle('is-active', dir === state.dir);
      btn.disabled = !info.valid;
      btn.style.opacity = info.valid ? '' : '.42';

      if (!info.valid) {
        setText(eta, '终点站');
      } else if (info.closed) {
        setText(eta, fmtHM(info.next, now));
      } else {
        const mins = Math.floor(info.gap / 60000);
        const secs = Math.floor((info.gap % 60000) / 1000);
        setText(eta, mins < 1 ? secs + ' 秒' : mins + ' 分');
      }
    });

    // 主看板
    const cur = infos[state.dir];
    const toward = LINE.directions[state.dir].label;
    setText(el.boardToward, toward);

    if (!cur.valid) {
      setText(el.cdNum, '—');
      setText(el.cdUnit, '');
      setText(el.cdCaption, '本站为该方向终点站');
      return;
    }

    setText(el.after1, cur.after1 ? fmtHM(cur.after1, now) : '—');
    setText(el.after2, cur.after2 ? fmtHM(cur.after2, now) : '—');
    setText(el.tripTime, cur.tripMin + ' 分');

    setText(el.nextLabel, '下一班 ' + fmtHM(cur.next, now));
    setText(el.prevLabel, cur.prev ? '上一班 ' + fmtHM(cur.prev, now) : '首班之前');

    // 状态
    if (cur.closed) {
      const sameDay = new Date(cur.next).getDate() === new Date(now).getDate();
      setStatus(sameDay ? 'first' : 'closed');
      setText(el.cdNum, '—');
      setText(el.cdUnit, '');
      setText(el.cdCaption, (sameDay ? '今日首班车 ' : '明日首班车 ') + fmtHM(cur.next, now));
      el.countdown.classList.remove('is-soon', 'is-near');
      el.railDot.style.left = 'calc(7px + (100% - 14px) * 0)';
      el.railProgress.style.width = '0px';
      lastCdKey = '--';
      return;
    }

    setStatus(cur.firstOfToday ? 'first' : 'open');

    // 倒计时
    const secs = Math.max(0, Math.round(cur.gap / 1000));
    let num, unit, key;
    if (secs < 3600) {
      num = pad2(Math.floor(secs / 60));
      unit = ':' + pad2(secs % 60);
    } else {
      num = String(Math.floor(secs / 60));
      unit = ' 分';
    }
    key = num + unit;
    if (key !== lastCdKey) {
      lastCdKey = key;
      setText(el.cdNum, num);
      setText(el.cdUnit, unit);
    }

    setText(el.cdCaption, cur.firstOfToday ? '今日首班车到站' : '下一趟到站');

    el.countdown.classList.toggle('is-soon', secs <= 90);
    el.countdown.classList.toggle('is-near', secs <= 30);

    // 轨道进度
    let p = 0;
    if (cur.prev) {
      const span = cur.next - cur.prev;
      p = span > 0 ? (now - cur.prev) / span : 0;
      p = Math.min(1, Math.max(0, p));
    }
    el.railDot.style.left = 'calc(7px + (100% - 14px) * ' + p.toFixed(4) + ')';
    el.railProgress.style.width = 'calc((100% - 14px) * ' + p.toFixed(4) + ')';

    if (!el.ttBody.hidden) updateTimetableHighlight(now);
  }

  /* ─────────────── 全天时刻表 ─────────────── */
  let ttCells = [];
  let nowRow = null;

  function renderTimetable() {
    const now = Date.now() + state.calib * 1000;
    const list = scheduleFor(state.idx, state.dir, now);
    const t0 = startOfDay(now);

    const today = list.filter((ts) => ts >= t0 + 5 * 3600000 && ts <= t0 + 25 * 3600000);

    // 按小时分组
    const groups = [];
    today.forEach(function (ts) {
      const d = new Date(ts);
      const h = d.getHours();
      let g = groups[groups.length - 1];
      if (!g || g.hour !== h) { g = { hour: h, items: [] }; groups.push(g); }
      g.items.push({ ts: ts, mm: d.getMinutes() });
    });

    el.ttGrid.innerHTML = '';
    ttCells = [];
    nowRow = null;
    let nextAssigned = false;

    const frag = document.createDocumentFragment();

    groups.forEach(function (g) {
      const row = document.createElement('div');
      row.className = 'tt-row';

      const hEl = document.createElement('span');
      hEl.className = 'tt-h';
      hEl.textContent = pad2(g.hour);

      const listEl = document.createElement('span');
      listEl.className = 'tt-list';

      g.items.forEach(function (it) {
        const b = document.createElement('b');
        b.className = 'tt-t';
        b.textContent = pad2(it.mm);

        if (it.ts <= now) {
          b.classList.add('is-past');
        } else if (!nextAssigned) {
          nextAssigned = true;
          b.classList.add('is-next');
          row.classList.add('is-now');
          nowRow = row;
        }

        listEl.appendChild(b);
        ttCells.push({ node: b, ts: it.ts });
      });

      row.appendChild(hEl);
      row.appendChild(listEl);
      frag.appendChild(row);
    });

    el.ttGrid.appendChild(frag);

    const dirLabel = LINE.directions[state.dir].terminal;
    setText(el.ttMeta, ST[state.idx].name + ' · 开往' + dirLabel + ' · 共 ' + today.length + ' 班');

    updateTimetableHighlight(now);

    if (!el.ttBody.hidden && nowRow) {
      nowRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function updateTimetableHighlight(now) {
    if (!ttCells.length) return;
    let nextSet = false;
    for (let i = 0; i < ttCells.length; i++) {
      const c = ttCells[i];
      const past = c.ts <= now;
      c.node.classList.toggle('is-past', past);
      const isNext = !past && !nextSet;
      if (isNext) nextSet = true;
      c.node.classList.toggle('is-next', isNext);
      if (isNext && nowRow) {
        // 当前小时行可能随时间推进而变化，保持高亮正确
        const row = c.node.closest('.tt-row');
        if (row && row !== nowRow) {
          if (nowRow) nowRow.classList.remove('is-now');
          row.classList.add('is-now');
          nowRow = row;
        }
      }
    }
  }

  /* ─────────────── 站点选择 ─────────────── */
  function renderStationList(filter) {
    const q = (filter || '').trim();
    const frag = document.createDocumentFragment();

    ST.forEach(function (s, i) {
      if (q && s.name.indexOf(q) === -1 && s.en.toLowerCase().indexOf(q.toLowerCase()) === -1) return;

      const row = document.createElement('button');
      row.className = 'st-row' + (i === state.idx ? ' is-current' : '');
      row.dataset.idx = i;

      let distHTML = '';
      if (state.distances) {
        const m = state.distances[i];
        distHTML = '<span class="st-dist">' + (m < 1000 ? Math.round(m) + ' 米' : (m / 1000).toFixed(1) + ' 公里') + '</span>';
      }

      let endHTML = '';
      if (i === 0) endHTML = '<span class="st-end">起点</span>';
      else if (i === N - 1) endHTML = '<span class="st-end">终点</span>';

      row.innerHTML =
        '<span class="st-idx">' + pad2(i + 1) + '</span>' +
        '<span class="st-body">' +
          '<span class="st-name">' + s.name + '</span>' +
          distHTML +
          '<span class="st-transfers">' + transferHTML(s.transfers) + '</span>' +
        '</span>' +
        endHTML;

      frag.appendChild(row);
    });

    el.sheetList.innerHTML = '';
    if (!frag.childNodes.length) {
      const empty = document.createElement('p');
      empty.className = 'st-empty';
      empty.textContent = '没有找到「' + q + '」相关的站点';
      el.sheetList.appendChild(empty);
      return;
    }
    el.sheetList.appendChild(frag);
  }

  function openSheet() {
    el.sheetMask.hidden = false;
    renderStationList(el.search.value);
    setTimeout(function () { el.search.focus(); }, 120);
  }

  function closeSheet() {
    el.sheetMask.hidden = true;
    el.search.value = '';
  }

  /* ─────────────── 选择站点 ─────────────── */
  function selectStation(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= N) return;
    if (i === state.idx && !opts.force) { closeSheet(); return; }

    state.idx = i;

    // 若当前方向在本站无车（本站为该方向终点），自动切到另一方向
    const terminalIdx = state.dir === 'down' ? N - 1 : 0;
    if (i === terminalIdx) {
      state.dir = state.dir === 'down' ? 'up' : 'down';
    }

    renderStationHeader();
    closeSheet();
    savePrefs();
    renderTimetable();
    lastCdKey = '';
    el.board.classList.remove('flip');
    void el.board.offsetWidth;
    el.board.classList.add('flip');
    render();
  }

  /* ─────────────── 定位 ─────────────── */
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLng = (lng2 - lng1) * toRad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /* 局域网 IP（http://192.168.x.x）不是安全上下文，浏览器会直接禁用定位 */
  function isLanHttp() {
    const h = location.hostname;
    return location.protocol === 'http:'
      && h !== 'localhost' && h !== '127.0.0.1' && h !== '::1'
      && !window.isSecureContext;
  }

  function locate() {
    if (!navigator.geolocation) {
      showToast('当前浏览器不支持定位');
      return;
    }

    if (isLanHttp()) {
      el.locateNote.hidden = false;
      el.locateNote.textContent = '当前是 http://' + location.host + '。浏览器规定只有 https 或 localhost 才能调用定位，'
        + '所以在手机上请直接点上面的站点框手动选站，选一次会记住。';
      showToast('http 页面不能定位，请手动点选车站');
      return;
    }

    el.locateBtn.classList.add('loading');

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        el.locateBtn.classList.remove('loading');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const dists = ST.map(function (s) { return haversine(lat, lng, s.lat, s.lng); });
        state.distances = dists;

        let best = 0;
        for (let i = 1; i < N; i++) if (dists[i] < dists[best]) best = i;

        const dm = dists[best];
        const prevIdx = state.idx;
        selectStation(best, { force: prevIdx === best });

        el.locateNote.hidden = false;
        el.locateNote.textContent = dm > 3000
          ? '您当前距 8 号线较远（最近为 ' + ST[best].name + '，约 ' + (dm / 1000).toFixed(1) + ' 公里），已按该站显示。'
          : '已定位到最近的 ' + ST[best].name + '站，直线距离约 ' + (dm < 1000 ? Math.round(dm) + ' 米' : (dm / 1000).toFixed(1) + ' 公里') + '。';
      },
      function (err) {
        el.locateBtn.classList.remove('loading');
        let msg = '定位失败，请手动选择站点';
        if (err.code === 1) msg = '定位权限被拒绝，可手动选择站点';
        else if (err.code === 2) msg = '暂时无法获取位置，请检查网络或 GPS';
        else if (err.code === 3) msg = '定位超时，请重试';
        if (location.protocol === 'file:') {
          msg = '浏览器限制：本地文件方式无法定位，请运行 start.bat 打开';
        }
        showToast(msg);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  }

  /* ─────────────── Toast ─────────────── */
  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    requestAnimationFrame(function () { el.toast.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
      setTimeout(function () { el.toast.hidden = true; }, 250);
    }, 3200);
  }

  /* ─────────────── 事件绑定 ─────────────── */
  el.stationBtn.addEventListener('click', openSheet);
  el.locateBtn.addEventListener('click', locate);
  el.sheetMask.addEventListener('click', function (e) {
    if (e.target === el.sheetMask) closeSheet();
  });

  el.search.addEventListener('input', function () { renderStationList(this.value); });

  el.sheetList.addEventListener('click', function (e) {
    const row = e.target.closest('.st-row');
    if (row) selectStation(parseInt(row.dataset.idx, 10));
  });

  el.segs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const dir = btn.dataset.dir;
      if (dir === state.dir) return;
      state.dir = dir;
      savePrefs();
      renderTimetable();
      lastCdKey = '';
      el.board.classList.remove('flip');
      void el.board.offsetWidth;
      el.board.classList.add('flip');
      render();
    });
  });

  el.ttToggle.addEventListener('click', function () {
    const open = el.ttBody.hidden;
    el.ttBody.hidden = !open;
    el.ttToggle.setAttribute('aria-expanded', String(open));
    if (open) renderTimetable();
  });

  el.infoToggle.addEventListener('click', function () {
    const open = el.infoBody.hidden;
    el.infoBody.hidden = !open;
    el.infoToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.calib-btn');
    if (!btn) return;
    const v = parseInt(btn.dataset.set, 10);
    state.calib = (v === 0) ? 0 : state.calib + v;
    state.calib = Math.max(-300, Math.min(300, state.calib));
    try { localStorage.setItem('line8.calib', String(state.calib)); } catch (err) { /* ignore */ }
    setText(el.calibVal, state.calib === 0 ? '0 秒' : (state.calib > 0 ? '+' : '') + state.calib + ' 秒');
    schedCache.key = null;
    renderTimetable();
    render();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.sheetMask.hidden) closeSheet();
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      schedCache.key = null;
      if (!el.ttBody.hidden) renderTimetable();
      render();
    }
  });

  /* ─────────────── 启动 ─────────────── */
  setText(el.calibVal, state.calib === 0 ? '0 秒' : (state.calib > 0 ? '+' : '') + state.calib + ' 秒');
  renderStationHeader();
  renderTimetable();
  render();

  setInterval(render, 500);
})();
