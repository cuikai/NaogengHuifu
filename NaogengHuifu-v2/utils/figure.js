/* ===========================================================================
 * figure.js —— 人体骨骼渲染器
 *
 * 一套渲染器 + 每个动作一份关节角度数据。新增动作 = 加一份 JSON，
 * 不需要再画图、不需要导 GIF。品质天然统一，包体几乎不增加。
 *
 * 角度约定（全部为「世界绝对角」，authoring 时不用推算父子关系）：
 *   trunk / head  —— 从「正上方」量起，正 = 向前（+X，人物面朝的方向）倾
 *   四肢各段      —— 从「正下方」量起，正 = 向前（+X）
 *                    例：uarm=0 手臂自然下垂；uarm=90 手臂水平前举
 *                        thigh=90 大腿水平前伸（坐位）；shank=0 小腿垂直
 *                        foot=90 脚掌水平朝前（站立）
 *   每段角描述的是「该段从近端指向远端」的方向。
 *
 * 世界坐标：地面 y = 0，向上为负。单位 = 1 个头高 h。
 * 站立成人 ≈ 7.5h 高。
 * =========================================================================== */

var SEG = {
  headR: 0.42,   // 头半径
  neck:  0.30,
  spine: 2.35,   // 骨盆 → 肩
  uarm:  1.32,
  farm:  1.08,
  hand:  0.40,
  thigh: 1.85,
  shank: 1.75,
  foot:  0.82
};

var RAD = Math.PI / 180;

/* ---------- 正向运动学：由角度算出所有关节点 ---------- */

function up(p, a, L)  { return { x: p.x + L * Math.sin(a * RAD), y: p.y - L * Math.cos(a * RAD) }; }
function dn(p, a, L)  { return { x: p.x + L * Math.sin(a * RAD), y: p.y + L * Math.cos(a * RAD) }; }

function solve(pose) {
  var P = {};
  P.pelvis   = { x: 0, y: 0 };
  P.chest    = up(P.pelvis, pose.trunk, SEG.spine * 0.60);
  P.shoulder = up(P.pelvis, pose.trunk, SEG.spine);
  P.neckTop  = up(P.shoulder, pose.head, SEG.neck);
  P.headC    = up(P.shoulder, pose.head, SEG.neck + SEG.headR);

  // 近侧（默认 = 患侧，画在前面）
  P.elbow = dn(P.shoulder, pose.uarm, SEG.uarm);
  P.wrist = dn(P.elbow,    pose.farm, SEG.farm);
  P.hand  = dn(P.wrist,    pose.hand != null ? pose.hand : pose.farm, SEG.hand);
  P.knee  = dn(P.pelvis,   pose.thigh, SEG.thigh);
  P.ankle = dn(P.knee,     pose.shank, SEG.shank);
  P.toe   = dn(P.ankle,    pose.foot,  SEG.foot);

  // 远侧
  var uF = pose.uarmF  != null ? pose.uarmF  : pose.uarm;
  var fF = pose.farmF  != null ? pose.farmF  : pose.farm;
  var tF = pose.thighF != null ? pose.thighF : pose.thigh;
  var sF = pose.shankF != null ? pose.shankF : pose.shank;
  var oF = pose.footF  != null ? pose.footF  : pose.foot;
  P.elbowF = dn(P.shoulder, uF, SEG.uarm);
  P.wristF = dn(P.elbowF,   fF, SEG.farm);
  P.handF  = dn(P.wristF,   fF, SEG.hand);
  P.kneeF  = dn(P.pelvis,   tF, SEG.thigh);
  P.ankleF = dn(P.kneeF,    sF, SEG.shank);
  P.toeF   = dn(P.ankleF,   oF, SEG.foot);
  return P;
}

/* 把整个人平移，使 anchor 关节落在指定世界坐标 —— 脚不会浮空也不会陷进地面 */
function place(P, anchor, ax, ay) {
  var key = anchor;
  if (anchor === 'auto') key = (P.ankle.y >= P.ankleF.y) ? 'ankle' : 'ankleF';
  var a = P[key] || P.pelvis;
  var dx = ax - a.x, dy = ay - a.y;
  for (var k in P) { P[k] = { x: P[k].x + dx, y: P[k].y + dy }; }
  return P;
}

/* ---------- 关键帧插值 ---------- */

var EASE = {
  linear: function (u) { return u; },
  inout:  function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; },
  out:    function (u) { return 1 - Math.pow(1 - u, 3); },
  hold:   function ()  { return 0; }
};

