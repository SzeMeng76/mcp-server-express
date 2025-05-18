import crypto from 'crypto';
import { provinces, isSameProvince, isRemoteArea, isJiangZheHu } from './provinces.js';


const EXPRESS_COM_MAP: { [key: string]: string } = {
  '中通': 'zhongtong',
  '圆通': 'yuantong',
  '韵达': 'yunda',
  '申通': 'shentong',
  '顺丰': 'shunfengkuaiyun',
  '邮政': 'youzhengguonei',
  'ems': 'ems',
  '极兔': 'jtexpress',
  '京东': 'jd',
  '德邦': 'debangwuliu',
  '百世': 'huitongkuaidi',
  '天天': 'tiantian',
  '全峰': 'quanfengkuaidi',
  '德邦快递': 'debangwuliu',
  '圆通快递': 'yuantong',
  '韵达快递': 'yunda',
  '申通快递': 'shentong',
  '顺丰快递': 'shunfengkuaiyun',
  '邮政快递': 'youzhengguonei',
  '极兔快递': 'jtexpress',
  '京东快递': 'jd'
};


interface ExpressQueryParams {
    com: string;          // 快递公司编码
    num: string;          // 快递单号
    phone?: string;       // 手机号码（部分快递公司必填）
    from?: string;        // 出发地城市
    to?: string;          // 目的地城市
    resultv2?: string;    // 行政区域解析功能
    show?: string;        // 返回格式
    order?: string;       // 返回结果排序
    // lang?: string;        // 返回结果语言版本
}

/**
 * 快递价格比对接口参数
 */
export interface ExpressPriceCompareParams {
    weight?: number;      // 包裹重量(kg)，默认为1kg
    length?: number;      // 包裹长度(cm)
    width?: number;       // 包裹宽度(cm)
    height?: number;      // 包裹高度(cm)
    from: string;         // 出发地城市
    to: string;           // 目的地城市
}

/**
 * 快递价格比对结果
 */
export interface ExpressPriceCompareResult {
    company: string;      // 快递公司名称
    code: string;         // 快递公司编码
    price: number;        // 价格(元)
    firstWeight: number;  // 首重价格(元)
    additionalWeight: number; // 续重单价(元/kg)
    volumeWeight: number; // 体积重量(kg)
    actualWeight: number; // 计费重量(kg)
    isRemote: boolean;    // 是否偏远地区
    isSameProvince: boolean; // 是否同省
    isSameCity: boolean;  // 是否同城
    description: string;  // 描述信息
}

export interface ExpressQueryResult {
    message: string;
    state: string;        // 快递单当前状态
    status: string;       // 通讯状态
    condition: string;    // 快递单明细状态标记
    ischeck: string;      // 是否签收标记
    com: string;         // 快递公司编码
    nu: string;          // 单号
    data: Array<{
        context: string;  // 内容
        time: string;    // 时间
        ftime: string;   // 格式化后时间
        status?: string; // 物流状态名称
        statusCode?: string; // 高级物流状态值
        areaCode?: string;  // 行政区域编码
        areaName?: string;  // 行政区域名称
        areaCenter?: string; // 行政区域经纬度
        location?: string;   // 快件当前地点
        areaPinYin?: string; // 行政区域拼音
    }>;
}

export class ExpressClient {
    private readonly apiUrl = 'https://poll.kuaidi100.com/poll/query.do';
    private readonly customer: string;
    private readonly key: string;
    
    // 快递公司抛比系数
    private readonly volumeRatios: { [key: string]: number } = {
        '顺丰': 12000,
        '京东': 4800,
        '中通': 8000,
        '圆通': 8000,
        '韵达': 8000,
        '申通': 8000,
        '德邦': 6000,
        '邮政': 6000,
        '极兔': 8000,
        'ems': 6000
    };
    
    // 快递公司价格配置
    private readonly priceConfig: { [key: string]: { sameCity: number, sameProvince: number, crossProvince: number, additionalWeight: number } } = {
        '顺丰': { sameCity: 13, sameProvince: 18, crossProvince: 22, additionalWeight: 8 },
        '中通': { sameCity: 10, sameProvince: 10, crossProvince: 13, additionalWeight: 6 },
        '圆通': { sameCity: 8, sameProvince: 8, crossProvince: 15, additionalWeight: 12 },
        '韵达': { sameCity: 10, sameProvince: 10, crossProvince: 13, additionalWeight: 7 },
        '申通': { sameCity: 10, sameProvince: 10, crossProvince: 14, additionalWeight: 7 },
        '德邦': { sameCity: 12, sameProvince: 12, crossProvince: 11, additionalWeight: 3 },
        '邮政': { sameCity: 6, sameProvince: 8, crossProvince: 10, additionalWeight: 3 },
        '极兔': { sameCity: 10, sameProvince: 10, crossProvince: 13, additionalWeight: 6 },
        '京东': { sameCity: 12, sameProvince: 15, crossProvince: 18, additionalWeight: 10 },
        'ems': { sameCity: 12, sameProvince: 15, crossProvince: 18, additionalWeight: 10 }
    };

