const app = getApp();
const store = require('../../utils/store.js');

Page({
  data: { ui: { fs: 1 }, repo: 'github.com/cuikai/NaogengHuifu' },

  onLoad() { this.setData({ ui: app.globalData.ui }); },

  copyRepo() {
    wx.setClipboardData({
      data: 'https://' + this.data.repo,
      success() { wx.showToast({ title: '地址已复制', icon: 'none' }); }
    });
  },

  clear() {
    wx.showModal({
      title: '清空全部记录？',
      content: '第几天、累计件数、你写下的话、里程碑，都会被删掉，无法恢复。',
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
