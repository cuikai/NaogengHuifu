const app = getApp();
const store = require('../../utils/store.js');
const moves = require('../../utils/moves.js');

Page({
  data: { ui: { fs: 1 }, list: [], done: 0, total: moves.length },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  onShow() { store.load(); this.refresh(); },

  refresh() {
    const list = moves.map((m) => {
      const n = store.moveGet(m.id);
      const full = n >= m.target;
      return Object.assign({}, m, {
        n: n,
        full: full,
        pad: (m.ratio * 100).toFixed(2) + '%',
        line: full ? ('今天 ' + m.target + ' ' + m.unit + '都做完了')
                   : ('今天 ' + n + ' / ' + m.target + ' ' + m.unit)
      });
    });
    this.setData({ list: list, done: store.moveDoneCount() });
  },

  tap(e) {
    store.moveBump(e.currentTarget.dataset.id);
    this.refresh();
  },

  open(e) {
    wx.navigateTo({ url: '/pages/move/move?id=' + e.currentTarget.dataset.id });
  }
});
