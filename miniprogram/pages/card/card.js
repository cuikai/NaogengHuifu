const app = getApp();
const cards = require('../../utils/cards.js');

const pad = (r) => (r * 100).toFixed(2) + '%';

Page({
  data: { ui: { fs: 1 }, c: null, prev: null, next: null },

  onLoad(q) { this.render(q.id); },

  render(id) {
    const i = Math.max(0, cards.findIndex((x) => x.id === id));
    const src = cards[i];
    wx.setNavigationBarTitle({ title: src.t });

    const c = JSON.parse(JSON.stringify(src));
    if (c.compare) c.compare.forEach((x) => { x.pad = pad(x.img.r); });
    if (c.fast) c.fast.forEach((x) => { x.pad = pad(x.img.r); });
    if (c.big) c.bigPad = pad(c.big.r);
    if (c.big2) c.big2Pad = pad(c.big2.r);

    this.setData({
      ui: app.globalData.ui,
      c: c,
      prev: i > 0 ? { id: cards[i - 1].id, t: cards[i - 1].t } : null,
      next: i < cards.length - 1 ? { id: cards[i + 1].id, t: cards[i + 1].t } : null
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  jump(e) { this.render(e.currentTarget.dataset.id); }
});
