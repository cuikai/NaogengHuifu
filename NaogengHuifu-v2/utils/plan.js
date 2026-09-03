/**
 * 今日训练的组装与升降级。
 *
 * 措辞注意：对外一律叫「今天适合练的」「按你勾的情况筛出来的」，
 * 不用「处方」「方案」。见 docs/合规边界.md。
 */
const lib = require('./library.js');
const { FLAG_RULE } = require('./assess.js');

/* 一次训练的排列顺序：先热身循环，再核心与下肢，再平衡步行，最后上肢与转移收尾 */
const ORDER = ['循环', '核心', '下肢', '平衡', '步行', '上肢', '手', '转移'];

/**
 * @param level {m, h}
 * @param flags 安全标记下标数组
 * @returns 今天的动作列表（4~5 个，约 20 分钟）
 */
function build(level, flags) {
  const blocked = {};
  (flags || []).forEach(function (f) {
    const r = FLAG_RULE[f];
    if (r) (r.block || []).forEach(function (id) { blocked[id] = 1; });
  });

  const pick = lib.list.filter(function (x) {
    if (blocked[x.id]) return false;
    const okM = !x.m || x.m.indexOf(level.m) >= 0;
    const okH = !x.h || x.h.indexOf(level.h) >= 0;
    // 只标了 m 的按移动层筛；只标了 h 的按手功能层筛；两个都标的要同时满足
    if (x.m && x.h) return okM && okH;
    if (x.m) return okM;
    return okH;
  });

  // 同一类别里挑「他够得着的最靠上的那一个」——
  // 能站的人做站立重心转移，而不是还在做坐位够物。
  function entry(x) {
    const a = x.m ? Math.min.apply(null, x.m) : 0;
    const b = x.h ? Math.min.apply(null, x.h) : 0;
    return Math.max(a, b);
  }
  pick.sort(function (a, b) {
    if (!!a.hero !== !!b.hero) return a.hero ? -1 : 1;
    const g = ORDER.indexOf(a.group) - ORDER.indexOf(b.group);
    if (g !== 0) return g;
    return entry(b) - entry(a);
  });

  // 每个类别先各取一个 —— 保证一天里下肢、平衡、上肢都摸到，
  // 而不是被平衡类动作占满五个格子。
  const taken = {}, out = [];
  pick.forEach(function (x) {
    if (out.length >= 5) return;
    if (taken[x.group]) return;
    taken[x.group] = 1;
    out.push(x);
  });
  // 还没满 4 个就从剩下的补
  for (let i = 0; i < pick.length && out.length < 4; i++) {
    if (out.indexOf(pick[i]) < 0) out.push(pick[i]);
  }
  return out;
}

/**
 * 反馈驱动的升降级。
 * f: 0 很轻松 / 1 有点吃力 / 2 做不到或疼
 * 返回 { step, sets, msg, seeDoctor }
 */
function applyFeedback(state, id, f) {
  if (!state.step) state.step = {};
  if (!state.sets) state.sets = {};
  if (!state.easy) state.easy = {};
  if (!state.painDays) state.painDays = {};

  const steps = lib.ladder(id);
  let step = state.step[id] || 0;
  let sets = state.sets[id] || lib.baseSets(id);
  let msg, seeDoctor = false;

  if (f === 0) {
    state.easy[id] = (state.easy[id] || 0) + 1;
    state.painDays[id] = 0;
    if (state.easy[id] >= 2) {
      state.easy[id] = 0;
      if (sets < lib.baseSets(id) + 2) {
        sets += 1;
        msg = '明天加到 ' + sets + ' 组。';
      } else if (step < steps.length - 1) {
        step += 1; sets = lib.baseSets(id);
        msg = '明天升一档：' + steps[step] + '。';
      } else {
        msg = '已经是这个动作的最高一档了，保持住。';
      }
    } else {
      msg = '再轻松一次就给你加量。';
    }
  } else if (f === 1) {
    state.easy[id] = 0;
    state.painDays[id] = 0;
    msg = '这个强度是对的，明天保持一样的量。';
  } else {
    state.easy[id] = 0;
    state.painDays[id] = (state.painDays[id] || 0) + 1;
    if (sets > 1) { sets -= 1; msg = '明天减到 ' + sets + ' 组。'; }
    else if (step > 0) { step -= 1; sets = lib.baseSets(id); msg = '明天退一档：' + steps[step] + '。'; }
    else { msg = '明天先跳过这个动作，过两天再试。'; }
    if (state.painDays[id] >= 3) {
      seeDoctor = true;
      msg += '连着三天做不了或者疼了 —— 去医院看一下，不要自己扛。';
    }
  }

  state.step[id] = step;
  state.sets[id] = sets;
  return { step: step, sets: sets, msg: msg, seeDoctor: seeDoctor, stepLabel: steps[step] };
}

module.exports = { build: build, applyFeedback: applyFeedback, ORDER: ORDER };
