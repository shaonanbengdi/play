/* 粒子系统模块 - 优化版本 */

import { randomRange, randomInt } from './utils.js';
import { CONFIG } from '../config.js';

/**
 * 粒子基类
 */
class Particle {
    /**
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {string} type - 粒子类型 ('snowflake' | 'firework')
     * @param {Object} config - 配置参数
     */
    constructor(x, y, type, config = {}) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = config;
        
        // 基础属性
        this.life = 1.0;           // 生命值 0-1
        this.decay = config.decay || 0.01; // 生命衰减速度
        
        // 物理属性
        this.vx = config.vx || 0;  // 水平速度
        this.vy = config.vy || 0;  // 垂直速度
        this.gravity = config.gravity || 0.1; // 重力
        this.drag = config.drag || 0.99; // 阻力
        
        // 视觉属性
        this.size = config.size || randomRange(2, 6);
        this.rotation = config.rotation || randomRange(0, Math.PI * 2);
        this.rotationSpeed = config.rotationSpeed || randomRange(-0.1, 0.1);
        
        // 颜色
        this.color = config.color || this.getDefaultColor();
        
        // 特殊属性
        this.trail = []; // 拖尾轨迹
        this.maxTrailLength = config.maxTrailLength || 5;
        
        // 烟花特有属性
        if (type === 'firework') {
            this.life = 1.0;
            this.decay = config.decay || randomRange(0.02, 0.04);
            this.size = config.size || randomRange(1, 3);
        }
        
        // 性能优化：缓存透明度值
        this.alpha = 1.0;
        
        // 雪花特有属性
        if (type === 'snowflake') {
            this.swayOffset = randomRange(0, Math.PI * 2); // 摆动相位
            this.swaySpeed = randomRange(0.02, 0.05); // 摆动速度
        }
    }

    /**
     * 获取默认颜色
     */
    getDefaultColor() {
        if (this.type === 'snowflake') {
            // 雪花：白色到浅蓝色渐变
            const blueTint = randomRange(0, 30);
            return `rgba(${255 - blueTint}, ${255 - blueTint}, 255, 0.8)`;
        }
        
        // 烟花颜色 - 使用配置中的颜色
        const colors = CONFIG.PARTICLES.fireworkColors;
        return colors[randomInt(0, colors.length - 1)];
    }

    /**
     * 更新粒子状态
     * @param {number} deltaTime - 时间增量（秒）
     */
    update(deltaTime = 1) {
        // 更新拖尾（仅烟花）
        if (this.type === 'firework' && this.life > 0.3) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
        
        // 应用物理
        this.vy += this.gravity * deltaTime; // 重力
        this.vx *= Math.pow(this.drag, deltaTime);    // 阻力
        this.vy *= Math.pow(this.drag, deltaTime);
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // 旋转
        this.rotation += this.rotationSpeed * deltaTime;
        
        // 生命衰减
        this.life -= this.decay * deltaTime;
        
        // 更新透明度
        this.alpha = Math.max(0, this.life);
        
        // 雪花特殊行为：左右摆动
        if (this.type === 'snowflake') {
            this.swayOffset += this.swaySpeed * deltaTime;
            this.vx += Math.sin(this.swayOffset) * 0.02 * deltaTime;
            
            // 雪花缓慢下落
            this.vy = Math.min(this.vy, 2); // 限制最大速度
        }
        
        return this.life > 0;
    }

    /**
     * 绘制粒子（使用Canvas 2D）- 已优化为批量绘制
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @deprecated 现在使用 ParticleSystem.draw() 的批量绘制方法
     */
    draw(ctx) {
        // 此方法已弃用，现在使用 ParticleSystem.draw() 的批量绘制方法
        // 保留此方法仅用于向后兼容，但不会被实际调用
        console.warn('Particle.draw() is deprecated. Use ParticleSystem.draw() instead.');
    }

    /**
     * 检查是否在画布外
     * @param {number} width - 画布宽度
     * @param {number} height - 画布高度
     * @returns {boolean} 是否在画布外
     */
    isOutOfBounds(width, height) {
        return this.x < -50 || this.x > width + 50 || this.y > height + 50;
    }
}

