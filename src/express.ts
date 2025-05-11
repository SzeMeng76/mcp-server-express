import crypto from 'crypto';

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
  '中通快递': 'zhongtong',
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
    async query(params: ExpressQueryParams): Promise<String> {
        console.log('开始查询快递信息:', JSON.stringify(params, null, 2));
        
        params.com;
        
        const param = JSON.stringify(params);
        const sign = this.generateSign(param);
        console.log('生成的签名信息:', {
            param,
            sign,
            customer: this.customer
        });

        const url = `${this.apiUrl}?customer=${this.customer}&sign=${sign}&param=${param}`;
        console.log('请求URL:', url);

        try {
            console.log('开始发送HTTP请求...');
            const response = await fetch(url, {
                method: 'GET'
            });
            
            console.log('HTTP响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API返回错误:', errorText);
                throw new Error(`API请求失败: HTTP ${response.status} - ${errorText}`);
            }

            const result = await response.json() as ExpressQueryResult;
            console.log('API返回结果:', JSON.stringify(result, null, 2));
            const logisticsDetails = result.data.map((item: ExpressQueryResult['data'][0], index: number) => 
                `[${index + 1}] ${item.ftime}\n    详情：${item.context}`
            ).join('\n\n');
            return logisticsDetails;
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
}