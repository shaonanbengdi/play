# Cloudflare Pages 部署说明

## 问题原因

原始构建失败是因为：
- 错误命令：`npx wrangler deploy src/index.tsy`
- 正确命令：`npx wrangler pages deploy .`

## 解决方案

### 步骤 1: 获取 Cloudflare API Token

1. 登录 [Cloudflare 仪表板](https://dash.cloudflare.com)
2. 访问个人资料页面：`https://dash.cloudflare.com/profile/api-tokens`
3. 点击 "Create Token"（创建令牌）
4. 选择以下配置：
   - **权限**：Zone → Edit
   - **区域资源**：Include → Specific zone → 选择您的域名
5. 点击 "Continue to summary" 然后 "Create Token"
6. **复制生成的 API Token**（这是一个长字符串）

### 步骤 2: 设置环境变量

在 Windows 命令提示符中：
```cmd
set CLOUDFLARE_API_TOKEN=your_actual_token_here
```

在 PowerShell 中：
```powershell
$env:CLOUDFLARE_API_TOKEN="your_actual_token_here"
```

在 Linux/Mac 中：
```bash
export CLOUDFLARE_API_TOKEN="your_actual_token_here"
```

### 步骤 3: 部署项目

```bash
# 方法 1: 使用环境变量
npx wrangler pages deploy . --project-name=new-year-countdown

# 方法 2: 使用部署脚本（Windows）
deploy.bat
```

### 步骤 4: 验证部署

部署成功后，您将看到类似输出：
```
✨ Deployment complete!
Your site is live at: https://new-year-countdown.pages.dev
```

## 替代方案

如果您不想使用 Cloudflare，也可以：

1. **GitHub Pages**：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/repo.git
   git push -u origin main
   ```

2. **Netlify**：拖拽整个文件夹到 Netlify 仪表板

3. **Vercel**：使用 Vercel CLI 或连接 Git 仓库

## 项目结构说明

这是一个纯静态网站项目，包含：
- `index.html` - 主页面
- `css/` - 样式文件
- `js/` - JavaScript 模块
- `assets/` - 图片、字体等资源
- `manifest.json` - PWA 配置

不需要任何服务器端代码或构建过程。