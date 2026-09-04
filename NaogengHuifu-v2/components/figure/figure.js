/**
 * 骨骼动画组件。
 *
 * 一个 <canvas type="2d">，按 utils/poses.js 里的关节角度关键帧实时绘制。
 * 全部 14 个动作（含两个手部特写）都走这一条路 —— 所以可以调速、可以镜像患侧、
 * 可以叠信息层，包体也不涨。
 */
const fig = require('../../utils/figure.js');
const lib = require('../../utils/library.js');

Component({
  properties: {
    move:   { type: String, value: '' },
    speed:  { type: Number, value: 1,     observer: 'reset' },
    mirror: { type: Boolean, value: false, observer: 'reset' },
    cmp:    { type: Boolean, value: false, observer: 'reset' },  // 播常见代偿
    thumb:  { type: Boolean, value: false },                     // 缩略图：关掉信息层
    paused: { type: Boolean, value: false }
  },

  data: { box: '' },

  lifetimes: {
    attached() {
      const m = lib.get(this.data.move);
      if (!m) return;
      this.setData({ box: m.box || (m.wide ? 'wide' : '') });
    },
    ready() { this.init(); },
    detached() { this.stopped = true; }
  },

  pageLifetimes: {
    hide() { this.stopped = true; },
    show() { if (this.canvas && this.stopped) { this.stopped = false; this.loop(); } }
  },

  methods: {
    init() {
      const q = wx.createSelectorQuery().in(this);
      q.select('#cv').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        let dpr = 2;
        try { dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2; } catch (e) {}
        dpr = Math.min(dpr, 3);
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this.canvas = canvas;
        this.ctx = ctx;
        this.w = res[0].width;
        this.h = res[0].height;
        this.t0 = Date.now();
        this.stopped = false;
        this.loop();
      });
    },

    reset() { this.t0 = Date.now(); },

    /** 当前归一化时间，供父页面同步阶段条 */
    phase() {
      const m = lib.get(this.data.move);
      if (!m) return 0;
      const cyc = (m.cycle || 4000) / (this.data.speed || 1);
      return ((Date.now() - (this.t0 || 0)) % cyc) / cyc;
    },

    loop() {
      if (this.stopped || !this.ctx) return;
      const m = lib.get(this.data.move);
      if (!m) return;

      let track = m;
      if (this.data.cmp && m.compare) {
        track = Object.assign({}, m, { keyframes: m.compare.keyframes, trail: null, focus: null });
      }

      const t = this.data.paused ? 0.35 : this.phase();
      const small = this.w < 130;
      const layers = (this.data.thumb || small)
        ? { trail: false, highlight: !this.data.thumb, plumb: false }
        : { trail: true, highlight: true, plumb: true };

      fig.draw(this.ctx, this.w, this.h, track, t, {
        theme: fig.THEME.light,
        mirror: this.data.mirror,
        layers: layers,
        zoom: small ? 1.14 : 1
      });

      if (!this.data.thumb) this.triggerEvent('tick', { t: t });
      this.canvas.requestAnimationFrame(() => this.loop());
    }
  }
});
