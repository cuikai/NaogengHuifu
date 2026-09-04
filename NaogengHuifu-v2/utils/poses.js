/* ===========================================================================
 * poses.js —— 动作库
 *
 * 每个动作 = 一份关节角度关键帧。角度全部是康复科口头说的那个角度：
 *   trunk 躯干前倾 · neck 颈 · hip 屈髋 · knee 屈膝 · ankle 踝(+背屈/-跖屈)
 *   sho 肩前屈 · elb 屈肘 · wri 腕 · flat=1 该脚平踩支撑面（踝角自动反推）
 *   带 F 后缀 = 远侧（画在后面那半边）
 * 渲染器会把每个角度夹进生理活动度（见 figure.js 的 LIM），
 * 所以画不出反折的膝盖；但数据本身也要对 —— 每个角度的依据见下方注释。
 *
 * 关节角度依据：
 *   步态各时相髋/膝/踝角度：Perry《Gait Analysis》常用值
 *     着地 髋屈30 膝0 踝0 / 承重反应 膝屈18 踝跖屈5 / 支撑中期 髋0 膝5 踝背屈5
 *     支撑末期 髋伸15 踝背屈10 / 蹬离 膝屈40 踝跖屈18 / 摆动中期 髋屈30 膝屈60
 *   坐站转移：屈髋约90→120、屈膝约95、最大踝背屈约15～18（座位越低越大）
 *   踝泵：主动背屈约20、跖屈约40
 *   桥式：抬起后肩-髋-膝成一条直线（屈髋回到 0）
 *
 * 其它字段：
 *   m / h    适用的移动能力层 / 上肢手功能层（内部分层，界面上不出现）
 *   view     {cx, cy, span} 取景：世界坐标中心 + 纵向跨度（单位 = 头高）
 *   anchor   'ground' 骨盆横向固定 · 'feet' 脚固定 · 或某个关节名
 *   focus    高亮的关节 · trail 画运动轨迹的点
 *   phases   阶段条，to = 该阶段结束的归一化时间（要和动画真正的相位对齐）
 *   compare  常见代偿动作（同一套渲染器，另一组角度）
 * =========================================================================== */

var SEAT = -1.675;         // 椅面高度：解出来的 —— 坐直、大腿水平、双脚正好平踩地面（≈40cm）
var BEDY = 0;              // 床面

/* 基础姿势 */
/* 仰卧：躯干水平、腿伸直，脚跟落在床面上（角度是按「脚跟贴床」解出来的） */
var LIE = { trunk: -91, neck: 10, hip: -3, knee: 4, ankle: 0, sho: 4, elb: 10,
            hipF: -4, kneeF: 3, ankleF: 0, shoF: 2, elbF: 8 };
var SIT = { trunk: 4, neck: -2, hip: 90, knee: 95, flat: 1, sho: 1, elb: 61,
            hipF: 88, kneeF: 92, flatF: 1, shoF: 1, elbF: 61 };
var STAND = { trunk: 2, neck: -1, hip: 2, knee: 3, flat: 1, sho: 5, elb: 10,
              hipF: -1, kneeF: 4, flatF: 1, shoF: 2, elbF: 8 };

