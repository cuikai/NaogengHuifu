/**
 * 本地状态。全部存在本机，不上传任何服务器。
 *
 * v3 新增：分层结果、每日反馈、升降级进度、每周复评曲线。
 * v2 的旧数据会被平滑迁移（保留 startDate / 累计 / 里程碑 / 手写的话）。
 */
const KEY = 'ngk_state_v3';
const OLD_KEY = 'ngk_state_v2';

const assess = require('./assess.js');
const plan = require('./plan.js');
const adl = require('./adl.js');
const lib = require('./library.js');

function ymd(d) {
  d = d || new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function prettyDate(s) {
  const a = (s || ymd()).split('-');
  return Number(a[1]) + ' 月 ' + Number(a[2]) + ' 日';
}

function daysBetween(a, b) {
  const t = (s) => { const x = s.split('-'); return Date.UTC(+x[0], +x[1] - 1, +x[2]); };
  return Math.round((t(b) - t(a)) / 86400000);
}

function blank() {
  return {
    v: 3,
    startDate: ymd(),
    lastDate: ymd(),
    assessed: false,
    ans: {},            // 快筛答案
    level: { m: 1, h: 1 },
    flags: [],
    assessedAt: '',
    progress: {},       // 今天：动作 id → 已完成组数；自理项 id → 次数
    fb: {},             // 今天：动作 id → 0/1/2
    step: {},           // 动作 id → 进阶阶梯下标
    sets: {},           // 动作 id → 当前目标组数
    easy: {},           // 动作 id → 连续「很轻松」次数
    painDays: {},       // 动作 id → 连续「做不到/疼」天数
    weekly: [],         // [{date, v}] 每周复评趋势
    history: [],        // [{date, done, total}]
    yesterday: null,
    careDates: [],
    notes: [],
    milestones: {},
    cum: 0
  };
}

let S = null;

function load() {
  if (S) { rollover(); return S; }
  try { S = wx.getStorageSync(KEY) || null; } catch (e) { S = null; }
  if (!S || !S.startDate) S = migrate();
  // 字段补全，防止老包升级后取到 undefined
  const b = blank();
  for (const k in b) if (S[k] === undefined) S[k] = b[k];
  rollover();
  return S;
}

/** v2 → v3：能留的都留下，用户不该因为我们改版丢掉记录 */
function migrate() {
  let old = null;
  try { old = wx.getStorageSync(OLD_KEY) || null; } catch (e) {}
  const s = blank();
  if (old && old.startDate) {
    s.startDate = old.startDate;
    s.cum = old.cum || 0;
    s.notes = old.notes || [];
    s.careDates = old.careDates || [];
    s.milestones = old.milestones || {};
  }
  return s;
}

function save() { try { wx.setStorageSync(KEY, S); } catch (e) {} }

/** 跨天：把昨天封存，今天清零。绝不出现「连续记录已清零」。 */
function rollover() {
  const today = ymd();
  if (S.lastDate === today) return;
  const done = doneCount();
  if (done > 0) {
    S.yesterday = { date: S.lastDate, done: done, total: todayPlan().length };
    S.history.push({ date: S.lastDate, done: done, total: todayPlan().length });
    if (S.history.length > 120) S.history = S.history.slice(-120);
  }
  S.progress = {};
  S.fb = {};
  S.lastDate = today;
  save();
}

/* ---------- 快筛 ---------- */

function saveAssessment(ans) {
  S.ans = ans;
  S.level = { m: assess.levelM(ans), h: assess.levelH(ans) };
  S.flags = ans.flags || [];
  S.assessed = true;
  S.assessedAt = ymd();
  pushWeekly();
  save();
}

function pushWeekly() {
  const v = assess.trend(S.ans);
  const last = S.weekly[S.weekly.length - 1];
  if (last && last.date === ymd()) { last.v = v; return; }
  S.weekly.push({ date: ymd(), v: v });
  if (S.weekly.length > 52) S.weekly = S.weekly.slice(-52);
}

/** 距上次复评满 7 天就该再问一次那三题 */
function needWeekly() {
  if (!S.assessed) return false;
  const last = S.weekly.length ? S.weekly[S.weekly.length - 1].date : S.assessedAt;
  return daysBetween(last, ymd()) >= 7;
}

/* ---------- 今日训练 ---------- */

function todayPlan() {
  if (!S.assessed) return [];
  return plan.build(S.level, S.flags);
}

function setsTarget(id) { return S.sets[id] || lib.baseSets(id); }
function stepLabel(id) { return lib.ladder(id)[S.step[id] || 0]; }

function moveGet(id) { return S.progress['mv_' + id] || 0; }

function moveBump(id) {
  const t = setsTarget(id);
  const n = moveGet(id);
  S.progress['mv_' + id] = n >= t ? 0 : n + 1;
  if (n < t) { S.cum += 1; markCareDay(); try { wx.vibrateShort({ type: 'light' }); } catch (e) {} }
  save();
  return S.progress['mv_' + id];
}

function moveSet(id, n) { S.progress['mv_' + id] = Math.max(0, n); save(); }

function feedback(id, f) {
  S.fb[id] = f;
  const r = plan.applyFeedback(S, id, f);
  markCareDay();
  save();
  return r;
}

function doneCount() {
  return todayPlan().filter(function (m) { return S.fb[m.id] != null; }).length;
}

/* ---------- 今天让他自己做 ---------- */

function adlList() { return adl.forLevel(S.level.m); }
function get(id) { return S.progress[id] || 0; }

function bump(id, target) {
  const n = get(id);
  if (n >= target) { S.progress[id] = 0; }
  else {
    S.progress[id] = n + 1; S.cum += 1; markCareDay();
    try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
  }
  save();
  return S.progress[id];
}

function adlDone() {
  return adlList().filter(function (t) { return get(t.id) >= t.target; }).length;
}

function markCareDay() {
  const t = ymd();
  if (S.careDates.indexOf(t) < 0) S.careDates.push(t);
}

/* ---------- 展示用 ---------- */

function day() { return daysBetween(S.startDate, ymd()) + 1; }
function careDaysThisMonth() {
  const p = ymd().slice(0, 8);
  return S.careDates.filter(function (d) { return d.slice(0, 8) === p; }).length;
}
function milestoneCount() { return Object.keys(S.milestones || {}).length; }

function addNote(text) {
  text = (text || '').trim();
  if (!text) return;
  S.notes.push({ date: ymd(), text: text });
  save();
}
function todayNote() {
  for (let i = S.notes.length - 1; i >= 0; i--) if (S.notes[i].date === ymd()) return S.notes[i].text;
  return '';
}
function reset() { S = blank(); save(); }

module.exports = {
  load, save, ymd, prettyDate, daysBetween, day,
  saveAssessment, needWeekly, pushWeekly,
  todayPlan, setsTarget, stepLabel, moveGet, moveBump, moveSet, feedback, doneCount,
  adlList, get, bump, adlDone,
  careDaysThisMonth, milestoneCount, addNote, todayNote, reset,
  state: () => S
};
