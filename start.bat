@echo off
echo ========================================
echo 启动衣服库存管理系统
echo ========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖...
    echo.
    call npm install
    echo.
)

REM 启动服务器
echo [启动] 正在启动服务器...
echo.
start http://localhost:3000
node server.js

pause
