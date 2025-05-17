# mcp-server-express MCP Server

一个基于TypeScript的MCP服务器，实现了简单的快递查询系统。

## 功能

### 工具
- `query_express` - 通过快递单号查询快递信息
  - 调用快递100接口 https://api.kuaidi100.com/manager/v2/home
- `compare_price` - 比较快递公司的寄件价格

## 开发

安装依赖：
```bash
npm install
```

构建服务器：
```bash
npm run build
```

开发模式（自动重建）：
```bash
npm run watch
```

## 安装

要与Claude Desktop一起使用，请添加服务器配置：

在MacOS上：`~/Library/Application Support/Claude/claude_desktop_config.json`
在Windows上：`%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-server-express-maxbin": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-server-express-maxbin",
        "--auth_key=kuaidi100authkey",
        "--customer=kuaidi100customer",
      ],
      "env": {}
    }
  }
}
```

### 调试

由于MCP服务器通过stdio通信，调试可能具有挑战性。我们推荐使用[MCP Inspector](https://github.com/modelcontextprotocol/inspector)，它作为一个包脚本提供：

```bash
npm run inspector
```

Inspector将提供一个URL，用于在浏览器中访问调试工具。