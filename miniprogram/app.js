const store = require('./utils/store.js');

App({
  globalData: {
    ui: { fs: 1, sb: 0 }
  },

  onLaunch() {
    store.load();
    this.measure();
  },

  onShow() {
    // 从后台切回来可能已经跨天了
    store.load();
  },

  /**
   * 不同分辨率的适配。
   * rpx 只按屏宽等比缩放，小屏上正文会缩到看不清 —— 对老人是硬伤。
   * 这里算一个字号系数：小屏放大一点、大屏收一点，让正文的「物理大小」接近一致。
   */
  measure() {
    let w = 375, sb = 0;
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      w = info.windowWidth || info.screenWidth || 375;
      const sa = info.safeArea;
      if (sa && info.screenHeight) sb = Math.max(0, info.screenHeight - sa.bottom);
    } catch (e) {}
    const fs = Math.min(1.14, Math.max(0.9, Math.pow(375 / w, 0.6)));
    this.globalData.ui = { fs: fs.toFixed(3), sb: sb };
  }
});