var POSE_KEYS = ['trunk','head','uarm','farm','hand','thigh','shank','foot',
                 'uarmF','farmF','thighF','shankF','footF',
                 'lean','hipL','hipR','liftL','liftR','armL','armR','bend'];

function sample(track, t) {
  var kf = track.keyframes;
  if (t <= kf[0].t) return merge(track.base, kf[0]);
  if (t >= kf[kf.length - 1].t) return merge(track.base, kf[kf.length - 1]);
  var i = 0;
  while (i < kf.length - 1 && kf[i + 1].t <= t) i++;
  var a = kf[i], b = kf[i + 1];
  var u = (b.t - a.t) > 0 ? (t - a.t) / (b.t - a.t) : 0;
  u = (EASE[b.ease || 'inout'] || EASE.inout)(u);
  var A = merge(track.base, a), B = merge(track.base, b), out = {};
  for (var j = 0; j < POSE_KEYS.length; j++) {
    var k = POSE_KEYS[j];
    var va = A[k], vb = B[k];
    if (va == null && vb == null) continue;
    if (va == null) va = vb;
    if (vb == null) vb = va;
    out[k] = va + (vb - va) * u;
  }
  return out;
}

function merge(base, kf) {
  var o = {};
  var i;
  for (i in base) o[i] = base[i];
  var src = kf.pose || kf;
  for (i in src) { if (i !== 't' && i !== 'ease' && i !== 'pose') o[i] = src[i]; }
  return o;
}

/* ---------- 绘制基元 ---------- */

/* 带锥度的圆头肢体段 */
function limb(ctx, p0, p1, w0, w1) {
  var dx = p1.x - p0.x, dy = p1.y - p0.y;
  var L = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  var a = Math.atan2(dy, dx);
  var r0 = w0 / 2, r1 = w1 / 2;
  ctx.beginPath();
  // 两个圆之间的外公切线
  var d = (r0 - r1) / L;
  if (Math.abs(d) > 1) d = Math.sign(d);
  var th = Math.acos(d);
  ctx.arc(p0.x, p0.y, r0, a + th, a - th + 2 * Math.PI);
  ctx.arc(p1.x, p1.y, r1, a - th, a + th);
  ctx.closePath();
}

function torso(ctx, pelvis, chest, shoulder, wHip, wChest, wSh) {
  ctx.beginPath();
  var pts = [
    { p: pelvis, w: wHip }, { p: chest, w: wChest }, { p: shoulder, w: wSh }
  ];
  // 左右两条边
  var left = [], right = [];
  for (var i = 0; i < pts.length; i++) {
    var prev = pts[Math.max(0, i - 1)].p, next = pts[Math.min(pts.length - 1, i + 1)].p;
    var dx = next.x - prev.x, dy = next.y - prev.y;
    var L = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / L, ny = dx / L;
    var r = pts[i].w / 2;
    left.push({ x: pts[i].p.x + nx * r, y: pts[i].p.y + ny * r });
    right.push({ x: pts[i].p.x - nx * r, y: pts[i].p.y - ny * r });
  }
  ctx.moveTo(left[0].x, left[0].y);
  ctx.quadraticCurveTo(left[1].x, left[1].y, left[2].x, left[2].y);
  ctx.lineTo(right[2].x, right[2].y);
  ctx.quadraticCurveTo(right[1].x, right[1].y, right[0].x, right[0].y);
  ctx.closePath();
}

/* ---------- 主渲染 ---------- */

/**
 * @param ctx    canvas 2d context
 * @param W,H    画布 CSS 像素尺寸
 * @param track  动作定义（见 poses.js）
 * @param t      0..1 归一化时间
 * @param opt    { theme, mirror, layers:{trail,highlight,plumb}, ghost }
 */
