# 图片资源目录

此目录用于存放图片资源文件。

## 推荐格式
- **SVG** - 用于图标、插图（可缩放，文件小）
- **WebP** - 用于照片（高压缩率，高质量）
- **PNG** - 用于需要透明背景的图片
- **JPG** - 用于照片（兼容性好）

## 性能优化建议
1. **图片压缩**
   - 使用 [TinyPNG](https://tinypng.com/) 或 [Squoosh](https://squoosh.app/) 压缩图片
   - 目标：保持视觉质量的同时减小文件大小

2. **响应式图片**
   ```html
   <picture>
     <source srcset="image.webp" type="image/webp">
     <source srcset="image.jpg" type="image/jpeg">
     <img src="image.jpg" alt="描述">
   </picture>
   ```

3. **懒加载**
   ```html
   <img src="image.jpg" loading="lazy" alt="描述">
   ```

## 文件组织
- `backgrounds/` - 背景图片
- `illustrations/` - 插图
- `icons/` - 图标（如果需要复杂图标）
- `photos/` - 照片

## 注意事项
- 避免使用过大的图片（> 500KB）
- 为所有图片添加适当的 `alt` 属性
- 考虑使用 CDN 加速图片加载