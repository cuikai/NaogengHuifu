const app = getApp();
const store = require('../../utils/store.js');
const moves = require('../../utils/moves.js');
const { STOP } = require('../../utils/data.js');

Page({
  data: { ui: { fs: 1 }, m: null, n: 0, full: false, pad: '60%', stop: STOP },

  onLoad(q) {
    const m = moves.find((x) => x.id === q.id) || moves[0];
    this.mv = m;
    wx.setNavigationBarTitle({ title: m.name });
    this.setData({
      ui: app.globalData.ui,
      m: m,
      pad: (m.ratio * 100).toFixed(2) + '%'
    });
  },

  onShow() { store.load(); this.refresh(); },

  refresh() {
    const n = store.moveGet(this.mv.id);
    this.setData({ n: n, full: n >= this.mv.target });
  },

  plus() {
    const n = this.data.n;
    if (n >= this.mv.target) store.moveSet(this.mv.id, 0);
    else store.bump('mv_' + this.mv.id, this.mv.target);
    this.refresh();
  },

  minus() {
    if (this.data.n <= 0) return;
    store.moveSet(this.mv.id, this.data.n - 1);
    this.refresh();
  }
});
