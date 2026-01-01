# 2026年春节倒计时 - 技术架构文档

## 项目概述

**项目名称**: 2026年春节倒计时单页Web应用程序
**目标**: 创建一个实时倒计时计时器，结合动态粒子动画（雪花、烟花）和交互式许愿功能，以现代、节日风格呈现，完全响应式设计。
**技术栈**: 纯客户端技术（HTML5、CSS3、纯JavaScript），无外部库/框架。

---

## 1. 项目文件结构

```
new-year-countdown-2026/
├── index.html                    # 主HTML文件
├── favicon.ico                   # 网站图标
├── robots.txt                    # 搜索引擎机器人文件
├── manifest.json                 # PWA清单（可选）
├── styles/                       # CSS样式目录
│   ├── variables.css            # CSS自定义属性（颜色、字体、间距）
│   ├── layout.css               # 主要布局样式（Grid/Flexbox）
│   ├── components.css           # 组件样式（按钮、卡片、表单）
│   ├── animations.css           # CSS关键帧动画（简单过渡）
│   └── responsive.css           # 媒体查询和响应式调整
├── scripts/                      # JavaScript模块目录
│   ├── app.js                   # 应用程序入口点（初始化模块）
│   ├── countdown.js             # 倒计时计时器模块
│   ├── particles.js             # 粒子系统（Canvas动画）
│   ├── wish.js                  # 许愿功能模块（表单、画廊）
│   └── utils.js                 # 实用工具函数
├── assets/                       # 静态资源目录
│   ├── images/                  # 背景图、图标等
│   └── fonts/                   # 自托管Web字体（可选）
└── plans/                        # 项目规划文档（此文档所在目录）
```

---

## 2. HTML语义结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2026年春节倒计时</title>
    <link rel="stylesheet" href="styles/variables.css">
    <link rel="stylesheet" href="styles/layout.css">
    <link rel="stylesheet" href="styles/components.css">
    <link rel="stylesheet" href="styles/animations.css">
    <link rel="stylesheet" href="styles/responsive.css">
    <link rel="icon" href="favicon.ico">
</head>
<body>
    <!-- 粒子画布（全屏叠加） -->
    <canvas id="particle-canvas"></canvas>

    <header class="header" role="banner">
        <h1 class="title">2026年春节倒计时</h1>
        <p class="subtitle">距离农历新年还有...</p>
    </header>

    <main class="main" role="main">
        <section class="countdown-section" aria-labelledby="countdown-title">
            <h2 id="countdown-title" class="visually-hidden">倒计时计时器</h2>
            <div class="countdown-display">
                <div class="time-unit">
                    <span class="value" id="days">00</span>
                    <span class="label">天</span>
                </div>
                <div class="time-unit">
                    <span class="value" id="hours">00</span>
                    <span class="label">小时</span>
                </div>
                <div class="time-unit">
                    <span class="value" id="minutes">00</span>
                    <span class="label">分钟</span>
                </div>
                <div class="time-unit">
                    <span class="value" id="seconds">00</span>
                    <span class="label">秒</span>
                </div>
            </div>
        </section>

        <section class="wish-section" aria-labelledby="wish-title">
            <h2 id="wish-title">许下你的农历新年愿望</h2>
            <form class="wish-form" id="wish-form">
                <textarea class="wish-input" placeholder="写下你的愿望（例如：2026年春节我希望...）" required></textarea>
                <button type="submit" class="wish-submit-btn">点亮愿望</button>
            </form>
            <div class="wish-gallery" id="wish-gallery">
                <!-- 动态插入的愿望卡片 -->
            </div>
        </section>
    </main>

    <footer class="footer" role="contentinfo">
        <p>© 2025 新年倒计时项目 | 设计并开发</p>
    </footer>

    <script type="module" src="scripts/app.js"></script>
