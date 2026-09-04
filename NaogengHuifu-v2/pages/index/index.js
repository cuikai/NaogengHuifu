const app = getApp();
const store = require('../../utils/store.js');
const cards = require('../../utils/cards.js');
const A = require('../../utils/assess.js');

Page({
  data: {
    ui: { fs: 1 },
    day: 1, date: '', echo: null,
    assessed: false, mLabel: '',
    planCount: 0, planDone: 0, thumbs: [],
    adlDone: 0, adlTotal: 0,
    needWeekly: false, lastWeek: '',
    acute: false, acuteNote: A.ACUTE_NOTE, urgent: [],
    msCount: 0, cardCount: cards.length
  },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  onShow() {
    store.load();
    const S = store.state();
    const plan = store.todayPlan();
    const weekly = S.weekly || [];
    this.setData({
      day: store.day(),
      date: store.prettyDate(store.ymd()),
      echo: S.yesterday,
      assessed: S.assessed,
      mLabel: A.M_LABEL[S.level.m],
      planCount: plan.length,
      planDone: store.doneCount(),
      thumbs: plan.slice(0, 3).map((m) => m.id),
      adlDone: store.adlDone(),
      adlTotal: store.adlList().length,
      needWeekly: store.needWeekly(),
      acute: store.isAcute(),
      // 「先看医生再练」那一档要在首页就露头 —— 埋在画像页里等于没有
      urgent: store.urgentFlags(),
      lastWeek: weekly.length ? store.prettyDate(weekly[weekly.length - 1].date) : store.prettyDate(S.assessedAt),
      msCount: store.milestoneCount()
    });
  },

  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
  toAssess() { wx.navigateTo({ url: '/pages/assess/assess' }); },
  toWeekly() { wx.navigateTo({ url: '/pages/assess/assess?weekly=1' }); },

  onShareAppMessage() {
    return {
      title: '脑梗恢复 —— 先看他现在能做到什么，再决定今天练什么',
      path: '/pages/index/index'
    };
  },
  onShareTimeline() {
    return { title: '脑梗恢复 —— 在家怎么练，按他现在的情况来' };
  }
});
