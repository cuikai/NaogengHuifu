const app = getApp();
const store = require('../../utils/store.js');
const milestones = require('../../utils/milestones.js');
const A = require('../../utils/assess.js');

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
    const all = S.weekly || [];
    const off = Math.max(0, all.length - 8);
    const w = all.slice(-8);
    // 满档取自 assess.TREND_MAX（三题最高档 3+4+4=11）。
    // 原来写死 12，柱子永远顶不到头 —— 恰恰是恢复得最好的人看不到满格。
    const max = A.TREND_MAX;
    const bars = w.map((x, i) => ({
      // 编号跟着真实的复评次数走，滑窗之后不再从 W1 重新数
      d: 'W' + (off + i + 1),
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
