const app = getApp();
const store = require('../../utils/store.js');
const A = require('../../utils/assess.js');

function rung(lv) {
  const out = [];
  for (let i = 1; i <= 5; i++) out.push(i < lv ? 'on' : i === lv ? 'now' : '');
  return out;
}

Page({
  data: { ui: { fs: 1 }, weekly: false, mRung: [], hRung: [], plan: [],
          rules: [], urgent: [], acute: false, acuteNote: A.ACUTE_NOTE },

  onLoad(q) { this.setData({ ui: app.globalData.ui, weekly: q && q.weekly === '1' }); },

  onShow() {
    store.load();
    const S = store.state();
    const m = S.level.m, h = S.level.h;
    const all = (S.flags || []).map((f) => A.FLAG_RULE[f]).filter(Boolean);
    this.setData({
      mRung: rung(m), hRung: rung(h),
      mLabel: A.M_LABEL[m], mNext: A.M_NEXT[m],
      hLabel: A.H_LABEL[h], hNext: A.H_NEXT[h],
      acute: store.isAcute(),
      plan: store.todayPlan(),
      // 「先看医生再练」那一档要单独放在最上面，不能和普通注意事项混在一起 ——
      // 混在一起就会被一起划过去。
      urgent: all.filter((r) => r.urgent),
      // 已经在上面的「先看医生」里出现过的，不要在下面再重复一遍
      rules: all.filter((r) => !r.urgent)
    });
  },

  go() { wx.reLaunch({ url: '/pages/index/index' }); }
});