/**
 * 粒子工厂函数
 */
const ParticleFactory = {
    /**
     * 创建雪花粒子
     */
    createSnowflake(x, y, config = {}) {
        const snowflakeConfig = {
            vx: randomRange(-0.3, 0.3),
            vy: randomRange(CONFIG.PARTICLES.snowflakeSpeed.min, CONFIG.PARTICLES.snowflakeSpeed.max),
            gravity: 0.05,
            drag: 0.995,
            size: randomRange(CONFIG.PARTICLES.snowflakeSize.min, CONFIG.PARTICLES.snowflakeSize.max),
            decay: randomRange(0.002, 0.004),
            rotationSpeed: randomRange(-0.08, 0.08),
            color: CONFIG.PARTICLES.snowflakeColor,
            ...config
        };
        
        return new Particle(x, y, 'snowflake', snowflakeConfig);
    },

    /**
     * 创建烟花粒子
     */
    createFirework(x, y, config = {}) {
        const colors = CONFIG.PARTICLES.fireworkColors;
        const color = colors[randomInt(0, colors.length - 1)];
        
        const fireworkConfig = {
            vx: config.vx || randomRange(-3, 3),
            vy: config.vy || randomRange(-3, 3),
            gravity: 0.15,
            drag: 0.96,
            size: randomRange(1, 3),
            decay: randomRange(0.02, 0.04),
            rotationSpeed: randomRange(-0.2, 0.2),
            maxTrailLength: 8,
            color: color,
            ...config
        };
        
        return new Particle(x, y, 'firework', fireworkConfig);
    }
};

/**
 * 雪花粒子系统（已弃用 - 使用工厂函数代替）
 * @deprecated 使用 ParticleFactory.createSnowflake() 代替
 */
class SnowflakeParticleSystem extends Particle {
    constructor(x, y, config = {}) {
        console.warn('SnowflakeParticleSystem is deprecated. Use ParticleFactory.createSnowflake() instead.');
        const snowflakeConfig = {
            vx: randomRange(-0.3, 0.3),
            vy: randomRange(CONFIG.PARTICLES.snowflakeSpeed.min, CONFIG.PARTICLES.snowflakeSpeed.max),
            gravity: 0.05,
            drag: 0.995,
            size: randomRange(CONFIG.PARTICLES.snowflakeSize.min, CONFIG.PARTICLES.snowflakeSize.max),
            decay: randomRange(0.002, 0.004),
            rotationSpeed: randomRange(-0.08, 0.08),
            color: CONFIG.PARTICLES.snowflakeColor,
            ...config
        };
        
        super(x, y, 'snowflake', snowflakeConfig);
    }
}

/**
 * 烟花粒子系统（已弃用 - 使用工厂函数代替）
 * @deprecated 使用 ParticleFactory.createFirework() 代替
 */
class FireworkParticleSystem extends Particle {
    constructor(x, y, config = {}) {
        console.warn('FireworkParticleSystem is deprecated. Use ParticleFactory.createFirework() instead.');
        const colors = CONFIG.PARTICLES.fireworkColors;
        const color = colors[randomInt(0, colors.length - 1)];
        
        const fireworkConfig = {
            vx: config.vx || randomRange(-3, 3),
            vy: config.vy || randomRange(-3, 3),
            gravity: 0.15,
            drag: 0.96,
            size: randomRange(1, 3),
            decay: randomRange(0.02, 0.04),
            rotationSpeed: randomRange(-0.2, 0.2),
            maxTrailLength: 8,
            color: color,
            ...config
        };
        
        super(x, y, 'firework', fireworkConfig);
    }
}

/**
 * 粒子系统管理器
 */
export class ParticleSystem {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @param {Object} config - 配置参数
     */
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // 优化：禁用alpha通道
        this.config = { ...CONFIG.PARTICLES, ...config };
        
        // 粒子数组 - 使用对象池优化
        this.particles = [];
        this.particlePool = []; // 对象池
        
