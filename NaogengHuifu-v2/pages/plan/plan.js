const app = getApp();
const store = require('../../utils/store.js');

Page({
  data: { ui: { fs: 1 }, list: [], done: 0 },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  onShow() {
    store.load();
    const S = store.state();
    const list = store.todayPlan().map((m) => Object.assign({}, m, {
      n: store.moveGet(m.id),
      sets: store.setsTarget(m.id),
      stepLabel: store.stepLabel(m.id),
      fbDone: S.fb[m.id] != null
    }));
    this.setData({ list: list, done: store.doneCount() });
  },

  open(e) { wx.navigateTo({ url: '/pages/move/move?id=' + e.currentTarget.dataset.id }); }
});
