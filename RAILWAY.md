# Railway 部署指南

Railway 会自动检测 Node.js 项目，无需额外配置文件。

## 快速部署步骤

### 1. 准备工作

确保项目根目录有以下文件：

- ✅ `package.json` - 已包含
- ✅ `server.js` - 已包含
- ✅ `.gitignore` - 已包含

### 2. 部署到 Railway

#### 方式一：通过网页部署

1. 访问 [Railway](https://railway.app)
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择您的仓库
6. Railway 会自动检测并部署

#### 方式二：使用 Railway CLI

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

### 3. 配置环境变量

Railway 会自动分配端口，`server.js` 中的 `process.env.PORT` 会自动读取。

无需手动配置！

### 4. 添加持久化存储

Railway 默认支持文件持久化，`inventory.db` 会自动保存。

如果需要明确配置持久化卷：

1. 在 Railway 项目页面
2. 点击 "Settings" → "Volumes"
3. 添加新卷：
   - Mount Path: `/app/data`
   - Size: 1GB

然后修改 `server.js` 第 16 行：

```javascript
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/inventory.db`
  : "inventory.db";
```

### 5. 获取访问地址

部署完成后：

1. 在 Railway 项目页面点击 "Settings"
2. 找到 "Domains" 部分
3. 点击 "Generate Domain"
4. 获得类似 `https://your-app.railway.app` 的地址

### 6. 监控和日志

- **查看日志**: 在项目页面点击 "Deployments" → 选择最新部署 → 查看实时日志
- **查看指标**: 点击 "Metrics" 查看 CPU、内存使用情况

## Railway 特点

✅ **优势**

- 完全免费额度（每月 $5 credit）
- 自动检测项目类型
- 支持文件持久化
- GitHub 集成，自动部署
- 提供免费域名

⚠️ **限制**

- 免费额度用完后需要付费
- 每月约 500 小时运行时间

## 故障排查

### 部署失败？

检查日志中是否有错误信息：

```bash
railway logs
```

### 数据丢失？

确认已添加持久化卷，并正确配置 `dbPath`。

### 无法访问？

检查是否已生成域名，并确保服务正在运行。

## 更新部署

每次推送到 GitHub 主分支，Railway 会自动重新部署。

或使用 CLI：

```bash
railway up
```

---

**完成！** 🎉

您的库存管理系统现在已部署到 Railway，可以通过公网访问了！
