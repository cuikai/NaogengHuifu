/* ===========================================================================
 * poses.js —— 动作库
 *
 * 每个动作 = 一份关节角度关键帧数据。新增动作不需要画图。
 *
 * 字段：
 *   m / h      适用的移动能力层 / 上肢手功能层（内部分层，界面上不出现）
 *   view       {cx, cy, span} 取景：世界坐标中心 + 纵向跨度（单位=头高）
 *   anchor     'auto' | 关节名 —— 平移全身使该关节落在 (ax, ay)
 *   focus      需要高亮的关节
 *   trail      需要画运动轨迹的点
 *   phases     阶段条：[{to, label}]，to = 该阶段结束的归一化时间
 *   compare    常见代偿动作（同一套渲染器，另一组角度）
 * =========================================================================== */

var SIT = { trunk: 4, head: 2, uarm: 12, farm: 40, thigh: 88, shank: -4, foot: 92,
            uarmF: 6, farmF: 34, thighF: 84, shankF: 0, footF: 88 };
var STAND = { trunk: 2, head: 0, uarm: 7, farm: 10, thigh: 2, shank: 0, foot: 92,
              uarmF: -3, farmF: -1, thighF: -3, shankF: 2, footF: 88 };
var LIE = { trunk: -90, head: -86, uarm: 84, farm: 88, thigh: 87, shank: 85, foot: 178,
            uarmF: 80, farmF: 84, thighF: 89, shankF: 87, footF: 176 };

