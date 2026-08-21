const app = getApp();
const cards = require('../../utils/cards.js');

Page({
  data: {
    ui: { fs: 1 },
    list: cards.map((c) => ({
      id: c.id, t: c.t, d: c.d,
      src: c.thumb.src,
      pad: (c.thumb.r * 100).toFixed(2) + '%'
    }))
  },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  open(e) {
    wx.navigateTo({ url: '/pages/card/card?id=' + e.currentTarget.dataset.id });
  }
});
