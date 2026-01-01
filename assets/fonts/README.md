# 字体文件目录

此目录用于存放自托管的Web字体文件。

## 支持的格式
- WOFF2 (首选)
- WOFF
- TTF (备用)

## 使用方法
在 `css/variables.css` 中引用字体：
```css
@font-face {
    font-family: 'YourFont';
    src: url('../assets/fonts/your-font.woff2') format('woff2'),
         url('../assets/fonts/your-font.woff') format('woff');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}
```

## 注意事项
- 仅添加已获得授权的字体
- 优化字体文件大小
- 考虑使用系统字体作为回退