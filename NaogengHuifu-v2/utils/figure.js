/* ===========================================================================
 * figure.js —— 人体骨骼渲染器
 *
 * 一套渲染器 + 每个动作一份关节角度数据。新增动作 = 加一份关键帧，
 * 不需要画图、不需要导 GIF。品质天然统一，包体几乎不增加。
 *
 * ── 角度约定：全部是「关节角」，也就是康复科口头说的那个角度 ──
 *   trunk   躯干前倾（世界角，0 = 直立，+ = 前倾，-90 = 平躺）
 *   neck    颈（相对躯干，+ = 低头）
 *   hip     屈髋（+ = 大腿抬向身体前方）
 *   knee    屈膝（+ = 小腿向后折；永远 ≥ 0，膝盖不可能向前反折）
 *   ankle   踝（+ = 背屈/勾脚尖，- = 跖屈/绷脚尖，0 = 中立位）
 *   sho     肩前屈（+ = 手臂前举）
 *   elb     屈肘（+ = 前臂向前折；永远 ≥ 0）
 *   wri     腕（+ = 背伸）
 *   带 F 后缀 = 远侧（画在身体后面的那半边）
 *
 * 所有角度进渲染器前都过一遍 LIM 生理活动度限制 —— 数据写错也画不出
 * 反折的膝盖、拧断的脚踝。这是「看起来像个人」的底线。
 *
 * 世界坐标：地面 y = 0，向下为正（画布坐标）。单位 = 1 个头高。
 * 站立成人 ≈ 6.9 个头高。
 * =========================================================================== */

var SEG = {
  headRx: 0.44, headRy: 0.50,   // 头（椭圆，不是圆）
  neck:   0.28,
  spine:  2.15,                 // 骨盆 → 肩
  uarm:   1.30, farm: 1.08, hand: 0.46,
  thigh:  1.80, shank: 1.68, foot: 0.78,
  shoW:   0.80,                 // 正视：肩半宽
  hipW:   0.46                  // 正视：髋半宽
};

/* ---------- 手 ----------
 * 单位换成「掌宽」，因为手是特写，和全身不共用一套比例。
 * 手指用一个 curl（0 完全伸直、1 完全握拳、负数是掌指关节过伸）驱动三个关节，
 * 比例取自握拳时各关节的实际屈曲角：掌指 88°、近节指间 105°、远节指间 72°。
 */
var HAND = {
  fore: 2.30, foreW0: 0.98, foreW1: 0.70,
  palm: 1.00, palmW: 0.94, wristW: 0.74,
  /* mcp: 掌指关节在掌骨头的纵向位置（指列弓）; u: 横向位次; L: 三节指骨长; g: 握拳时的屈曲增益 */
  fing: [
    { mcp: 0.02, u: -1.5, L: [0.50, 0.30, 0.22], w: 0.21, g: 0.92 },  // 食指
    { mcp: 0.08, u: -0.5, L: [0.55, 0.34, 0.23], w: 0.22, g: 1.00 },  // 中指
    { mcp: 0.04, u:  0.5, L: [0.51, 0.32, 0.22], w: 0.21, g: 1.03 },  // 无名指
    { mcp: -0.06, u: 1.5, L: [0.40, 0.24, 0.19], w: 0.19, g: 1.08 }   // 小指
  ],
  thumb: { L: [0.52, 0.38, 0.28], w: 0.25 }
};
/* 桡侧 3/4 视角下的指列视差：越往小指方向越远，画面上略往右上错、并且略短。
 * 只在掌指关节这一处偏移（不能逐节累加，累加会把手指掰弯）。 */
var FAN = { x: 0.048, y: -0.058, shrink: 0.972 };
var HLIM = { wri: [-78, 72], curl: [-0.28, 1], spread: [0, 1], thumb: [0, 1] };

/* 生理活动度上下限（度）—— 超出的一律夹回来 */
var LIM = {
  trunk: [-180, 180],        // 躯干是世界朝向，不是关节，不设生理上限
  neck:  [-32, 46],
  hip:   [-26, 132],
  knee:  [0, 146],
  ankle: [-46, 28],
  sho:   [-58, 176],
  elb:   [0, 150],
  wri:   [-72, 72],
  abd:   [-8, 172]              // 正视用：外展
};

var RAD = Math.PI / 180;

function clamp(v, r) { return v < r[0] ? r[0] : (v > r[1] ? r[1] : v); }
function num(v, d) { return v == null ? d : v; }

/* 「朝下为 0、向前为正」的单位向量（画布坐标，y 向下） */
function vec(a) { return { x: Math.sin(a * RAD), y: Math.cos(a * RAD) }; }
function dn(p, a, L) { return { x: p.x + L * Math.sin(a * RAD), y: p.y + L * Math.cos(a * RAD) }; }
function up(p, a, L) { return { x: p.x + L * Math.sin(a * RAD), y: p.y - L * Math.cos(a * RAD) }; }

/* ---------- 关节角 → 世界角（顺便夹进生理范围） ---------- */

function world(p) {
  var t = clamp(num(p.trunk, 0), LIM.trunk);
  var o = { trunk: t, head: t + clamp(num(p.neck, 0), LIM.neck) };

  function side(sfx) {
    var hip   = clamp(num(p['hip' + sfx],   num(p.hip, 0)),   LIM.hip);
    var knee  = clamp(num(p['knee' + sfx],  num(p.knee, 0)),  LIM.knee);
    var ank   = num(p['ankle' + sfx], num(p.ankle, 0));
    var sho   = clamp(num(p['sho' + sfx],   num(p.sho, 0)),   LIM.sho);
    var elb   = clamp(num(p['elb' + sfx],   num(p.elb, 0)),   LIM.elb);
    var wri   = clamp(num(p['wri' + sfx],   num(p.wri, 0)),   LIM.wri);
    var thigh = hip - t;
    var shank = thigh - knee;          // 屈膝只能让小腿往后走
    // flat = 1 表示「这只脚平踩在支撑面上」—— 踝角由几何反推，脚不会插进地里、
    // 也不会踮着走。数值来自其它关节，所以关键帧里改屈膝屈髋，脚自动跟着对。
    var fl = num(p['flat' + sfx], num(p.flat, 0));
    if (fl > 0) ank = ank + (-shank - ank) * (fl > 1 ? 1 : fl);
    ank = clamp(ank, LIM.ankle);
    var foot  = shank + 90 + ank;      // 中立位 = 与小腿成 90°
    var uarm  = sho - t;
    var farm  = uarm + elb;            // 屈肘只能让前臂往前折
    o['thigh' + sfx] = thigh; o['shank' + sfx] = shank; o['foot' + sfx] = foot;
    o['uarm' + sfx]  = uarm;  o['farm' + sfx]  = farm;  o['hand' + sfx] = farm + wri;
  }
  side(''); side('F');
  return o;
}

/* ---------- 正向运动学 ---------- */

