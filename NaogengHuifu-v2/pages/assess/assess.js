const app = getApp();
const store = require('../../utils/store.js');
const { QUIZ, WEEKLY } = require('../../utils/assess.js');

Page({
  data: {
    ui: { fs: 1 },
    quiz: QUIZ, qi: 0, q: QUIZ[0], opts: [],
    ans: { flags: [] },
    canNext: false, last: false,
    weekly: false
  },

  onLoad(query) {
    // weekly=1：每周复评，只重问三道关键题
    const weekly = query && query.weekly === '1';
    const quiz = weekly ? QUIZ.filter((q) => WEEKLY.indexOf(q.id) >= 0) : QUIZ;
    const S = store.state();
    wx.setNavigationBarTitle({ title: weekly ? '这一周有变化吗' : '先认识一下他' });
    this.setData({
      ui: app.globalData.ui,
      weekly: weekly,
      quiz: quiz,
      ans: weekly ? Object.assign({}, S.ans) : { flags: [] }
    });
    this.sync();
  },

  sync() {
    const q = this.data.quiz[this.data.qi];
    const ans = this.data.ans;
    const opts = q.opts.map((t, i) => ({
      i: i, t: t,
      on: q.multi ? (ans.flags || []).indexOf(i) >= 0 : ans[q.id] === i
    }));
    this.setData({
      q: q, opts: opts,
      last: this.data.qi === this.data.quiz.length - 1,
      canNext: q.multi ? true : ans[q.id] != null
    });
  },

  pick(e) {
    const i = Number(e.currentTarget.dataset.i);
    const q = this.data.quiz[this.data.qi];
    const ans = this.data.ans;
    if (q.multi) {
      if (!ans.flags) ans.flags = [];
      const ix = ans.flags.indexOf(i);
      if (ix >= 0) ans.flags.splice(ix, 1); else ans.flags.push(i);
      this.setData({ ans: ans });
      this.sync();
    } else {
      ans[q.id] = i;
      this.setData({ ans: ans });
      // 选完自动进下一题 —— 少一次点击，对老人很重要
      if (this.data.qi < this.data.quiz.length - 1) {
        setTimeout(() => { this.setData({ qi: this.data.qi + 1 }); this.sync(); }, 160);
      } else {
        this.sync();
      }
    }
  },

  back() {
    if (this.data.qi <= 0) return;
    this.setData({ qi: this.data.qi - 1 });
    this.sync();
  },

  next() {
    if (!this.data.canNext) return;
    if (this.data.qi < this.data.quiz.length - 1) {
      this.setData({ qi: this.data.qi + 1 });
      this.sync();
      return;
    }
    if (this.data.weekly) {
      const S = store.state();
      S.ans = Object.assign({}, S.ans, this.data.ans);
      store.saveAssessment(S.ans);
      wx.redirectTo({ url: '/pages/profile/profile?weekly=1' });
    } else {
      store.saveAssessment(this.data.ans);
      wx.redirectTo({ url: '/pages/profile/profile' });
    }
  }
});