var LIBRARY = [

/* ───────────────────────── 卧床期 ───────────────────────── */
{
  id: 'ankle-pump', wide: true, name: '踝泵', sub: '勾脚尖、绷脚尖',
  m: [1, 2], h: null, group: '循环',
  dose: '20 次 / 组 · 3 组 · 一天 3 次',
  purpose: '长期少动，小腿血流慢，容易形成血栓。踝泵是把血往回泵的动作 —— 全套里最安全的一个，好腿也一起做。',
  view: { cx: -1.4, cy: -1.5, span: 6.2 },
  anchor: 'pelvis', ax: -2.0, ay: -0.44,
  props: [{ k: 'bed', x0: -4.2, x1: 4.6 }],
  focus: ['ankle'], trail: 'toe',
  base: LIE, cycle: 3200,
  keyframes: [
    { t: 0.00, foot: 178, footF: 176 },
    { t: 0.28, foot: 206, footF: 203 },
    { t: 0.42, foot: 206, footF: 203, ease: 'hold' },
    { t: 0.70, foot: 146, footF: 149 },
    { t: 0.84, foot: 146, footF: 149, ease: 'hold' },
    { t: 1.00, foot: 178, footF: 176 }
  ],
  phases: [
    { to: 0.42, label: '勾脚尖，勾到最大，停 2 秒' },
    { to: 0.84, label: '绷脚尖，绷到最大，停 2 秒' },
    { to: 1.00, label: '回到中间' }
  ],
  cautions: ['慢慢来，一次一次数，不要甩。', '小腿突然肿胀、发热、疼 —— 停下来，告诉医生。']
},

{
  id: 'knee-slide', wide: true, name: '屈膝滑动', sub: '脚跟贴着床往回滑',
  m: [1, 2], h: null, group: '下肢',
  dose: '15 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '为以后能坐、能站做准备，也防止膝关节僵住。脚不离开床面，最省力也最安全。',
  view: { cx: -1.4, cy: -1.5, span: 6.2 },
  anchor: 'pelvis', ax: -2.0, ay: -0.44,
  props: [{ k: 'bed', x0: -4.2, x1: 4.6 }],
  focus: ['knee'], trail: 'ankle',
  base: LIE, cycle: 3600,
  keyframes: [
    { t: 0.00, thigh: 87, shank: 85, foot: 178, thighF: 89, shankF: 87 },
    { t: 0.40, thigh: 143, shank: 12, foot: 172, thighF: 145, shankF: 10 },
    { t: 0.55, thigh: 143, shank: 12, foot: 172, thighF: 145, shankF: 10, ease: 'hold' },
    { t: 1.00, thigh: 87, shank: 85, foot: 178, thighF: 89, shankF: 87 }
  ],
  phases: [
    { to: 0.55, label: '脚跟贴着床，往屁股方向滑，膝盖立起来' },
    { to: 1.00, label: '慢慢滑回去，完全伸直' }
  ],
  cautions: ['脚不要离开床面。', '膝盖后面拉得疼就少滑一点。']
},

{
  id: 'bridge', wide: true, name: '桥式运动', sub: '抬起臀部，停 5 秒',
  m: [1, 2, 3], h: null, group: '核心',
  dose: '10 个 / 组 · 3 组 · 一天 1～2 次',
  purpose: '练的是腰臀的力量。做得好，翻身、坐起、用便盆都会轻松很多 —— 照顾的人也省力。',
  view: { cx: 0.9, cy: -1.9, span: 6.0 },
  anchor: 'ankle', ax: 2.4, ay: -0.28,
  props: [{ k: 'bed', x0: -4.4, x1: 4.6 }],
  focus: ['pelvis'], trail: 'pelvis',
  base: LIE, cycle: 5200,
  keyframes: [
    { t: 0.00, trunk: -90, head: -86, thigh: 139.5, shank: 23.5, foot: 96, thighF: 143, shankF: 21, footF: 94 },
    { t: 0.26, trunk: -102, head: -93, thigh: 123, shank: 13, foot: 96, thighF: 127, shankF: 11, footF: 94 },
    { t: 0.66, trunk: -102, head: -93, thigh: 123, shank: 13, foot: 96, thighF: 127, shankF: 11, footF: 94, ease: 'hold' },
    { t: 0.88, trunk: -90, head: -86, thigh: 139.5, shank: 23.5, foot: 96, thighF: 143, shankF: 21, footF: 94 },
    { t: 1.00, trunk: -90, head: -86, thigh: 139.5, shank: 23.5, foot: 96, thighF: 143, shankF: 21, footF: 94, ease: 'hold' }
  ],
  phases: [
    { to: 0.26, label: '收紧臀部，把腰抬起来' },
    { to: 0.66, label: '保持 5 秒 · 正常呼吸，不要憋气' },
    { to: 1.00, label: '慢慢放下来' }
  ],
  cautions: ['抬不起来就先只做「用力想抬」，也有用。', '抬得低一点没关系，不要憋气。'],
  compare: {
    label: '腰硬顶上去，臀部没发力',
    why: '腰会越练越酸，臀肌一点没练到。手放在屁股上，摸得到它在收紧才算对。',
    keyframes: [
      { t: 0.00, trunk: -90, head: -84, thigh: 139.5, shank: 23.5, foot: 96 },
      { t: 0.26, trunk: -96, head: -74, thigh: 133, shank: 20, foot: 96 },
      { t: 0.66, trunk: -96, head: -74, thigh: 133, shank: 20, foot: 96, ease: 'hold' },
      { t: 1.00, trunk: -90, head: -84, thigh: 139.5, shank: 23.5, foot: 96 }
    ]
  }
},

{
  id: 'bobath', name: '双手叉握上举', sub: '十指交叉，患侧拇指在上',
  m: null, h: [1, 2, 3], group: '上肢',
  dose: '10 次 / 组 · 2 组 · 一天 2 次',
  purpose: '用好手带着患手动，让患侧的肩胛骨跟着活动起来。力度由他自己控制，是家里最推荐的上肢动作。',
  view: { cx: 0.5, cy: -3.1, span: 7.2 },
  anchor: 'pelvis', ax: 0, ay: -2.11,
  props: [{ k: 'chair', x0: -1.9, x1: 0.6, seat: -1.66, back: true }, { k: 'floor' }],
  focus: ['shoulder'], trail: 'hand',
  base: SIT, cycle: 4600,
  keyframes: [
    { t: 0.00, uarm: 14, farm: 62, uarmF: 12, farmF: 60, trunk: 4, head: 2 },
    { t: 0.40, uarm: 74, farm: 84, uarmF: 72, farmF: 82, trunk: 4, head: 4 },
    { t: 0.60, uarm: 74, farm: 84, uarmF: 72, farmF: 82, trunk: 4, head: 4, ease: 'hold' },
    { t: 1.00, uarm: 14, farm: 62, uarmF: 12, farmF: 60, trunk: 4, head: 2 }
  ],
  phases: [
    { to: 0.40, label: '好手带着患手，一起慢慢举起来' },
    { to: 0.60, label: '举到胸口高度就够 · 先不要过头顶' },
    { to: 1.00, label: '慢慢放下' }
  ],
  cautions: ['这是全套里最需要当心的动作。肩膀一有疼，马上停。', '患侧拇指要压在健侧拇指上面。']
},

/* ───────────────────────── 坐位期 ───────────────────────── */
{
  id: 'sit-reach', name: '坐位前伸够物', sub: '坐稳了，手往前够',
  m: [2, 3], h: null, group: '平衡',
  dose: '10 次 / 组 · 2 组 · 一天 2 次',
  purpose: '坐着够东西，练的是躯干控制和坐位平衡。能稳稳够到前面的杯子，离自己吃饭、自己穿衣就近了一步。',
  view: { cx: 0.7, cy: -3.1, span: 7.2 },
  anchor: 'pelvis', ax: -0.6, ay: -2.11,
  props: [{ k: 'chair', x0: -2.5, x1: 0.0, seat: -1.66, back: true },
          { k: 'floor' }, { k: 'target', x: 2.35, y: -2.62, layer: 'front' }],
  focus: ['shoulder'], trail: 'hand',
  base: SIT, cycle: 4800,
  keyframes: [
    { t: 0.00, trunk: 4, head: 2, uarm: 12, farm: 40, uarmF: 8, farmF: 34 },
    { t: 0.44, trunk: 26, head: 22, uarm: 78, farm: 84, uarmF: 20, farmF: 30 },
    { t: 0.62, trunk: 26, head: 22, uarm: 78, farm: 84, uarmF: 20, farmF: 30, ease: 'hold' },
    { t: 1.00, trunk: 4, head: 2, uarm: 12, farm: 40, uarmF: 8, farmF: 34 }
  ],
  phases: [
    { to: 0.44, label: '屁股不动，身体带着手往前够' },
    { to: 0.62, label: '够到，停一下' },
    { to: 1.00, label: '坐回来，坐直' }
  ],
  cautions: ['屁股离开椅面就是够太远了，收回来一点。', '旁边要有人，或者靠着墙角坐。'],
  compare: {
    label: '弓背去够，屁股滑出椅面',
    why: '这样练的是弯腰，不是坐位平衡；而且很容易从椅子上滑下去。',
    keyframes: [
      { t: 0.00, trunk: 6, head: 10, uarm: 12, farm: 40 },
      { t: 0.44, trunk: 12, head: 40, uarm: 88, farm: 96 },
      { t: 0.62, trunk: 12, head: 40, uarm: 88, farm: 96, ease: 'hold' },
      { t: 1.00, trunk: 6, head: 10, uarm: 12, farm: 40 }
    ]
  }
},

{
  id: 'knee-ext-sit', name: '坐位伸膝', sub: '把小腿抬平，停 3 秒',
  m: [2, 3], h: null, group: '下肢',
  dose: '12 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '大腿前侧的力量，是「能不能自己站起来」的关键。坐着练最安全，摔不了。',
  view: { cx: 0.9, cy: -3.1, span: 7.2 },
  anchor: 'pelvis', ax: -0.9, ay: -2.11,
  props: [{ k: 'chair', x0: -2.8, x1: -0.3, seat: -1.66, back: true }, { k: 'floor' }],
  focus: ['knee'], trail: 'toe',
  base: SIT, cycle: 4400,
  keyframes: [
    { t: 0.00, shank: -4, foot: 92, shankF: 0 },
    { t: 0.34, shank: 72, foot: 62, shankF: 2 },
    { t: 0.62, shank: 72, foot: 62, shankF: 2, ease: 'hold' },
    { t: 1.00, shank: -4, foot: 92, shankF: 0 }
  ],
  phases: [
    { to: 0.34, label: '慢慢把小腿抬平，脚尖勾起来' },
    { to: 0.62, label: '停 3 秒 · 大腿前面应该发紧' },
    { to: 1.00, label: '慢慢放下，不要摔下去' }
  ],
  cautions: ['放下来的那一下要慢 —— 这一半才是真正在练力量。', '两条腿轮流做，好腿也要做。']
},

/* ───────────────────────── 站立期 ───────────────────────── */
{
  id: 'sit-to-stand', name: '坐站转移', sub: '从椅子上自己站起来',
  m: [3, 4, 5], h: null, group: '转移', hero: true,
  dose: '5 次 / 组 · 3 组 · 一天 2 次',
  purpose: '这是整套训练里最值钱的一个动作 —— 上厕所、上下床、出门，全都从它开始。能自己站起来，照顾的人一天能省下几十次搀扶。',
  view: { cx: -0.1, cy: -3.6, span: 8.7 },
  anchor: 'ankle', ax: 0.75, ay: -0.30,
  props: [{ k: 'chair', x0: -2.9, x1: -0.35, seat: -1.66, back: true }, { k: 'floor' }],
  focus: ['knee'], trail: 'headC',
  base: SIT, cycle: 5400,
  keyframes: [
    { t: 0.00, trunk: 4, head: 2, thigh: 88, shank: -4, foot: 92, uarm: 12, farm: 40,
      thighF: 84, shankF: 0, footF: 88, uarmF: 8, farmF: 34 },
    { t: 0.26, trunk: 48, head: 42, thigh: 88, shank: -10, foot: 92, uarm: 30, farm: 30,
      thighF: 84, shankF: -6, footF: 88, uarmF: 26, farmF: 26 },
    { t: 0.36, trunk: 52, head: 44, thigh: 66, shank: -16, foot: 92, uarm: 34, farm: 26,
      thighF: 63, shankF: -12, footF: 88, uarmF: 30, farmF: 22 },
    { t: 0.56, trunk: 26, head: 20, thigh: 30, shank: -9, foot: 92, uarm: 18, farm: 16,
      thighF: 28, shankF: -6, footF: 88, uarmF: 14, farmF: 12 },
    { t: 0.70, trunk: 3, head: 0, thigh: 2, shank: 0, foot: 92, uarm: 7, farm: 10,
      thighF: -3, shankF: 2, footF: 88, uarmF: -3, farmF: -1 },
    { t: 0.86, trunk: 3, head: 0, thigh: 2, shank: 0, foot: 92, uarm: 7, farm: 10,
      thighF: -3, shankF: 2, footF: 88, uarmF: -3, farmF: -1, ease: 'hold' },
    { t: 1.00, trunk: 4, head: 2, thigh: 88, shank: -4, foot: 92, uarm: 12, farm: 40,
      thighF: 84, shankF: 0, footF: 88, uarmF: 8, farmF: 34 }
  ],
  phases: [
    { to: 0.26, label: '脚往后收，身体前倾 —— 鼻子过脚尖' },
    { to: 0.56, label: '用腿的力量顶起来，不要靠手撑' },
    { to: 0.86, label: '站直，停 2 秒再坐' },
    { to: 1.00, label: '慢慢坐回去，别砸下去' }
  ],
  cautions: ['椅子要有靠背、别带轮子；后面顶着墙更稳。', '起来时头晕就先坐回去，坐一分钟再试。'],
  compare: {
    label: '用手撑着椅子起来',
    why: '看着是站起来了，但腿的力量一点没练到 —— 明天还是站不起来。手只在快要摔的时候扶一下。',
    keyframes: [
      { t: 0.00, trunk: 4, head: 2, thigh: 88, shank: -4, foot: 92, uarm: 12, farm: 40 },
      { t: 0.26, trunk: 18, head: 14, thigh: 88, shank: -6, foot: 92, uarm: -32, farm: -14 },
      { t: 0.36, trunk: 20, head: 14, thigh: 68, shank: -8, foot: 92, uarm: -46, farm: -20 },
      { t: 0.56, trunk: 12, head: 8, thigh: 30, shank: -4, foot: 92, uarm: -30, farm: -12 },
      { t: 0.70, trunk: 3, head: 0, thigh: 2, shank: 0, foot: 92, uarm: 7, farm: 10 },
      { t: 0.86, trunk: 3, head: 0, thigh: 2, shank: 0, foot: 92, uarm: 7, farm: 10, ease: 'hold' },
      { t: 1.00, trunk: 4, head: 2, thigh: 88, shank: -4, foot: 92, uarm: 12, farm: 40 }
    ]
  }
},

{
  id: 'weight-shift', name: '站立重心转移', sub: '把身体的重量挪到患侧',
  m: [3, 4], h: null, group: '平衡', front: true,
  dose: '10 个来回 / 组 · 2 组 · 一天 2 次',
  purpose: '走路就是不停地把重心从一条腿换到另一条腿。患侧敢不敢承重，决定了走路稳不稳、会不会拖着走。',
  view: { cx: 0, cy: -3.7, span: 8.8 },
  props: [{ k: 'floor' }, { k: 'rail', x: 2.5, y: -2.4 }],
  plumb: true,
  base: { lean: 0, hipL: -4, hipR: 4, liftL: 0, liftR: 0, armL: 15, armR: 15, bend: 0 },
  cycle: 5000,
  keyframes: [
    { t: 0.00, lean: 0, bend: 0 },
    { t: 0.25, lean: -13, bend: -0.34 },
    { t: 0.38, lean: -13, bend: -0.34, ease: 'hold' },
    { t: 0.63, lean: 13, bend: 0.34 },
    { t: 0.80, lean: 13, bend: 0.34, ease: 'hold' },
    { t: 1.00, lean: 0, bend: 0 }
  ],
  phases: [
    { to: 0.38, label: '重心慢慢移到健侧，停 3 秒' },
    { to: 0.80, label: '再慢慢移到患侧，停 3 秒 —— 这一边才是重点' },
    { to: 1.00, label: '回到正中' }
  ],
  cautions: ['旁边要有扶手或椅背，手轻轻搭着就行，不要用力抓。', '脚不要挪动，只是把重量换过去。']
},

{
  id: 'heel-raise', name: '提踵', sub: '扶稳了，踮起脚尖',
  m: [3, 4, 5], h: null, group: '下肢',
  dose: '15 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '小腿后侧的力量决定走路能不能蹬起来。这块肌肉弱，走路就会拖、会累。',
  view: { cx: 0.3, cy: -3.7, span: 8.9 },
  anchor: 'toe', ax: 0.9, ay: -0.06,
  props: [{ k: 'floor' }, { k: 'rail', x: 1.75, y: -3.35 }],
  focus: ['ankle'], trail: 'shoulder',
  base: STAND, cycle: 3800,
  keyframes: [
    { t: 0.00, foot: 92, footF: 90, uarm: 31, farm: 35, uarmF: 27, farmF: 31 },
    { t: 0.34, foot: 58, footF: 56, uarm: 26, farm: 30, uarmF: 22, farmF: 26 },
    { t: 0.56, foot: 58, footF: 56, uarm: 26, farm: 30, uarmF: 22, farmF: 26, ease: 'hold' },
    { t: 1.00, foot: 92, footF: 90, uarm: 31, farm: 35, uarmF: 27, farmF: 31 }
  ],
  phases: [
    { to: 0.34, label: '踮起来，尽量高' },
    { to: 0.56, label: '停 2 秒' },
    { to: 1.00, label: '慢慢放下来，脚跟轻轻落地' }
  ],
  cautions: ['一定要扶着东西。', '小腿抽筋就停下来，把脚尖往回勾一勾。']
},

/* ───────────────────────── 步行期 ───────────────────────── */
{
  id: 'single-leg', name: '单腿站立', sub: '患侧单腿站，数到 10',
  m: [4, 5], h: null, group: '平衡', front: true,
  dose: '5 次 / 侧 · 一天 2 次',
  purpose: '走路时有一半的时间是单腿撑着的。单腿站不住，走路就会又快又碎、容易摔。',
  view: { cx: 0, cy: -3.7, span: 8.8 },
  props: [{ k: 'floor' }, { k: 'rail', x: 2.5, y: -2.4 }],
  plumb: true,
  base: { lean: 0, hipL: -4, hipR: 4, liftL: 0, liftR: 0, armL: 15, armR: 15, bend: 0 },
  cycle: 5600,
  keyframes: [
    { t: 0.00, lean: 0, liftR: 0, hipR: 4, bend: 0, armR: 15 },
    { t: 0.22, lean: -10, liftR: 0.85, hipR: 22, bend: -0.26, armR: 30 },
    { t: 0.78, lean: -10, liftR: 0.85, hipR: 22, bend: -0.26, armR: 26, ease: 'hold' },
    { t: 1.00, lean: 0, liftR: 0, hipR: 4, bend: 0, armR: 15 }
  ],
  phases: [
    { to: 0.22, label: '重心先移到站立的那条腿' },
    { to: 0.78, label: '抬起另一条腿，心里数到 10' },
    { to: 1.00, label: '慢慢放下' }
  ],
  cautions: ['扶手就在手边，站不稳马上扶。', '先练好腿单腿站，找到感觉再换患侧。']
},

{
  id: 'gait', name: '步行训练', sub: '一步一步，脚跟先着地',
  m: [4, 5], h: null, group: '步行',
  dose: '连续走 5～10 分钟 · 一天 2 次',
  purpose: '走路不是走够步数就行 —— 是每一步都走对。脚跟先落地、患腿敢承重、两步一样长，这三件事决定了走得稳不稳。',
  view: { cx: 0.1, cy: -3.6, span: 8.7 },
  anchor: 'pelvis', ax: 0, ay: -3.70,
  props: [{ k: 'floor' }],
  focus: ['ankle'], trail: 'toe',
  base: STAND, cycle: 2600,
  keyframes: [
    { t: 0.00, thigh: 31, shank: 7, foot: 64, thighF: -23, shankF: -7, footF: 110, trunk: 4, uarm: -20, uarmF: 22, farm: -8, farmF: 34 },
    { t: 0.25, thigh: 4, shank: 0, foot: 92, thighF: -6, shankF: 14, footF: 96, trunk: 4, uarm: -8, uarmF: 10, farm: 2, farmF: 20 },
    { t: 0.50, thigh: -23, shank: -7, foot: 110, thighF: 31, shankF: 7, footF: 64, trunk: 4, uarm: 22, uarmF: -20, farm: 34, farmF: -8 },
    { t: 0.75, thigh: -6, shank: 14, foot: 96, thighF: 4, shankF: 0, footF: 92, trunk: 4, uarm: 10, uarmF: -8, farm: 20, farmF: 2 },
    { t: 1.00, thigh: 31, shank: 7, foot: 64, thighF: -23, shankF: -7, footF: 110, trunk: 4, uarm: -20, uarmF: 22, farm: -8, farmF: 34 }
  ],
  phases: [
    { to: 0.25, label: '患腿脚跟先着地' },
    { to: 0.50, label: '重心压到患腿上' },
    { to: 0.75, label: '后脚蹬起来' },
    { to: 1.00, label: '摆到前面，脚尖勾住' }
  ],
  cautions: ['走廊里练，扶着墙；不要在光滑地面上练。', '走到有点喘、还能说话，就是合适的强度。'],
  compare: {
    label: '拖着走 · 脚尖勾不起来',
    why: '脚尖勾不起来（足下垂），脚会在地上蹭、被门槛绊倒。走路先练「勾脚尖」，必要时问医生要不要配踝足矫形器。',
    keyframes: [
      { t: 0.00, thigh: 16, shank: 2, foot: 112, thighF: -16, shankF: -4, footF: 106, trunk: 6, uarm: -12, uarmF: 14 },
      { t: 0.25, thigh: 3, shank: 0, foot: 110, thighF: -4, shankF: 12, footF: 98, trunk: 6, uarm: -6, uarmF: 8 },
      { t: 0.50, thigh: -16, shank: -4, foot: 106, thighF: 16, shankF: 2, footF: 112, trunk: 6, uarm: 14, uarmF: -12 },
      { t: 0.75, thigh: -4, shank: 12, foot: 100, thighF: 3, shankF: 0, footF: 110, trunk: 6, uarm: 8, uarmF: -6 },
      { t: 1.00, thigh: 16, shank: 2, foot: 112, thighF: -16, shankF: -4, footF: 106, trunk: 6, uarm: -12, uarmF: 14 }
    ]
  }
},

/* ───────────────────────── 上肢 · 手 ───────────────────────── */
{
  id: 'shoulder-flex', name: '肩前屈上举', sub: '手臂往前、往上举',
  m: null, h: [3, 4, 5], group: '上肢',
  dose: '10 次 / 组 · 3 组 · 一天 2 次',
  purpose: '够高处的东西、晾衣服、梳头，靠的都是这个动作。举得越高，能自己做的事越多。',
  view: { cx: 0.7, cy: -3.9, span: 9.4 },
  anchor: 'auto', ax: 0, ay: -0.30,
  props: [{ k: 'floor' }],
  focus: ['shoulder'], trail: 'hand',
  base: STAND, cycle: 4600,
  keyframes: [
    { t: 0.00, uarm: 8, farm: 10, trunk: 2, head: 0, uarmF: 4, farmF: 6 },
    { t: 0.42, uarm: 126, farm: 132, trunk: 2, head: 4, uarmF: 6, farmF: 8 },
    { t: 0.60, uarm: 126, farm: 132, trunk: 2, head: 4, uarmF: 6, farmF: 8, ease: 'hold' },
    { t: 1.00, uarm: 8, farm: 10, trunk: 2, head: 0, uarmF: 4, farmF: 6 }
  ],
  phases: [
    { to: 0.42, label: '手臂伸直，往前往上举' },
    { to: 0.60, label: '举到不疼的最高处，停 2 秒' },
    { to: 1.00, label: '慢慢放下来' }
  ],
  cautions: ['疼就是上限，到疼之前停住 —— 卒中后的肩膀经不起硬拉。', '肩膀出现持续疼痛、摸到凹陷，告诉医生。'],
  compare: {
    label: '耸肩、身体往旁边倒',
    why: '手看着举高了，其实是身子歪过去凑的。肩关节一点没活动开，还容易把肩拉伤。',
    keyframes: [
      { t: 0.00, uarm: 8, farm: 10, trunk: 2, head: 0 },
      { t: 0.42, uarm: 92, farm: 118, trunk: -16, head: -18 },
      { t: 0.60, uarm: 92, farm: 118, trunk: -16, head: -18, ease: 'hold' },
      { t: 1.00, uarm: 8, farm: 10, trunk: 2, head: 0 }
    ]
  }
},

/* ───────────────────────── 手 · 精细 ─────────────────────────
 * 这两个暂时沿用 v1 的图 —— 手部关节太多，需要单独的手部绘制器，排在第二批。
 * 组件检测到 gif 字段就走 <image>，其余字段和 canvas 动作完全一致。
 */
{
  id: 'grip', name: '握拳伸展', sub: '张开、握紧',
  m: null, h: [1, 2, 3], group: '手',
  gif: '/images/mv/grip.gif', ratio: 1.0405,
  dose: '20 次 / 组 · 3 组 · 一天 2～3 次',
  purpose: '手指长时间攥着会慢慢僵死，掰不开。每天张开握紧是最直接的预防 —— 也是以后能拿住东西的前提。',
  cycle: 3000,
  phases: [
    { to: 0.5, label: '五指尽量张开，撑到最大' },
    { to: 1.0, label: '再慢慢握成拳' }
  ],
  cautions: ['他自己做不了，就用你的手一根一根轻轻掰开 —— 只用很轻的力。', '掰不动就停，不要较劲。']
},

{
  id: 'wrist', name: '腕关节屈伸', sub: '手腕上下摆',
  m: null, h: [1, 2, 3, 4], group: '手',
  gif: '/images/mv/wrist.gif', ratio: 0.7714,
  dose: '20 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '手腕僵住会让整只手都用不上 —— 抓握、端碗、写字，全都要先有一个能立起来的手腕。',
  cycle: 2800,
  phases: [
    { to: 0.5, label: '前臂垫稳，手腕往上翘起来' },
    { to: 1.0, label: '再往下垂，到有点紧就够' }
  ],
  cautions: ['是上下摆，不是转圈 —— 手腕不适合大幅度旋转。', '不要压到疼。']
}
];

/* 正视图动作打个标记，渲染器据此切换 */
for (var _i = 0; _i < LIBRARY.length; _i++) {
  if (LIBRARY[_i].front) LIBRARY[_i].view3 = 'front';
}

if (typeof module !== 'undefined' && module.exports) module.exports = LIBRARY;