function solve(pose) {
  var a = world(pose);
  var P = { ang: a, plant: pose.plant };

  P.pelvis   = { x: 0, y: 0 };
  P.waist    = up(P.pelvis, a.trunk, SEG.spine * 0.34);
  P.chest    = up(P.pelvis, a.trunk, SEG.spine * 0.68);
  P.shoulder = up(P.pelvis, a.trunk, SEG.spine);
  P.neckTop  = up(P.shoulder, a.head, SEG.neck);
  P.headC    = up(P.neckTop, a.head, SEG.headRy * 0.94);

  // 远侧（后面那半边）整体往身后错一点点 —— 一眼分得出前后，不会看成只有一条腿。
  // 只在水平方向错开：竖直方向一动，躺着的时候远侧那只脚就会陷进床里。
  var shF = { x: P.shoulder.x - 0.15, y: P.shoulder.y };
  var hpF = { x: P.pelvis.x - 0.13, y: P.pelvis.y };
  P.shoulderF = shF; P.pelvisF = hpF;

  P.knee  = dn(P.pelvis, a.thigh, SEG.thigh);
  P.ankle = dn(P.knee,   a.shank, SEG.shank);
  P.toe   = dn(P.ankle,  a.foot,  SEG.foot);
  P.kneeF  = dn(hpF,     a.thighF, SEG.thigh);
  P.ankleF = dn(P.kneeF, a.shankF, SEG.shank);
  P.toeF   = dn(P.ankleF, a.footF, SEG.foot);

  P.elbow = dn(P.shoulder, a.uarm, SEG.uarm);
  P.wrist = dn(P.elbow,    a.farm, SEG.farm);
  P.hand  = dn(P.wrist,    a.hand, SEG.hand);
  P.elbowF = dn(shF,       a.uarmF, SEG.uarm);
  P.wristF = dn(P.elbowF,  a.farmF, SEG.farm);
  P.handF  = dn(P.wristF,  a.handF, SEG.hand);

  // 鞋底触地点 —— 用来把人「放」在地面上，脚不浮空也不陷进去
  P.heel  = sole(P.ankle,  a.foot,  -0.30, 0.17);
  P.tip   = sole(P.ankle,  a.foot,   0.84, 0.17);
  P.heelF = sole(P.ankleF, a.footF, -0.30, 0.17);
  P.tipF  = sole(P.ankleF, a.footF,  0.84, 0.17);
  return P;
}

/* 足部局部坐标 (u 沿脚掌朝前，v 垂直于脚掌朝鞋底) → 世界坐标 */
function sole(ank, fa, u, v) {
  var d = vec(fa), n = vec(fa - 90);
  return { x: ank.x + (d.x * u + n.x * v) * SEG.foot,
           y: ank.y + (d.y * u + n.y * v) * SEG.foot };
}

/* 把整个人平移到位。'ground' = 最低的那个触地点落在地面上 */
function place(P, track) {
  var dx, dy, ay = track.ay != null ? track.ay : 0, ax = track.ax || 0;
  var anchor = track.anchor || 'ground';
  if (anchor === 'ground' || anchor === 'feet') {
    // 最低的那个触地点落在支撑面上 —— 脚既不浮空也不陷进去，
    // 骨盆的起伏（走路的上下、坐站的升起）就自动是对的。
    var low = Math.max(P.heel.y, P.tip.y, P.heelF.y, P.tipF.y);
    // 横向的参照物：plant=0 骨盆不动（屁股坐在椅子上，动的是脚），
    // plant=1 脚不动（离座之后身体绕着脚走）。坐站转移正好要在两者之间过渡。
    var plant = P.plant != null ? P.plant : (anchor === 'feet' ? 1 : 0);
    var dxP = ax - P.pelvis.x;
    var dxF = (track.axFoot != null ? track.axFoot : ax) - P.heel.x;
    dx = dxP + (dxF - dxP) * plant;
    dy = ay - low;
  } else {
    var a = P[anchor] || P.pelvis;
    dx = ax - a.x; dy = ay - a.y;
  }
  for (var k in P) {
    if (k === 'ang' || k === 'plant' || !P[k] || P[k].x == null) continue;
    P[k] = { x: P[k].x + dx, y: P[k].y + dy };
  }
  return P;
}

/* ---------- 关键帧插值 ---------- */

var EASE = {
  linear: function (u) { return u; },
  inout:  function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; },
  out:    function (u) { return 1 - Math.pow(1 - u, 3); },
  hold:   function ()  { return 0; }
};

var KEYS = ['trunk','neck','hip','knee','ankle','sho','elb','wri','flat','plant',
            'curl','spread','thumb',
            'hipF','kneeF','ankleF','shoF','elbF','wriF','flatF',
            'lean','sway','hipL','hipR','kneeL','kneeR','abdL','abdR',
            'shoL','shoR','elbL','elbR','armAbdL','armAbdR','riseL','riseR'];

function sample(track, t) {
  var kf = track.keyframes;
  if (!kf || !kf.length) return merge(track.base, {});
  if (t <= kf[0].t) return merge(track.base, kf[0]);
  if (t >= kf[kf.length - 1].t) return merge(track.base, kf[kf.length - 1]);
  var i = 0;
  while (i < kf.length - 1 && kf[i + 1].t <= t) i++;
  var a = kf[i], b = kf[i + 1];
  var u = (b.t - a.t) > 0 ? (t - a.t) / (b.t - a.t) : 0;
  u = (EASE[b.ease || 'inout'] || EASE.inout)(u);
  var A = merge(track.base, a), B = merge(track.base, b), out = {};
  for (var j = 0; j < KEYS.length; j++) {
    var k = KEYS[j], va = A[k], vb = B[k];
    if (va == null && vb == null) continue;
    if (va == null) va = vb;
    if (vb == null) vb = va;
    out[k] = va + (vb - va) * u;
  }
  return out;
}

function merge(base, kf) {
  var o = {}, i;
  for (i in base) o[i] = base[i];
  for (i in kf) { if (i !== 't' && i !== 'ease') o[i] = kf[i]; }
  return o;
}

/* ---------- 绘制基元 ---------- */

/* 带锥度的圆头肢体段（两圆外公切线）。
 * capsuleTo 只往当前路径里加一个子路径 —— 多段拼成一条肢体时要用它，
 * 不能用会重置路径的 capsule。 */
function capsuleTo(ctx, p0, p1, w0, w1) {
  var dx = p1.x - p0.x, dy = p1.y - p0.y;
  var L = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  var a = Math.atan2(dy, dx), r0 = w0 / 2, r1 = w1 / 2;
  var d = (r0 - r1) / L;
  if (d > 1) d = 1; if (d < -1) d = -1;
  var th = Math.acos(d);
  ctx.moveTo(p0.x + r0 * Math.cos(a + th), p0.y + r0 * Math.sin(a + th));
  ctx.arc(p0.x, p0.y, r0, a + th, a - th + 2 * Math.PI);
  ctx.arc(p1.x, p1.y, r1, a - th, a + th);
  ctx.closePath();
}
function capsule(ctx, p0, p1, w0, w1) {
  ctx.beginPath();
  capsuleTo(ctx, p0, p1, w0, w1);
}

