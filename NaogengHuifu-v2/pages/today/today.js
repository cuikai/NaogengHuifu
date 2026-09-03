const app = getApp();
const store = require('../../utils/store.js');
const adl = require('../../utils/adl.js');

Page({
  data: { ui: { fs: 1 }, list: [], total: 0, finished: false, careDays: 0, note: '', note0: '' },

  onLoad() { this.setData({ ui: app.globalData.ui }); },
  onShow() { store.load(); this.refresh(); },

  refresh() {
    const S = store.state();
    const raw = store.adlList();
    const list = raw.map((t) => {
      const n = store.get(t.id);
      const full = n >= t.target;
      return Object.assign({}, t, {
        n: n, full: full,
        icon: '/images/ic/' + t.icon + (full ? '-on' : '') + '.svg',
        line: full ? '已完成' : (t.target > 1 ? n + ' / ' + t.target + ' 次　·　' + t.times : t.times)
      });
    });
    const done = list.filter((x) => x.full).length;
    this.setData({
      list: list,
      total: list.length,
      finished: done >= list.length,
      careDays: store.careDaysThisMonth(),
      note: store.todayNote(),
      note0: adl.noteFor(S.level.m)
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
    wx.navigateBack({ fail() { wx.reLaunch({ url: '/pages/index/index' }); } });
  },

  reopen() { this.setData({ finished: false }); }
});
