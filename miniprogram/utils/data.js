/**
 * 今天要做的两组事。
 * 第一组是家属做的照护，第二组是让他自己做的（日常本身就是训练）。
 * 每一条的剂量都能核到出处，见 docs/证据与来源.md。
 */

const careList = [
  { id: 'm',  icon: 'meal',  label: '坐直了喂饭', times: '每一餐',     target: 1 },
  { id: 't',  icon: 'turn',  label: '翻身',       times: '每 2 小时',  target: 1 },
  { id: 'p',  icon: 'pill',  label: '吃药',       times: '按医嘱',     target: 1 },
  { id: 's',  icon: 'pos',   label: '摆好姿势',   times: '每次躺下',   target: 1 },
  { id: 'bp', icon: 'bp',    label: '量血压',     times: '每天记下来', target: 1 }
];

const trainList = [
  { id: 'd', icon: 'dress', label: '自己穿上衣', times: '早上 1 次',      target: 1 },
  { id: 'w', icon: 'wash',  label: '自己洗脸',   times: '早上 1 次',      target: 1 },
  { id: 'u', icon: 'sit',   label: '坐起来',     times: '15 分钟 × 2 次', target: 2 },
  { id: 'k', icon: 'talk',  label: '和他聊天',   times: '10 分钟 × 1 次', target: 1 }
];

/** 什么时候必须停 —— 每个训练动作下面都要出现一次 */
const STOP = [
  { k: '疼痛',                     v: '立刻停，不要「忍一下就过去了」' },
  { k: '头晕、乏力、气短、脸色发白', v: '停下来休息' },
  { k: '憋气',                     v: '全程不要憋气，慢慢做，不要甩、不要用猛劲' },
  { k: '第二天比平时更累',          v: '说明昨天做多了，减量' }
];

module.exports = { careList, trainList, STOP };
