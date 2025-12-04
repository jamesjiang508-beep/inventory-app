# Render 部署指南

Render 提供免费套餐，完美支持 Node.js + SQLite 应用。

## 快速部署步骤

### 1. 准备工作

确保项目根目录有 `render.yaml` 文件（已创建）。

### 2. 部署到 Render

#### 方式一：通过网页部署（推荐）

1. 访问 [Render](https://render.com)
2. 使用 GitHub/GitLab 账号登录
3. 点击 "New +" → "Web Service"
4. 连接您的 Git 仓库
5. Render 会自动检测 `render.yaml` 配置
6. 点击 "Create Web Service"

#### 方式二：手动配置

如果没有使用 `render.yaml`，可以手动填写：

- **Name**: `inventory-app`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### 3. 配置持久化磁盘

这是**最关键的一步**，确保数据不丢失：

1. 在 Web Service 创建页面或设置中
2. 找到 "Disk" 部分
3. 添加持久化磁盘：
   - **Name**: `inventory-data`
   - **Mount Path**: `/opt/render/project/src`
   - **Size**: 1 GB

如果使用 `render.yaml`，配置已自动包含。

### 4. 环境变量（可选）

Render 会自动设置 `PORT` 环境变量，无需手动配置。

### 5. 部署

点击 "Create Web Service" 后，Render 会：

1. 克隆您的仓库
2. 运行 `npm install`
3. 启动服务 `npm start`
4. 分配一个公网域名

### 6. 获取访问地址

部署完成后，您会看到：

```
Your service is live at https://inventory-app.onrender.com
```

访问这个地址即可使用您的库存管理系统！

## Render 配置文件说明

`render.yaml` 文件内容：

```yaml
services:
  - type: web
    name: inventory-app # 服务名称
    env: node # Node.js 环境
    plan: free # 免费套餐
    buildCommand: npm install # 构建命令
    startCommand: npm start # 启动命令
    disk:
      name: inventory-data # 磁盘名称
      mountPath: /opt/render/project/src # 挂载路径
      sizeGB: 1 # 磁盘大小 1GB
```

## Render 特点

✅ **优势**

- 完全免费套餐
- 支持持久化磁盘（关键！）
- 自动 HTTPS
- GitHub/GitLab 自动部署
- 提供免费子域名

⚠️ **限制**

- 免费套餐 15 分钟无活动会休眠
- 首次访问可能需要等待唤醒（10-30 秒）
- 每月 750 小时免费运行时间

## 自动部署

每次推送到 GitHub/GitLab 的主分支，Render 会自动重新部署。

您也可以在 Render 控制台手动触发部署：

1. 进入您的服务
2. 点击 "Manual Deploy" → "Deploy latest commit"

## 查看日志

1. 在 Render 控制台进入您的服务
2. 点击 "Logs" 标签
3. 查看实时日志输出

## 自定义域名（可选）

1. 在服务设置中点击 "Custom Domains"
2. 添加您的域名
3. 按照说明配置 DNS 记录

## 故障排查

### 部署失败？

- 检查 Logs 查看错误信息
- 确认 `package.json` 中的依赖正确
- 确认 Node.js 版本兼容（推荐 18.x 或 20.x）

### 数据丢失？

- **必须**配置持久化磁盘！
- 检查 `render.yaml` 中的 `disk` 配置
- 或在网页控制台手动添加 Disk

### 服务休眠？

免费套餐会在 15 分钟无活动后休眠，这是正常的。

- 可以升级到付费套餐保持持续运行
- 或接受首次访问可能有延迟

### 无法访问？

- 检查服务是否正在运行（绿色状态）
- 查看日志是否有启动错误
- 确认防火墙/网络设置

## 监控和维护

### 查看服务状态

在 Render 控制台可以看到：

- 运行状态
- CPU/内存使用
- 请求数量
- 响应时间

### 备份数据库

定期下载 `inventory.db` 文件作为备份：

通过 Render Shell：

```bash
# 在 Render 控制台打开 Shell
cat inventory.db > /tmp/backup.db
```

## 成本估算

**免费套餐**：

- 750 小时/月运行时间
- 15 分钟无活动休眠
- 足够个人或小团队使用

**付费套餐**（如需）：

- Starter: $7/月，持续运行，不休眠
- Standard: $25/月，更高性能

---

## 完整部署清单

- [x] 确认 `render.yaml` 文件存在
- [x] 推送代码到 GitHub/GitLab
- [x] 在 Render 创建 Web Service
- [x] 配置持久化磁盘
- [x] 等待自动部署完成
- [x] 访问分配的域名
- [x] 测试功能正常

**完成！** 🎉

您的库存管理系统现在已部署到 Render，可以通过公网访问了！
