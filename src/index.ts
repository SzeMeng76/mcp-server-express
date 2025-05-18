#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ExpressClient } from './express.js';

// 解析命令行参数
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value;
    }
  });
  return args;
}

const args = parseArgs();
const auth_key = args.auth_key || "";
const customer = args.customer || "";

// 验证必要的参数
if (!auth_key) {
  console.error('错误: 缺少 auth_key 参数');
  console.error('用法: npx mcp-server-express-maxbin --auth_key=您的授权密钥 --customer=您的客户ID');
  process.exit(1);
}

if (!customer) {
  console.error('错误: 缺少 customer 参数');
  console.error('用法: npx mcp-server-express-maxbin --auth_key=您的授权密钥 --customer=您的客户ID');
  process.exit(1);
}

// 创建 Express 客户端
const expressClient = new ExpressClient(customer, auth_key);

// 创建 MCP 服务器
const server = new McpServer({
  name: 'express-service',
  version: '1.0.0',
});

// 定义查询快递的工具
server.tool(
  'query-express',
  '实时查询快递物流信息',
  {
    com: z.string().describe('快递公司名称或快递编码'),
    num: z.string().describe('快递单号'),
    phone: z.string().optional().describe('手机号码'),
    from: z.string().optional().describe('出发地'),
    to: z.string().optional().describe('目的地'),
    resultv2: z.string().optional().describe('开启高级物流状态'),
    show: z.string().optional().default('0').describe('返回JSON格式'),
    order: z.string().optional().default('desc').describe('降序排列')
  },
  async ({ com, num, phone = '', from = '', to = '', resultv2 = '', show = '0', order = 'desc' }) => {
    if (!com) {
      throw new Error("请输入快递公司名称或编码");
    }
    if (!num) {
      throw new Error("请输入快递单号");
    }

    try {
      // 尝试将中文快递公司名称转换为编码
      const companyCode = expressClient.getCompanyCode(com);
      
      const result = await expressClient.query({
        com: companyCode,
        num,
        phone,
        from,
        to,
        resultv2,
        show,
        order
      });

      return {
        content: [
          {
            type: 'text',
            text: formatExpressResult(result),
          },
        ],
      };
    } catch (error) {
      console.error('[ERROR] Failed to query express:', error);
      return {
        content: [
          {
            type: 'text',
            text: '查询快递信息失败: ' + (error instanceof Error ? error.message : String(error)),
          },
        ],
      };
    }
  },
);

// 定义比较快递价格的工具
server.tool(
  'compare-price',
  '查询多个快递公司快递价格',
  {
    weight: z.number().optional().default(1).describe('重量'),
    length: z.number().optional().describe('长度'),
    width: z.number().optional().describe('宽度'),
    height: z.number().optional().describe('高度'),
    from: z.string().describe('出发地'),
    to: z.string().describe('目的地')
  },
  async ({ weight = 1, length, width, height, from, to }) => {
    if (!from) {
      throw new Error("请输入出发地");
    }
    if (!to) {
      throw new Error("请输入目的地");
    }

    try {
      const results = await expressClient.comparePrice({
        weight,
        length,
        width,
        height,
        from,
        to
      });

      return {
        content: [
          {
            type: 'text',
            text: formatPriceComparisonResult(results),
          },
        ],
      };
    } catch (error) {
      console.error('[ERROR] Failed to compare express prices:', error);
      return {
        content: [
          {
            type: 'text',
            text: '比较快递价格失败: ' + (error instanceof Error ? error.message : String(error)),
          },
        ],
      };
    }
  },
);

// 格式化快递查询结果
function formatExpressResult(result: any) {
  if (typeof result === 'string') {
    return result;
  }
  
  try {
    if (result.status === '200') {
      const data = result.data || {};
      let formatted = `快递单号: ${data.nu || 'N/A'}\n`;
      formatted += `快递公司: ${data.com || 'N/A'}\n`;
      formatted += `状态: ${data.state ? getStateDescription(data.state) : 'N/A'}\n\n`;
      
      if (Array.isArray(data.data) && data.data.length > 0) {
        formatted += `物流详情:\n`;
        data.data.forEach((item: any, index: number) => {
          formatted += `${index + 1}. [${item.ftime || item.time || 'N/A'}] ${item.context || 'N/A'}\n`;
        });
      } else {
        formatted += `暂无物流详情`;
      }
      
      return formatted;
    } else {
      return `查询失败: ${result.message || '未知错误'}`;
    }
  } catch (e) {
    return `解析结果失败: ${JSON.stringify(result)}`;
  }
}

// 获取物流状态描述
function getStateDescription(state: string): string {
  const stateMap: Record<string, string> = {
    '0': '在途中',
    '1': '已揽收',
    '2': '疑难',
    '3': '已签收',
    '4': '退签',
    '5': '派送中',
    '6': '退回',
    '7': '转单'
  };
  
  return stateMap[state] || `未知状态(${state})`;
}

// 格式化价格比较结果
function formatPriceComparisonResult(results: any) {
  if (typeof results === 'string') {
    return results;
  }
  
  try {
    if (Array.isArray(results)) {
      let formatted = `快递价格比较结果:\n\n`;
      results.forEach((item: any, index: number) => {
        formatted += `${index + 1}. ${item.name || 'N/A'}\n`;
        formatted += `   价格: ¥${item.price || 'N/A'}\n`;
        formatted += `   时效: ${item.time || 'N/A'}\n`;
        if (item.discount) {
          formatted += `   优惠: ${item.discount}\n`;
        }
        formatted += '\n';
      });
      return formatted;
    } else {
      return `价格比较失败: ${JSON.stringify(results)}`;
    }
  } catch (e) {
    return `解析结果失败: ${JSON.stringify(results)}`;
  }
}

// 启动服务器
async function main() {
  console.log('启动快递查询 MCP 服务器...');
  console.log(`客户ID: ${customer}`);
  console.log(`授权密钥: ${auth_key.substring(0, 3)}${'*'.repeat(auth_key.length - 6)}${auth_key.substring(auth_key.length - 3)}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Express MCP Server 已通过 stdio 启动');
}

main().catch((error) => {
  console.error('启动服务器时发生错误:', error);
  process.exit(1);
});
