/**
 * 本地状态。全部存在本机，不上传任何服务器。
 * 只保存：从哪天开始、今天做了什么、累计多少、以及用户自己写的那句话。
 */
const KEY = 'ngk_state_v2';

const { careList, trainList } = require('./data.js');
const moves = require('./moves.js');

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
  const t = (s) => {
    const x = s.split('-');
    return Date.UTC(+x[0], +x[1] - 1, +x[2]);
  };
  return Math.round((t(b) - t(a)) / 86400000);
}

function blank() {
  return {
    startDate: ymd(),
    lastDate: ymd(),
    progress: {},
    cum: 0,
    careDates: [],      // 有过任何完成记录的日期，用来算「这个月陪了多少天」
    yesterday: null,    // {done,total,note,date}
    notes: [],          // [{date, text}]  用户自己写的那句话，只增不减
    reduceMotion: false,
    milestones: {}
  };
}

let S = null;

function load() {
  if (S) return S;
  try {
    S = wx.getStorageSync(KEY) || null;
  } catch (e) {
    S = null;
  }
  if (!S || !S.startDate) S = blank();
  if (!S.notes) S.notes = [];
  if (!S.careDates) S.careDates = [];
  rollover();
  return S;
}

function save() {
  try {
    wx.setStorageSync(KEY, S);
  } catch (e) {}
}

/** 跨天：把昨天封存，今天清零。绝不出现「连续记录已清零」。 */
function rollover() {
  const today = ymd();
  if (S.lastDate === today) return;

  const doneY = doneCount();
  if (doneY > 0 || (S.progress && Object.keys(S.progress).length)) {
    S.yesterday = {
      date: S.lastDate,
      done: doneY,
      total: allTasks().length,
      note: lastNoteOn(S.lastDate)
    };
  }
  S.progress = {};
  S.lastDate = today;
  save();
}

function lastNoteOn(date) {
  for (let i = S.notes.length - 1; i >= 0; i--) {
    if (S.notes[i].date === date) return S.notes[i].text;
  }
  return '';
}

/* ---------- 今天要做的（照护 + 他自己做的） ---------- */

function allTasks() {
  return careList.concat(trainList);
}

function get(id) {
  return (S.progress[id] || 0);
}

function bump(id, target) {
  const n = get(id);
  if (n >= target) {
    S.progress[id] = 0;                       // 点满之后再点一下 = 清零重记
  } else {
    S.progress[id] = n + 1;
    S.cum += 1;
    markCareDay();
    wx.vibrateShort({ type: 'light' });
  }
  save();
  return S.progress[id];
}

function markCareDay() {
  const t = ymd();
  if (S.careDates.indexOf(t) < 0) S.careDates.push(t);
}

function doneCount() {
  return allTasks().filter((t) => get(t.id) >= t.target).length;
}

/* ---------- 训练动作（按组计） ---------- */

function moveGet(id) {
  return (S.progress['mv_' + id] || 0);
}

function moveBump(id) {
  const m = moves.find((x) => x.id === id);
  return bump('mv_' + id, m.target);
}

function moveSet(id, n) {
  S.progress['mv_' + id] = Math.max(0, n);
  save();
}

function moveDoneCount() {
  return moves.filter((m) => moveGet(m.id) >= m.target).length;
}

/* ---------- 展示用的数字 ---------- */

function day() {
  return daysBetween(S.startDate, ymd()) + 1;
}

function careDaysThisMonth() {
  const p = ymd().slice(0, 8);
  return S.careDates.filter((d) => d.slice(0, 8) === p).length;
}

function addNote(text) {
  text = (text || '').trim();
  if (!text) return;
  S.notes.push({ date: ymd(), text: text });
  save();
}

function todayNote() {
  return lastNoteOn(ymd());
}

function reset() {
  S = blank();
  save();
}

module.exports = {
  load, save, ymd, prettyDate, day,
  allTasks, get, bump, doneCount,
  moveGet, moveBump, moveSet, moveDoneCount,
  careDaysThisMonth, addNote, todayNote, reset,
  state: () => S
};