var LIBRARY = [

/* ───────────────────────── 卧床期 ───────────────────────── */
{
  id: 'ankle-pump', wide: true, name: '踝泵', sub: '勾脚尖、绷脚尖',
  m: [1, 2], h: null, group: '循环',
  dose: '20 次 / 组 · 3 组 · 一天 3 次',
  purpose: '长期少动，小腿血流慢，容易形成血栓。踝泵是把血往回泵的动作 —— 全套里最安全的一个，好腿也一起做。',
  view: { cx: 0.15, cy: -0.60, span: 2.50 },
  anchor: 'pelvis', ax: 0, ay: -0.50, armBack: true,
  props: [{ k: 'bed', x0: -6.0, x1: 6.0 }],
  focus: ['ankle'], trail: 'toe',
  /* 周期是按文字里的秒数排的：勾 1.2s → 停 2s → 绷 1.6s → 停 2s → 回中 1.0s。
   * 患者是跟着动画数拍子做的，说停 2 秒就得真的停 2 秒。 */
  base: LIE, cycle: 7800,
  keyframes: [
    { t: 0.000, ankle: 0, ankleF: 0 },
    { t: 0.154, ankle: 22, ankleF: 20 },                 // 勾脚尖：主动背屈约 20°
    { t: 0.410, ankle: 22, ankleF: 20, ease: 'hold' },
    { t: 0.615, ankle: -40, ankleF: -38 },               // 绷脚尖：跖屈约 40°
    { t: 0.872, ankle: -40, ankleF: -38, ease: 'hold' },
    { t: 1.000, ankle: 0, ankleF: 0 }
  ],
  phases: [
    { to: 0.410, label: '勾脚尖，勾到最大，停 2 秒' },
    { to: 0.872, label: '绷脚尖，绷到最大，停 2 秒' },
    { to: 1.000, label: '回到中间' }
  ],
  cautions: ['慢慢来，一次一次数，不要甩。', '小腿突然肿胀、发热、疼 —— 停下来，告诉医生。']
},

{
  id: 'knee-slide', wide: true, name: '屈膝滑动', sub: '脚跟贴着床往回滑',
  m: [1, 2], h: null, group: '下肢',
  dose: '15 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '为以后能坐、能站做准备，也防止膝关节僵住。脚不离开床面，最省力也最安全。',
  view: { cx: 0.15, cy: -0.88, span: 2.60 },
  anchor: 'pelvis', ax: 0, ay: -0.50, armBack: true,
  props: [{ k: 'bed', x0: -6.0, x1: 6.0 }],
  focus: ['knee'], trail: 'heel',
  base: LIE, cycle: 4200,
  /* 屈髋角是按「脚跟一直贴在床面上」解出来的：
   * 屈膝 4/20/40/60/80/100 对应屈髋 -3/5/14/24/32/40。
   * 中间几帧不能省 —— 只给首尾两帧，插值过程中脚跟会陷进床里。 */
  keyframes: [
    { t: 0.00, hip: -3, knee: 4,  ankle: 0, hipF: -4, kneeF: 3,  ankleF: 0 },
    { t: 0.12, hip: 5,  knee: 20, ankle: 3, hipF: 4,  kneeF: 19, ankleF: 2 },
    { t: 0.24, hip: 14, knee: 40, ankle: 5, hipF: 13, kneeF: 38, ankleF: 4 },
    { t: 0.34, hip: 24, knee: 60, ankle: 6, hipF: 23, kneeF: 58, ankleF: 5 },
    { t: 0.42, hip: 40, knee: 100, ankle: 8, hipF: 39, kneeF: 97, ankleF: 7 },
    { t: 0.56, hip: 40, knee: 100, ankle: 8, hipF: 39, kneeF: 97, ankleF: 7, ease: 'hold' },
    { t: 0.70, hip: 24, knee: 60, ankle: 6, hipF: 23, kneeF: 58, ankleF: 5 },
    { t: 0.82, hip: 14, knee: 40, ankle: 5, hipF: 13, kneeF: 38, ankleF: 4 },
    { t: 0.92, hip: 5,  knee: 20, ankle: 3, hipF: 4,  kneeF: 19, ankleF: 2 },
    { t: 1.00, hip: -3, knee: 4,  ankle: 0, hipF: -4, kneeF: 3,  ankleF: 0 }
  ],
  phases: [
    { to: 0.56, label: '脚跟贴着床，往屁股方向滑，膝盖立起来' },
    { to: 1.00, label: '慢慢滑回去，完全伸直' }
  ],
  cautions: ['脚不要离开床面。', '膝盖后面拉得疼就少滑一点。']
},

{
  id: 'bridge', wide: true, name: '桥式运动', sub: '抬起臀部，停 5 秒',
  m: [1, 2, 3], h: null, group: '核心',
  dose: '10 个 / 组 · 3 组 · 一天 1～2 次',
  purpose: '练的是腰臀的力量。做得好，翻身、坐起、用便盆都会轻松很多 —— 照顾的人也省力。',
  view: { cx: 0.10, cy: -1.05, span: 2.95 },
  anchor: 'feet', ax: 1.55, ay: 0,             // 脚踩定在床上不动，身体绕着它起落
  armBack: true,
  props: [{ k: 'bed', x0: -6.0, x1: 6.0 }],
  focus: ['pelvis'], trail: 'pelvis',
  base: LIE, cycle: 9800,   // 抬 2s → 保持 5s → 放下 2s → 落床 0.8s
  keyframes: [
    // 放下：屁股落床，屈髋约 45°、屈膝约 118°
    { t: 0.00, trunk: -93, neck: 10, hip: 45, knee: 118, flat: 1, hipF: 44, kneeF: 116, flatF: 1,
      sho: 4, elb: 10, shoF: 2, elbF: 8 },
    // 抬起：肩-髋-膝成一条直线 —— 屈髋回到 0，这才叫「臀部发力」
    { t: 0.204, trunk: -108, neck: 16, hip: 1, knee: 106, flat: 1, hipF: 0, kneeF: 105, flatF: 1,
      sho: 2, elb: 8, shoF: 0, elbF: 6 },
    { t: 0.714, trunk: -108, neck: 16, hip: 1, knee: 106, flat: 1, hipF: 0, kneeF: 105, flatF: 1,
      sho: 2, elb: 8, shoF: 0, elbF: 6, ease: 'hold' },
    { t: 0.918, trunk: -93, neck: 10, hip: 45, knee: 118, flat: 1, hipF: 44, kneeF: 116, flatF: 1,
      sho: 4, elb: 10, shoF: 2, elbF: 8 },
    { t: 1.00, trunk: -93, neck: 10, hip: 45, knee: 118, flat: 1, hipF: 44, kneeF: 116, flatF: 1,
      sho: 4, elb: 10, shoF: 2, elbF: 8, ease: 'hold' }
  ],
  phases: [
    { to: 0.204, label: '收紧臀部，把腰抬起来' },
    { to: 0.714, label: '保持 5 秒 · 正常呼吸，不要憋气' },
    { to: 1.00, label: '慢慢放下来' }
  ],
  cautions: ['抬不起来就先只做「用力想抬」，也有用。', '抬得低一点没关系，不要憋气。'],
  compare: {
    label: '腰硬顶上去，臀部没发力',
    why: '屁股其实没离床多少，全靠腰往上顶 —— 腰会越练越酸，臀肌一点没练到。手放在屁股上，摸得到它在收紧才算对。',
    keyframes: [
      { t: 0.00, trunk: -93, neck: 10, hip: 45, knee: 118, flat: 1, hipF: 44, kneeF: 116, flatF: 1 },
      // 只抬了一点点，屈髋还剩 30°，靠挺腰（颈也跟着后仰）凑出来
      { t: 0.204, trunk: -98, neck: 26, hip: 30, knee: 112, flat: 1, hipF: 29, kneeF: 111, flatF: 1 },
      { t: 0.714, trunk: -98, neck: 26, hip: 30, knee: 112, flat: 1, hipF: 29, kneeF: 111, flatF: 1, ease: 'hold' },
      { t: 1.00, trunk: -93, neck: 10, hip: 45, knee: 118, flat: 1, hipF: 44, kneeF: 116, flatF: 1 }
    ]
  }
},

{
  id: 'bobath', name: '双手叉握上举', sub: '十指交叉，患侧拇指在上',
  m: null, h: [1, 2, 3], group: '上肢',
  dose: '10 次 / 组 · 2 组 · 一天 2 次',
  purpose: '用好手带着患手动，让患侧的肩胛骨跟着活动起来。力度由他自己控制，是家里最推荐的上肢动作。',
  view: { cx: 0.55, cy: -3.05, span: 7.4 },
  anchor: 'pelvis', ax: 0, ay: SEAT - 0.30,
  props: [{ k: 'chair', x0: -2.05, x1: 0.55, seat: SEAT, back: true }, { k: 'floor' }],
  focus: ['shoulder'], trail: 'hand',
  base: SIT, cycle: 4800,
  keyframes: [
    // 双手交叉握在一起，两条手臂角度必须一样 —— 不然就不是「叉握」了
    { t: 0.00, sho: 16, elb: 66, shoF: 16, elbF: 66, trunk: 4, neck: -2 },
    { t: 0.42, sho: 88, elb: 14, shoF: 88, elbF: 14, trunk: 4, neck: 2 },   // 举到胸口/肩高：肩前屈约 90°
    { t: 0.62, sho: 88, elb: 14, shoF: 88, elbF: 14, trunk: 4, neck: 2, ease: 'hold' },
    { t: 1.00, sho: 16, elb: 66, shoF: 16, elbF: 66, trunk: 4, neck: -2 }
  ],
  phases: [
    { to: 0.42, label: '好手带着患手，一起慢慢举起来' },
    { to: 0.62, label: '举到胸口高度就够 · 先不要过头顶' },
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
  view: { cx: 1.15, cy: -3.05, span: 7.4 },
  anchor: 'pelvis', ax: -0.55, ay: SEAT - 0.30,
  props: [{ k: 'chair', x0: -2.6, x1: 0.0, seat: SEAT, back: true },
          { k: 'floor' }, { k: 'target', x: 3.06, y: -2.72, layer: 'front' }],
  focus: ['shoulder'], trail: 'hand',
  base: SIT, cycle: 5000,
  keyframes: [
    { t: 0.00, trunk: 4, neck: -2, sho: 1, elb: 61, shoF: 1, elbF: 61, hip: 90, hipF: 88 },
    // 从髋关节折过去（屈髋 +22°），不是弓背；两侧髋都要加，不然后面那条腿会插进地里。
    // 远侧手仍搭在大腿上（-13/92 是解出来的），近侧手臂伸直前伸够杯子。
    { t: 0.44, trunk: 26, neck: -14, sho: 96, elb: 10, shoF: -13, elbF: 92, hip: 112, hipF: 110 },
    { t: 0.62, trunk: 26, neck: -14, sho: 96, elb: 10, shoF: -13, elbF: 92, hip: 112, hipF: 110, ease: 'hold' },
    { t: 1.00, trunk: 4, neck: -2, sho: 1, elb: 61, shoF: 1, elbF: 61, hip: 90, hipF: 88 }
  ],
  phases: [
    { to: 0.44, label: '屁股不动，身体带着手往前够' },
    { to: 0.62, label: '够到，停一下' },
    { to: 1.00, label: '坐回来，坐直' }
  ],
  cautions: ['屁股离开椅面就是够太远了，收回来一点。', '旁边要有人，或者靠着墙角坐。'],
  compare: {
    label: '弓背去够，头往前伸',
    why: '腰背弓成一团、脖子往前伸，练的是弯腰不是坐位平衡；而且屁股会往前滑，容易从椅子上溜下去。',
    keyframes: [
      { t: 0.00, trunk: 6, neck: 6, sho: 1, elb: 61, shoF: 1, elbF: 61, hip: 92, hipF: 90 },
      // 躯干几乎没从髋部折过去（只多了 6°），全靠含胸低头 + 屈肘凑；大腿角度不变，脚不离地
      { t: 0.44, trunk: 12, neck: 40, sho: 86, elb: 34, shoF: -4, elbF: 74, hip: 98, hipF: 96 },
      { t: 0.62, trunk: 12, neck: 40, sho: 86, elb: 34, shoF: -4, elbF: 74, hip: 98, hipF: 96, ease: 'hold' },
      { t: 1.00, trunk: 6, neck: 6, sho: 1, elb: 61, shoF: 1, elbF: 61, hip: 92, hipF: 90 }
    ]
  }
},

{
  id: 'knee-ext-sit', name: '坐位伸膝', sub: '把小腿抬平，停 3 秒',
  m: [2, 3], h: null, group: '下肢',
  dose: '12 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '大腿前侧的力量，是「能不能自己站起来」的关键。坐着练最安全，摔不了。',
  view: { cx: 1.1, cy: -3.05, span: 7.4 },
  anchor: 'pelvis', ax: -0.7, ay: SEAT - 0.30,
  props: [{ k: 'chair', x0: -2.75, x1: -0.15, seat: SEAT, back: true }, { k: 'floor' }],
  focus: ['knee'], trail: 'toe',
  base: SIT, cycle: 7000,   // 抬 1.5s → 停 3s → 放下 2.5s
  keyframes: [
    { t: 0.000, knee: 95, flat: 1 },
    // 小腿抬平（屈膝剩约 8°），脚尖勾起来 = 踝背屈 18°；此时脚离地，flat 关掉
    { t: 0.214, knee: 8, flat: 0, ankle: 18 },
    { t: 0.643, knee: 8, flat: 0, ankle: 18, ease: 'hold' },
    { t: 1.000, knee: 95, flat: 1 }
  ],
  phases: [
    { to: 0.214, label: '慢慢把小腿抬平，脚尖勾起来' },
    { to: 0.643, label: '停 3 秒 · 大腿前面应该发紧' },
    { to: 1.000, label: '慢慢放下，不要摔下去' }
  ],
  cautions: ['放下来的那一下要慢 —— 这一半才是真正在练力量。', '两条腿轮流做，好腿也要做。']
},

/* ───────────────────────── 站立期 ───────────────────────── */
{
  id: 'sit-to-stand', name: '坐站转移', sub: '从椅子上自己站起来',
  m: [3, 4, 5], h: null, group: '转移', hero: true,
  dose: '5 次 / 组 · 3 组 · 一天 2 次',
  purpose: '这是整套训练里最值钱的一个动作 —— 上厕所、上下床、出门，全都从它开始。能自己站起来，照顾的人一天能省下几十次搀扶。',
  view: { cx: -0.25, cy: -3.45, span: 8.2 },
  // 坐着时屁股在椅面上不动（动的是脚往后收），离座后改成脚不动、身体绕着脚起来。
  // plant 就是这两个参照物之间的过渡。
  anchor: 'feet', ax: -1.00, axFoot: 0.30, ay: 0,
  props: [{ k: 'chair', x0: -3.05, x1: -0.45, seat: SEAT, back: true }, { k: 'floor' }],
  focus: ['knee'], trail: 'headC',
  base: STAND, cycle: 8000,   // 前倾1.8s → 起立1.6s → 站直停2s → 坐回2s → 落座0.6s
  keyframes: [
    // ① 坐着：屈髋 90、屈膝 95，双脚平踩，手轻放在大腿上
    { t: 0.00, trunk: 4, neck: -2, hip: 90, knee: 95, flat: 1, hipF: 88, kneeF: 92, flatF: 1,
      sho: 1, elb: 61, shoF: 1, elbF: 61, plant: 0 },
    // ② 脚往后收：屈膝加大到 108，小腿前倾（踝背屈自动变大）
    { t: 0.100, trunk: 10, neck: -4, hip: 92, knee: 106, flat: 1, hipF: 90, kneeF: 104, flatF: 1,
      sho: -2, elb: 67, shoF: -2, elbF: 67, plant: 0 },
    // ③ 身体前倾，鼻子过脚尖：躯干前倾 42°，屈髋到 118；手臂顺势前摆当配重
    { t: 0.225, trunk: 42, neck: -10, hip: 118, knee: 104, flat: 1, hipF: 116, kneeF: 102, flatF: 1,
      sho: 78, elb: 22, shoF: 74, elbF: 20, plant: 0.15 },
    // ④ 离座：臀部刚离开椅面，膝踝一起发力
    { t: 0.290, trunk: 40, neck: -8, hip: 100, knee: 88, flat: 1, hipF: 98, kneeF: 86, flatF: 1,
      sho: 84, elb: 16, shoF: 80, elbF: 14, plant: 0.75 },
    { t: 0.360, trunk: 24, neck: -4, hip: 56, knee: 50, flat: 1, hipF: 54, kneeF: 48, flatF: 1,
      sho: 56, elb: 16, shoF: 52, elbF: 14, plant: 1 },
    // ⑤ 站直
    { t: 0.425, trunk: 2, neck: -1, hip: 2, knee: 3, flat: 1, hipF: -1, kneeF: 4, flatF: 1,
      sho: 5, elb: 10, shoF: 2, elbF: 8, plant: 1 },
    { t: 0.675, trunk: 2, neck: -1, hip: 2, knee: 3, flat: 1, hipF: -1, kneeF: 4, flatF: 1,
      sho: 5, elb: 10, shoF: 2, elbF: 8, plant: 1, ease: 'hold' },
    // ⑥ 慢慢坐回去：先屈髋屈膝往后坐，不是直接砸下去
    { t: 0.820, trunk: 34, neck: -8, hip: 86, knee: 72, flat: 1, hipF: 84, kneeF: 70, flatF: 1,
      sho: 66, elb: 22, shoF: 62, elbF: 20, plant: 0.5 },
    { t: 0.925, trunk: 4, neck: -2, hip: 90, knee: 95, flat: 1, hipF: 88, kneeF: 92, flatF: 1,
      sho: 1, elb: 61, shoF: 1, elbF: 61, plant: 0 },
    { t: 1.000, trunk: 4, neck: -2, hip: 90, knee: 95, flat: 1, hipF: 88, kneeF: 92, flatF: 1,
      sho: 1, elb: 61, shoF: 1, elbF: 61, plant: 0, ease: 'hold' }
  ],
  phases: [
    { to: 0.225, label: '脚往后收，身体前倾 —— 鼻子过脚尖' },
    { to: 0.425, label: '用腿的力量顶起来，不要靠手撑' },
    { to: 0.675, label: '站直，停 2 秒再坐' },
    { to: 1.00, label: '慢慢坐回去，别砸下去' }
  ],
  cautions: ['椅子要有靠背、别带轮子；后面顶着墙更稳。', '起来时头晕就先坐回去，坐一分钟再试。'],
  compare: {
    label: '双手撑着椅面把自己推起来', handsOnSeat: true,
    why: '手一撑，腿就偷懒了 —— 看着是站起来了，腿的力量一点没练到，明天还是站不起来。手只在快要摔的时候扶一下。',
    keyframes: [
      // 手往后按在椅面上（肩后伸 + 屈肘），身体前倾少，靠手把自己推起来
      // 手的角度是解出来的：手掌正好按在椅面上（不是悬在半空，更不是撑到地上）
      { t: 0.00, trunk: 4, neck: -2, hip: 90, knee: 95, flat: 1, hipF: 88, kneeF: 92, flatF: 1,
        sho: -30, elb: 65, shoF: -30, elbF: 65, plant: 0 },
      { t: 0.100, trunk: 8, neck: -2, hip: 92, knee: 104, flat: 1, hipF: 90, kneeF: 102, flatF: 1,
        sho: -38, elb: 66, shoF: -38, elbF: 66, plant: 0 },
      { t: 0.225, trunk: 18, neck: -4, hip: 100, knee: 102, flat: 1, hipF: 98, kneeF: 100, flatF: 1,
        sho: -35, elb: 63, shoF: -35, elbF: 63, plant: 0.15 },
      // 用手把身体推起来：肘伸直的这一下就是「靠手撑」
      { t: 0.290, trunk: 20, neck: -4, hip: 92, knee: 88, flat: 1, hipF: 90, kneeF: 86, flatF: 1,
        sho: -14, elb: 31, shoF: -14, elbF: 31, plant: 0.75 },
      { t: 0.360, trunk: 14, neck: -2, hip: 52, knee: 48, flat: 1, hipF: 50, kneeF: 46, flatF: 1,
        sho: -6, elb: 14, shoF: -6, elbF: 14, plant: 1 },
      { t: 0.425, trunk: 2, neck: -1, hip: 2, knee: 3, flat: 1, hipF: -1, kneeF: 4, flatF: 1,
        sho: 5, elb: 10, shoF: 2, elbF: 8, plant: 1 },
      { t: 0.675, trunk: 2, neck: -1, hip: 2, knee: 3, flat: 1, hipF: -1, kneeF: 4, flatF: 1,
        sho: 5, elb: 10, shoF: 2, elbF: 8, plant: 1, ease: 'hold' },
      { t: 0.820, trunk: 26, neck: -6, hip: 86, knee: 72, flat: 1, hipF: 84, kneeF: 70, flatF: 1,
        sho: -18, elb: 40, shoF: -18, elbF: 40, plant: 0.5 },
      { t: 0.925, trunk: 4, neck: -2, hip: 90, knee: 95, flat: 1, hipF: 88, kneeF: 92, flatF: 1,
        sho: -30, elb: 65, shoF: -30, elbF: 65, plant: 0 },
      { t: 1.000, trunk: 4, neck: -2, hip: 90, knee: 95, flat: 1, hipF: 88, kneeF: 92, flatF: 1,
        sho: -30, elb: 65, shoF: -30, elbF: 65, plant: 0, ease: 'hold' }
    ]
  }
},

{
  id: 'weight-shift', name: '站立重心转移', sub: '把身体的重量挪到患侧',
  m: [3, 4], h: null, group: '平衡', front: true,
  dose: '10 个来回 / 组 · 2 组 · 一天 2 次',
  purpose: '走路就是不停地把重心从一条腿换到另一条腿。患侧敢不敢承重，决定了走路稳不稳、会不会拖着走。',
  view: { cx: 0.35, cy: -3.5, span: 8.4 },
  ay: 0, plumb: true,
  props: [{ k: 'floor' }, { k: 'rail', x: 1.52, y: -3.50 }],   // 横杆高度 ≈84cm，手正好搭上去
  touchRail: true, bothFeetDown: true,                         // 脚不许挪动、不许抬起
  base: { lean: 0, sway: 0, abdL: 5, abdR: 5, hipL: 0, hipR: 0, kneeL: 4, kneeR: 4,
          armAbdL: 7, armAbdR: 7, shoL: 4, shoR: 4, elbL: 10, elbR: 46 },
  cycle: 11500,   // 每边真的停满 3 秒
  keyframes: [
    // 脚不动，只把骨盆和重量横着挪过去；手轻搭扶手（右手屈肘不变）
    // 手一直搭在横杆上：身体挪过去，肩外展角跟着解出来，手不会离开杆
    { t: 0.00, lean: 0, sway: 0, abdL: 5, abdR: 5, kneeL: 4, kneeR: 4, armAbdR: 8, elbR: 45 },
    { t: 0.130, lean: 5, sway: -0.52, abdL: 2, abdR: 9, kneeL: 2, kneeR: 8, armAbdR: 15, elbR: 45 },
    { t: 0.391, lean: 5, sway: -0.52, abdL: 2, abdR: 9, kneeL: 2, kneeR: 8, armAbdR: 15, elbR: 45, ease: 'hold' },
    { t: 0.609, lean: -5, sway: 0.52, abdL: 9, abdR: 2, kneeL: 8, kneeR: 2, armAbdR: 1, elbR: 46 },
    { t: 0.870, lean: -5, sway: 0.52, abdL: 9, abdR: 2, kneeL: 8, kneeR: 2, armAbdR: 1, elbR: 46, ease: 'hold' },
    { t: 1.00, lean: 0, sway: 0, abdL: 5, abdR: 5, kneeL: 4, kneeR: 4, armAbdR: 8, elbR: 45 }
  ],
  phases: [
    { to: 0.391, label: '重心慢慢移到健侧，停 3 秒' },
    { to: 0.870, label: '再慢慢移到患侧，停 3 秒 —— 这一边才是重点' },
    { to: 1.00, label: '回到正中' }
  ],
  cautions: ['旁边要有扶手或椅背，手轻轻搭着就行，不要用力抓。', '脚不要挪动，只是把重量换过去。']
},

{
  id: 'heel-raise', name: '提踵', sub: '扶稳了，踮起脚尖',
  m: [3, 4, 5], h: null, group: '下肢',
  dose: '15 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '小腿后侧的力量决定走路能不能蹬起来。这块肌肉弱，走路就会拖、会累。',
  view: { cx: 0.9, cy: -3.5, span: 8.4 },
  anchor: 'feet', ax: 0.1, ay: 0,
  props: [{ k: 'floor' }, { k: 'rail', x: 1.50, y: -3.85 }],   // 横杆高度 ≈92cm
  touchRail: true,
  focus: ['ankle'], trail: 'shoulder',
  base: STAND, cycle: 5200,   // 踮 1.2s → 停 2s → 慢慢放下 2s
  keyframes: [
    // 手扶在横杆上，肩肘角度是按「手落在杆上」解出来的。
    // 踮起来时身体升高约半个头高，手不动 → 肘自然伸开，这才是「扶着」不是「吊着」。
    { t: 0.00, ankle: 0, ankleF: 0, flat: 1, flatF: 1, sho: -15, elb: 81, shoF: -15, elbF: 81 },
    { t: 0.231, ankle: -38, ankleF: -36, flat: 0, flatF: 0, sho: -6, elb: 57, shoF: -6, elbF: 57 },
    { t: 0.615, ankle: -38, ankleF: -36, flat: 0, flatF: 0, sho: -6, elb: 57, shoF: -6, elbF: 57, ease: 'hold' },
    { t: 1.00, ankle: 0, ankleF: 0, flat: 1, flatF: 1, sho: -15, elb: 81, shoF: -15, elbF: 81 }
  ],
  phases: [
    { to: 0.231, label: '踮起来，尽量高' },
    { to: 0.615, label: '停 2 秒' },
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
  view: { cx: 0.35, cy: -3.5, span: 8.4 },
  ay: 0, plumb: true,
  props: [{ k: 'floor' }, { k: 'rail', x: 1.52, y: -3.50 }],
  touchRail: true,
  base: { lean: 0, sway: 0, abdL: 5, abdR: 5, hipL: 0, hipR: 0, kneeL: 4, kneeR: 4,
          armAbdL: 7, armAbdR: 7, shoL: 4, shoR: 4, elbL: 10, elbR: 46 },
  cycle: 14500,   // 「数到 10」就是真的 10 秒
  keyframes: [
    { t: 0.00, lean: 0, sway: 0, hipR: 0, kneeR: 4, abdR: 5, armAbdL: 7, armAbdR: 8, elbR: 45 },
    // ① 重心先移到站立腿（左）上：骨盆横移，躯干略向左倾
    { t: 0.103, lean: 5, sway: -0.36, hipR: 0, kneeR: 4, abdR: 5, armAbdL: 7, armAbdR: 11, elbR: 46 },
    // ② 抬另一条腿：屈髋 55°、屈膝 88°，脚离地约 25cm；对侧手臂外展帮着平衡，
    //    扶手那只手保持在横杆上不动
    { t: 0.172, lean: 7, sway: -0.42, hipR: 55, kneeR: 88, abdR: 11, armAbdL: 26, armAbdR: 11, elbR: 48 },
    { t: 0.862, lean: 7, sway: -0.42, hipR: 55, kneeR: 88, abdR: 11, armAbdL: 24, armAbdR: 11, elbR: 48, ease: 'hold' },
    { t: 0.945, lean: 5, sway: -0.30, hipR: 6, kneeR: 8, abdR: 5, armAbdL: 10, armAbdR: 10, elbR: 47 },
    { t: 1.00, lean: 0, sway: 0, hipR: 0, kneeR: 4, abdR: 5, armAbdL: 7, armAbdR: 8, elbR: 45 }
  ],
  phases: [
    { to: 0.103, label: '重心先移到站立的那条腿' },
    { to: 0.862, label: '抬起另一条腿，心里数到 10' },
    { to: 1.00, label: '慢慢放下' }
  ],
  cautions: ['扶手就在手边，站不稳马上扶。', '先练好腿单腿站，找到感觉再换患侧。']
},

{
  id: 'gait', name: '步行训练', sub: '一步一步，脚跟先着地',
  m: [4, 5], h: null, group: '步行',
  dose: '连续走 5～10 分钟 · 一天 2 次',
  purpose: '走路不是走够步数就行 —— 是每一步都走对。脚跟先落地、患腿敢承重、两步一样长，这三件事决定了走得稳不稳。',
  view: { cx: 0.15, cy: -3.5, span: 8.4 },
  anchor: 'ground', ax: 0, ay: 0,
  props: [{ k: 'floor' }],
  focus: ['ankle'], trail: 'toe',
  base: { trunk: 4, neck: -2, sho: 0, elb: 14, shoF: 0, elbF: 14 },
  cycle: 2800,
  /* 一个完整步态周期。近侧腿（患侧）在 t=0 脚跟着地，远侧腿相位差 50%。
   * 角度取自标准步态运动学：着地 髋30/膝0/踝0 → 承重反应 膝18/踝-5 →
   * 支撑中期 髋0/膝5/踝+5 → 支撑末期 髋-15/踝+10 → 蹬离 膝40/踝-18 →
   * 摆动中期 髋30/膝60 → 摆动末期 髋30/膝5/踝0（脚尖勾住准备着地）。*/
  keyframes: [
    { t: 0.00, hip: 30, knee: 3, ankle: 0,   hipF: -8, kneeF: 40, ankleF: -18, sho: -22, elb: 10, shoF: 24, elbF: 30 },
    { t: 0.12, hip: 25, knee: 18, ankle: -5, hipF: 10, kneeF: 58, ankleF: -6,  sho: -18, elb: 10, shoF: 18, elbF: 26 },
    { t: 0.31, hip: 8,  knee: 8,  ankle: 5,  hipF: 26, kneeF: 42, ankleF: 0,   sho: -6,  elb: 12, shoF: 6,  elbF: 18 },
    { t: 0.50, hip: -15, knee: 5, ankle: 10, hipF: 30, kneeF: 5,  ankleF: 0,   sho: 24,  elb: 30, shoF: -22, elbF: 10 },
    { t: 0.62, hip: -8, knee: 40, ankle: -18, hipF: 25, kneeF: 18, ankleF: -5, sho: 18,  elb: 26, shoF: -18, elbF: 10 },
    { t: 0.75, hip: 10, knee: 58, ankle: -6, hipF: 8,  kneeF: 8,  ankleF: 5,   sho: 6,   elb: 18, shoF: -6,  elbF: 12 },
    { t: 0.87, hip: 26, knee: 42, ankle: 0,  hipF: -15, kneeF: 5, ankleF: 10,  sho: -12, elb: 12, shoF: 12,  elbF: 20 },
    { t: 1.00, hip: 30, knee: 3,  ankle: 0,  hipF: -8, kneeF: 40, ankleF: -18, sho: -22, elb: 10, shoF: 24, elbF: 30 }
  ],
  phases: [
    { to: 0.12, label: '患腿脚跟先着地，脚尖是抬着的' },
    { to: 0.31, label: '重心压到患腿上，膝盖别锁死' },
    { to: 0.62, label: '脚跟抬起，前脚掌把身体蹬出去' },
    { to: 1.00, label: '腿摆到前面，脚尖勾住准备落地' }
  ],
  cautions: ['走廊里练，扶着墙；不要在光滑地面上练。', '走到有点喘、还能说话，就是合适的强度。'],
  compare: {
    label: '拖着走 · 脚尖勾不起来',
    why: '摆腿的时候脚尖一直垂着（足下垂），脚会在地上蹭、被门槛绊倒；同时膝盖抬不高，只能把腿往外划一圈。走路先练「勾脚尖」，必要时问医生要不要配踝足矫形器。',
    keyframes: [
      { t: 0.00, hip: 20, knee: 8, ankle: -14, hipF: -5, kneeF: 30, ankleF: -20, sho: -7, shoF: 7 },
      { t: 0.12, hip: 17, knee: 14, ankle: -12, hipF: 8, kneeF: 38, ankleF: -16, sho: -5, shoF: 5 },
      { t: 0.31, hip: 6,  knee: 6,  ankle: 2,  hipF: 18, kneeF: 28, ankleF: -14, sho: -3, shoF: 3 },
      { t: 0.50, hip: -10, knee: 4, ankle: 6,  hipF: 20, kneeF: 8,  ankleF: -14, sho: 7,  shoF: -7 },
      { t: 0.62, hip: -6, knee: 26, ankle: -16, hipF: 17, kneeF: 14, ankleF: -12, sho: 5, shoF: -5 },
      { t: 0.75, hip: 6,  knee: 32, ankle: -18, hipF: 6, kneeF: 6,  ankleF: 2,   sho: 3,  shoF: -3 },
      { t: 0.87, hip: 17, knee: 22, ankle: -16, hipF: -10, kneeF: 4, ankleF: 6,  sho: -4, shoF: 4 },
      { t: 1.00, hip: 20, knee: 8,  ankle: -14, hipF: -5, kneeF: 30, ankleF: -20, sho: -7, shoF: 7 }
    ]
  }
},

/* ───────────────────────── 上肢 · 手 ───────────────────────── */
{
  id: 'shoulder-flex', name: '肩前屈上举', sub: '手臂往前、往上举',
  m: null, h: [3, 4, 5], group: '上肢',
  dose: '10 次 / 组 · 3 组 · 一天 2 次',
  purpose: '够高处的东西、晾衣服、梳头，靠的都是这个动作。举得越高，能自己做的事越多。',
  view: { cx: 0.75, cy: -3.9, span: 9.6 },
  anchor: 'ground', ax: 0, ay: 0,
  props: [{ k: 'floor' }],
  focus: ['shoulder'], trail: 'hand',
  base: STAND, cycle: 7000,   // 举 2s → 停 2s → 慢慢放下 3s
  keyframes: [
    { t: 0.00, sho: 6, elb: 12, shoF: 3, elbF: 10, trunk: 2, neck: -1 },
    { t: 0.286, sho: 152, elb: 6, shoF: 5, elbF: 10, trunk: 2, neck: 2 },   // 手臂伸直举到接近头顶
    { t: 0.571, sho: 152, elb: 6, shoF: 5, elbF: 10, trunk: 2, neck: 2, ease: 'hold' },
    { t: 1.00, sho: 6, elb: 12, shoF: 3, elbF: 10, trunk: 2, neck: -1 }
  ],
  phases: [
    { to: 0.286, label: '手臂伸直，往前往上举' },
    { to: 0.571, label: '举到不疼的最高处，停 2 秒' },
    { to: 1.00, label: '慢慢放下来' }
  ],
  cautions: ['疼就是上限，到疼之前停住 —— 卒中后的肩膀经不起硬拉。', '肩膀出现持续疼痛、摸到凹陷，告诉医生。'],
  compare: {
    label: '身体后仰、屈着肘凑高度',
    why: '手看着举高了，其实是腰往后仰、胳膊肘弯着凑出来的 —— 肩关节只动了一半，腰还容易闪着。举不高就举到能到的地方，别用身子凑。',
    keyframes: [
      { t: 0.00, sho: 6, elb: 12, shoF: 3, elbF: 10, trunk: 2, neck: -1 },
      { t: 0.286, sho: 104, elb: 54, shoF: 4, elbF: 10, trunk: -14, neck: -12 },
      { t: 0.571, sho: 104, elb: 54, shoF: 4, elbF: 10, trunk: -14, neck: -12, ease: 'hold' },
      { t: 1.00, sho: 6, elb: 12, shoF: 3, elbF: 10, trunk: 2, neck: -1 }
    ]
  }
},

/* ───────────────────────── 手 · 精细 ─────────────────────────
 * 手部特写用同一套渲染器的手部视图（handView）。
 * 角度：wri 腕（+背伸/-掌屈）· curl 手指卷曲（0 完全伸直、1 完全握拳、负数是掌指过伸）
 *       spread 五指分开 · thumb 拇指（0 外展伸直、1 横过掌心）
 */
{
  id: 'grip', name: '握拳伸展', sub: '张开、握紧',
  m: null, h: [1, 2, 3], group: '手',
  handView: 'palm',
  view: { cx: -0.06, cy: -0.40, span: 4.75 },
  dose: '20 次 / 组 · 3 组 · 一天 2～3 次',
  purpose: '手指长时间攥着会慢慢僵死，掰不开。每天张开握紧是最直接的预防 —— 也是以后能拿住东西的前提。',
  focus: ['finger'],
  base: { wri: 6, curl: 0.30, spread: 0.2, thumb: 0.3 },
  cycle: 3600,
  keyframes: [
    // 张开到最大：掌指关节略过伸（-0.26 ≈ 过伸 17°）、五指分开、拇指外展
    { t: 0.00, wri: 8, curl: -0.26, spread: 1, thumb: 0 },
    { t: 0.18, wri: 8, curl: -0.26, spread: 1, thumb: 0, ease: 'hold' },
    // 握成拳：掌指 88°、近节指间 105°、远节指间 72°，拇指横过手指外面
    { t: 0.50, wri: 2, curl: 1, spread: 0, thumb: 1 },
    { t: 0.68, wri: 2, curl: 1, spread: 0, thumb: 1, ease: 'hold' },
    { t: 1.00, wri: 8, curl: -0.26, spread: 1, thumb: 0 }
  ],
  phases: [
    { to: 0.18, label: '五指尽量张开，撑到最大' },
    { to: 0.68, label: '再慢慢握成拳，拇指压在手指外面' },
    { to: 1.00, label: '重新张开' }
  ],
  cautions: ['他自己做不了，就用你的手一根一根轻轻掰开 —— 只用很轻的力。', '掰不动就停，不要较劲。']
},

{
  id: 'wrist', name: '腕关节屈伸', sub: '手腕上下摆',
  m: null, h: [1, 2, 3, 4], group: '手',
  handView: 'side', box: 'mid',
  view: { cx: -0.30, cy: 0.30, span: 4.90 },
  // 前臂垫在桌面上，手腕露在桌沿外面 —— 这样才是「前臂垫稳，只动手腕」
  props: [{ k: 'table', x0: -3.6, x1: -0.50, y: 0.47 }],
  dose: '20 次 / 组 · 2～3 组 · 一天 2 次',
  purpose: '手腕僵住会让整只手都用不上 —— 抓握、端碗、写字，全都要先有一个能立起来的手腕。',
  focus: ['wrist'],
  base: { wri: 0, curl: 0.20, spread: 0.06, thumb: 0.18 },
  cycle: 3200,
  keyframes: [
    // 背伸约 60°、掌屈约 55°（正常主动活动度），手指全程放松微屈
    { t: 0.00, wri: 0 },
    { t: 0.26, wri: 60 },
    { t: 0.40, wri: 60, ease: 'hold' },
    { t: 0.70, wri: -55 },
    { t: 0.84, wri: -55, ease: 'hold' },
    { t: 1.00, wri: 0 }
  ],
  phases: [
    { to: 0.40, label: '前臂垫稳，手腕往上翘起来' },
    { to: 0.84, label: '再往下垂，到有点紧就够' },
    { to: 1.00, label: '回到中间' }
  ],
  cautions: ['是上下摆，不是转圈 —— 手腕不适合大幅度旋转。', '不要压到疼。']
}
];

if (typeof module !== 'undefined' && module.exports) module.exports = LIBRARY;
