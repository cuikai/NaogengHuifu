const app = getApp();
const store = require('../../utils/store.js');
const A = require('../../utils/assess.js');

function rung(lv) {
  const out = [];
  for (let i = 1; i <= 5; i++) out.push(i < lv ? 'on' : i === lv ? 'now' : '');
  return out;
}

Page({
  data: { ui: { fs: 1 }, weekly: false, mRung: [], hRung: [], plan: [], rules: [] },

  onLoad(q) { this.setData({ ui: app.globalData.ui, weekly: q && q.weekly === '1' }); },

  onShow() {
    store.load();
    const S = store.state();
    const m = S.level.m, h = S.level.h;
    this.setData({
      mRung: rung(m), hRung: rung(h),
      mLabel: A.M_LABEL[m], mNext: A.M_NEXT[m],
      hLabel: A.H_LABEL[h], hNext: A.H_NEXT[h],
      plan: store.todayPlan(),
      rules: (S.flags || []).map((f) => A.FLAG_RULE[f]).filter(Boolean)
    });
  },

  go() { wx.reLaunch({ url: '/pages/index/index' }); }
});
