/**
 * 「今天让他自己做」—— 按移动能力层筛。
 *
 * 旧版这份清单是写死的（喂饭 / 翻身 / 吃药 / 量血压），
 * 对已经能自己走路的人一条都用不上。这是旧版最大的适用性缺口。
 *
 * 原则：每一件他自己完成的事，本身就是一次康复训练。
 * 帮他做完，不如陪他慢慢做。
 */

const BY_LEVEL = {
  1: [
    { id: 'm',  icon: 'meal',  label: '坐直了喂饭', times: '每一餐',    target: 1 },
    { id: 't',  icon: 'turn',  label: '翻身',       times: '每 2 小时', target: 1 },
    { id: 'p',  icon: 'pill',  label: '吃药',       times: '按医嘱',    target: 1 },
    { id: 'bp', icon: 'bp',    label: '量血压',     times: '每天记下来', target: 1 },
    { id: 'k',  icon: 'talk',  label: '和他聊天',   times: '10 分钟',   target: 1 }
  ],
  2: [
    { id: 'e',  icon: 'meal',  label: '自己把饭送进嘴里', times: '每一餐',        target: 1 },
    { id: 'w',  icon: 'wash',  label: '自己洗脸',         times: '早上 1 次',     target: 1 },
    { id: 'u',  icon: 'sit',   label: '坐起来',           times: '15 分钟 × 2 次', target: 2 },
    { id: 'p',  icon: 'pill',  label: '吃药',             times: '按医嘱',        target: 1 },
    { id: 'bp', icon: 'bp',    label: '量血压',           times: '每天记下来',     target: 1 }
  ],
  3: [
    { id: 'd',  icon: 'dress', label: '自己穿上衣',       times: '早上 1 次', target: 1 },
    { id: 'tr', icon: 'pos',   label: '自己从床挪到椅子', times: '每天 3 次', target: 3 },
    { id: 'to', icon: 'sit',   label: '自己上厕所',       times: '白天',      target: 1 },
    { id: 'p',  icon: 'pill',  label: '吃药',             times: '按医嘱',    target: 1 },
    { id: 'bp', icon: 'bp',    label: '量血压',           times: '每天记下来', target: 1 }
  ],
  4: [
    { id: 'd2', icon: 'dress', label: '自己穿衣穿鞋', times: '早晚',              target: 2 },
    { id: 'wk', icon: 'pos',   label: '在家里走动',   times: '每天 3 次，每次 5 分钟', target: 3 },
    { id: 'bt', icon: 'wash',  label: '自己洗澡',     times: '坐着洗',            target: 1 },
    { id: 'p',  icon: 'pill',  label: '吃药',         times: '按医嘱',            target: 1 },
    { id: 'bp', icon: 'bp',    label: '量血压',       times: '每天记下来',         target: 1 }
  ],
  5: [
    { id: 'ck', icon: 'meal',  label: '自己做一顿饭',   times: '每天',      target: 1 },
    { id: 'ot', icon: 'pos',   label: '出门走一段',     times: '每天 20 分钟', target: 1 },
    { id: 'so', icon: 'talk',  label: '用手机联系一个人', times: '每天',     target: 1 },
    { id: 'p',  icon: 'pill',  label: '吃药',           times: '按医嘱',    target: 1 },
    { id: 'bp', icon: 'bp',    label: '量血压',         times: '每天记下来', target: 1 }
  ]
};

/** 这一层的一句话说明 —— 让人知道为什么给他这几件 */
const LEVEL_NOTE = {
  1: '这几件是照顾的人要做的。做到位，能挡掉压疮、呛咳、肩关节脱位这三样最常见的二次伤害。',
  2: '他能坐了，就把「自己吃、自己洗脸」交回给他。慢一点没关系，代劳才是真的耽误。',
  3: '能站起来之后，转移和上厕所要开始自己做。这两件做成了，照顾的人一天能少搀扶几十次。',
  4: '能走了就要走够。在家里多走动，比任何单独的训练动作都管用。',
  5: '训练要往真实生活里搬 —— 做饭、出门、跟人说话，这些才是最后要恢复的东西。'
};

function forLevel(m) { return BY_LEVEL[m] || BY_LEVEL[1]; }
function noteFor(m) { return LEVEL_NOTE[m] || LEVEL_NOTE[1]; }

/** 什么时候必须停 —— 每个训练动作下面都要出现一次 */
const STOP = [
  { k: '疼痛',                      v: '立刻停，不要「忍一下就过去了」' },
  { k: '头晕、乏力、气短、脸色发白', v: '停下来休息' },
  { k: '憋气',                      v: '全程不要憋气，慢慢做，不要甩、不要用猛劲' },
  { k: '第二天比平时更累',           v: '说明昨天做多了，会自动给你减量' }
];

module.exports = { forLevel: forLevel, noteFor: noteFor, BY_LEVEL: BY_LEVEL, STOP: STOP };