/* 过点的光滑闭合曲线（中点二次贝塞尔） */
function smooth(ctx, pts) {
  var n = pts.length;
  var m = { x: (pts[n - 1].x + pts[0].x) / 2, y: (pts[n - 1].y + pts[0].y) / 2 };
  ctx.beginPath();
  ctx.moveTo(m.x, m.y);
  for (var i = 0; i < n; i++) {
    var a = pts[i], b = pts[(i + 1) % n];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  if (h < 0) { y += h; h = -h; }
  if (w < 0) { x += w; w = -w; }
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- 主渲染 ---------- */

function draw(ctx, W, H, track, t, opt) {
  opt = opt || {};
  var C = opt.theme || THEME.light;
  var view = track.view || { cx: 0, cy: -3.4, span: 8.6 };
  var s = H / (view.span / (opt.zoom || 1));
  var mir = opt.mirror ? -1 : 1;

  var G = {
    s: s, mir: mir, C: C,
    X: function (wx) { return W / 2 + (wx - view.cx) * s * mir; },
    Y: function (wy) { return H / 2 + (wy - view.cy) * s; }
  };
  G.pt = function (p) { return { x: G.X(p.x), y: G.Y(p.y) }; };
  G.lw = Math.max(1, s * 0.042);

  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';

  if (track.handView) return drawHand(ctx, W, H, track, t, opt, G);
  if (track.front) return drawFront(ctx, W, H, track, t, opt, G);
  return drawSide(ctx, W, H, track, t, opt, G);
}

/* ---------- 侧视图 ---------- */

function drawSide(ctx, W, H, track, t, opt, G) {
  var C = G.C, s = G.s, pt = G.pt;
  var P = place(solve(sample(track, t)), track);

  props(ctx, track.props, G, 'back');
  shadow(ctx, G, [P.heel, P.tip, P.heelF, P.tipF]);

  // 运动轨迹：整个周期里目标点走过的路 —— 视频给不了的信息层
  if (track.trail && (!opt.layers || opt.layers.trail !== false)) {
    var path = trailPath(track);
    ctx.save();
    ctx.strokeStyle = C.trail;
    ctx.lineWidth = Math.max(1.4, s * 0.05);
    ctx.setLineDash([s * 0.16, s * 0.15]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < path.length; i++) {
      var q = pt(path[i]);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt';
  }

  var F = { skin: C.skinF, line: C.lineF, shirt: C.shirtF, shirtL: C.shirtLF,
            pants: C.pantsF, pantsL: C.pantsLF, shoe: C.shoeF, shoeL: C.shoeLF, hair: C.hairF };
  var N = { skin: C.skin, line: C.line, shirt: C.shirt, shirtL: C.shirtL,
            pants: C.pants, pantsL: C.pantsL, shoe: C.shoe, shoeL: C.shoeL, hair: C.hair };

  // 远侧：手臂 + 腿
  arm(ctx, G, P.shoulderF, P.elbowF, P.wristF, P.handF, P.ang.handF, F);
  leg(ctx, G, P.pelvisF, P.kneeF, P.ankleF, P.ang.footF, F);
  // 仰卧时手臂贴在身体两侧 —— 画在躯干后面，不然一条胳膊横在肚子上
  if (track.armBack) arm(ctx, G, P.shoulder, P.elbow, P.wrist, P.hand, P.ang.hand, N);
  // 近侧腿
  leg(ctx, G, P.pelvis, P.knee, P.ankle, P.ang.foot, N);
  // 短裤（盖住两条大腿根，人才有胯）
  shorts(ctx, G, P, F, N);
  // 躯干
  trunkShape(ctx, G, P, N);
  // 颈 + 头
  neckHead(ctx, G, P, N, C);
  // 近侧手臂（最前面）
  if (!track.armBack) arm(ctx, G, P.shoulder, P.elbow, P.wrist, P.hand, P.ang.hand, N);

  props(ctx, track.props, G, 'front');
  focusRing(ctx, G, track, P, t, opt);
  return P;
}

/* 手臂：整条一次画完（上臂+前臂+手+拇指），再套上短袖 */
function arm(ctx, G, sh, el, wr, hd, handAng, K) {
  var d = vec(handAng), n = vec(handAng - 90 * G.mir);
  var thumb = { x: wr.x + (d.x * 0.20 + n.x * 0.16) * SEG.hand,
                y: wr.y + (d.y * 0.20 + n.y * 0.16) * SEG.hand };
  limb(ctx, G, [[sh, el, 0.40, 0.32], [el, wr, 0.32, 0.25], [wr, hd, 0.25, 0.27]],
       K.skin, K.line, [[thumb, 0.105]]);
  cloth(ctx, G, sh, el, 0.52, 0.47, 0.40, K.shirt, K.shirtL);
}

/* 腿：大腿 + 小腿一条画完，再穿鞋 */
function leg(ctx, G, hip, kn, ank, footAng, K) {
  limb(ctx, G, [[hip, kn, 0.62, 0.44], [kn, ank, 0.44, 0.27]], K.skin, K.line);
  shoe(ctx, G, ank, footAng, K);
}

function shoe(ctx, G, ank, fa, K) {
  var L = [
    [-0.34, -0.14], [-0.33, 0.10], [-0.24, 0.19], [0.24, 0.21],
    [0.72, 0.19], [0.86, 0.09], [0.84, -0.02], [0.48, -0.15],
    [0.16, -0.34], [-0.18, -0.33]
  ];
  var pts = [];
  for (var i = 0; i < L.length; i++) pts.push(G.pt(sole(ank, fa, L[i][0], L[i][1])));
  smooth(ctx, pts);
  ctx.fillStyle = K.shoe; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = K.shoeL; ctx.stroke();
}

function fillSeg(ctx, G, a, b, w0, w1, fill, line) {
  capsule(ctx, G.pt(a), G.pt(b), w0 * G.s, w1 * G.s);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = line; ctx.stroke();
}

/* 一条肢体 = 若干段拼起来的一个整体。
 * 先用两倍线宽把整条路径描一遍，再把并集填上 —— 内部的接缝被填色盖掉，
 * 只剩下最外面半条描边。这样肘、膝就不会各挂一个圆圈，看着才像一条胳膊。 */
function limb(ctx, G, segs, fill, line, dots) {
  var i;
  ctx.beginPath();
  for (i = 0; i < segs.length; i++) {
    var g = segs[i];
    capsuleTo(ctx, G.pt(g[0]), G.pt(g[1]), g[2] * G.s, g[3] * G.s);
  }
  for (i = 0; dots && i < dots.length; i++) {
    var d = G.pt(dots[i][0]);
    ctx.moveTo(d.x + dots[i][1] * G.s, d.y);
    ctx.arc(d.x, d.y, dots[i][1] * G.s, 0, 6.2832);
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = line; ctx.lineWidth = G.lw * 2; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineCap = 'butt';
}

/* 袖口 / 裤脚：只填色不描边，再在袖口画一条边线 —— 衣服和肩膀连成一体 */
function cloth(ctx, G, a, b, f, w0, w1, fill, line) {
  var m = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  capsule(ctx, G.pt(a), G.pt(m), w0 * G.s, w1 * G.s);
  ctx.fillStyle = fill; ctx.fill();
  var d = { x: b.x - a.x, y: b.y - a.y };
  var L = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
  var nx = -d.y / L * w1 / 2, ny = d.x / L * w1 / 2;
  var p0 = G.pt({ x: m.x + nx, y: m.y + ny }), p1 = G.pt({ x: m.x - nx, y: m.y - ny });
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
  ctx.strokeStyle = line; ctx.lineWidth = G.lw; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineCap = 'butt';
}

/* 躯干局部坐标系：du 沿脊柱向上，dv 朝身体正面。
 * 方向直接取自解算出来的骨盆→肩向量 —— 不能从躯干角反推，
 * 躺着的时候两者正好相反，那样人会断成两截。 */
function frame(P) {
  var dx = P.shoulder.x - P.pelvis.x, dy = P.shoulder.y - P.pelvis.y;
  var L = Math.sqrt(dx * dx + dy * dy) || 1;
  var ux = dx / L, uy = dy / L;
  return { ux: ux, uy: uy, nx: -uy, ny: ux, o: P.pelvis };
}
function at(G, f, du, dv) {
  return G.pt({ x: f.o.x + f.ux * du + f.nx * dv, y: f.o.y + f.uy * du + f.ny * dv });
}

/* 短裤：远侧裤腿 → 胯 → 近侧裤腿 */
function shorts(ctx, G, P, F, N) {
  cloth(ctx, G, P.pelvisF, P.kneeF, 0.44, 0.74, 0.58, F.pants, F.pantsL);
  var f = frame(P);
  function q(du, dv) { return at(G, f, du, dv); }
  smooth(ctx, [q(-0.52, 0.44), q(-0.16, 0.50), q(0.34, 0.40), q(0.44, 0.00),
               q(0.32, -0.40), q(-0.18, -0.52), q(-0.52, -0.46)]);
  ctx.fillStyle = N.pants; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = N.pantsL; ctx.stroke();
  cloth(ctx, G, P.pelvis, P.knee, 0.44, 0.74, 0.58, N.pants, N.pantsL);
}

/* 躯干：上衣。肩、胸、腰、胯的轮廓一条曲线走完 */
function trunkShape(ctx, G, P, N) {
  var f = frame(P);
  function q(du, dv) { return at(G, f, du, dv); }
  var sp = SEG.spine;
  smooth(ctx, [
    q(0.02, 0.42), q(sp * 0.34, 0.36), q(sp * 0.68, 0.50), q(sp * 0.96, 0.46),
    q(sp + 0.14, 0.22), q(sp + 0.16, -0.10),
    q(sp * 0.96, -0.48), q(sp * 0.68, -0.52), q(sp * 0.34, -0.44), q(0.02, -0.46)
  ]);
  ctx.fillStyle = N.shirt; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = N.shirtL; ctx.stroke();
}

/* 颈 + 头（侧面轮廓：额、鼻、唇、下巴都在同一条线上） */
function neckHead(ctx, G, P, N, C) {
  var s = G.s, ha = P.ang.head, mir = G.mir;
  limb(ctx, G, [[P.shoulder, P.neckTop, 0.34, 0.31]], N.skin, N.line);

  var hc = G.pt(P.headC);
  // 头轴方向 =（sin ha, -cos ha）；镜像时整个世界翻面，旋转量也跟着翻
  var rot = ha * RAD * mir;
  var rx = SEG.headRx * s, ry = SEG.headRy * s;
  ctx.save();
  ctx.translate(hc.x, hc.y);
  ctx.rotate(rot);
  ctx.scale(mir, 1);

  // 侧脸轮廓（局部坐标：x 朝前，y 朝上，单位 = 头半径）
  var prof = [
    [0.00, 1.00], [0.56, 0.88], [0.86, 0.50], [0.90, 0.20], [0.82, 0.06],
    [1.06, -0.20], [1.05, -0.22], [0.84, -0.32], [0.88, -0.46], [0.74, -0.68],
    [0.44, -0.90], [0.06, -0.98], [-0.42, -0.82], [-0.78, -0.44],
    [-0.94, 0.06], [-0.74, 0.70]
  ];
  var pts = [];
  for (var i = 0; i < prof.length; i++) pts.push({ x: prof[i][0] * rx, y: -prof[i][1] * ry });
  smooth(ctx, pts);
  ctx.fillStyle = N.skin; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = N.line; ctx.stroke();

  // 耳（在下颌后上方，不是脸中间）
  ctx.beginPath();
  ctx.arc(-0.34 * rx, -0.06 * ry, rx * 0.15, Math.PI * 0.55, Math.PI * 1.75);
  ctx.lineWidth = G.lw * 0.85; ctx.strokeStyle = N.line; ctx.stroke();

  // 眉、眼、嘴 —— 三笔，别多
  ctx.strokeStyle = C.face; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, rx * 0.13);
  ctx.beginPath();
  ctx.moveTo(0.34 * rx, -0.10 * ry); ctx.lineTo(0.66 * rx, -0.14 * ry);   // 眉
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.52 * rx, 0.12 * ry, rx * 0.10, 0, 6.2832);
  ctx.fillStyle = C.face; ctx.fill();                                     // 眼
  ctx.beginPath();
  ctx.moveTo(0.52 * rx, 0.52 * ry); ctx.lineTo(0.76 * rx, 0.50 * ry);     // 嘴
  ctx.lineWidth = Math.max(1, rx * 0.11);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // 头发：贴着颅顶的一层，前面留出额头
  ctx.save();
  ctx.beginPath();
  var hair = [
    [0.66, 0.80], [0.92, 0.40], [1.02, 0.62], [0.86, 0.96],
    [0.30, 1.16], [-0.42, 1.10], [-0.94, 0.66], [-1.10, 0.02],
    [-1.02, -0.34], [-0.84, -0.14], [-0.84, 0.36], [-0.52, 0.80],
    [-0.04, 0.96], [0.34, 0.92]
  ];
  var hp = [];
  for (var j = 0; j < hair.length; j++) hp.push({ x: hair[j][0] * rx, y: -hair[j][1] * ry });
  smooth(ctx, hp);
  ctx.fillStyle = N.hair; ctx.fill();
  ctx.restore();
  ctx.restore();
}

/* ---------- 正视图（平衡、重心类动作用） ----------
 * 同一套关节角，只是换成冠状面投影 + 一点点侧转（YAW），
 * 这样「向前抬起来的腿」是缩短、不是向旁边甩。
 */
var YAW = 0.34;

function fSolve(p) {
  var lean = num(p.lean, 0), sway = num(p.sway, 0), trunk = num(p.trunk, 0);
  var P = { legs: [], arms: [] };
  function proj(v) { return { x: v.x + v.z * YAW, y: v.y }; }

  // 躯干：侧倾 lean，骨盆侧移 sway
  var pel = { x: sway, y: 0, z: 0 };
  var lr = lean * RAD;
  var sh = { x: pel.x + Math.sin(lr) * SEG.spine, y: pel.y - Math.cos(lr) * SEG.spine, z: 0 };
  var nk = { x: sh.x + Math.sin(lr * 0.5) * SEG.neck, y: sh.y - Math.cos(lr * 0.5) * SEG.neck, z: 0 };
  var hd = { x: nk.x + Math.sin(lr * 0.3) * SEG.headRy * 0.94,
             y: nk.y - Math.cos(lr * 0.3) * SEG.headRy * 0.94, z: 0 };
  P.pelvis = proj(pel); P.shoulder = proj(sh); P.neckTop = proj(nk); P.headC = proj(hd);
  P.lean = lean;

  // 骨盆 / 肩带随侧倾一起转
  function off(base, w, sgn, rot) {
    var r = rot * RAD;
    return { x: base.x + sgn * w * Math.cos(r), y: base.y + sgn * w * Math.sin(r), z: 0 };
  }
  var sides = [-1, 1];
  for (var i = 0; i < 2; i++) {
    var sg = sides[i], S = sg < 0 ? 'L' : 'R';
    var hip = off(pel, SEG.hipW, sg, lean * 0.35);
    var sho = off(sh, SEG.shoW, sg, lean * 0.5);

    // 腿
    var abd  = clamp(num(p['abd' + S], 4), LIM.abd);
    var hf   = clamp(num(p['hip' + S], 0), LIM.hip);
    var kf   = clamp(num(p['knee' + S], 0), LIM.knee);
    var rise = num(p['rise' + S], 0);
    var kn = seg3(hip, SEG.thigh, hf, abd, sg);
    var an = seg3(kn, SEG.shank, hf - kf, abd, sg);
    P.legs.push({ sg: sg, hip: proj(hip), knee: proj(kn), ankle: proj(an),
                  z: (kn.z + an.z) / 2, rise: rise, abd: abd, fwd: hf });

    // 手臂：外展 armAbd + 肩前屈 sho + 屈肘 elb
    var aab = clamp(num(p['armAbd' + S], 6), LIM.abd);
    var sf  = clamp(num(p['sho' + S], 0), LIM.sho);
    var ef  = clamp(num(p['elb' + S], 0), LIM.elb);
    var el = seg3(sho, SEG.uarm, sf, aab, sg);
    var wr = seg3(el, SEG.farm, sf + ef, aab, sg);
    var hn = seg3(wr, SEG.hand, sf + ef, aab, sg);
    P.arms.push({ sg: sg, sho: proj(sho), elbow: proj(el), wrist: proj(wr), hand: proj(hn),
                  z: (el.z + wr.z) / 2 });
  }
  P.proj = proj;
  return P;
}

/* 从关节出发的一段肢体：sag = 矢状面角（+ 向前），abd = 外展角 */
function seg3(p, L, sag, abd, sg) {
  var a = sag * RAD, b = abd * RAD;
  return {
    x: p.x + sg * Math.sin(b) * L,
    y: p.y + Math.cos(b) * Math.cos(a) * L,
    z: p.z + Math.cos(b) * Math.sin(a) * L
  };
}

/* 正视图：解算 + 落地，渲染和体检共用 */
function fPlace(track, t) {
  var K = fSolve(sample(track, t));
  var lowest = -1e9, i;
  for (i = 0; i < 2; i++) {
    var lg = K.legs[i];
    lg.sole = lg.ankle.y + (0.20 - lg.rise * 0.10) * SEG.foot;
    if (lg.sole > lowest) lowest = lg.sole;
  }
  var ay = track.ay != null ? track.ay : 0;
  shift(K, 0, ay - lowest);
  for (i = 0; i < 2; i++) K.legs[i].sole += ay - lowest;
  K.ay = ay;
  return K;
}

function drawFront(ctx, W, H, track, t, opt, G) {
  var C = G.C, s = G.s, i;
  var K = fPlace(track, t);
  var ay = K.ay;

  props(ctx, track.props, G, 'back');
  var contact = [];
  for (i = 0; i < 2; i++) contact.push({ x: K.legs[i].ankle.x, y: K.legs[i].sole });
  shadow(ctx, G, contact);

  var far = { skin: C.skinF, line: C.lineF, shirt: C.shirtF, shirtL: C.shirtLF,
              pants: C.pantsF, pantsL: C.pantsLF, shoe: C.shoeF, shoeL: C.shoeLF, hair: C.hairF };
  var near = { skin: C.skin, line: C.line, shirt: C.shirt, shirtL: C.shirtL,
               pants: C.pants, pantsL: C.pantsL, shoe: C.shoe, shoeL: C.shoeL, hair: C.hair };

  // 抬起来的腿在前面 —— 按深度排序，谁在前谁后画
  if (track.plumb && (!opt.layers || opt.layers.plumb !== false)) plumbLine(ctx, G, track, K, ay, opt);

  var legs = K.legs.slice().sort(function (a, b) { return a.z - b.z; });
  var arms = K.arms.slice().sort(function (a, b) { return a.z - b.z; });

  // 按深度排序决定前后遮挡；两条腿都用正常配色 —— 站着的那条腿才是重点，
  // 画成半透明会让人以为它不重要。
  for (i = 0; i < 2; i++) drawFLeg(ctx, G, legs[i], near);
  fShorts(ctx, G, K, near);
  for (i = 0; i < 2; i++) drawFArm(ctx, G, arms[i], near);
  fTrunk(ctx, G, K, near);
  for (i = 0; i < 2; i++) {
    cloth(ctx, G, arms[i].sho, arms[i].elbow, 0.52, 0.50, 0.40, near.shirt, near.shirtL);
  }
  fHead(ctx, G, K, near, C);

  props(ctx, track.props, G, 'front');
}

/* 重心线：从头顶垂下来，落在哪只脚上一目了然。画在人身后，不挡脸。 */
function plumbLine(ctx, G, track, K, ay, opt) {
  var C = G.C, s = G.s;
  {
    var a = G.pt({ x: K.headC.x, y: K.headC.y - SEG.headRy * 1.15 }), b = G.pt({ x: K.headC.x, y: ay + 0.12 });
    ctx.save();
    ctx.setLineDash([s * 0.14, s * 0.13]);
    ctx.strokeStyle = C.focus; ctx.lineWidth = Math.max(1.4, s * 0.045);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(b.x, b.y, s * 0.12, 0, 6.2832);
    ctx.fillStyle = C.focus; ctx.fill();
  }
}

function shift(K, dx, dy) {
  function m(p) { p.x += dx; p.y += dy; }
  m(K.pelvis); m(K.shoulder); m(K.neckTop); m(K.headC);
  for (var i = 0; i < 2; i++) {
    m(K.legs[i].hip); m(K.legs[i].knee); m(K.legs[i].ankle);
    m(K.arms[i].sho); m(K.arms[i].elbow); m(K.arms[i].wrist); m(K.arms[i].hand);
  }
}

function drawFLeg(ctx, G, lg, K) {
  limb(ctx, G, [[lg.hip, lg.knee, 0.60, 0.44], [lg.knee, lg.ankle, 0.44, 0.28]], K.skin, K.line);
  // 正面看到的鞋：脚尖略朝外
  var s = G.s, a = G.pt(lg.ankle);
  var w = s * 0.40, h = s * (0.34 - lg.rise * 0.06), sg = lg.sg;
  ctx.save();
  ctx.translate(a.x + sg * s * 0.03 * G.mir, a.y + s * 0.02);
  ctx.rotate(sg * G.mir * 0.13);
  roundRect(ctx, -w / 2, 0, w, h, s * 0.12);
  ctx.fillStyle = K.shoe; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = K.shoeL; ctx.stroke();
  ctx.restore();
}

function drawFArm(ctx, G, am, K) {
  limb(ctx, G, [[am.sho, am.elbow, 0.40, 0.32], [am.elbow, am.wrist, 0.32, 0.25],
                [am.wrist, am.hand, 0.26, 0.30]], K.skin, K.line);
}

function fShorts(ctx, G, K, N) {
  for (var i = 0; i < 2; i++) {
    cloth(ctx, G, K.legs[i].hip, K.legs[i].knee, 0.46, 0.68, 0.56, N.pants, N.pantsL);
  }
  var p = K.pelvis, w = SEG.hipW + 0.16;
  smooth(ctx, [G.pt({ x: p.x - w, y: p.y - 0.40 }), G.pt({ x: p.x, y: p.y - 0.46 }),
               G.pt({ x: p.x + w, y: p.y - 0.40 }), G.pt({ x: p.x + w * 0.96, y: p.y + 0.26 }),
               G.pt({ x: p.x, y: p.y + 0.20 }), G.pt({ x: p.x - w * 0.96, y: p.y + 0.26 })]);
  ctx.fillStyle = N.pants; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = N.pantsL; ctx.stroke();
}

function fTrunk(ctx, G, K, N) {
  var p = K.pelvis, sh = K.shoulder;
  function L(f, dx) { return G.pt({ x: p.x + (sh.x - p.x) * f + dx, y: p.y + (sh.y - p.y) * f }); }
  smooth(ctx, [
    L(0.00, -0.56), L(0.32, -0.49), L(0.66, -0.64), L(0.97, -0.78),
    L(1.06, -0.62), L(1.09, -0.18), L(1.09, 0.18), L(1.06, 0.62),
    L(0.97, 0.78), L(0.66, 0.64), L(0.32, 0.49), L(0.00, 0.56)
  ]);
  ctx.fillStyle = N.shirt; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = N.shirtL; ctx.stroke();
}

function fHead(ctx, G, K, N, C) {
  var s = G.s;
  limb(ctx, G, [[K.shoulder, K.neckTop, 0.36, 0.33]], N.skin, N.line);
  var hc = G.pt(K.headC), rx = SEG.headRx * s, ry = SEG.headRy * s;
  ctx.save();
  ctx.translate(hc.x, hc.y);
  ctx.rotate(-K.lean * RAD * 0.35 * G.mir);
  ctx.save(); ctx.scale(rx / ry, 1);
  ctx.beginPath(); ctx.arc(0, 0, ry, 0, 6.2832);
  ctx.restore();
  ctx.fillStyle = N.skin; ctx.fill();
  ctx.lineWidth = G.lw; ctx.strokeStyle = N.line; ctx.stroke();
  // 耳
  for (var e = 0; e < 2; e++) {
    var sg = e ? 1 : -1;
    ctx.beginPath(); ctx.arc(sg * rx * 0.96, ry * 0.06, rx * 0.15, 0, 6.2832);
    ctx.fillStyle = N.skin; ctx.fill(); ctx.lineWidth = G.lw * 0.8; ctx.stroke();
  }
  // 头发
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-rx * 1.06, ry * 0.16);
  ctx.quadraticCurveTo(-rx * 1.14, -ry * 1.06, 0, -ry * 1.13);
  ctx.quadraticCurveTo(rx * 1.14, -ry * 1.06, rx * 1.06, ry * 0.16);
  ctx.quadraticCurveTo(rx * 1.00, -ry * 0.30, rx * 0.52, -ry * 0.48);
  ctx.quadraticCurveTo(-rx * 0.30, -ry * 0.66, -rx * 1.00, -ry * 0.30);
  ctx.closePath();
  ctx.fillStyle = N.hair; ctx.fill();
  ctx.restore();
  // 眉、眼、嘴
  ctx.strokeStyle = C.face; ctx.fillStyle = C.face; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, rx * 0.12);
  for (var i = 0; i < 2; i++) {
    var g = i ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(g * rx * 0.18, -ry * 0.20); ctx.lineTo(g * rx * 0.60, -ry * 0.24);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(g * rx * 0.39, ry * 0.02, rx * 0.10, 0, 6.2832); ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-rx * 0.20, ry * 0.46); ctx.quadraticCurveTo(0, ry * 0.58, rx * 0.20, ry * 0.46);
  ctx.lineWidth = Math.max(1, rx * 0.11); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

/* ---------- 手部视图 ----------
 * 前臂 + 手掌 + 五指，按关节角画。视角是桡侧 3/4 —— 拇指朝观察者，
 * 手指的卷曲看得最清楚，同时四指斜排开、不会互相遮死。
 */

function handSolve(p) {
  var wri = clamp(num(p.wri, 0), HLIM.wri) * RAD;
  var curl = clamp(num(p.curl, 0), HLIM.curl);
  var spread = clamp(num(p.spread, 0), HLIM.spread);
  var th = clamp(num(p.thumb, 0), HLIM.thumb);

  var K = { wri: wri, fingers: [], curl: curl };
  // 前臂沿 -x 伸向手肘；手在腕关节处转 wri（+ 背伸，向手背方向翘）
  K.wrist = { x: 0, y: 0 };
  K.elbow = { x: -HAND.fore, y: 0 };
  function hp(u, v) {                       // 手的局部坐标 → 世界（u 沿手指方向，v 朝手掌侧）
    var c = Math.cos(-wri), s2 = Math.sin(-wri);
    return { x: K.wrist.x + u * c - v * s2, y: K.wrist.y + u * s2 + v * c };
  }
  K.hp = hp;
  K.palmTip = hp(HAND.palm, 0);

  for (var i = 0; i < 4; i++) {
    var f = HAND.fing[i];
    // 张开时四指扇开（spread 加大指列间距）；卷曲由同一个 curl 驱动三个关节
    var lat = f.u * (1 + spread * 0.75);
    var mcp = curl >= 0 ? 88 * curl * f.g : 66 * curl;
    var pip = curl > 0 ? 105 * curl * f.g : 0;
    var dip = curl > 0 ? 72 * curl * f.g : 0;
    var sc = Math.pow(FAN.shrink, Math.abs(lat));       // 远的手指略短
    var base = hp(HAND.palm + f.mcp, 0);
    base = { x: base.x + lat * FAN.x, y: base.y + lat * FAN.y };
    var ang = [mcp, mcp + pip, mcp + pip + dip], pts = [base];
    for (var j = 0; j < 3; j++) {
      var d = handDir(ang[j], wri), L = f.L[j] * sc;
      pts.push({ x: pts[j].x + d.x * L, y: pts[j].y + d.y * L });
    }
    K.fingers.push({ pts: pts, w: f.w * sc, lat: lat });
  }

  // 侧视图里拇指掌骨埋在手掌里，只画露出来的两节；不然会长出第五根手指。
  var tb = hp(HAND.palm * 0.54, HAND.palmW * 0.30);
  var b = 16 + 40 * th;                            // 相对手轴，+ 朝掌侧
  var T = [tb], ta = [b, b + 10 + 30 * th];
  var TL = [HAND.thumb.L[1], HAND.thumb.L[2]];
  for (var k = 0; k < 2; k++) {
    var dd = handDir(ta[k], wri);
    T.push({ x: T[k].x + dd.x * TL[k], y: T[k].y + dd.y * TL[k] });
  }
  K.thumb = T;
  return K;
}

/* 手指某一节的方向：局部角 a（0 = 顺着手指伸直，+ 向掌侧卷）叠加腕角 */
function handDir(a, wri) {
  var r = a * RAD - wri;
  return { x: Math.cos(r), y: Math.sin(r) };
}

/* ---- 掌面视图：手指朝上，正对观察者 ----
 * 张开 = 五指散开，握拳 = 手指折过来盖住掌心。这个视角一眼就认得出是不是拳头，
 * 侧视图做不到（四根手指会叠在一起）。
 * 屈曲让手指朝观察者转，投影上就是缩短 + 往下落。
 */
var PALMZ = 0.34;                       // 朝观察者的分量投影到画面上的比例

function palmSolve(p) {
  var curl = clamp(num(p.curl, 0), HLIM.curl);
  var spread = clamp(num(p.spread, 0), HLIM.spread);
  var th = clamp(num(p.thumb, 0), HLIM.thumb);
  var K = { fingers: [] };
  K.wrist = { x: 0, y: 0 };
  K.elbow = { x: 0, y: 1.60 };          // 画面上 y 向下，前臂在下方
  K.palmTop = { x: -0.04, y: -HAND.palm };

  var MCP = [                            // 掌指关节：指列弓
    { x: -0.34, y: -0.97, ab: -10 }, { x: -0.11, y: -1.05, ab: -3 },
    { x: 0.12, y: -1.02, ab: 4 },    { x: 0.33, y: -0.90, ab: 12 }
  ];
  for (var i = 0; i < 4; i++) {
    var f = HAND.fing[i], m = MCP[i];
    var ab = m.ab * (0.32 + 0.68 * spread) * RAD;
    var mcp = curl >= 0 ? 88 * curl * f.g : 66 * curl;
    var pip = curl > 0 ? 105 * curl * f.g : 0;
    var dip = curl > 0 ? 72 * curl * f.g : 0;
    var ang = [mcp, mcp + pip, mcp + pip + dip], pts = [{ x: m.x, y: m.y }];
    for (var j = 0; j < 3; j++) {
      var a = ang[j] * RAD, L = f.L[j];
      pts.push({
        x: pts[j].x + Math.sin(ab) * Math.cos(a) * L,
        y: pts[j].y - Math.cos(ab) * Math.cos(a) * L + Math.sin(a) * L * PALMZ
      });
    }
    K.fingers.push({ pts: pts, w: f.w, curl: mcp });
  }

  // 拇指：从掌根桡侧岔出去；握拳时折过来压在手指外面
  var tb = { x: -HAND.palmW * 0.46, y: -HAND.palm * 0.34 };
  var d0 = -58, d1 = 26;                                  // 相对「朝上」的方向角
  var b = d0 + (d1 - d0) * th;
  var flex = [0, 18 + 26 * th, 10 + 26 * th];
  var T = [tb], acc = b;
  for (var k = 0; k < 3; k++) {
    acc += flex[k];
    var r = acc * RAD, L2 = HAND.thumb.L[k];
    var fz = (k === 0 ? 0 : (0.30 + 0.45 * th));
    T.push({ x: T[k].x + Math.sin(r) * L2, y: T[k].y - Math.cos(r) * L2 * (1 - fz * 0.35) + fz * L2 * 0.30 });
  }
  K.thumb = T;
  return K;
}

function drawPalm(ctx, W, H, track, t, opt, G) {
  var C = G.C, s = G.s;
  var K = palmSolve(sample(track, t));
  var N = { skin: C.skin, line: C.line };
  var pw = HAND.palmW;

  props(ctx, track.props, G, 'back');

  // 伸直的手指在手掌后面（看得到全长），弯下来的手指盖在手掌前面
  var back = [], front = [];
  for (var i = 0; i < 4; i++) (K.fingers[i].curl > 30 ? front : back).push(K.fingers[i]);
  for (i = 0; i < back.length; i++) drawFinger(ctx, G, back[i], N);

  limb(ctx, G, [
    [K.elbow, K.wrist, HAND.foreW0, HAND.wristW],
    [{ x: -0.02, y: -0.06 }, { x: -0.04, y: -HAND.palm * 0.92 }, HAND.wristW, pw],
    [{ x: -pw * 0.24, y: -HAND.palm * 0.20 }, { x: -pw * 0.34, y: -HAND.palm * 0.56 }, pw * 0.56, pw * 0.46]
  ], N.skin, N.line);

  for (i = 0; i < front.length; i++) drawFinger(ctx, G, front[i], N);
  limb(ctx, G, [[K.thumb[0], K.thumb[1], HAND.thumb.w * 1.15, HAND.thumb.w],
                [K.thumb[1], K.thumb[2], HAND.thumb.w, HAND.thumb.w * 0.9],
                [K.thumb[2], K.thumb[3], HAND.thumb.w * 0.9, HAND.thumb.w * 0.82]], N.skin, N.line);

  var cf = { x: K.elbow.x, y: K.elbow.y - (K.elbow.y - K.wrist.y) * 0.30 };
  cloth(ctx, G, K.elbow, cf, 1.0, HAND.foreW0 * 1.16, HAND.foreW0 * 1.04, C.shirt, C.shirtL);
  props(ctx, track.props, G, 'front');

  if (track.focus && (!opt.layers || opt.layers.highlight !== false)) {
    var pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
    var g = G.pt(K.fingers[1].pts[1]);
    ctx.beginPath(); ctx.arc(g.x, g.y, s * (0.48 + 0.12 * pulse), 0, 6.2832);
    ctx.strokeStyle = C.focus; ctx.lineWidth = s * 0.08;
    ctx.globalAlpha = 0.26 + 0.34 * (1 - pulse); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function drawHand(ctx, W, H, track, t, opt, G) {
  if (track.handView === 'palm') return drawPalm(ctx, W, H, track, t, opt, G);
  var C = G.C, s = G.s, pt = G.pt;
  var K = handSolve(sample(track, t));
  var N = { skin: C.skin, line: C.line };
  var F = { skin: C.skinF, line: C.lineF };

  props(ctx, track.props, G, 'back');

  // 小指侧先画（离观察者远），食指和拇指最后 —— 前后关系才对
  for (var i = 3; i >= 2; i--) drawFinger(ctx, G, K.fingers[i], F);

  // 前臂 + 手掌：一条路径，先描边再填并集
  var pw = HAND.palmW;
  limb(ctx, G, [
    [K.elbow, K.wrist, HAND.foreW0, HAND.foreW1],
    [K.hp(-0.04, 0), K.hp(HAND.palm * 0.92, -0.06), HAND.wristW, pw * 0.90],
    // 大鱼际：拇指根部那一坨，手掌才有厚度
    [K.hp(HAND.palm * 0.14, pw * 0.22), K.hp(HAND.palm * 0.46, pw * 0.30), pw * 0.60, pw * 0.50]
  ], N.skin, N.line);

  for (var j = 1; j >= 0; j--) drawFinger(ctx, G, K.fingers[j], N);
  // 拇指（只有露出手掌的两节）
  limb(ctx, G, [[K.thumb[0], K.thumb[1], HAND.thumb.w * 1.05, HAND.thumb.w * 0.94],
                [K.thumb[1], K.thumb[2], HAND.thumb.w * 0.94, HAND.thumb.w * 0.86]],
       N.skin, N.line);

  // 袖口
  var cf = { x: K.elbow.x + (K.wrist.x - K.elbow.x) * 0.30, y: K.elbow.y };
  cloth(ctx, G, K.elbow, cf, 1.0, HAND.foreW0 * 1.14, HAND.foreW0 * 1.02, C.shirt, C.shirtL);

  props(ctx, track.props, G, 'front');

  // 目标关节高亮
  if (track.focus && (!opt.layers || opt.layers.highlight !== false)) {
    var pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
    var spot = track.focus[0] === 'wrist' ? K.wrist : K.fingers[1].pts[1];
    var g = pt(spot);
    ctx.beginPath(); ctx.arc(g.x, g.y, s * (0.52 + 0.12 * pulse), 0, 6.2832);
    ctx.strokeStyle = C.focus; ctx.lineWidth = s * 0.085;
    ctx.globalAlpha = 0.26 + 0.34 * (1 - pulse); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function drawFinger(ctx, G, f, K) {
  limb(ctx, G, [[f.pts[0], f.pts[1], f.w * 1.06, f.w],
                [f.pts[1], f.pts[2], f.w, f.w * 0.92],
                [f.pts[2], f.pts[3], f.w * 0.92, f.w * 0.86]], K.skin, K.line);
}

/* ---------- 公共层 ---------- */

function trailPath(track) {
  if (track._trail) return track._trail;
  var out = [];
  for (var i = 0; i <= 40; i++) {
    var P = place(solve(sample(track, i / 40)), track);
    out.push(P[track.trail]);
  }
  track._trail = out;
  return out;
}

function shadow(ctx, G, pts) {
  var s = G.s, C = G.C, i;
  var lo = -1e9, x0 = 1e9, x1 = -1e9;
  for (i = 0; i < pts.length; i++) {
    if (pts[i].y > lo) lo = pts[i].y;
    if (pts[i].x < x0) x0 = pts[i].x;
    if (pts[i].x > x1) x1 = pts[i].x;
  }
  var c = G.pt({ x: (x0 + x1) / 2, y: lo });
  var w = Math.max((x1 - x0) * 0.62 + 0.55, 0.8) * s;
  ctx.save();
  ctx.translate(c.x, c.y + s * 0.04);
  ctx.scale(1, 0.17);
  ctx.beginPath(); ctx.arc(0, 0, w, 0, 6.2832);
  ctx.fillStyle = C.shadow; ctx.fill();
  ctx.restore();
}

function focusRing(ctx, G, track, P, t, opt) {
  if (!track.focus || (opt.layers && opt.layers.highlight === false)) return;
  var s = G.s, C = G.C;
  var pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
  for (var f = 0; f < track.focus.length; f++) {
    var jp = P[track.focus[f]]; if (!jp) continue;
    var g = G.pt(jp);
    ctx.beginPath(); ctx.arc(g.x, g.y, s * (0.42 + 0.10 * pulse), 0, 6.2832);
    ctx.strokeStyle = C.focus; ctx.lineWidth = s * 0.07;
    ctx.globalAlpha = 0.26 + 0.34 * (1 - pulse);
    ctx.stroke(); ctx.globalAlpha = 1;
  }
}

/* ---------- 道具：床、椅子、地面、扶手、目标物 ---------- */

function props(ctx, list, G, layer) {
  if (!list) return;
  var s = G.s, C = G.C, X = G.X, Y = G.Y;
  for (var i = 0; i < list.length; i++) {
    var o = list[i];
    if ((o.layer || 'back') !== layer) continue;
    ctx.save();
    if (o.k === 'floor') {
      ctx.fillStyle = C.floorSoft;
      ctx.fillRect(-2000, Y(0), 4000, s * 1.6);
      ctx.fillStyle = C.floor;
      ctx.fillRect(-2000, Y(0), 4000, Math.max(2, s * 0.09));
    } else if (o.k === 'bed') {
      var by = Y(o.y || 0), x0 = X(o.x0), x1 = X(o.x1);
      ctx.fillStyle = C.prop;
      roundRect(ctx, Math.min(x0, x1), by, Math.abs(x1 - x0), s * 0.78, s * 0.12); ctx.fill();
      ctx.fillStyle = C.propL;
      ctx.fillRect(Math.min(x0, x1), by, Math.abs(x1 - x0), Math.max(1.5, s * 0.05));
    } else if (o.k === 'chair') {
      var xa = Math.min(X(o.x0), X(o.x1)), wid = Math.abs(X(o.x1) - X(o.x0));
      var st = Y(o.seat), gy = Y(0);
      ctx.fillStyle = C.prop;
      if (o.back) {                                  // 靠背在人后面
        var bx = (G.mir > 0) ? xa : xa + wid - s * 0.20;
        roundRect(ctx, bx, Y(o.seat - 1.55), s * 0.20, s * 1.55, s * 0.07); ctx.fill();
      }
      roundRect(ctx, xa, st, wid, s * 0.22, s * 0.08); ctx.fill();
      roundRect(ctx, xa + s * 0.06, st + s * 0.20, s * 0.17, gy - st - s * 0.20, s * 0.05); ctx.fill();
      roundRect(ctx, xa + wid - s * 0.23, st + s * 0.20, s * 0.17, gy - st - s * 0.20, s * 0.05); ctx.fill();
    } else if (o.k === 'rail') {
      ctx.fillStyle = C.prop;
      roundRect(ctx, X(o.x) - s * 0.09, Y(o.y), s * 0.18, (0 - o.y) * s, s * 0.06); ctx.fill();
      roundRect(ctx, X(o.x) - s * 0.62, Y(o.y) - s * 0.09, s * 1.24, s * 0.18, s * 0.09); ctx.fill();
    } else if (o.k === 'target') {                   // 杯子
      ctx.fillStyle = C.accentSoft; ctx.strokeStyle = C.accent;
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(X(o.x) - s * 0.20, Y(o.y) - s * 0.24);
      ctx.lineTo(X(o.x) + s * 0.20, Y(o.y) - s * 0.24);
      ctx.lineTo(X(o.x) + s * 0.15, Y(o.y) + s * 0.24);
      ctx.lineTo(X(o.x) - s * 0.15, Y(o.y) + s * 0.24);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (o.k === 'table') {
      ctx.fillStyle = C.prop;
      roundRect(ctx, X(o.x0), Y(o.y), (o.x1 - o.x0) * s, s * 0.16, s * 0.06); ctx.fill();
      roundRect(ctx, X(o.x1) - s * 0.28, Y(o.y), s * 0.16, (0 - o.y) * s, s * 0.05); ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- 配色 ---------- */

var THEME = {
  light: {
    skin: '#F0C6A2', line: '#BC8657', skinF: '#D6AB88', lineF: '#A87A50',
    shirt: '#2F9C82', shirtL: '#0E6B58', shirtF: '#237E6A', shirtLF: '#0A5446',
    pants: '#40606E', pantsL: '#27424E', pantsF: '#334E5A', pantsLF: '#1D333D',
    shoe: '#33454C', shoeL: '#1F2C31', shoeF: '#293840', shoeLF: '#162126',
    hair: '#332F2A', hairF: '#282521', face: '#7A5638',
    floor: '#B7C7BF', floorSoft: 'rgba(146,170,160,0.20)',
    prop: '#CBD8D1', propL: '#A9BAB2',
    shadow: 'rgba(38,70,58,0.13)',
    focus: '#B96F14', accent: '#0E6B58', accentSoft: '#DCEBE5',
    trail: 'rgba(185,111,20,0.55)'
  },
  dark: {
    skin: '#C8926B', line: '#6E4A2C', skinF: '#8A6750', lineF: '#5A4335',
    shirt: '#1F7B66', shirtL: '#0C5545', shirtF: '#3D5D57', shirtLF: '#2A4740',
    pants: '#31474F', pantsL: '#1E2F36', pantsF: '#3A4A50', pantsLF: '#2A383D',
    shoe: '#28353A', shoeL: '#161F22', shoeF: '#39474C', shoeLF: '#28343A',
    hair: '#1A1A18', hairF: '#3A3833', face: '#4A342A',
    floor: '#46534E', floorSoft: 'rgba(120,140,135,0.14)',
    prop: '#414D48', propL: '#5A6963',
    shadow: 'rgba(0,0,0,0.26)',
    focus: '#E8A33A', accent: '#4FBFA2', accentSoft: '#1E3B34',
    trail: 'rgba(232,163,58,0.55)'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { draw: draw, sample: sample, solve: solve, place: place,
                     fPlace: fPlace, handSolve: handSolve, palmSolve: palmSolve, world: world,
                     SEG: SEG, LIM: LIM, HAND: HAND, HLIM: HLIM, THEME: THEME };
}
