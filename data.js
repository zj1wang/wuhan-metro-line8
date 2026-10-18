/**
 * 武汉地铁 8 号线 · 线路数据
 *
 * 数据来源：武汉地铁集团官网《8号线各站首末班车时间》
 *   https://www.wuhanrt.com/news-content.html?id=1447528
 *
 * downOff / upOff = 自起点站发车后，列车到达本站所需分钟数。
 * 该偏移量取自官网「末班车」时刻序列（23:00 两端对发，末班车数据自洽且严格递增），
 * 首班车列因官网表格存在滚动发车与版面错位，未直接采用。
 *
 * lat / lng 为车站实测坐标，取自 OpenStreetMap（railway=station 节点，经 Photon 地理编码核验），
 *   精度约 10–50 米，用于"定位最近站"。
 */

window.LINE8 = {
  lineName: '8号线',
  colorName: '编钟青',
  color: '#009AA8',
  colorDeep: '#006D77',
  colorLight: '#E6F6F8',

  // down = 金潭路 → 军运村（官网称下行）；up = 军运村 → 金潭路（官网称上行）
  directions: {
    down: { key: 'down', terminal: '军运村', from: '金潭路', label: '开往 军运村' },
    up:   { key: 'up',   terminal: '金潭路', from: '军运村', label: '开往 金潭路' },
  },

  // 换乘线路配色（仅用于展示标识）
  transferColors: {
    1: '#2B7CBB',
    2: '#E6003C',
    3: '#E8B500',
    4: '#5AAE3C',
    5: '#B83D8E',
    6: '#00A984',
    7: '#FF7E00',
    11: '#D9A400',
    12: '#8A6FC4',
  },

  stations: [
    { name: '金潭路',         en: 'Jintan Road',      district: '东西湖区', transfers: [],      lat: 30.678134, lng: 114.277925, downOff: 0,  upOff: 68 },
    { name: '宏图大道',       en: 'Hongtu Blvd.',     district: '东西湖区', transfers: [2, 3],  lat: 30.669734, lng: 114.273804, downOff: 2,  upOff: 66 },
    { name: '塔子湖',         en: 'Tazihu',           district: '江岸区',   transfers: [],      lat: 30.654763, lng: 114.274980, downOff: 5,  upOff: 63 },
    { name: '中一路',         en: 'Zhongyi Road',     district: '江岸区',   transfers: [],      lat: 30.642619, lng: 114.275557, downOff: 8,  upOff: 60 },
    { name: '竹叶山',         en: 'Zhuyeshan',        district: '江岸区',   transfers: [],      lat: 30.627921, lng: 114.281702, downOff: 10, upOff: 58 },
    { name: '赵家条',         en: 'Zhaojiatiao',      district: '江岸区',   transfers: [3],     lat: 30.620510, lng: 114.291610, downOff: 13, upOff: 55 },
    { name: '黄浦路',         en: 'Huangpu Road',     district: '江岸区',   transfers: [1],     lat: 30.610820, lng: 114.302707, downOff: 16, upOff: 52 },
    { name: '徐家棚',         en: 'Xujiapeng',        district: '武昌区',   transfers: [5, 7],  lat: 30.592957, lng: 114.328126, downOff: 20, upOff: 48 },
    { name: '徐东',           en: 'Xudong',           district: '武昌区',   transfers: [],      lat: 30.590442, lng: 114.340197, downOff: 22, upOff: 45 },
    { name: '汪家墩',         en: 'Wangjiadun',       district: '武昌区',   transfers: [],      lat: 30.586731, lng: 114.345710, downOff: 24, upOff: 43 },
    { name: '岳家嘴',         en: 'Yuejiazui',        district: '武昌区',   transfers: [4],     lat: 30.579217, lng: 114.356117, downOff: 27, upOff: 41 },
    { name: '梨园',           en: 'Liyuan',           district: '武昌区',   transfers: [],      lat: 30.577119, lng: 114.364560, downOff: 30, upOff: 39 },
    { name: '省博湖北日报',   en: 'Hubei Museum',     district: '武昌区',   transfers: [],      lat: 30.567110, lng: 114.359756, downOff: 33, upOff: 36 },
    { name: '中南医院',       en: 'Zhongnan Hospital',district: '武昌区',   transfers: [],      lat: 30.559201, lng: 114.351810, downOff: 35, upOff: 33 },
    { name: '水果湖',         en: 'Shuiguohu',        district: '武昌区',   transfers: [],      lat: 30.554008, lng: 114.340746, downOff: 38, upOff: 31 },
    { name: '洪山路',         en: 'Hongshan Road',    district: '武昌区',   transfers: [],      lat: 30.547736, lng: 114.338207, downOff: 40, upOff: 29 },
    { name: '小洪山',         en: 'Xiaohongshan',     district: '武昌区',   transfers: [],      lat: 30.537987, lng: 114.346978, downOff: 43, upOff: 26 },
    { name: '街道口',         en: 'Jiedaokou',        district: '洪山区',   transfers: [2],     lat: 30.528965, lng: 114.347792, downOff: 46, upOff: 23 },
    { name: '马房山',         en: 'Mafangshan',       district: '洪山区',   transfers: [11],    lat: 30.517472, lng: 114.344769, downOff: 48, upOff: 21 },
    { name: '文治街',         en: 'Wenzhi Street',    district: '洪山区',   transfers: [],      lat: 30.502964, lng: 114.338909, downOff: 51, upOff: 18 },
    { name: '文昌路',         en: 'Wenchang Road',    district: '洪山区',   transfers: [],      lat: 30.494565, lng: 114.323769, downOff: 54, upOff: 15 },
    { name: '省农科院',       en: 'Hubei Agri. Aca.', district: '洪山区',   transfers: [],      lat: 30.484113, lng: 114.320512, downOff: 57, upOff: 12 },
    { name: '马湖',           en: 'Mahu',             district: '洪山区',   transfers: [],      lat: 30.473758, lng: 114.319531, downOff: 59, upOff: 10 },
    { name: '野芷湖',         en: 'Yezhihu',          district: '洪山区',   transfers: [7],     lat: 30.463753, lng: 114.313728, downOff: 61, upOff: 7  },
    { name: '黄家湖地铁小镇', en: 'Huangjiahu Town',  district: '江夏区',   transfers: [],      lat: 30.439311, lng: 114.292658, downOff: 66, upOff: 2  },
    { name: '军运村',         en: "Military Athletes' Village", district: '江夏区', transfers: [], lat: 30.429950, lng: 114.289511, downOff: 68, upOff: 0 },
  ],

  /**
   * 行车间隔（分钟）。依据武汉地铁公开信息：8 号线工作日高峰最小间隔约 4.8 分钟，
   * 休息日最小间隔约 6.3 分钟，平峰 6~7 分钟。
   */
  intervals: {
    weekday: [
      { until: 7 * 60 + 30, gap: 7 },
      { until: 9 * 60,      gap: 4.8 },
      { until: 17 * 60,     gap: 6 },
      { until: 19 * 60 + 30, gap: 4.8 },
      { until: 21 * 60,     gap: 6 },
      { until: 24 * 60,     gap: 7 },
    ],
    weekend: [
      { until: 9 * 60,  gap: 6.5 },
      { until: 20 * 60, gap: 6.3 },
      { until: 24 * 60, gap: 7 },
    ],
  },

  // 起点站首末班发车时间（分钟）
  service: {
    weekday: { first: 6 * 60,      last: 23 * 60 },
    weekend: { first: 6 * 60 + 30,  last: 23 * 60 },
  },
};
