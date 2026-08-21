const app = getApp();
const store = require('../../utils/store.js');
const milestones = require('../../utils/milestones.js');

Page({
  data: {
    ui: { fs: 1 },
    day: 1, cum: 0, careDays: 0, start: '',
    notes: [], ms: []
  },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  onShow() { store.load(); this.refresh(); },

  refresh() {
    const S = store.state();
    const hit = S.milestones || {};
    this.setData({
      day: store.day(),
      cum: S.cum,
      careDays: store.careDaysThisMonth(),
      start: store.prettyDate(S.startDate),
      notes: S.notes.slice().reverse().map((n) => ({
        d: store.prettyDate(n.date), t: n.text
      })),
      ms: milestones.map((m) => ({
        id: m.id, t: m.t,
        on: !!hit[m.id],
        when: hit[m.id] ? store.prettyDate(hit[m.id]) : ''
      }))
    });
  },

  toggleMs(e) {
    const id = e.currentTarget.dataset.id;
    const S = store.state();
    if (!S.milestones) S.milestones = {};
    if (S.milestones[id]) delete S.milestones[id];
    else S.milestones[id] = store.ymd();
    store.save();
    this.refresh();
  }
});
