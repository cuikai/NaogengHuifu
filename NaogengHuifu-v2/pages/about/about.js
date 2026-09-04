const app = getApp();
const store = require('../../utils/store.js');

Page({
  data: { ui: { fs: 1 }, repo: 'github.com/cuikai/NaogengHuifu' },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  redo() { wx.navigateTo({ url: '/pages/assess/assess' }); },

  clear() {
    wx.showModal({
      title: '清空全部记录？',
      content: '快筛结果、训练进度、你写下的话、里程碑，都会被删掉，无法恢复。',
      confirmText: '清空',
      confirmColor: '#c62f2f',
      success(r) {
        if (!r.confirm) return;
        store.reset();
        wx.showToast({ title: '已清空', icon: 'none' });
        setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 600);
      }
    });
  }
});