function draw(ctx, W, H, track, t, opt) {
  opt = opt || {};
  var C = opt.theme || THEME.light;
  var view = track.view || { cx: 0, cy: -3.6, span: 8.8 };
  var s = H / (view.span * (opt.zoom || 1));   // 1 头高 = s 像素
  var mir = opt.mirror ? -1 : 1;

  function X(wx) { return W / 2 + (wx - view.cx) * s * mir; }
  function Y(wy) { return H / 2 + (wy - view.cy) * s; }
  function pt(p) { return { x: X(p.x), y: Y(p.y) }; }

  ctx.clearRect(0, 0, W, H);

  if (track.view3 === 'front') return drawFront(ctx, W, H, track, t, opt, C, s, X, Y);

  var pose = sample(track, t);
  var P = place(solve(pose), track.anchor || 'auto', track.ax || 0, track.ay != null ? track.ay : -0.30);

  drawProps(ctx, track.props, X, Y, s, C, 'back');

  // 运动轨迹：把整个周期里目标点的路径画出来 —— 视频给不了的信息层
  if (track.trail && opt.layers !== false && (!opt.layers || opt.layers.trail !== false)) {
    ctx.save();
    ctx.strokeStyle = C.trail;
    ctx.lineWidth = Math.max(1.5, s * 0.055);
    ctx.setLineDash([s * 0.16, s * 0.14]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i <= 48; i++) {
      var pp = place(solve(sample(track, i / 48)), track.anchor || 'auto', track.ax || 0, track.ay != null ? track.ay : -0.30);
      var q = pt(pp[track.trail]);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  var lw = s * 0.05;
  ctx.lineJoin = 'round';

  function seg(a, b, w0, w1, fill, stroke) {
    limb(ctx, pt(a), pt(b), w0 * s, w1 * s);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke();
  }

  // 远侧肢体：降饱和 —— 一眼分出前后，不会再看成「只有一条腿」
  seg(P.pelvis, P.kneeF, 0.62, 0.46, C.skinF, C.lineF);
  seg(P.kneeF, P.ankleF, 0.44, 0.30, C.skinF, C.lineF);
  seg(P.ankleF, P.toeF, 0.30, 0.20, C.shoeF, C.lineF);
  seg(P.shoulder, P.elbowF, 0.42, 0.34, C.skinF, C.lineF);
  seg(P.elbowF, P.wristF, 0.33, 0.26, C.skinF, C.lineF);
  seg(P.wristF, P.handF, 0.28, 0.24, C.skinF, C.lineF);

  // 躯干
  torso(ctx, pt(P.pelvis), pt(P.chest), pt(P.shoulder), 0.90 * s, 1.02 * s, 0.94 * s);
  ctx.fillStyle = C.cloth; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = C.clothLine; ctx.stroke();

  // 头
  var hc = pt(P.headC), hr = SEG.headR * s;
  seg(P.shoulder, P.neckTop, 0.34, 0.32, C.skin, C.line);
  ctx.beginPath(); ctx.arc(hc.x, hc.y, hr, 0, 6.2832);
  ctx.fillStyle = C.skin; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = C.line; ctx.stroke();
  // 朝向：鼻梁 + 发际
  var fa = (sample(track, t).head || 0);
  var upA = fa * RAD - Math.PI / 2;            // 头顶方向（画布角）
  var fwd = mir;                               // 面朝方向
  var nA = upA + fwd * Math.PI / 2;
  var nx = hc.x + Math.cos(nA) * hr * 0.94, ny = hc.y + Math.sin(nA) * hr * 0.94;
  ctx.beginPath(); ctx.arc(nx, ny, hr * 0.15, 0, 6.2832);
  ctx.fillStyle = C.skin; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = lw * 0.75; ctx.stroke();
  ctx.beginPath();
  ctx.arc(hc.x, hc.y, hr * 0.995, upA - fwd * Math.PI * 0.52, upA + fwd * 0.34, fwd < 0);
  ctx.lineWidth = hr * 0.36; ctx.strokeStyle = C.hair; ctx.lineCap = 'butt'; ctx.stroke();

  // 近侧肢体
  seg(P.pelvis, P.knee, 0.66, 0.48, C.skin, C.line);
  seg(P.knee, P.ankle, 0.46, 0.31, C.skin, C.line);
  seg(P.ankle, P.toe, 0.31, 0.21, C.shoe, C.line);
  seg(P.shoulder, P.elbow, 0.44, 0.35, C.skin, C.line);
  seg(P.elbow, P.wrist, 0.34, 0.27, C.skin, C.line);
  seg(P.wrist, P.hand, 0.29, 0.25, C.skin, C.line);

  drawProps(ctx, track.props, X, Y, s, C, 'front');

  // 目标关节高亮 —— 「哪里该动」，视频拍不出来
  if (track.focus && (!opt.layers || opt.layers.highlight !== false)) {
    var pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
    for (var f = 0; f < track.focus.length; f++) {
      var jp = P[track.focus[f]]; if (!jp) continue;
      var g = pt(jp);
      ctx.beginPath(); ctx.arc(g.x, g.y, s * (0.40 + 0.10 * pulse), 0, 6.2832);
      ctx.strokeStyle = C.focus; ctx.lineWidth = s * 0.075; ctx.globalAlpha = 0.30 + 0.35 * (1 - pulse);
      ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(g.x, g.y, s * 0.13, 0, 6.2832);
      ctx.fillStyle = C.focus; ctx.fill();
    }
  }
  return P;
}

/* ---------- 正视图（平衡、重心类动作用） ---------- */

function drawFront(ctx, W, H, track, t, opt, C, s, X, Y) {
  var p = sample(track, t);
  var lean = p.lean || 0, py = -3.86;
  var pelvis = { x: (p.bend || 0) + lean * 0.030, y: py };
  var lw = s * 0.05;
  function pt(q) { return { x: X(q.x), y: Y(q.y) }; }
  function seg(a, b, w0, w1, fill, stroke) {
    limb(ctx, pt(a), pt(b), w0 * s, w1 * s);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke();
  }
  var shoulder = { x: pelvis.x + lean * 0.052, y: py - SEG.spine };
  var chest = { x: pelvis.x + lean * 0.031, y: py - SEG.spine * 0.60 };
  var headC = { x: shoulder.x + lean * 0.020, y: shoulder.y - SEG.neck - SEG.headR };

  drawProps(ctx, track.props, X, Y, s, C, 'back');

  var legs = [
    { sgn: -1, hip: p.hipL || 0, lift: p.liftL || 0 },
    { sgn:  1, hip: p.hipR || 0, lift: p.liftR || 0 }
  ];
  var feet = [];
  for (var i = 0; i < 2; i++) {
    var g = legs[i];
    var hip = { x: pelvis.x + g.sgn * 0.40, y: py + 0.10 };
    var fore = 1 - g.lift * 0.52;                       // 抬腿 = 透视缩短
    var knee = { x: hip.x + g.sgn * Math.sin(g.hip * RAD) * SEG.thigh * fore,
                 y: hip.y + Math.cos(g.hip * RAD) * SEG.thigh * fore };
    var ank  = { x: knee.x + g.sgn * 0.04 - g.sgn * g.lift * 0.42, y: knee.y + SEG.shank * (1 - g.lift * 0.62) };
    feet.push(ank);
    var far = g.lift > 0.05;
    seg(hip, knee, 0.60, 0.44, far ? C.skinF : C.skin, far ? C.lineF : C.line);
    seg(knee, ank, 0.44, 0.30, far ? C.skinF : C.skin, far ? C.lineF : C.line);
    var toe = { x: ank.x + g.sgn * 0.30, y: ank.y + 0.24 };
    seg(ank, toe, 0.30, 0.26, far ? C.shoeF : C.shoe, far ? C.lineF : C.line);
  }

  torso(ctx, pt(pelvis), pt(chest), pt(shoulder), 1.02 * s, 1.14 * s, 1.16 * s);
  ctx.fillStyle = C.cloth; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = C.clothLine; ctx.stroke();

  var arms = [{ sgn: -1, a: p.armL || 0 }, { sgn: 1, a: p.armR || 0 }];
  for (var j = 0; j < 2; j++) {
    var sh = { x: shoulder.x + arms[j].sgn * 0.64, y: shoulder.y + 0.12 };
    var el = { x: sh.x + arms[j].sgn * Math.sin(arms[j].a * RAD) * SEG.uarm,
               y: sh.y + Math.cos(arms[j].a * RAD) * SEG.uarm };
    var wr = { x: el.x + arms[j].sgn * Math.sin(arms[j].a * RAD * 1.1) * SEG.farm,
               y: el.y + Math.cos(arms[j].a * RAD * 1.1) * SEG.farm };
    seg(sh, el, 0.42, 0.34, C.skin, C.line);
    seg(el, wr, 0.33, 0.27, C.skin, C.line);
  }

  var hc = pt(headC), hr = SEG.headR * s;
  ctx.beginPath(); ctx.arc(hc.x, hc.y, hr, 0, 6.2832);
  ctx.fillStyle = C.skin; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = C.line; ctx.stroke();
  ctx.beginPath();
  ctx.arc(hc.x, hc.y, hr * 0.99, Math.PI * 1.06, Math.PI * 1.94);
  ctx.lineWidth = hr * 0.44; ctx.strokeStyle = C.hair; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineCap = 'butt';

  // 重心线：从头顶垂下来，落在哪只脚上一目了然
  if (track.plumb && (!opt.layers || opt.layers.plumb !== false)) {
    var a = pt({ x: headC.x, y: headC.y - 0.5 }), b = pt({ x: headC.x, y: 0.15 });
    ctx.save();
    ctx.setLineDash([s * 0.14, s * 0.12]);
    ctx.strokeStyle = C.focus; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(b.x, b.y, s * 0.13, 0, 6.2832);
    ctx.fillStyle = C.focus; ctx.fill();
  }
  drawProps(ctx, track.props, X, Y, s, C, 'front');
}

/* ---------- 道具：床、椅子、地面、扶手、目标物 ---------- */

function drawProps(ctx, props, X, Y, s, C, layer) {
  if (!props) return;
  for (var i = 0; i < props.length; i++) {
    var o = props[i];
    if ((o.layer || 'back') !== layer) continue;
    ctx.save();
    if (o.k === 'floor') {
      ctx.fillStyle = C.floor;
      ctx.fillRect(0, Y(0), 4000, Math.max(2, s * 0.13));
      ctx.fillStyle = C.floorSoft;
      ctx.fillRect(0, Y(0) + Math.max(2, s * 0.13), 4000, s * 0.5);
    } else if (o.k === 'bed') {
      var by = Y(o.y || 0);
      ctx.fillStyle = C.prop;
      roundRect(ctx, X(o.x0), by, (o.x1 - o.x0) * s, s * 0.70, s * 0.10);
      ctx.fill();
      ctx.fillStyle = C.propLine;
      ctx.fillRect(X(o.x0), by, (o.x1 - o.x0) * s, Math.max(1.5, s * 0.05));
    } else if (o.k === 'chair') {
      ctx.fillStyle = C.prop;
      roundRect(ctx, X(o.x0), Y(o.seat), (o.x1 - o.x0) * s, s * 0.20, s * 0.07); ctx.fill();
      roundRect(ctx, X(o.x0), Y(o.seat) + s * 0.18, s * 0.20, (0 - o.seat) * s - s * 0.18, s * 0.05); ctx.fill();
      roundRect(ctx, X(o.x1) - s * 0.20, Y(o.seat) + s * 0.18, s * 0.20, (0 - o.seat) * s - s * 0.18, s * 0.05); ctx.fill();
      if (o.back) { roundRect(ctx, X(o.x0), Y(o.seat - 1.5), s * 0.20, s * 1.5, s * 0.06); ctx.fill(); }
    } else if (o.k === 'rail') {
      ctx.fillStyle = C.prop;
      roundRect(ctx, X(o.x) - s * 0.10, Y(o.y), s * 0.20, (0 - o.y) * s, s * 0.06); ctx.fill();
      roundRect(ctx, X(o.x) - s * 0.55, Y(o.y) - s * 0.10, s * 1.1, s * 0.20, s * 0.08); ctx.fill();
    } else if (o.k === 'target') {
      ctx.fillStyle = C.accentSoft; ctx.strokeStyle = C.accent; ctx.lineWidth = Math.max(1.5, s * 0.05);
      roundRect(ctx, X(o.x) - s * 0.22, Y(o.y) - s * 0.26, s * 0.44, s * 0.52, s * 0.08);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  if (h < 0) { y += h; h = -h; }
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- 配色 ---------- */

var THEME = {
  light: {
    skin: '#EFC3A0', skinF: '#F6DECB', line: '#B07C52', lineF: '#D6B79B',
    shoe: '#5B6B6E', shoeF: '#9DAAAC',
    cloth: '#CFDBDA', clothLine: '#94AAA9', hair: '#3D3A36',
    floor: '#B5C2BC', floorSoft: 'rgba(150,170,164,0.22)',
    prop: '#CBD6D1', propLine: '#A6B5AE',
    focus: '#C8791A', accent: '#0F6F5C', accentSoft: '#DCEBE5',
    trail: 'rgba(200,121,26,0.55)'
  },
  dark: {
    skin: '#C8926B', skinF: '#8E6A50', line: '#6E4A2C', lineF: '#5A4335',
    shoe: '#39474A', shoeF: '#2C3639',
    cloth: '#48605F', clothLine: '#334746', hair: '#191A19',
    floor: '#46534E', floorSoft: 'rgba(120,140,135,0.16)',
    prop: '#414D48', propLine: '#5A6963',
    focus: '#E8A33A', accent: '#4FBFA2', accentSoft: '#1E3B34',
    trail: 'rgba(232,163,58,0.55)'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { draw: draw, sample: sample, solve: solve, place: place, SEG: SEG, THEME: THEME };
}
