/**
 * 动作库 = poses.js（动作定义 + 关节角度关键帧）+ 这里的进阶阶梯。
 *
 * 剂量的写法：sets 是「今天记几组」，随反馈升降；reps 只是显示，不做打卡要求。
 * 每条剂量的出处见 docs/训练动作依据.md。
 */
const POSES = require('./poses.js');

/**
 * 升降级阶梯 —— 顺序是有讲究的：
 * 先加量（安全），再减支撑（难度真正上升），最后才加幅度/速度。
 * 反过来做很容易摔。
 */
const LADDER = {
  'ankle-pump':   ['3 组 / 次', '4 组 / 次', '5 组 / 次'],
  'knee-slide':   ['2 组 · 半程', '2 组 · 全程', '3 组 · 全程'],
  'bridge':       ['抬起来就算', '抬起保持 3 秒', '抬起保持 5 秒', '保持 5 秒 · 单腿'],
  'bobath':       ['举到胸口', '举到下巴', '举过头顶'],
  'sit-reach':    ['够到膝盖前', '够到一臂远', '够到一臂远 · 不扶'],
  'knee-ext-sit': ['抬起就算', '抬平停 3 秒', '抬平停 5 秒 · 加沙袋'],
  'sit-to-stand': ['双手撑膝盖起', '扶扶手起', '不扶手起', '不扶手 · 30 秒内做 5 次'],
  'weight-shift': ['扶着做', '手轻搭扶手', '不扶', '不扶 · 闭眼'],
  'heel-raise':   ['双手扶稳', '单手扶', '不扶'],
  'single-leg':   ['扶着站 5 秒', '手轻搭扶手 10 秒', '不扶 10 秒', '不扶 · 闭眼 10 秒'],
  'gait':         ['扶着走 5 分钟', '拐杖走 10 分钟', '不扶走 10 分钟', '不扶 · 变速走'],
  'shoulder-flex':['举到胸口', '举到眼睛高', '举过头顶', '举过头顶 · 手拿矿泉水瓶'],
  'grip':         ['帮他掰开', '他自己张开', '自己张开握紧 · 捏软球'],
  'wrist':        ['帮他摆动', '他自己摆动', '自己摆动 · 手拿轻物']
};

const BASE_SETS = {
  'ankle-pump': 3, 'knee-slide': 2, 'bridge': 3, 'bobath': 2,
  'sit-reach': 2, 'knee-ext-sit': 2, 'sit-to-stand': 3, 'weight-shift': 2,
  'heel-raise': 2, 'single-leg': 2, 'gait': 1, 'shoulder-flex': 3,
  'grip': 3, 'wrist': 2
};

const MAP = {};
POSES.forEach(function (m) { MAP[m.id] = m; });

function get(id) { return MAP[id]; }
function ladder(id) { return LADDER[id] || ['照做']; }
function baseSets(id) { return BASE_SETS[id] || 2; }

module.exports = { list: POSES, get: get, ladder: ladder, baseSets: baseSets, MAP: MAP };
