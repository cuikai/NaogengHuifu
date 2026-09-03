const app = getApp();
const store = require('../../utils/store.js');
const milestones = require('../../utils/milestones.js');

Page({
  data: {
    ui: { fs: 1 },
    day: 1, careDays: 0, msCount: 0, start: '',
    bars: [], latest: 0, delta: 0, nextWeek: '',
    notes: [], ms: []
  },

  onLoad() { this.setData({ ui: app.globalData.ui }); },
  onShow() { store.load(); this.refresh(); },

  refresh() {
    const S = store.state();
    const hit = S.milestones || {};
    const w = (S.weekly || []).slice(-8);
    const max = 12;               // 三题各 0~4 档，满档 12
    const bars = w.map((x, i) => ({
      d: 'W' + (i + 1),
      h: Math.max(4, Math.round(x.v / max * 100))
    }));
    const latest = w.length ? w[w.length - 1].v : 0;

    this.setData({
      day: store.day(),
      careDays: store.careDaysThisMonth(),
      msCount: Object.keys(hit).length,
      start: store.prettyDate(S.startDate),
      bars: bars,
      latest: latest,
      delta: w.length > 1 ? latest - w[0].v : 0,
      nextWeek: S.assessedAt ? '上次是 ' + store.prettyDate(S.assessedAt) + '，满 7 天首页会提醒你。' : '',
      notes: S.notes.slice().reverse().map((n) => ({ d: store.prettyDate(n.date), t: n.text })),
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