        // 发射率控制
        this.emissionRates = {
            snowflake: this.config.snowflakeRate,
            firework: this.config.fireworkRate
        };
        
        // 强度控制
        this.currentIntensity = 'normal';
        this.intensityMultiplier = 1.0;
        
        // 动画状态
        this.isRunning = false;
        this.animationId = null;
        
        // 画布尺寸
        this.width = 0;
        this.height = 0;
        
        // 性能监控
        this.frameCount = 0;
        this.lastFPSCheck = Date.now();
        this.fps = 60;
        this.lastFrameTime = Date.now();
        
        // 自适应控制
        this.maxParticles = this.config.maxParticles;
        this.performanceMode = false;
        
        // 窗口大小调整
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }

    /**
     * 调整画布大小
     */
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // 清空画布
        this.clear();
    }

    /**
     * 从对象池获取粒子
     */
    getParticleFromPool() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return null;
    }

    /**
     * 回收粒子到对象池
     */
    returnParticleToPool(particle) {
        if (this.particlePool.length < 100) { // 限制对象池大小
            this.particlePool.push(particle);
        }
    }

    /**
     * 发射雪花
     */
    emitSnowflake() {
        if (this.particles.length >= this.maxParticles) return;
        
        const x = randomRange(0, this.width);
        const y = -10;
        
        // 从对象池获取或创建新粒子
        let particle = this.getParticleFromPool();
        if (particle) {
            // 重置粒子属性
            particle.x = x;
            particle.y = y;
            particle.life = 1.0;
            particle.vx = randomRange(-0.3, 0.3);
            particle.vy = randomRange(CONFIG.PARTICLES.snowflakeSpeed.min, CONFIG.PARTICLES.snowflakeSpeed.max);
            particle.rotation = randomRange(0, Math.PI * 2);
            particle.swayOffset = randomRange(0, Math.PI * 2);
        } else {
            particle = ParticleFactory.createSnowflake(x, y);
        }
        
        this.particles.push(particle);
    }

    /**
     * 发射烟花
     * @param {number} x - 爆炸X坐标（可选）
     * @param {number} y - 爆炸Y坐标（可选）
     * @param {number} scale - 爆炸规模倍数（可选）
     */
    emitFirework(x, y, scale = 1.0) {
        const centerX = x || randomRange(this.width * 0.2, this.width * 0.8);
        const centerY = y || randomRange(this.height * 0.2, this.height * 0.5);
        
        // 烟花爆炸产生多个粒子
        const baseCount = randomInt(
            CONFIG.PARTICLES.fireworkParticleCount.min,
            CONFIG.PARTICLES.fireworkParticleCount.max
        );
        const particleCount = Math.floor(baseCount * scale);
        
        // 限制单次发射数量以保护性能
        const actualCount = Math.min(particleCount, 50);
        
        for (let i = 0; i < actualCount; i++) {
            if (this.particles.length >= this.maxParticles) break;
            
            const angle = (Math.PI * 2 * i) / actualCount;
            const speed = randomRange(CONFIG.PARTICLES.fireworkSpeed.min, CONFIG.PARTICLES.fireworkSpeed.max) * scale;
            
            // 从对象池获取或创建新粒子
            let particle = this.getParticleFromPool();
            if (particle) {
                // 重置粒子属性
                particle.x = centerX;
                particle.y = centerY;
                particle.life = 1.0;
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;
                particle.rotation = randomRange(0, Math.PI * 2);
                particle.trail = [];
            } else {
                const config = {
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed
                };
                particle = ParticleFactory.createFirework(centerX, centerY, config);
            }
            
            this.particles.push(particle);
        }
        
        // 添加闪光效果
        this.addFlashEffect(centerX, centerY, scale);
    }

    /**
     * 添加闪光效果
     */
    addFlashEffect(x, y, scale = 1.0) {
        const flash = document.createElement('div');
        const size = 100 * scale;
        flash.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 999;
            animation: flash ${0.3 * scale}s ease-out forwards;
        `;
        
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300 * scale);
    }

    /**
     * 大型烟花爆发（午夜时刻）
     */
    grandFinale() {
        // 连续发射多个烟花
        const fireworkCount = 12;
        const interval = 150;
        
        for (let i = 0; i < fireworkCount; i++) {
            setTimeout(() => {
                const x = randomRange(this.width * 0.1, this.width * 0.9);
                const y = randomRange(this.height * 0.1, this.height * 0.4);
                const scale = 1.5 + (i % 3) * 0.3; // 逐渐增大规模
                this.emitFirework(x, y, scale);
            }, i * interval);
        }
        
        // 全屏闪烁
        this.addFullscreenFlash();
    }

    /**
     * 全屏闪烁效果
     */
    addFullscreenFlash() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%);
            pointer-events: none;
            z-index: 998;
            animation: flash 0.5s ease-out forwards;
        `;
        
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
    }

    /**
     * 更新强度控制
     * @param {string} intensity - 强度级别
     */
    updateIntensity(intensity) {
        if (intensity === this.currentIntensity) return;
        
        this.currentIntensity = intensity;
        
        // 更新发射率
        const rates = this.config.intensityEmissionRates[intensity] || this.config.intensityEmissionRates.normal;
        this.emissionRates.snowflake = this.config.snowflakeRate * rates.snowflake;
        this.emissionRates.firework = this.config.fireworkRate * rates.firework;
        
        // 更新强度倍数
        this.intensityMultiplier = this.config.intensityMultipliers[intensity] || 1.0;
        
        console.log(`Particle intensity changed to: ${intensity}, multiplier: ${this.intensityMultiplier}`);
    }

    /**
     * 更新所有粒子（优化版本）
     */
    updateParticles() {
        const now = Date.now();
        const deltaTime = Math.min((now - this.lastFrameTime) / 16.67, 2); // 限制最大时间增量
        this.lastFrameTime = now;
        
        // 发射新粒子（使用位运算优化随机检查）
        if (Math.random() < this.emissionRates.snowflake * this.intensityMultiplier) {
            this.emitSnowflake();
        }
        
        if (Math.random() < this.emissionRates.firework * this.intensityMultiplier) {
            this.emitFirework();
        }
        
        // 更新现有粒子（使用单次循环和预分配数组）
        const aliveCount = 0;
        const particleCount = this.particles.length;
        
        // 使用 while 循环从末尾开始，便于删除
        let i = particleCount;
        while (i--) {
            const particle = this.particles[i];
            const alive = particle.update(deltaTime);
            
            // 移除超出边界或死亡的粒子
            if (!alive || particle.isOutOfBounds(this.width, this.height)) {
                // 回收到对象池
                this.returnParticleToPool(particle);
                // 从数组中移除（交换到末尾并弹出）
                const last = this.particles.length - 1;
                if (i < last) {
                    this.particles[i] = this.particles[last];
                }
                this.particles.pop();
            }
        }
        
        // 性能保护：如果粒子过多，强制清理（保留最新的粒子）
        if (this.particles.length > this.maxParticles * 1.2) {
            this.particles = this.particles.slice(-this.maxParticles);
        }
    }

    /**
     * 清除画布
     */
    clear() {
        // 使用深色背景填充
        this.ctx.fillStyle = 'rgb(10, 26, 58)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * 绘制所有粒子（优化版本）
     */
    draw() {
        // 清空画布（使用半透明创建拖尾效果）
        this.ctx.fillStyle = 'rgba(10, 26, 58, 0.15)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 批量绘制粒子以减少 ctx.save/restore 调用
        const snowflakes = [];
        const fireworks = [];
        
        // 分类粒子以优化绘制
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            if (particle.type === 'snowflake') {
                snowflakes.push(particle);
            } else {
                fireworks.push(particle);
            }
        }
        
        // 批量绘制雪花（更简单的绘制逻辑）
        if (snowflakes.length > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 1.0;
            
            for (let i = 0; i < snowflakes.length; i++) {
                const particle = snowflakes[i];
                if (particle.alpha <= 0.01) continue;
                
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 只对较大的雪花添加发光效果
                if (particle.size > 3) {
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                }
            }
            
            this.ctx.restore();
        }
        
        // 批量绘制烟花
        if (fireworks.length > 0) {
            for (let i = 0; i < fireworks.length; i++) {
                const particle = fireworks[i];
                if (particle.alpha <= 0.01) continue;
                
                this.ctx.save();
                this.ctx.globalAlpha = particle.alpha;
                
                // 绘制拖尾
                if (particle.trail.length > 1) {
                    this.ctx.strokeStyle = particle.color;
                    this.ctx.globalAlpha = particle.alpha * 0.4;
                    this.ctx.lineWidth = particle.size * 0.5;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
                    for (let j = 1; j < particle.trail.length; j++) {
                        this.ctx.lineTo(particle.trail[j].x, particle.trail[j].y);
                    }
                    this.ctx.stroke();
                }
                
                // 绘制粒子核心
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 添加发光效果
                this.ctx.shadowBlur = 12;
                this.ctx.shadowColor = particle.color;
                this.ctx.fill();
                
                this.ctx.restore();
            }
        }
    }

    /**
     * 动画循环
     */
    animate() {
        if (!this.isRunning) return;
        
        // 更新FPS
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFPSCheck >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSCheck = now;
            
            // 性能优化：根据FPS调整
            this.adjustPerformance();
        }
        
        this.updateParticles();
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * 性能自适应调整
     */
    adjustPerformance() {
        if (this.fps < 30 && !this.performanceMode) {
            // 进入性能模式
            this.performanceMode = true;
            this.maxParticles = Math.max(200, Math.floor(this.maxParticles * 0.6));
            this.emissionRates.snowflake *= 0.7;
            this.emissionRates.firework *= 0.8;
            console.log(`Performance mode activated: FPS=${this.fps}, maxParticles=${this.maxParticles}`);
        } else if (this.fps > 50 && this.performanceMode) {
            // 退出性能模式
            this.performanceMode = false;
            this.maxParticles = this.config.maxParticles;
            this.emissionRates.snowflake = this.config.snowflakeRate;
            this.emissionRates.firework = this.config.fireworkRate;
            console.log(`Performance mode deactivated: FPS=${this.fps}`);
        }
    }

    /**
     * 启动粒子系统
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = Date.now();
        this.animate();
        console.log('Particle system started');
    }

    /**
     * 停止粒子系统
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('Particle system stopped');
    }

    /**
     * 暂停粒子系统
     */
    pause() {
        if (!this.isRunning) return;
        
        this.stop();
        console.log('Particle system paused');
    }

    /**
     * 恢复粒子系统
     */
    resume() {
        if (this.isRunning) return;
        
        this.start();
        console.log('Particle system resumed');
    }

    /**
     * 清除所有粒子
     */
    clearParticles() {
        // 将所有粒子回收到对象池
        for (const particle of this.particles) {
            this.returnParticleToPool(particle);
        }
        this.particles = [];
        this.clear();
    }

    /**
     * 销毁粒子系统
     */
    destroy() {
        this.stop();
        this.clearParticles();
        this.particlePool = [];
        this.canvas = null;
        this.ctx = null;
        console.log('Particle system destroyed');
    }

    /**
     * 获取状态信息
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            particleCount: this.particles.length,
            poolSize: this.particlePool.length,
            maxParticles: this.maxParticles,
            emissionRates: this.emissionRates,
            fps: this.fps,
            intensity: this.currentIntensity,
            intensityMultiplier: this.intensityMultiplier,
            performanceMode: this.performanceMode
        };
    }

    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(eventName, callback) {
        this.canvas.addEventListener(eventName, callback);
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(eventName, callback) {
        this.canvas.removeEventListener(eventName, callback);
    }
}

// 导出工厂函数和基类供外部使用
export { ParticleFactory, Particle };
// 向后兼容：导出已弃用的子类（带警告）
export { SnowflakeParticleSystem, FireworkParticleSystem };