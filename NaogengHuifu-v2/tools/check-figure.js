/* ===========================================================================
 * check-figure.js —— 动作数据体检
 *
 *   node tools/check-figure.js          只报问题
 *   node tools/check-figure.js --table  连每个动作的关节角度表一起打出来（给治疗师复核）
 *
 * 检查项：
 *   1. 关节角是否超出生理活动度（超了会被渲染器夹住，说明数据写错了）
 *   2. 支撑面：脚/身体有没有陷进地面（床面），有没有整个人悬空
 *   3. 手有没有穿过椅面、扶手位置对不对（动作里用 touch 声明）
 *   4. phases 阶段条是否递增并覆盖 0～1
 *   5. 该平踩的脚是不是真的平踩在支撑面上
 * =========================================================================== */

var fig = require('../utils/figure.js');
var LIB = require('../utils/poses.js');

var LIM = fig.LIM, SEG = fig.SEG, HLIM = fig.HLIM;
var TABLE = process.argv.indexOf('--table') >= 0;
var N = 24;                      // 每个动作抽 24 帧
var TOL = 0.06;                  // 允许的误差（头高）≈ 1.4cm
var problems = [];

function bad(id, msg) { problems.push(id + '：' + msg); }

/* 逐个角度检查是否被夹过 —— 夹过 = 原始数据超出了生理范围 */
function limitCheck(id, t, p) {
  var pairs = [['neck', 'neck'], ['hip', 'hip'], ['knee', 'knee'], ['ankle', 'ankle'],
               ['sho', 'sho'], ['elb', 'elb'], ['wri', 'wri'],
               ['hipF', 'hip'], ['kneeF', 'knee'], ['ankleF', 'ankle'],
               ['shoF', 'sho'], ['elbF', 'elb'], ['wriF', 'wri'],
               ['hipL', 'hip'], ['hipR', 'hip'], ['kneeL', 'knee'], ['kneeR', 'knee'],
               ['shoL', 'sho'], ['shoR', 'sho'], ['elbL', 'elb'], ['elbR', 'elb'],
               ['abdL', 'abd'], ['abdR', 'abd'], ['armAbdL', 'abd'], ['armAbdR', 'abd']];
  for (var i = 0; i < pairs.length; i++) {
    var k = pairs[i][0], r = LIM[pairs[i][1]], v = p[k];
    if (v == null) continue;
    // flat 会自动反推踝角，反推结果被夹住才算问题，这里只查作者手写的值
    if ((k === 'ankle' && p.flat) || (k === 'ankleF' && p.flatF)) continue;
    if (v < r[0] - 0.5 || v > r[1] + 0.5) {
      bad(id, 't=' + t.toFixed(2) + ' ' + k + '=' + v.toFixed(1) + '° 超出生理范围 [' + r[0] + ',' + r[1] + ']');
    }
  }
}

/* 支撑面：地面 y=0；床面 y=0；椅面 = props 里的 seat */
function surfaceOf(m) {
  var y = null;
  (m.props || []).forEach(function (o) {
    if (o.k === 'floor') y = 0;
    if (o.k === 'bed') y = o.y || 0;
  });
  return y;
}

function seatOf(m) {
  var s = null;
  (m.props || []).forEach(function (o) { if (o.k === 'chair') s = o; });
  return s;
}
function railOf(m) {
  var r = null;
  (m.props || []).forEach(function (o) { if (o.k === 'rail') r = o; });
  return r;
}

