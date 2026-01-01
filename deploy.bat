@echo off  
echo ========================================  
echo 2026春节倒计时 - Cloudflare Pages 部署脚本  
echo ========================================  
echo.  
echo 步骤 1: 检查是否已设置 CLOUDFLARE_API_TOKEN  
if "%%CLOUDFLARE_API_TOKEN%%"=="" (  
    echo.  
    echo 错误: 未检测到 CLOUDFLARE_API_TOKEN 环境变量  
    echo.  
    echo 请按照以下步骤操作：  
    echo 1. 访问 https://dash.cloudflare.com/profile/api-tokens  
    echo 2. 创建一个新的 API Token (权限: Zone -> Edit)  
    echo 3. 在命令行中执行: set CLOUDFLARE_API_TOKEN=your_token_here  
    echo 4. 然后重新运行此脚本  
    echo.  
    pause  
    exit /b 1  
)  
echo API Token 已设置  
echo.  
echo 步骤 2: 开始部署到 Cloudflare Pages  
echo.  
npx wrangler pages deploy . --project-name=new-year-countdown  
if %0% EQU 0 (  
    echo.  
    echo 部署成功！  
    echo.  
    echo 您的网站已部署到 Cloudflare Pages  
    echo 访问地址: https://new-year-countdown.pages.dev  
) else (  
    echo.  
    echo 部署失败，请检查错误信息  
)  
echo.  
