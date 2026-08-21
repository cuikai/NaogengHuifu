const app = getApp();
const store = require('../../utils/store.js');
const moves = require('../../utils/moves.js');
const cards = require('../../utils/cards.js');

Page({
  data: {
    ui: { fs: 1 },
    day: 1,
    date: '',
    echo: null,
    todayDone: 0, todayTotal: 0,
    trainDone: 0, trainTotal: moves.length,
    cardCount: cards.length,
    cum: 0
  },

  onLoad() {
    this.setData({ ui: app.globalData.ui });
  },

  onShow() {
    store.load();
    const S = store.state();
    this.setData({
      day: store.day(),
      date: store.prettyDate(store.ymd()),
      echo: S.yesterday,
      todayDone: store.doneCount(),
      todayTotal: store.allTasks().length,
      trainDone: store.moveDoneCount(),
      cum: S.cum
    });
  },

  go(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  },

  onShareAppMessage() {
    return {
      title: '脑梗恢复 —— 在家怎么照顾、怎么练，一天一件件来',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return { title: '脑梗恢复 —— 在家怎么照顾、怎么练' };
  }
});
