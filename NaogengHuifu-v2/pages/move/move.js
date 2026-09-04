const app = getApp();
const store = require('../../utils/store.js');
const lib = require('../../utils/library.js');
const { STOP } = require('../../utils/adl.js');

Page({
  data: {
    ui: { fs: 1 }, m: null, stop: STOP,
    n: 0, sets: 3, full: false, stepLabel: '',
    speed: 1, mirror: false, cmp: false,
    phases: [], phaseText: '',
    fb: null, fbMsg: '', seeDoctor: false
  },

  onLoad(q) {
    const plan = store.todayPlan();
    const m = lib.get(q.id) || plan[0] || lib.list[0];
    this.mv = m;
    wx.setNavigationBarTitle({ title: m.name });
    this.setData({
      ui: app.globalData.ui,
      m: m,
      phases: (m.phases || []).map((p) => ({ label: p.label, pct: 0 })),
      phaseText: (m.phases && m.phases[0].label) || ''
    });
  },

  onShow() { store.load(); this.refresh(); },

  refresh() {
    const S = store.state();
    const id = this.mv.id;
    const n = store.moveGet(id), sets = store.setsTarget(id);
    this.setData({
      n: n, sets: sets, full: n >= sets,
      stepLabel: store.stepLabel(id),
      fb: S.fb[id] == null ? null : S.fb[id]
    });
  },

  /** 动画每帧回调：把阶段条和当前提示文字对齐到动画进度 */
  onTick(e) {
    const t = e.detail.t;
    const ph = this.mv.phases || [];
    let prev = 0, text = this.data.phaseText;
    const segs = [];
    for (let i = 0; i < ph.length; i++) {
      let f = t <= prev ? 0 : t >= ph[i].to ? 1 : (t - prev) / (ph[i].to - prev);
      segs.push({ label: ph[i].label, pct: Math.round(f * 100) });
      if (t >= prev && t < ph[i].to) text = ph[i].label;
      prev = ph[i].to;
    }
    // 只在文字变化时 setData，避免每帧刷新逻辑层
    if (text !== this.data.phaseText || !this._lastSeg || Date.now() - this._lastSeg > 120) {
      this._lastSeg = Date.now();
      this.setData({ phases: segs, phaseText: text });
    }
  },

  slow() { this.setData({ speed: this.data.speed === 1 ? 0.5 : 1 }); },
  flip() { this.setData({ mirror: !this.data.mirror }); },
  toggleCmp() { this.setData({ cmp: !this.data.cmp }); },

  plus() {
    // 做满之后这个按钮就是出口 —— 老人不认左上角的返回箭头，也不会向左滑。
    // 要退组数用左边的「−」，不再让主按钮把已做的组数清零。
    if (this.data.n >= this.data.sets) return this.back();
    store.moveBump(this.mv.id);
    this.refresh();
  },

  back() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.redirectTo({ url: '/pages/plan/plan' });
  },

  minus() {
    if (this.data.n <= 0) return;
    store.moveSet(this.mv.id, this.data.n - 1);
    this.refresh();
  },

  rate(e) {
    const f = Number(e.currentTarget.dataset.f);
    const r = store.feedback(this.mv.id, f);
    this.setData({ fb: f, fbMsg: r.msg, seeDoctor: r.seeDoctor });
    this.refresh();
    wx.showToast({ title: '记下了', icon: 'none', duration: 900 });
  }
});
