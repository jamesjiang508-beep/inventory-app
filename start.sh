#!/bin/bash

echo "========================================"
echo "启动衣服库存管理系统"
echo "========================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js！"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "[提示] 首次运行，正在安装依赖..."
    echo ""
    npm install
    echo ""
fi

# 启动服务器
echo "[启动] 正在启动服务器..."
echo ""

# 根据系统选择打开浏览器的命令
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:3000 2>/dev/null || echo "请手动打开浏览器访问 http://localhost:3000"
fi

node server.js