</body>
</html>
```

**语义化说明**:
- 使用 `<header>`、`<main>`、`<footer>` 划分页面区域。
- 每个章节使用 `<section>` 并配有 `aria-labelledby` 以提高可访问性。
- 倒计时数字使用 `<span>` 并配有明确的标签。
- 表单使用 `<textarea>` 和 `<button>`，包含 `required` 属性。

---

## 3. CSS架构

### 3.1 设计令牌（Design Tokens）
在 `variables.css` 中定义：

```css
:root {
    /* 颜色方案 */
    --color-midnight-blue: #0a1a3a;
    --color-radiant-gold: #ffd700;
    --color-silver-white: #f8f9fa;
    --color-accent-glow: #00ffff;
    --color-dark-overlay: rgba(10, 26, 58, 0.8);

    /* 字体 */
    --font-family-primary: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    --font-family-decorative: 'Playfair Display', serif; /* 需自托管 */
    --font-size-base: 16px;
    --line-height-base: 1.6;

    /* 间距 */
    --spacing-unit: 1rem;
    --spacing-small: calc(var(--spacing-unit) * 0.5);
    --spacing-medium: calc(var(--spacing-unit) * 1.5);
    --spacing-large: calc(var(--spacing-unit) * 3);

    /* 断点 */
    --breakpoint-mobile: 768px;
    --breakpoint-tablet: 1024px;
    --breakpoint-desktop: 1200px;

    /* 边框半径 */
    --border-radius-sm: 4px;
    --border-radius-md: 8px;
    --border-radius-lg: 16px;

    /* 阴影 */
    --shadow-light: 0 4px 12px rgba(0, 0, 0, 0.1);
    --shadow-glow: 0 0 20px var(--color-accent-glow);
}
```

### 3.2 布局系统（`layout.css`）
- 采用 **移动优先** 策略。
- 使用 Flexbox 和 CSS Grid 创建响应式网格。
- 容器类：`.container` 设置最大宽度和水平居中。

### 3.3 组件样式（`components.css`）
- 倒计时数字：大号字体、金色渐变、文本阴影。
- 按钮：圆角、渐变背景、悬停效果。
- 愿望卡片：羊皮纸背景、内阴影、柔和发光。

### 3.4 动画（`animations.css`）
- 定义关键帧：`@keyframes fadeIn`、`@keyframes pulse`、`@keyframes slideUp`。
- 用于卡片入场、按钮反馈等简单动画。

### 3.5 响应式设计（`responsive.css`）
- 使用媒体查询调整布局和字体大小。
- 断点：
  ```css
  @media (min-width: 768px) { /* 平板 */ }
  @media (min-width: 1024px) { /* 桌面 */ }
  @media (min-width: 1200px) { /* 大桌面 */ }
  ```

---

## 4. JavaScript模块化架构

### 4.1 模块划分

| 模块 | 职责 | 导出 |
|------|------|------|
| `countdown.js` | 计算距离2026-02-16的时间差，更新DOM，触发强度变化事件 | `CountdownTimer` 类 |
| `particles.js` | 管理Canvas粒子系统（雪花、烟花），控制发射率、动画循环 | `ParticleSystem` 类 |
| `wish.js` | 处理表单提交、验证、存储（localStorage）、渲染愿望画廊 | `WishManager` 类 |
| `utils.js` | 辅助函数：日期格式化、随机数生成、DOM创建、错误处理 | 多个工具函数 |
| `app.js` | 主入口点，初始化所有模块，协调通信 | 无导出 |

### 4.2 模块间通信
- 使用 **自定义事件** 或 **观察者模式**。
- 例如：`CountdownTimer` 在最后10秒触发 `countdown-intensity-increased` 事件，`ParticleSystem` 监听并增加粒子发射率。

### 4.3 关键算法
**倒计时计算**：
```javascript
function getTimeRemaining(targetDate) {
    const now = new Date();
    const diff = targetDate - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
}
```

**粒子系统**：
- 使用 `requestAnimationFrame` 循环。
- 粒子对象池：预创建粒子对象，重用避免GC压力。
- 物理模拟：重力、阻力、随机风速。

---

## 5. 动画与粒子系统详细设计

### 5.1 粒子类型
| 类型 | 行为 | 视觉 |
|------|------|------|
| 雪花 | 缓慢下落，随机旋转，大小不一 | 白色半透明圆形，带模糊阴影 |
| 烟花 | 爆炸产生多个子粒子，向外扩散，颜色鲜艳 | 多色小粒子，拖尾效果 |

### 5.2 强度曲线
- **基础发射率**：雪花每帧0.2个，烟花每分钟2-3次。
- **最后10秒**：雪花发射率×3，烟花发射率×5，粒子速度增加。
- **午夜时刻**：大型烟花爆发（持续5秒），全屏闪烁效果。

### 5.3 性能优化
- **Canvas分层**：将背景与粒子分开渲染（如果背景静态）。
- **粒子数量上限**：500个活跃粒子，超出时移除最老的。
- **离屏渲染**：对于重复的粒子形状，使用 `drawImage` 缓存。

---

## 6. 许愿功能与画廊

### 6.1 数据流
```
用户输入 → 表单验证 → 存储（localStorage） → 创建卡片 → 插入画廊
```

### 6.2 卡片设计
- **样式**：仿羊皮纸背景（线性渐变 + 纹理图像），金色边框，内阴影。
- **动画**：提交后卡片从表单位置滑入画廊，带有淡入和缩放效果。
- **布局**：CSS Grid 自动排列，最小列宽 300px，响应式调整。

### 6.3 持久化
- 使用 `localStorage` 存储愿望数组。
- 页面加载时恢复显示。
- 提供清空画廊的选项（可选）。

---

## 7. 性能优化策略

### 7.1 动画性能
- 所有连续动画使用 `requestAnimationFrame`。
- 使用 `transform` 和 `opacity` 触发合成层（避免重绘）。
- 节流滚动和 resize 事件。

### 7.2 资源加载
- 使用 `<link rel="preload">` 预加载关键字体。
- 图片使用 `loading="lazy"`。
- 将 CSS 放在头部，JS 放在底部或使用 `defer`。

### 7.3 内存管理
- 移除画布外粒子时及时销毁引用。
- 使用 `WeakMap` 存储粒子状态（可选）。
- 定期清理未使用的愿望卡片元素。

### 7.4 离线支持（PWA）
- 提供 `manifest.json` 和 Service Worker（基础缓存）。
- 离线时显示缓存的倒计时静态页面。

---

## 8. 边缘情况与错误处理

| 场景 | 处理策略 |
|------|----------|
| 系统时间晚于目标日期 | 显示“春节已到来！”并停止计时器 |
| 用户离线 | 显示离线提示，使用缓存数据继续倒计时 |
| Canvas 不支持 | 回退到基于 DOM 的简单动画（div 粒子） |
| localStorage 写满 | 降级为内存存储，提示用户清理 |
| 表单输入过长 | 截断并提示最大字符数（例如 200） |
| 低性能设备 | 检测帧率，自动减少粒子数量 |
| 屏幕阅读器 | 使用 ARIA 标签，`role` 属性，确保键盘导航 |

---

## 9. 可访问性（A11y）考虑

- **语义化HTML**：如前述。
- **颜色对比度**：确保文本与背景对比度至少 4.5:1。
- **焦点管理**：表单提交后焦点移动到新创建的卡片。
- **屏幕阅读器通知**：使用 `aria-live` 区域播报倒计时更新。
- **键盘导航**：所有交互元素均可通过 Tab 访问。

---

## 10. 测试策略

### 10.1 单元测试
- 使用 Jest（如果允许）或原生 `assert`。
- 测试 `getTimeRemaining`、粒子物理、表单验证。

### 10.2 集成测试
- 模拟时间流逝，验证倒计时DOM更新。
- 模拟提交表单，验证画廊更新。

### 10.3 跨浏览器测试
- 主要浏览器：Chrome、Firefox、Safari、Edge（最新版）。
- 移动端：iOS Safari、Android Chrome。

### 10.4 性能测试
- 使用 Chrome DevTools Performance 面板分析帧率。
- 内存泄漏检查。

---

## 11. 部署与维护

### 11.1 构建步骤（无构建工具）
- 直接使用源文件，无需编译。
- 可手动压缩 CSS/JS 以减少文件大小。

### 11.2 托管
- 任何静态托管服务：GitHub Pages、Netlify、Vercel。

### 11.3 监控
- 使用简单的日志记录（`console`）用于调试。
- 错误上报（可选）：通过 `window.onerror` 收集。

---

## 总结

本架构设计提供了一个完整、可扩展且高性能的单页应用程序方案，严格遵循纯客户端技术约束。通过模块化JavaScript、Canvas粒子动画、响应式CSS和全面的边缘情况处理，确保了跨设备的流畅用户体验和节日氛围。

**下一步行动**：
1. 根据此架构创建项目骨架（文件与目录）。
2. 实现HTML基础结构和CSS变量。
3. 逐个实现JavaScript模块，并集成测试。
4. 优化性能并进行跨浏览器测试。
5. 部署到生产环境。

---
*文档版本：1.0*
*最后更新：2025-12-31*