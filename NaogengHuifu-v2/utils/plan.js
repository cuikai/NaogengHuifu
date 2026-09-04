/**
 * 今日训练的组装与升降级。
 *
 * 措辞注意：对外一律叫「今天适合练的」「按你勾的情况筛出来的」，
 * 不用「处方」「方案」。见 docs/合规边界.md。
 *
 * 改动记录（v2.1）：
 *   · 双轴配额 —— 原来 5 个格子按 ORDER 先到先得，一个「能走路但手不能用」
 *     的人（M5/H1）会拿到 4 个腿的动作、手的动作被挤掉。这正是双轴分层
 *     要解决的那个场景，反而没兑现。现在按「哪根轴落后」分配格子。
 *   · 急性期（发病 2 周内）屏蔽跌倒风险最高的几个动作。
 *   · 升降级的连续计数改成按天去重 —— 同一天点两次「很轻松」不该算两次。
 */
const lib = require('./library.js');
const A = require('./assess.js');
const FLAG_RULE = A.FLAG_RULE;

/* 一次训练里「先做谁」—— 先热身循环，再核心与下肢，再平衡步行，最后上肢与转移收尾 */
const ORDER = ['循环', '核心', '下肢', '平衡', '步行', '上肢', '手', '转移'];

/* 格子不够时「留下谁」—— 和上面的先后顺序是两回事。
 * 一个已经能走的人，步行训练比再做一组单腿站立值钱得多；
 * 原来两件事共用 ORDER，结果步行永远排在最后、永远第一个被砍掉。 */
const KEEP = ['转移', '步行', '平衡', '下肢', '核心', '循环', '上肢', '手'];
/* 还在床上、刚能坐的人是另一回事：他一天里几乎不动，踝泵（防下肢血栓）
 * 比多做一组平衡更该留在格子里。所以低分层单独把「循环」提前。 */
const KEEP_LOW = ['循环', '核心', '下肢', '转移', '平衡', '步行', '上肢', '手'];
function ranker(level) {
  const K = (level && level.m <= 2) ? KEEP_LOW : KEEP;
  return function (x) { const i = K.indexOf(x.group); return i < 0 ? K.length : i; };
}

/* 哪些类别属于「上肢手功能」这根轴 */
const H_GROUP = { '上肢': 1, '手': 1 };
function axisOf(x) { return H_GROUP[x.group] ? 'h' : 'm'; }

const SLOTS = 5;

/**
 * @param level {m, h}
 * @param flags 安全标记下标数组
 * @param opt   { acute: 发病 2 周内 }
 * @returns 今天的动作列表（4~5 个，约 20 分钟）
 */
function build(level, flags, opt) {
  opt = opt || {};
  const blocked = {};
  (flags || []).forEach(function (f) {
    const r = FLAG_RULE[f];
    if (r) (r.block || []).forEach(function (id) { blocked[id] = 1; });
  });
  if (opt.acute) A.ACUTE_BLOCK.forEach(function (id) { blocked[id] = 1; });

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
  const keepRank = ranker(level);
  pick.sort(function (a, b) {
    if (!!a.hero !== !!b.hero) return a.hero ? -1 : 1;
    const g = keepRank(a) - keepRank(b);
    if (g !== 0) return g;
    return entry(b) - entry(a);
  });

  // 每个类别只留一个 —— 保证一天里不同部位都摸到，
  // 而不是被平衡类动作占满五个格子。
  const seen = {}, byAxis = { m: [], h: [] };
  pick.forEach(function (x) {
    if (seen[x.group]) return;
    seen[x.group] = 1;
    byAxis[axisOf(x)].push(x);
  });

  // ── 双轴配额 ──
  // 落后的那根轴至少拿 2 个格子。上下肢恢复常常不同步：能自己走路、
  // 患手还握不住杯子的人，格子应该多分给手，而不是继续堆腿的动作。
  let hQuota = 2;
  if (level.h - level.m >= 2) hQuota = 1;      // 手比腿好得多 → 重心回到腿
  if (level.m - level.h >= 2) hQuota = 3;      // 腿比手好得多 → 重心给手
  hQuota = Math.min(hQuota, byAxis.h.length);
  const mQuota = Math.min(SLOTS - hQuota, byAxis.m.length);

  const out = byAxis.m.slice(0, mQuota).concat(byAxis.h.slice(0, hQuota));

  // 配额没占满就互相补位，最后从同类别的剩余动作里补到至少 4 个
  const rest = byAxis.m.slice(mQuota).concat(byAxis.h.slice(hQuota));
  for (let i = 0; i < rest.length && out.length < SLOTS; i++) out.push(rest[i]);
  // 还不够 4 个才允许同一类别出现第二个动作（内容本来就不多的分层会走到这里）
  for (let i = 0; i < pick.length && out.length < 4; i++) {
    if (out.indexOf(pick[i]) < 0) out.push(pick[i]);
  }

  // 输出仍按训练顺序排（hero 优先），配额只决定「选谁」，不决定「先做谁」
  out.sort(function (a, b) {
    if (!!a.hero !== !!b.hero) return a.hero ? -1 : 1;
    return ORDER.indexOf(a.group) - ORDER.indexOf(b.group);
  });
  return out;
}

/**
 * 反馈驱动的升降级。
 * f: 0 很轻松 / 1 有点吃力 / 2 做不到或疼
 * @param today 今天的日期字符串，用来给连续计数去重
 * 返回 { step, sets, msg, seeDoctor }
 */
function applyFeedback(state, id, f, today) {
  if (!state.step) state.step = {};
  if (!state.sets) state.sets = {};
  if (!state.easy) state.easy = {};
  if (!state.painDays) state.painDays = {};
  if (!state.fbDate) state.fbDate = {};

  const steps = lib.ladder(id);
  let step = state.step[id] || 0;
  let sets = state.sets[id] || lib.baseSets(id);
  let msg, seeDoctor = false;

  // 同一天改主意（先点了「吃力」又改成「很轻松」）不该算成两天。
  // 连续计数一天只走一次；改评价只改当天的量，不再叠加天数。
  const counted = today && state.fbDate[id] === today;

  if (f === 0) {
    if (!counted) state.easy[id] = (state.easy[id] || 0) + 1;
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
    if (!counted) state.painDays[id] = (state.painDays[id] || 0) + 1;
    if (sets > 1) { sets -= 1; msg = '明天减到 ' + sets + ' 组。'; }
    else if (step > 0) { step -= 1; sets = lib.baseSets(id); msg = '明天退一档：' + steps[step] + '。'; }
    else { msg = '明天先跳过这个动作，过两天再试。'; }
    if (state.painDays[id] >= 3) {
      seeDoctor = true;
      msg += '连着三天做不了或者疼了 —— 去医院看一下，不要自己扛。';
    }
  }

  if (today) state.fbDate[id] = today;
  state.step[id] = step;
  state.sets[id] = sets;
  return { step: step, sets: sets, msg: msg, seeDoctor: seeDoctor, stepLabel: steps[step] };
}

module.exports = { build: build, applyFeedback: applyFeedback, ORDER: ORDER, SLOTS: SLOTS };