LIB.forEach(function (m) {
  if (m.gif) return;                                   // 还在用图的动作（现在没有了）

  /* --- phases --- */
  var ph = m.phases || [], prev = 0;
  for (var i = 0; i < ph.length; i++) {
    if (!(ph[i].to > prev)) bad(m.id, 'phases 第 ' + (i + 1) + ' 段的 to 没有递增');
    prev = ph[i].to;
  }
  if (ph.length && Math.abs(prev - 1) > 1e-6) bad(m.id, 'phases 最后一段没有停在 1.0');

  var tracks = [{ tag: '', tr: m }];
  if (m.compare) tracks.push({ tag: '（代偿）', tr: mix(m, m.compare) });

  tracks.forEach(function (T) {
    var id = m.id + T.tag, tr = T.tr;
    var surf = surfaceOf(m), seat = seatOf(m), rail = railOf(m);
    var rows = [], everLow = false;

    for (var s = 0; s < N; s++) {
      var t = s / N;
      var p = fig.sample(tr, t);
      limitCheck(id, t, p);

      if (m.handView) {                                 // ---- 手部特写 ----
        var hk = [['wri', 'wri'], ['curl', 'curl'], ['spread', 'spread'], ['thumb', 'thumb']];
        for (var q = 0; q < hk.length; q++) {
          var hv = p[hk[q][0]], hr = HLIM[hk[q][1]];
          if (hv == null) continue;
          if (hv < hr[0] - 1e-6 || hv > hr[1] + 1e-6) {
            bad(id, 't=' + t.toFixed(2) + ' ' + hk[q][0] + '=' + hv.toFixed(2) + ' 超出范围 [' + hr[0] + ',' + hr[1] + ']');
          }
        }
        var K = m.handView === 'palm' ? fig.palmSolve(p) : fig.handSolve(p);
        // 指尖不能穿到手掌背面去：完全握拳时指尖应落在掌心里，不是掌根以外
        if (m.handView === 'palm' && (p.curl || 0) > 0.9) {
          for (var fi = 0; fi < K.fingers.length; fi++) {
            var tip = K.fingers[fi].pts[3];
            if (tip.y > 0.1) bad(id, 't=' + t.toFixed(2) + ' 握拳时第 ' + (fi + 1) + ' 指的指尖伸到手腕以下了');
          }
        }
        continue;
      }

      if (m.front) {                                    // ---- 正视图 ----
        var K = fig.fPlace(tr, t);
        var lift = [K.legs[0].sole - K.ay, K.legs[1].sole - K.ay];
        // 声明「两脚都不离地」的动作（比如重心转移：脚不要挪动），抬脚就是错的
        if (tr.bothFeetDown && Math.min(lift[0], lift[1]) < -TOL) {
          bad(id, 't=' + t.toFixed(2) + ' 这个动作两只脚都该踩在地上，却抬起来了 ' +
              (-Math.min(lift[0], lift[1])).toFixed(2));
        }
        if (rail && tr.touchRail) {
          var dr = 9;
          K.arms.forEach(function (a) { dr = Math.min(dr, Math.hypot(a.hand.x - rail.x, a.hand.y - rail.y)); });
          if (dr > 0.45) bad(id, 't=' + t.toFixed(2) + ' 手离扶手 ' + dr.toFixed(2) + ' 个头高，没扶上');
        }
        // 单腿支撑时，重心线（头顶垂线）要落在站立脚上，否则这个姿势站不住
        var up = lift[0] > 0.25 ? 0 : (lift[1] > 0.25 ? 1 : -1);
        if (up >= 0) {
          var st = K.legs[1 - up];
          if (Math.abs(K.headC.x - st.ankle.x) > 0.55) {
            bad(id, 't=' + t.toFixed(2) + ' 单腿站立时重心线离支撑脚 ' +
                Math.abs(K.headC.x - st.ankle.x).toFixed(2) + ' 个头高，人会倒');
          }
        }
        continue;
      }

      var P = fig.place(fig.solve(p), tr);
      var w = P.ang;

      if (surf != null) {
        var low = Math.max(P.heel.y, P.tip.y, P.heelF.y, P.tipF.y);
        if (low > surf + TOL) bad(id, 't=' + t.toFixed(2) + ' 脚陷进支撑面 ' + (low - surf).toFixed(2));
        if (low < surf - TOL - 0.02 && !isAir(m, t)) everLow = true;
        // 手不能穿到地面以下
        var hy = Math.max(P.hand.y, P.handF.y);
        if (hy > surf + 0.02) bad(id, 't=' + t.toFixed(2) + ' 手穿到支撑面以下了');
      }
      // 坐着的时候手不能低于椅面（撑到地上去）
      // 屁股不能陷进椅面；而只要还坐在座位高度上，就必须真的坐在椅面范围内
      if (seat) {
        var sit = seat.seat - P.pelvis.y;
        if (sit < 0.20) bad(id, 't=' + t.toFixed(2) + ' 骨盆陷进椅面（离椅面只有 ' + sit.toFixed(2) + '）');
        if (sit < 0.46 && (P.pelvis.x < seat.x0 + 0.15 || P.pelvis.x > seat.x1 - 0.05)) {
          bad(id, 't=' + t.toFixed(2) + ' 还在座位高度，屁股却不在椅面上（x=' + P.pelvis.x.toFixed(2) + '）');
        }
      }
      if (seat && P.pelvis.y > seat.seat - 0.55) {       // 还坐着
        var hlow = Math.max(P.hand.y, P.handF.y);
        if (tr.handsOnSeat) {                            // 声明「手撑椅面」：必须真的落在椅面上
          if (Math.abs(hlow - seat.seat) > 0.18) {
            bad(id, 't=' + t.toFixed(2) + ' 说是手撑椅面，手却离椅面 ' + (hlow - seat.seat).toFixed(2));
          }
        } else if (hlow > seat.seat + 0.12) {
          bad(id, 't=' + t.toFixed(2) + ' 坐姿时手掉到椅面以下 ' +
              (hlow - seat.seat).toFixed(2) + '（手快撑到地上了）');
        }
      }
      // 声明了扶手的动作：手要落在横杆上
      if (rail && tr.touchRail) {
        var d = Math.sqrt(Math.pow(P.hand.x - rail.x, 2) + Math.pow(P.hand.y - rail.y, 2));
        if (d > 0.55) bad(id, 't=' + t.toFixed(2) + ' 手离扶手 ' + d.toFixed(2) + ' 个头高，没扶上');
      }
      // 平踩的脚，脚掌必须和支撑面平行
      if (p.flat >= 0.99 && Math.abs(((w.foot % 360) + 360) % 360 - 90) > 2) {
        bad(id, 't=' + t.toFixed(2) + ' 标了 flat 但脚掌没放平（' + w.foot.toFixed(0) + '°）—— 关节角度不允许，说明姿势本身不可能');
      }
      rows.push([t.toFixed(2), f(p.trunk), f(p.hip), f(p.knee), f(w.foot - w.shank - 90),
                 f(p.sho), f(p.elb), (P.heel.y).toFixed(2), (P.pelvis.y).toFixed(2)]);
    }

    if (everLow && surf != null) bad(id, '整个人悬空在支撑面上方');

    if (TABLE && rows.length) {
      console.log('\n■ ' + m.name + ' ' + id);
      console.log('   t     躯干   屈髋   屈膝    踝   肩屈   屈肘  脚跟y  骨盆y');
      rows.forEach(function (r) { console.log('  ' + r.map(pad).join(' ')); });
    }
  });
});

function isAir(m, t) { return false; }
function mix(m, cmp) {                       // 代偿轨：换一组关键帧，并带上它自己的声明
  var o = {}, k;
  for (k in m) o[k] = m[k];
  for (k in cmp) { if (k !== 'keyframes' && k !== 'label' && k !== 'why') o[k] = cmp[k]; }
  o.keyframes = cmp.keyframes; o._trail = null;
  return o;
}
function f(v) { return v == null ? '  -' : v.toFixed(0); }
function pad(v) { return ('     ' + v).slice(-6); }

if (problems.length) {
  console.log('\n发现 ' + problems.length + ' 处问题：');
  problems.forEach(function (p) { console.log('  ✗ ' + p); });
  process.exit(1);
} else {
  console.log('\n✓ ' + LIB.filter(function (m) { return !m.gif; }).length +
    ' 个动作全部通过：关节角在生理范围内，脚站在支撑面上，手没有撑到地上。');
}
