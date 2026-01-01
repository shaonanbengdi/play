/**
 * 游戏渲染器 - 处理游戏画面渲染，复用粒子系统
 * @module game-renderer
 */

export class GameRenderer {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        
        // 渲染状态
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;
        
        // 游戏对象池
        this.objectPool = new Map();
        
        // 粒子系统（复用现有）
        this.particleSystem = null;
        
        // 绑定方法
        this.renderLoop = this.renderLoop.bind(this);
    }

    /**
     * 初始化渲染器
     */
    async init(containerId = 'game-canvas') {
        // 查找或创建容器
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            this.container.className = 'game-canvas-container';
            document.body.appendChild(this.container);
        }
        
        // 创建Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas-element';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.pointerEvents = 'none'; // 允许点击穿透到下层元素
        
        this.container.appendChild(this.canvas);
        
        // 获取2D上下文
        this.ctx = this.canvas.getContext('2d');
        
        // 初始化粒子系统（复用现有）
        await this.initParticleSystem();
        
        // 绑定窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));
        
        console.log('游戏渲染器初始化完成');
        return this;
    }

    /**
     * 初始化粒子系统（复用现有）
     */
    async initParticleSystem() {
        try {
            // 尝试导入现有的粒子系统
            const { ParticleSystem } = await import('../particle-system.js');
            this.particleSystem = new ParticleSystem(this.canvas);
            console.log('粒子系统已集成');
        } catch (error) {
            console.warn('无法加载粒子系统，使用内置简易版本');
            this.particleSystem = this.createFallbackParticleSystem();
        }
    }

    /**
     * 创建简易粒子系统（备用）
     */
    createFallbackParticleSystem() {
        const particles = [];
        
        return {
            createParticles: (x, y, count = 10, color = '#ff6b6b') => {
                for (let i = 0; i < count; i++) {
                    particles.push({
                        x: x,
                        y: y,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 1.0,
                        decay: 0.02,
                        color: color,
                        size: Math.random() * 3 + 1
                    });
                }
            },
            
            update: () => {
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.1; // 重力
                    p.life -= p.decay;
                    
                    if (p.life <= 0) {
                        particles.splice(i, 1);
                    }
                }
            },
            
            render: (ctx) => {
                particles.forEach(p => {
                    ctx.save();
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
            },
            
            clear: () => {
                particles.length = 0;
            }
        };
    }

    /**
     * 开始渲染循环
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.renderLoop();
    }

    /**
     * 停止渲染循环
     */
    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 渲染循环
     */
    renderLoop(timestamp) {
        if (!this.isRunning) return;
        
        // FPS控制
        const deltaTime = timestamp - this.lastFrameTime;
        if (deltaTime < this.frameInterval) {
            this.animationFrameId = requestAnimationFrame(this.renderLoop);
            return;
        }
        
        this.lastFrameTime = timestamp - (deltaTime % this.frameInterval);
        
        // 清空画布
        this.clearCanvas();
        
        // 渲染游戏对象
        if (this.currentGame && this.currentGame.render) {
            this.currentGame.render(this.ctx, timestamp);
        }
        
        // 更新和渲染粒子
        if (this.particleSystem) {
            this.particleSystem.update();
            this.particleSystem.render(this.ctx);
        }
        
        // 渲染UI
        this.renderUI();
        
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * 清空画布
     */
    clearCanvas() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 半透明背景（可选）
        // this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        if (!this.ctx || !this.gameManager) return;
        
        const state = this.gameManager.getState();
        
        // 渲染玩家信息
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, 10, 200, 60);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`玩家: ${state.playerName}`, 20, 30);
        this.ctx.fillText(`状态: ${state.gameState}`, 20, 50);
        
        if (state.roomId) {
            this.ctx.fillText(`房间: ${state.roomId}`, 120, 30);
            this.ctx.fillText(`角色: ${state.isHost ? '主机' : '客户端'}`, 120, 50);
        }
        
        this.ctx.restore();
        
        // 渲染玩家列表
        if (state.players && state.players.length > 1) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(10, 80, 150, 30 * state.players.length + 10);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            state.players.forEach((player, index) => {
                const y = 100 + index * 20;
                const prefix = player.isLocal ? '→' : '•';
                this.ctx.fillText(`${prefix} ${player.name}`, 20, y);
            });
            
            this.ctx.restore();
        }
    }

    /**
     * 设置当前游戏
     */
    setGame(game) {
        this.currentGame = game;
    }

    /**
     * 创建游戏对象
     */
    createGameObject(type, data) {
        const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const obj = {
            id: id,
            type: type,
            ...data,
            createdAt: Date.now()
        };
        
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }
        
        this.objectPool.get(type).push(obj);
        
        return obj;
    }

    /**
     * 获取游戏对象
     */
    getGameObjects(type) {
        return this.objectPool.get(type) || [];
    }

    /**
     * 移除游戏对象
     */
    removeGameObject(id) {
        for (let [type, objects] of this.objectPool) {
            const index = objects.findIndex(obj => obj.id === id);
            if (index !== -1) {
                objects.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * 清空游戏对象
     */
    clearGameObjects(type = null) {
        if (type) {
            this.objectPool.set(type, []);
        } else {
            this.objectPool.clear();
        }
    }

    /**
     * 创建粒子效果
     */
    createParticles(x, y, count = 10, color = '#ff6b6b') {
        if (this.particleSystem) {
            this.particleSystem.createParticles(x, y, count, color);
        }
    }

    /**
     * 绘制矩形
     */
    drawRect(x, y, width, height, color = '#fff', alpha = 1) {
        if (!this.ctx) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.restore();
    }

    /**
     * 绘制圆形
     */
    drawCircle(x, y, radius, color = '#fff', alpha = 1) {
        if (!this.ctx) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * 绘制文本
     */
    drawText(text, x, y, color = '#fff', size = 16, align = 'left') {
        if (!this.ctx) return;
        
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * 绘制图片
     */
    drawImage(img, x, y, width, height, alpha = 1) {
        if (!this.ctx || !img) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(img, x, y, width, height);
        this.ctx.restore();
    }

    /**
     * 绘制渐变背景
     */
    drawGradientBackground(colors = ['#1a1a2e', '#16213e']) {
        if (!this.ctx) return;
        
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        if (!this.canvas) return;
        
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // 通知游戏调整大小
        if (this.currentGame && this.currentGame.onResize) {
            this.currentGame.onResize(oldWidth, oldHeight, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * 获取画布尺寸
     */
    getCanvasSize() {
        return {
            width: this.canvas ? this.canvas.width : 0,
            height: this.canvas ? this.canvas.height : 0
        };
    }

    /**
     * 显示/隐藏画布
     */
    setVisible(visible) {
        if (this.canvas) {
            this.canvas.style.display = visible ? 'block' : 'none';
        }
        if (this.container) {
            this.container.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stop();
        
        if (this.particleSystem && this.particleSystem.clear) {
            this.particleSystem.clear();
        }
        
        this.clearGameObjects();
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        if (this.container && this.container.parentNode && this.container.id === 'game-canvas') {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.currentGame = null;
        this.particleSystem = null;
    }

    /**
     * 获取性能统计
     */
    getStats() {
        return {
            fps: this.fps,
            objectCount: Array.from(this.objectPool.values()).reduce((sum, arr) => sum + arr.length, 0),
            particleCount: this.particleSystem ? (this.particleSystem.getParticleCount ? this.particleSystem.getParticleCount() : 0) : 0
        };
    }
}