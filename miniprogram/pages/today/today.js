const app = getApp();
const store = require('../../utils/store.js');
const { careList, trainList } = require('../../utils/data.js');

function deco(list) {
  return list.map((t) => {
    const n = store.get(t.id);
    const full = n >= t.target;
    return Object.assign({}, t, {
      n: n,
      full: full,
      icon: '/images/ic/' + t.icon + (full ? '-on' : '') + '.svg',
      line: t.target > 1 ? (full ? '已完成' : n + ' / ' + t.target + ' 次') : (full ? '已完成' : t.times),
      sub: t.target > 1 && !full ? t.times : ''
    });
  });
}

Page({
  data: {
    ui: { fs: 1 },
    care: [], train: [],
    done: 0, total: 0, pct: 0, finished: false,
    cum: 0, careDays: 0,
    note: ''
  },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  onShow() { store.load(); this.refresh(); },

  refresh() {
    const S = store.state();
    const done = store.doneCount();
    const total = store.allTasks().length;
    this.setData({
      care: deco(careList),
      train: deco(trainList),
      done: done,
      total: total,
      pct: total ? done * 100 / total : 0,
      finished: done >= total,
      cum: S.cum,
      careDays: store.careDaysThisMonth(),
      note: store.todayNote()
    });
  },

  tap(e) {
    const d = e.currentTarget.dataset;
    store.bump(d.id, d.target);
    this.refresh();
  },

  onNote(e) { this.setData({ note: e.detail.value }); },

  finish() {
    store.addNote(this.data.note);
    wx.navigateBack({
      fail() { wx.reLaunch({ url: '/pages/index/index' }); }
    });
  },

  reopen() { this.setData({ finished: false }); }
});
