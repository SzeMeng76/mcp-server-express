/**
 * 中国省份信息
 */
export const provinces: { [key: string]: { region: string; code: string } } = {
  // 华东地区
  '上海': { region: '华东', code: '310000' },
  '江苏': { region: '华东', code: '320000' },
  '浙江': { region: '华东', code: '330000' },
  '安徽': { region: '华东', code: '340000' },
  '福建': { region: '华东', code: '350000' },
  '江西': { region: '华东', code: '360000' },
  '山东': { region: '华东', code: '370000' },
  '台湾': { region: '华东', code: '710000' },
  
  // 华北地区
  '北京': { region: '华北', code: '110000' },
  '天津': { region: '华北', code: '120000' },
  '河北': { region: '华北', code: '130000' },
  '山西': { region: '华北', code: '140000' },
  '内蒙古': { region: '华北', code: '150000' },
  
  // 华中地区
  '河南': { region: '华中', code: '410000' },
  '湖北': { region: '华中', code: '420000' },
  '湖南': { region: '华中', code: '430000' },
  
  // 华南地区
  '广东': { region: '华南', code: '440000' },
  '广西': { region: '华南', code: '450000' },
  '海南': { region: '华南', code: '460000' },
  '香港': { region: '华南', code: '810000' },
  '澳门': { region: '华南', code: '820000' },
  
  // 西南地区
  '重庆': { region: '西南', code: '500000' },
  '四川': { region: '西南', code: '510000' },
  '贵州': { region: '西南', code: '520000' },
  '云南': { region: '西南', code: '530000' },
  '西藏': { region: '西南', code: '540000' },
  
  // 西北地区
  '陕西': { region: '西北', code: '610000' },
  '甘肃': { region: '西北', code: '620000' },
  '青海': { region: '西北', code: '630000' },
  '宁夏': { region: '西北', code: '640000' },
  '新疆': { region: '西北', code: '650000' },
  
  // 东北地区
  '辽宁': { region: '东北', code: '210000' },
  '吉林': { region: '东北', code: '220000' },
  '黑龙江': { region: '东北', code: '230000' }
};

/**
 * 判断两个地区是否属于同一省份
 * @param from 出发地
 * @param to 目的地
 * @returns 是否同省
 */
export function isSameProvince(from: string, to: string): boolean {
  // 提取省份名称
  const fromProvince = extractProvince(from);
  const toProvince = extractProvince(to);
  
  return fromProvince === toProvince;
}

/**
 * 判断两个地区是否属于同一区域（华东、华北等）
 * @param from 出发地
 * @param to 目的地
 * @returns 是否同区域
 */
export function isSameRegion(from: string, to: string): boolean {
  // 提取省份名称
  const fromProvince = extractProvince(from);
  const toProvince = extractProvince(to);
  
  if (!fromProvince || !toProvince) return false;
  
  const fromRegion = provinces[fromProvince]?.region;
  const toRegion = provinces[toProvince]?.region;
  
  return fromRegion === toRegion;
}

/**
 * 从地址中提取省份名称
 * @param address 地址
 * @returns 省份名称
 */
export function extractProvince(address: string): string | null {
  if (!address) return null;
  
  // 直辖市特殊处理
  const directCities = ['北京', '上海', '天津', '重庆'];
  for (const city of directCities) {
    if (address.startsWith(city)) {
      return city;
    }
  }
  
  // 尝试匹配省份名称
  for (const province in provinces) {
    if (address.startsWith(province)) {
      return province;
    }
  }
  
  // 特殊情况处理：简称或其他常见表达
  if (address.startsWith('浙')) return '浙江';
  if (address.startsWith('苏')) return '江苏';
  if (address.startsWith('粤')) return '广东';
  if (address.startsWith('鲁')) return '山东';
  if (address.startsWith('皖')) return '安徽';
  if (address.startsWith('闽')) return '福建';
  if (address.startsWith('赣')) return '江西';
  if (address.startsWith('冀')) return '河北';
  if (address.startsWith('豫')) return '河南';
  if (address.startsWith('鄂')) return '湖北';
  if (address.startsWith('湘')) return '湖南';
  if (address.startsWith('琼')) return '海南';
  if (address.startsWith('川') || address.startsWith('蜀')) return '四川';
  if (address.startsWith('黔')) return '贵州';
  if (address.startsWith('滇')) return '云南';
  if (address.startsWith('陕')) return '陕西';
  if (address.startsWith('甘')) return '甘肃';
  if (address.startsWith('辽')) return '辽宁';
  if (address.startsWith('吉')) return '吉林';
  if (address.startsWith('黑')) return '黑龙江';
  
  return null;
}

/**
 * 判断地区是否为偏远地区
 * @param address 地址
 * @returns 是否为偏远地区
 */
export function isRemoteArea(address: string): boolean {
  const province = extractProvince(address);
  if (!province) return false;
  
  // 定义偏远地区列表
  const remoteProvinces = ['西藏', '新疆', '青海', '宁夏', '内蒙古'];
  return remoteProvinces.includes(province);
}

/**
 * 判断地区是否为江浙沪地区
 * @param address 地址
 * @returns 是否为江浙沪地区
 */
export function isJiangZheHu(address: string): boolean {
  const province = extractProvince(address);
  if (!province) return false;
  
  return ['江苏', '浙江', '上海'].includes(province);
}