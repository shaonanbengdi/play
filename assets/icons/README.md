# 图标文件目录

此目录用于存放各种尺寸的图标文件。

## 文件命名规范
- `icon-16.png` - 16x16px (favicon)
- `icon-32.png` - 32x32px (favicon)
- `icon-180.png` - 180x180px (iOS主屏幕)
- `icon-192.png` - 192x192px (PWA图标)
- `icon-512.png` - 512x512px (PWA图标)

## 推荐工具
- [Favicon.io](https://favicon.io/) - 生成各种尺寸的图标
- [RealFaviconGenerator](https://realfavicongenerator.net/) - 专业的图标生成器

## 使用方法
在 `manifest.json` 中引用：
```json
{
  "icons": [
    {
      "src": "assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

在 `index.html` 中引用：
```html
<link rel="icon" href="assets/icons/icon-32.png" type="image/png">