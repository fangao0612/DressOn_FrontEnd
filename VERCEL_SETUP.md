# Vercel 部署配置指南

## 🚀 快速开始

本项目已配置 Vite 构建，支持环境变量注入。

## 📝 在 Vercel 中配置环境变量

### 步骤 1: 打开 Vercel Dashboard

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的前端项目（DressOn_FrontEnd）
3. 点击 **Settings** 标签
4. 在左侧菜单选择 **Environment Variables**

### 步骤 2: 添加后端 API 地址

**推荐方式（使用同源代理）**：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `VITE_API_HOST` | `/api` | Production, Preview |

**说明**：
- 使用 `/api` 作为相对路径，利用 Vercel Rewrites 自动转发到后端
- 无需 CORS 配置，更安全
- 切换后端只需修改 `vercel.json`，无需重新构建
- `vercel.json` 已配置将 `/api/*` 转发到 RunPod 后端

**传统方式（直连后端）**：

如果你不想使用同源代理，可以直接配置后端完整 URL：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `VITE_API_HOST` | `https://rshmx6rz8b91s3-9091.proxy.runpod.net` | Production, Preview |

⚠️ **注意**：使用直连方式需要确保后端配置了正确的 CORS 允许来源。

#### 🔗 后端 URL 选项

根据你的后端部署位置选择：

**RunPod 常驻 Pod (推荐)**:
```
https://your-pod-id-9091.proxy.runpod.net
```

**Render.com**:
```
https://your-app-name.onrender.com
```

**本地测试** (仅 Development 环境):
```
http://127.0.0.1:9091
```

### 步骤 3: 保存并重新部署

1. 点击 **Save** 保存环境变量
2. 在 **Deployments** 标签中
3. 找到最新的部署，点击右侧的 **⋯** (三个点)
4. 选择 **Redeploy**
5. 勾选 **Use existing Build Cache** (可选，加速构建)
6. 点击 **Redeploy**

### 步骤 4: 验证部署

部署完成后（通常 1-2 分钟）：

1. 访问你的 Vercel 前端 URL
2. 按 **F12** 打开开发者工具
3. 查看 **Console** 标签
4. 确认没有 `ERR_CONNECTION_REFUSED` 错误
5. 查看 **Network** 标签
6. 确认请求发送到正确的后端地址（不是 127.0.0.1）

## 🔧 故障排查

### 前端仍然请求 127.0.0.1

**原因**: 环境变量未生效

**解决**:
1. 确认环境变量名是 `VITE_API_HOST`（不是 `API_HOST`）
2. 确认环境变量已应用到 **Production** 环境
3. 确认已重新部署（不是用缓存的旧版本）
4. 在浏览器中清除缓存并 Hard Refresh（Ctrl+F5）

### 前端请求后端时 CORS 错误

**原因**: 后端未允许前端域名

**解决**:
在后端环境变量中添加：
```bash
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

### 环境变量没有注入

**原因**: 旧版本没有构建步骤

**解决**:
确保使用最新代码（已包含 `vite build`）

## 📚 环境变量优先级

代码会按以下顺序查找后端 URL：

1. `localStorage.getItem('API_HOST')` (浏览器本地存储)
2. `window.FLUX_KONTEXT_BASE_URL` (全局变量)
3. `import.meta.env.VITE_API_HOST` (Vite 构建时注入) ✅
4. `import.meta.env.VITE_BACKEND_BASE_URL`
5. `import.meta.env.VITE_BASE_URL`
6. 默认: `http://127.0.0.1:9091`

## ✅ 最终检查清单

- [ ] Vercel 环境变量已设置 `VITE_API_HOST`
- [ ] 环境变量应用到 Production 环境
- [ ] 已重新部署（不使用旧缓存）
- [ ] 后端已启动并可访问
- [ ] 后端允许前端域名（CORS）
- [ ] 浏览器控制台无连接错误
- [ ] Network 面板显示请求发送到正确地址

## 🎯 当前状态

- ✅ 代码已推送到 GitHub
- ✅ Vercel 会自动检测并部署
- ⏳ **待办**: 在 Vercel 中设置 `VITE_API_HOST`

---

需要帮助？查看 `.env.example` 文件了解所有可用的环境变量。
