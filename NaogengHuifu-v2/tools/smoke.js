/**
 * 端到端冒烟测试 —— 不依赖微信运行时。
 * 用一个内存版的 wx.storage 把 store 跑一遍：快筛 → 出计划 → 打卡 → 反馈 →
 * 升降级 → 跨天 → 每周复评。
 *
 *   node tools/smoke.js
 */
let mem = {};
global.wx = {
  getStorageSync: (k) => mem[k],
  setStorageSync: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); },
  vibrateShort: () => {}
};

const store = require('../utils/store.js');
const A = require('../utils/assess.js');
const lib = require('../utils/library.js');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + msg); } }
function head(t) { console.log('\n── ' + t + ' ──'); }

/* 1. 未做快筛 */
head('冷启动');
store.load();
ok(store.todayPlan().length === 0, '没做快筛不该有训练内容');
ok(store.adlList().length > 0, '照护清单任何时候都该有');

/* 2. 快筛：能走路但患手不能用（双轴不同步，v2.1 修的就是这个） */
head('M5 / H1 —— 能自己走，患手还动不了');
store.saveAssessment({ phase: 3, situp: 3, sit: 3, stand: 3, walk: 4, stair: 3, hand: 0, flags: [] });
let S = store.state();
ok(S.level.m === 5 && S.level.h === 1, '分层应为 M5/H1，实为 M' + S.level.m + '/H' + S.level.h);
let plan = store.todayPlan();
const groups = plan.map((m) => m.group);
ok(groups.indexOf('上肢') >= 0, '必须给到上肢内容');
ok(groups.indexOf('手') >= 0, '必须给到手的内容 —— 这正是原来被腿挤掉的');
ok(plan.length >= 4 && plan.length <= 5, '每天 4~5 个动作，实为 ' + plan.length);

/* 3. 打卡 + 反馈驱动的升降级 */
head('打卡与升降级');
const id = plan[0].id;
const target = store.setsTarget(id);
for (let i = 0; i < target; i++) store.moveBump(id);
ok(store.moveGet(id) === target, '组数应记满');
ok(store.moveDone(id), '记满应算完成');

const before = store.setsTarget(id);
store.feedback(id, 0);
store.feedback(id, 0);   // 同一天点两次「很轻松」
ok(store.setsTarget(id) === before, '同一天点两次不该连加两次量');

/* 4. 「做不到或疼」三天 → 提示就医（按天去重） */
head('连续三天做不了 → 提示就医');
const S2 = store.state();
S2.painDays = {}; S2.fbDate = {}; S2.easy = {};
let r;
for (let d = 1; d <= 3; d++) {
  S2.fbDate[id] = '2026-01-0' + d;              // 假装换了一天
  r = require('../utils/plan.js').applyFeedback(S2, id, 2, '2026-01-0' + (d + 1));
}
ok(r.seeDoctor, '连着三天应触发就医提示');

/* 5. 答案互相矛盾 —— 不该越级 */
head('答案矛盾时的封顶');
store.saveAssessment({ phase: 3, situp: 3, sit: 3, stand: 0, walk: 2, stair: 3, hand: 2, flags: [] });
ok(store.state().level.m <= 2, '勾了「站不起来」就不该拿到能走路的分层');
const ids = store.todayPlan().map((m) => m.id);
ok(ids.indexOf('single-leg') < 0 && ids.indexOf('gait') < 0, '不该出现单腿站立/步行训练');

/* 6. 急性期 */
head('发病 2 周内');
store.saveAssessment({ phase: 0, situp: 3, sit: 3, stand: 3, walk: 4, stair: 3, hand: 3, flags: [] });
ok(store.isAcute(), '应识别为急性期');
ok(store.todayPlan().map((m) => m.id).indexOf('single-leg') < 0, '急性期不给单腿站立');
const anyId = store.todayPlan()[0].id;
store.state().step[anyId] = 3;
ok(store.stepIndex(anyId) === 0, '急性期阶梯应钉在第 0 档');
store.state().sets[anyId] = 99;
ok(store.setsTarget(anyId) === lib.baseSets(anyId), '急性期不该超过基础组数');
// 满 14 天后自动退出急性期
store.state().assessedAt = '2020-01-01';
ok(!store.isAcute(), '距快筛超过 14 天应自动退出急性期');

/* 7. 安全标记 */
head('安全标记');
store.saveAssessment({ phase: 3, situp: 3, sit: 3, stand: 3, walk: 4, stair: 3, hand: 4, flags: [0, 1, 4] });
const blocked = store.todayPlan().map((m) => m.id);
ok(blocked.indexOf('shoulder-flex') < 0, '肩膀疼应屏蔽肩前屈上举');
ok(blocked.indexOf('single-leg') < 0, '摔倒过应屏蔽单腿站立');
const urg = store.urgentFlags();
ok(urg.length === 2, '手脚肿、摔倒过应进入「先看医生」那一档，实为 ' + urg.length);
ok(urg.every((u) => u.urgentWhen && u.urgentDo), '每条紧急标记都要写清什么情况、怎么办');

/* 8. 每周复评 */
head('每周复评');
store.state().weekly = [];
store.pushWeekly();
ok(store.state().weekly.length === 1, '应写入一条趋势');
ok(A.trend({ stand: 3, walk: 4, hand: 4 }) === A.TREND_MAX, '满档 trend 应等于 TREND_MAX');
ok(A.WEEKLY.indexOf('flags') >= 0, '每周复评必须重问安全标记');

/* 9. 内容完整性 */
head('内容完整性');
const cards = require('../utils/cards.js');
ok(cards.length === 11, '知识卡应为 11 张，实为 ' + cards.length);
const again = cards.filter((c) => c.id === 'again')[0];
ok(/24 小时/.test(JSON.stringify(again)), '复发卡必须写明取栓 24 小时窗口');
ok(/平衡|走不稳/.test(JSON.stringify(again.extra)), '复发卡必须补上 BE-FAST 的平衡一项');
const drug = cards.filter((c) => c.id === 'drug')[0];
ok(/抗凝/.test(JSON.stringify(drug)), '用药卡必须提到抗凝');
const fit = cards.filter((c) => c.id === 'fit')[0];
ok(fit.never && fit.never.items.length >= 5, '适用性卡必须有绝对禁忌清单');
ok(fit.gate && fit.gate.rows.length === 4, '适用性卡必须有练前四个数');

for (let lvM = 1; lvM <= 5; lvM++) {
  for (let lvH = 1; lvH <= 5; lvH++) {
    const p = require('../utils/plan.js').build({ m: lvM, h: lvH }, []);
    ok(p.length >= 3, 'M' + lvM + '/H' + lvH + ' 至少要有 3 个动作，实为 ' + p.length);
    ok(new Set(p.map((x) => x.id)).size === p.length, 'M' + lvM + '/H' + lvH + ' 不该出现重复动作');
  }
}

console.log('\n' + (fail === 0 ? '✓ 全部通过' : '✗ 有失败项') + '　通过 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