    constructor(customer: string, key: string) {
        this.customer = customer;
        this.key = key;
    }

    /**
     * 生成签名
     * @param param 查询参数
     * @returns 32位大写MD5签名
     */
    private generateSign(param: string): string {
        const signStr = param + this.key + this.customer;
        return crypto.createHash('md5')
            .update(signStr)
            .digest('hex')
            .toUpperCase();
    }

    /**
     * 查询快递信息
     * @param params 查询参数
     * @returns 快递查询结果
     */
    async query(params: ExpressQueryParams): Promise<any> {
        console.log('开始查询快递信息:', JSON.stringify(params, null, 2));
        
        const param = JSON.stringify(params);
        const sign = this.generateSign(param);
        console.log('生成的签名信息:', {
            param,
            sign,
            customer: this.customer
        });

        try {
            console.log('开始发送HTTP请求...');
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    customer: this.customer,
                    sign: sign,
                    param: param
                }).toString()
            });
            
            console.log('HTTP响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API返回错误:', errorText);
                throw new Error(`API请求失败: HTTP ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('API返回结果:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('请求发生错误:', error);
            throw new Error(`快递查询失败: ${(error as Error).message ?? String(error)}`);
        }
    }

    /**
     * 根据中文快递公司名称获取编码
     * @param companyName 中文快递公司名称
     * @returns 快递公司编码
     */
    getCompanyCode(companyName: string): string {
        // 判断是否为中文
        const isChinese = /[\u4e00-\u9fa5]/.test(companyName);
        if (isChinese) {
            const code = EXPRESS_COM_MAP[companyName];
            if (!code) {
                throw new Error(`不支持的快递公司: ${companyName}`);
            }
            return code;
        }
        return companyName;
    }

    /**
     * 计算体积重量
     * @param company 快递公司名称
     * @param length 长度(cm)
     * @param width 宽度(cm)
     * @param height 高度(cm)
     * @returns 体积重量(kg)
     */
    private calculateVolumeWeight(company: string, length?: number, width?: number, height?: number): number {
        // 如果没有提供尺寸信息，返回0
        if (!length || !width || !height) {
            return 0;
        }

        // 获取抛比系数
        const ratio = this.volumeRatios[company] || 8000; // 默认使用8000
        
        // 计算体积重量: 长 × 宽 × 高 ÷ 抛比系数
        const volumeWeight = (length * width * height) / ratio;
        
        // 向上取整到小数点后一位
        return Math.ceil(volumeWeight * 10) / 10;
    }

    /**
     * 计算快递价格
     * @param company 快递公司名称
     * @param weight 实际重量(kg)
     * @param volumeWeight 体积重量(kg)
     * @param from 出发地
     * @param to 目的地
     * @returns 价格信息
     */
    private calculatePrice(company: string, weight: number, volumeWeight: number, from: string, to: string): {
        price: number;
        firstWeight: number;
        additionalWeight: number;
        actualWeight: number;
        isRemote: boolean;
        isSameProvince: boolean;
        isSameCity: boolean;
    } {
        // 获取价格配置
        const config = this.priceConfig[company];
        if (!config) {
            throw new Error(`未找到快递公司价格配置: ${company}`);
        }

        // 判断地区关系
        // 避免函数名与变量名冲突,重命名变量
        const isInSameProvince = from === to || isSameProvince(from, to);
        const isSameCity = from === to;
        const isRemote = isRemoteArea(to);
        
        // 特殊处理江浙沪地区的圆通快递
        const isJiangZheHuFlag = isJiangZheHu(from) && isJiangZheHu(to);
        
        // 确定首重价格
        let firstWeight = config.crossProvince; // 默认使用跨省价格
        if (isSameCity) {
            firstWeight = config.sameCity;
        } else if (isInSameProvince) {
            firstWeight = config.sameProvince;
        }
        
        // 特殊处理圆通江浙沪区域
        if (company === '圆通' && isJiangZheHuFlag) {
            firstWeight = 8; // 江浙沪8元不限重
        }
        
        // 偏远地区附加费
        if (isRemote) {
            firstWeight += 10; // 偏远地区加收10元
        }
        
        // 确定计费重量（取实际重量和体积重量的较大值）
        const actualWeight = Math.max(weight, volumeWeight);
        
        // 不足1kg按1kg计算
        const roundedWeight = Math.max(1, Math.ceil(actualWeight));
        
        // 计算价格: 首重价 + (总重量 - 首重) × 续重单价
        let price = firstWeight;
        if (roundedWeight > 1) {
            // 圆通江浙沪区域特殊处理
            if (company === '圆通' && isJiangZheHuFlag) {
                price = 8; // 江浙沪8元不限重
            } else {
                price += (roundedWeight - 1) * config.additionalWeight;
            }
        }
        
        // 德邦快递20kg以上大件优惠
        if (company === '德邦' && roundedWeight > 20) {
            // 大件优惠: 超过20kg部分，每kg减少0.5元
            const discount = Math.min((roundedWeight - 20) * 0.5, price * 0.3); // 最多优惠30%
            price -= discount;
        }
        
        // 四舍五入到小数点后两位
        price = Math.round(price * 100) / 100;
        
        return {
            price,
            firstWeight,
            additionalWeight: config.additionalWeight,
            actualWeight: roundedWeight,
            isRemote,
            isSameProvince: isInSameProvince,
            isSameCity
        };
    }

    /**
     * 比对各快递公司价格
     * @param params 价格比对参数
     * @returns 各快递公司价格比对结果
     */
    comparePrice(params: ExpressPriceCompareParams): ExpressPriceCompareResult[] {
        // 参数验证
        if (!params.from || !params.to) {
            throw new Error('必须提供出发地和目的地参数');
        }
        console.log('开始比对快递价格:', JSON.stringify(params, null, 2));
        
        // 设置默认值
        const weight = params.weight || 1; // 默认1kg
        const { length, width, height, from, to } = params;
        
        // 获取所有支持的快递公司
        const companies = Object.keys(this.priceConfig);
        
        // 计算各快递公司价格
        const results: ExpressPriceCompareResult[] = companies.map(company => {
            // 计算体积重量
            const volumeWeight = this.calculateVolumeWeight(company, length, width, height);
            
            // 计算价格
            const priceInfo = this.calculatePrice(company, weight, volumeWeight, from, to);
            
            // 生成描述信息
            let description = `首重(1kg)${priceInfo.firstWeight}元`;
            if (priceInfo.actualWeight > 1) {
                description += `，续重${priceInfo.additionalWeight}元/kg`;
            }
            
            if (priceInfo.isRemote) {
                description += '，偏远地区';
            }
            
            if (priceInfo.isSameCity) {
                description += '，同城快递';
            } else if (priceInfo.isSameProvince) {
                description += '，省内快递';
            } else {
                description += '，跨省快递';
            }
            
            // 特殊说明
            if (company === '顺丰') {
                description += '，高时效';
            } else if (company === '德邦' && priceInfo.actualWeight > 20) {
                description += '，大件优惠';
            } else if (company === '圆通' && isJiangZheHu(from) && isJiangZheHu(to)) {
                description += '，江浙沪地区优惠';
            }
            
            // 获取快递公司编码
            const code = this.getCompanyCode(company);
            
            return {
                company,
                code,
                price: priceInfo.price,
                firstWeight: priceInfo.firstWeight,
                additionalWeight: priceInfo.additionalWeight,
                volumeWeight,
                actualWeight: priceInfo.actualWeight,
                isRemote: priceInfo.isRemote,
                isSameProvince: priceInfo.isSameProvince,
                isSameCity: priceInfo.isSameCity,
                description
            };
        });
        
        // 按价格从低到高排序
        results.sort((a, b) => a.price - b.price);
        
        console.log('快递价格比对结果:', JSON.stringify(results, null, 2));
        
        return results;
    }
}

/**
 * 查询参数接口
 */
export interface QueryParams {
  com: string;
  num: string;
  phone?: string;
  from?: string;
  to?: string;
  resultv2?: string;
  show?: string;
  order?: string;
}

/**
 * 价格比较参数接口
 */
export interface PriceCompareParams {
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  from: string;
  to: string;
}
