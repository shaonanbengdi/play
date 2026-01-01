/* 应用程序主入口点 */

// 导入配置和模块
import { CONFIG, SELECTORS, EVENTS, getConfig, isDevelopment, isTargetDatePassed } from './config.js';
import { CountdownTimer } from './modules/countdown.js';
import { ParticleSystem } from './modules/particle-system.js';
import { WishManager } from './modules/wishes-manager.js';
import { AudioManager } from './modules/audio-manager.js';
import { createElement } from './modules/utils.js';
import { GameIntegration } from './modules/game-integration.js';

/**
 * 应用程序主类
 */
class NewYearCountdownApp {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;
        
        // 模块实例
        this.countdownTimer = null;
        this.particleSystem = null;
        this.wishManager = null;
        this.audioManager = null;
        this.gameIntegration = null;
        
        // DOM元素引用
        this.elements = {};
        
        // 性能监控
        this.performance = {
            startTime: null,
            frameCount: 0
        };
        
        // 绑定事件处理函数
        this.handleIntensityIncrease = this.handleIntensityIncrease.bind(this);
        this.handleCountdownComplete = this.handleCountdownComplete.bind(this);
        this.handleWishAdded = this.handleWishAdded.bind(this);
        this.handleWishRemoved = this.handleWishRemoved.bind(this);
        this.handleStorageError = this.handleStorageError.bind(this);
        this.handleValidationError = this.handleValidationError.bind(this);
    }

    /**
     * 初始化应用程序
     */
    async init() {
        if (this.isInitialized) {
            console.warn('App already initialized');
            return;
        }

        console.log('Initializing Lunar New Year Countdown App...');
        
        try {
            // 1. 检查目标日期
            if (isTargetDatePassed()) {
                this.showTargetDatePassedMessage();
                return;
            }

            // 2. 获取DOM元素

            this.cacheDOMElements();
            
            // 3. 初始化模块

            await this.initModules();
            
            // 4. 绑定事件

            this.bindEvents();
            
            // 5. 启动应用程序

            this.start();
            
            // 6. 触发就绪事件

            this.dispatchAppReady();
            
            this.isInitialized = true;

            if (isDevelopment()) {
                console.log('🎉 春节倒计时应用初始化成功');
            }
        } catch (error) {
            console.error('App initialization failed:', error);
            this.handleAppError('初始化失败，请刷新页面重试');
        }
    }

    /**
     * 缓存DOM元素
     */
    cacheDOMElements() {
        // 倒计时元素
        this.elements.countdownRoot = document.querySelector(SELECTORS.countdown.root);
        this.elements.days = document.querySelector(SELECTORS.countdown.days);
        this.elements.hours = document.querySelector(SELECTORS.countdown.hours);
        this.elements.minutes = document.querySelector(SELECTORS.countdown.minutes);
        this.elements.seconds = document.querySelector(SELECTORS.countdown.seconds);
        
        // 许愿功能元素
        this.elements.wishForm = document.querySelector(SELECTORS.wishes.form);
        this.elements.wishInput = document.querySelector(SELECTORS.wishes.input);
        this.elements.wishSubmitBtn = document.querySelector(SELECTORS.wishes.submitBtn);
        this.elements.wishGallery = document.querySelector(SELECTORS.wishes.gallery);
        this.elements.wishStats = document.querySelector(SELECTORS.wishes.stats);
        this.elements.clearWishBtn = document.querySelector(SELECTORS.wishes.clearBtn);
        this.elements.exportWishesBtn = document.querySelector(SELECTORS.wishes.exportBtn);
        this.elements.importWishesBtn = document.getElementById('import-wishes-btn');
        this.elements.wishCharCount = document.querySelector(SELECTORS.wishes.charCount);
        
        // 画布元素
        this.elements.canvas = document.querySelector(SELECTORS.canvas);
        
        // 页面根元素
        this.elements.root = document.querySelector(SELECTORS.root);
        
        // 验证关键元素是否存在
        this.validateRequiredElements();
    }

    /**
     * 验证必需的DOM元素
     */
    validateRequiredElements() {
        const required = [
            { element: this.elements.countdownRoot, name: '倒计时容器' },
            { element: this.elements.days, name: '天数元素' },
            { element: this.elements.hours, name: '小时元素' },
            { element: this.elements.minutes, name: '分钟元素' },
            { element: this.elements.seconds, name: '秒数元素' },
            { element: this.elements.wishForm, name: '许愿表单' },
            { element: this.elements.wishInput, name: '愿望输入框' },
            { element: this.elements.wishGallery, name: '愿望画廊' },
            { element: this.elements.canvas, name: '粒子画布' }
        ];

        const missing = required.filter(item => !item.element).map(item => item.name);
        
        if (missing.length > 0) {
            throw new Error(`缺少必需的DOM元素: ${missing.join(', ')}`);
        }
    }

    /**
     * 初始化模块
     */
    async initModules() {
        // 1. 初始化倒计时器
        this.countdownTimer = new CountdownTimer(CONFIG.COUNTDOWN_TARGET, {
            root: this.elements.countdownRoot,
            days: this.elements.days,
            hours: this.elements.hours,
            minutes: this.elements.minutes,
            seconds: this.elements.seconds
        });

        // 2. 初始化粒子系统
        this.particleSystem = new ParticleSystem(this.elements.canvas, {
            snowflakeRate: CONFIG.PARTICLES.snowflakeRate,
            fireworkRate: CONFIG.PARTICLES.fireworkRate,
            maxParticles: CONFIG.PARTICLES.maxParticles
        });

        // 3. 初始化许愿管理器
        this.wishManager = new WishManager({
            form: this.elements.wishForm,
            input: this.elements.wishInput,
            submitBtn: this.elements.wishSubmitBtn,
            gallery: this.elements.wishGallery,
            stats: this.elements.wishStats,
            clearBtn: this.elements.clearWishBtn,
            exportBtn: this.elements.exportWishesBtn,
            importBtn: this.elements.importWishesBtn,
            charCount: this.elements.wishCharCount
        }, {
            storageKey: CONFIG.WISHES.storageKey,
            maxWishes: CONFIG.WISHES.maxWishes,
            maxChars: CONFIG.WISHES.maxChars
        });

        // 4. 初始化可访问性支持
        this.initAccessibility();
        
        // 5. 立即启动粒子系统（页面加载时自动启动）
        setTimeout(() => {
            if (this.particleSystem && !this.particleSystem.isRunning) {
                this.particleSystem.start();
                console.log('Particle system auto-started on page load');
            }
        }, 100); // 延迟100ms确保Canvas准备就绪

        // 6. 初始化音频管理器
        this.audioManager = new AudioManager();
        this.audioManager.init();
        
        // 7. 初始化游戏集成（异步）
        this.initGameIntegration();
    }

    /**
     * 初始化可访问性支持
     */
    initAccessibility() {
        // 创建实时区域用于屏幕阅读器通知
        if (CONFIG.ACCESSIBILITY.announceUpdates) {
            const liveRegion = createElement('div', {
                id: CONFIG.ACCESSIBILITY.liveRegionId,
                role: 'status',
                'aria-live': 'polite',
                'aria-atomic': 'true'
            });
            
            liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
            
            document.body.appendChild(liveRegion);
            this.elements.liveRegion = liveRegion;
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        this.bindCountdownEvents();
        this.bindWishEvents();
        this.bindParticleEvents();
        this.bindWindowEvents();
        this.bindUIEvents();
        this.bindKeyboardEvents();
    }

    /**
     * 绑定倒计时相关事件
     */
    bindCountdownEvents() {
        this.countdownTimer.on(EVENTS.COUNTDOWN_INTENSITY_INCREASED, this.handleIntensityIncrease);
        this.countdownTimer.on(EVENTS.COUNTDOWN_COMPLETED, this.handleCountdownComplete);
    }

    /**
     * 绑定愿望相关事件
     */
    bindWishEvents() {
        this.wishManager.on('wish-added', this.handleWishAdded);
        this.wishManager.on('wish-removed', this.handleWishRemoved);
        this.wishManager.on('storage-error', this.handleStorageError);
        this.wishManager.on('validation-error', this.handleValidationError);
        
        if (this.elements.wishGallery) {
            this.elements.wishGallery.addEventListener('wish-stats-updated', (e) => {
                this.handleWishStatsUpdated(e);
            });
        }
        
        document.addEventListener('wish-firework', (e) => {
            this.handleWishFirework(e);
        });
        
        document.addEventListener('wish-delete-effect', () => {
            this.handleWishDeleteEffect();
        });
    }

    /**
     * 绑定粒子系统事件
     */
    bindParticleEvents() {
        this.particleSystem.on('click', (e) => {
            const rect = this.elements.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.particleSystem.emitFirework(x, y);
        });
    }

    /**
     * 绑定窗口和文档事件
     */
    bindWindowEvents() {
        window.addEventListener('resize', () => {
            if (this.particleSystem) {
                this.particleSystem.resize();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }

    /**
     * 绑定UI按钮事件
     */
    bindUIEvents() {
        // 导出愿望按钮
        const exportBtn = document.getElementById('export-wishes-btn');
        if (exportBtn && this.wishManager) {
            exportBtn.addEventListener('click', () => {
                this.wishManager.exportWishesToFile();
            });
        }
        
        // 分享按钮
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn && this.wishManager) {
            shareBtn.addEventListener('click', () => {
                if (this.wishManager.getWishCount() > 0) {
                    this.wishManager.shareWishes();
                } else {
                    this.shareCountdown();
                }
            });
        }

        // 音效控制按钮
        const muteToggleBtn = document.getElementById('mute-toggle-btn');
        if (muteToggleBtn) {
            muteToggleBtn.addEventListener('click', () => {
                if (this.audioManager) {
                    const isMuted = this.audioManager.toggleMute();
                    muteToggleBtn.textContent = isMuted ? '🔇 静音' : '🔊 音效';
                }
            });
        }

        // 主题切换按钮
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            
            themeToggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const themeCycle = ['dark', 'light', 'auto'];
                const currentIndex = themeCycle.indexOf(currentTheme);
                const nextIndex = (currentIndex + 1) % themeCycle.length;
                const newTheme = themeCycle[nextIndex];
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }
    }

    /**
     * 绑定键盘快捷键
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: 聚焦愿望输入框
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.elements.wishInput?.focus();
            }
            
            // Escape: 清除输入框焦点
            if (e.key === 'Escape') {
                this.elements.wishInput?.blur();
            }
            
            // P: 暂停/恢复粒子系统（调试用）
            if (e.key === 'p' && e.ctrlKey) {
                e.preventDefault();
                if (this.particleSystem) {
                    if (this.particleSystem.isRunning) {
                        this.particleSystem.pause();
                        console.log('粒子系统已暂停');
                    } else {
                        this.particleSystem.resume();
                        console.log('粒子系统已恢复');
                    }
                }
            }
        });
    }

    /**
     * 启动应用程序
     */
    start() {
        if (this.isRunning) return;

        console.log('Starting application...');
        
        // 启动倒计时器
        this.countdownTimer.start();
        
        // 启动粒子系统
        this.particleSystem.start();
        
        // 初始化许愿管理器
        this.wishManager.init();
        
        // 记录启动时间
        this.performance.startTime = Date.now();
        
        this.isRunning = true;
        
        // 显示欢迎消息
        this.showWelcomeMessage();
        
        // 屏幕阅读器通知
        this.announceToScreenReader('春节倒计时应用已启动');
        
        // 启动性能监控（可选）
        this.startPerformanceMonitoring();
        
        // 显示性能指示器（开发环境）
        this.showPerformanceIndicator();
    }

    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        // 每5秒检查一次性能状态
        setInterval(() => {
            if (!this.isRunning) return;
            
            const status = this.getStatus();
            const particleStatus = status.modules.particles;
            
            if (particleStatus && particleStatus.fps < 25) {
                console.warn(`Performance warning: FPS=${particleStatus.fps}, Particles=${particleStatus.particleCount}`);
            }
            
            // 可选：显示性能信息（开发环境）
            if (isDevelopment() && particleStatus) {
                console.log(`Performance: FPS=${particleStatus.fps}, Particles=${particleStatus.particleCount}, Mode=${particleStatus.performanceMode ? 'Performance' : 'Normal'}`);
            }
        }, 5000);
    }

    /**
     * 显示性能指示器（可选）
     */
    showPerformanceIndicator() {
        if (!isDevelopment()) return; // 仅在开发环境显示
        
        const indicator = document.createElement('div');
        indicator.className = 'performance-indicator';
        indicator.id = 'performance-indicator';
        document.body.appendChild(indicator);
        
        // 每秒更新
        setInterval(() => {
            if (!this.isRunning || !this.particleSystem) return;
            
            const status = this.particleSystem.getStatus();
            const fps = status.fps;
            
            indicator.textContent = `FPS: ${fps} | Particles: ${status.particleCount}`;
            
            // 根据性能改变样式
            indicator.classList.remove('good', 'warning', 'critical');
            if (fps >= 50) {
                indicator.classList.add('good');
            } else if (fps >= 30) {
                indicator.classList.add('warning');
            } else {
                indicator.classList.add('critical');
            }
        }, 1000);
    }

    /**
     * 暂停应用程序
     */
    pause() {
        if (!this.isRunning) return;
        
        console.log('Pausing application...');
        
        this.countdownTimer?.pause();
        this.particleSystem?.pause();
        
        this.announceToScreenReader('应用已暂停');
    }

    /**
     * 恢复应用程序
     */
    resume() {
        if (this.isRunning) return;
        
        console.log('Resuming application...');
        
        this.countdownTimer?.resume();
        this.particleSystem?.resume();
        
        this.announceToScreenReader('应用已恢复');
    }

    /**
     * 停止应用程序
     */
    stop() {
        if (!this.isRunning) return;
        
        console.log('Stopping application...');
        
        this.countdownTimer?.stop();
        this.particleSystem?.stop();
        
        this.isRunning = false;
    }

    /**
     * 处理强度增加事件
     */
    handleIntensityIncrease(event) {
        const { intensity, remainingSeconds } = event.detail;
        
        console.log(`Intensity increased to: ${intensity} (${remainingSeconds}s remaining)`);
        
        // 更新粒子系统强度
        this.particleSystem.updateIntensity(intensity);
        
        // 视觉反馈
        this.showIntensityFeedback(intensity, remainingSeconds);
        
        // 更新状态文本
        this.updateStatusText(remainingSeconds);
        
        // 处理特殊效果
        this.handleSpecialEffects(intensity, remainingSeconds);
    }

    /**
     * 更新状态文本（已优化：移除中间状态提示，直接显示倒计时）
     */
    updateStatusText(remainingSeconds) {
        // 已优化：不再显示状态文本，只通过倒计时数字显示
        // 保持屏幕阅读器通知但减少频率
        if (remainingSeconds <= 10 && remainingSeconds > 0) {
            this.announceToScreenReader(`倒计时最后 ${remainingSeconds} 秒`);
        } else if (remainingSeconds === 0) {
            this.announceToScreenReader('春节快乐');
        }
    }

    /**
     * 处理特殊效果（使用策略映射）
     */
    handleSpecialEffects(intensity, remainingSeconds) {
        const effects = [
            {
                condition: () => intensity === 'critical' && remainingSeconds <= 5,
                action: () => this.prepareGrandFinale()
            },
            {
                condition: () => remainingSeconds <= 10 && remainingSeconds > 0,
                action: () => this.addCountdownVisualEffect(remainingSeconds)
            }
        ];

        effects.forEach(effect => {
            if (effect.condition()) {
                effect.action();
            }
        });
    }

    /**
     * 处理倒计时完成事件
     */
    handleCountdownComplete() {
        console.log('Countdown completed!');
        
        // 停止倒计时器
        this.countdownTimer.stop();
        
        // 播放倒计时完成音效
        if (this.audioManager) {
            this.audioManager.playCountdownComplete();
        }

        // 触发盛大结局
        setTimeout(() => {
            this.triggerGrandFinale();
        }, CONFIG.ANIMATIONS.grandFinaleDelay);
        
        // 屏幕阅读器通知
        this.announceToScreenReader('春节快乐！2026年已到来！');
        
        // 显示完成消息
        this.showCompletionMessage();
    }

    /**
     * 处理愿望添加事件
     */
    handleWishAdded(event) {
        const { wish } = event.detail;
        console.log('Wish added:', wish);
        
        // 屏幕阅读器通知
        this.announceToScreenReader('愿望已保存');
        
        // 播放愿望成功音效
        if (this.audioManager) {
            this.audioManager.playWishSuccess();
        }

        // 在画布上添加一个小烟花效果
        if (this.particleSystem) {
            // 在愿望提交位置附近发射烟花
            const rect = this.elements.wishForm.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            this.particleSystem.emitFirework(x, y, 0.8); // 80%规模
        }
        
        // 添加愿望卡片进入动画
        setTimeout(() => {
            const wishCards = this.elements.wishGallery.querySelectorAll('.wish-card');
            if (wishCards.length > 0) {
                const lastCard = wishCards[wishCards.length - 1];
                lastCard.classList.add('wish-card-enter');
            }
        }, 50);
        
        // 更新愿望统计显示
        this.updateWishStatsDisplay();
    }
    
    /**
     * 处理愿望删除事件
     */
    handleWishRemoved(event) {
        const { index } = event.detail;
        console.log('Wish removed at index:', index);
        
        // 屏幕阅读器通知
        this.announceToScreenReader('愿望已删除');
        
        // 在画布上添加消失动画效果
        if (this.particleSystem) {
            this.particleSystem.emitParticles(
                this.elements.canvas.width / 2,
                this.elements.canvas.height / 2,
                10,
                'rgba(255, 68, 68, 0.6)'
            );
        }
        
        // 更新愿望统计显示
        this.updateWishStatsDisplay();
    }
    
    /**
     * 处理愿望统计更新
     */
    handleWishStatsUpdated(event) {
        const { count, maxWishes, remaining } = event.detail;
        console.log(`Wish stats updated: ${count}/${maxWishes}`);
        
        // 更新统计显示
        this.updateWishStatsDisplay();
        
        // 如果达到最大愿望数，禁用提交按钮
        if (this.elements.wishSubmitBtn) {
            if (count >= maxWishes) {
                this.elements.wishSubmitBtn.disabled = true;
                this.elements.wishSubmitBtn.textContent = '愿望已满';
                this.showUserMessage(`已达到最大愿望数量 (${maxWishes})`, 'warning');
            } else {
                this.elements.wishSubmitBtn.disabled = false;
                this.elements.wishSubmitBtn.textContent = '✨ 点亮愿望';
            }
        }
    }
    
    /**
     * 更新愿望统计显示
     */
    updateWishStatsDisplay() {
        if (!this.wishManager) return;
        
        const stats = this.wishManager.getWishStats();
        const statsElement = document.getElementById('wish-stats');
        
        if (statsElement) {
            const badge = statsElement.querySelector('#wish-count-badge');
            if (badge) {
                badge.textContent = `${stats.count} 个愿望`;
                
                // 根据容量改变样式
                badge.style.background = '';
                if (stats.capacity >= 90) {
                    badge.style.background = 'var(--color-error)';
                    badge.style.color = 'white';
                } else if (stats.capacity >= 70) {
                    badge.style.background = 'var(--color-warning)';
                    badge.style.color = 'var(--color-midnight-blue-dark)';
                }
            }
        }
        
        // 更新字符计数器（如果存在）
        const charCount = document.getElementById('char-count');
        if (charCount && this.elements.wishInput) {
            const currentLength = this.elements.wishInput.value.length;
            charCount.textContent = currentLength;
        }
    }
    
    /**
     * 处理愿望烟花事件（从愿望管理器触发）
     */
    handleWishFirework(event) {
        if (!this.particleSystem) return;
        
        const { position } = event.detail;
        if (position) {
            this.particleSystem.emitFirework(position.x, position.y, 0.6);
        } else {
            // 默认位置：愿望表单中心
            const rect = this.elements.wishForm.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            this.particleSystem.emitFirework(x, y, 0.6);
        }
    }
    
    /**
     * 处理愿望删除效果事件
     */
    handleWishDeleteEffect() {
        if (!this.particleSystem) return;
        
        // 在画布中心发射红色粒子
        const x = this.elements.canvas.width / 2;
        const y = this.elements.canvas.height / 2;
        this.particleSystem.emitParticles(x, y, 15, 'rgba(255, 68, 68, 0.8)');
    }
    
    /**
     * 分享倒计时
     */
    shareCountdown() {
        const status = this.countdownTimer.getStatus();
        const text = `🎉 2026年春节倒计时\n\n距离2026年春节还有：\n${status.days}天 ${status.hours}小时 ${status.minutes}分钟 ${status.seconds}秒\n\n快来许下你的农历新年愿望吧！`;
        
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.classList.add('loading');
            shareBtn.textContent = '分享中...';
        }
        
        if (navigator.share) {
            navigator.share({
                title: '2026年春节倒计时',
                text: text
            }).then(() => {
                this.showUserMessage('倒计时已分享', 'success');
                this.announceToScreenReader('倒计时已分享');
            }).catch((error) => {
                if (error.name !== 'AbortError') {
                    this.copyTextToClipboard(text);
                } else {
                    this.showUserMessage('分享已取消', 'info');
                    this.announceToScreenReader('分享已取消');
                }
            }).finally(() => {
                if (shareBtn) {
                    shareBtn.classList.remove('loading');
                    shareBtn.textContent = '📤 分享';
                }
            });
        } else {
            this.copyTextToClipboard(text);
            if (shareBtn) {
                shareBtn.classList.remove('loading');
                shareBtn.textContent = '📤 分享';
            }
        }
    }
    
    /**
     * 复制文本到剪贴板
     */
    copyTextToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showUserMessage('已复制到剪贴板', 'success');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(text);
            });
        } else {
            this.fallbackCopyTextToClipboard(text);
        }
    }
    
    /**
     * 降级复制方法
     */
    fallbackCopyTextToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            this.showUserMessage('已复制到剪贴板', 'success');
        } catch (error) {
            this.showUserMessage('复制失败，请手动复制', 'error');
        }
        
        document.body.removeChild(textarea);
    }

    /**
     * 处理存储错误
     */
    handleStorageError(event) {
        const { message } = event.detail;
        console.error('Storage error:', message);
        
        this.showUserMessage(message, 'error');
    }

    /**
     * 处理验证错误
     */
    handleValidationError(event) {
        const { message } = event.detail;
        console.warn('Validation error:', message);
        
        // 错误消息由WishManager处理，这里只记录
    }

    /**
     * 处理应用程序错误
     */
    handleAppError(message) {
        console.error('App error:', message);
        
        // 显示错误消息
        const errorDiv = createElement('div', {
            class: 'app-error-message'
        }, message);
        
        errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#ff4444;color:white;padding:2rem;border-radius:8px;z-index:10000;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
        
        document.body.appendChild(errorDiv);
        
        // 触发错误事件
        this.dispatchAppError(message);
    }

    /**
     * 准备盛大结局
     */
    prepareGrandFinale() {
        console.log('Preparing grand finale...');
        
        // 增加粒子强度倍数
        this.particleSystem.setIntensityMultiplier(2.0);
        
        // 视觉提示
        if (this.elements.countdownRoot) {
            this.elements.countdownRoot.style.animation = 'pulse 0.5s ease-in-out 3';
        }
        
        // 添加倒计时数字放大效果
        if (this.elements.seconds) {
            this.elements.seconds.style.cssText = 'font-size:3rem;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.8);';
        }
    }

    /**
     * 添加倒计时视觉效果
     */
    addCountdownVisualEffect(remainingSeconds) {
        if (!this.elements.countdownRoot) return;
        
        // 根据剩余时间调整视觉效果
        if (remainingSeconds <= 3) {
            // 最后3秒：强烈脉冲
            this.elements.countdownRoot.style.animation = 'countdownPulse 0.3s ease-in-out infinite';
            
            // 添加闪烁警告
            if (this.elements.seconds) {
                this.elements.seconds.classList.add('blink');
                setTimeout(() => {
                    this.elements.seconds?.classList.remove('blink');
                }, 1000);
            }
        } else if (remainingSeconds <= 10) {
            // 10秒内：轻微脉冲
            this.elements.countdownRoot.style.animation = 'pulse 1s ease-in-out infinite';
        }
    }

    /**
     * 触发盛大结局
     */
    triggerGrandFinale() {
        console.log('Triggering grand finale!');
        
        // 大型烟花爆发
        this.particleSystem.grandFinale();
        
        // 全屏闪烁效果
        this.addFullscreenEffect();
        
        // 停止粒子系统（5秒后）
        setTimeout(() => {
            this.particleSystem.stop();
        }, 5000);
    }

    /**
     * 添加全屏效果
     */
    addFullscreenEffect() {
        const overlay = createElement('div', {
            class: 'grand-finale-overlay'
        });
        
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle,rgba(255,215,0,0.2)0%,transparent 70%);pointer-events:none;z-index:997;animation:flash 1s ease-out forwards;';
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.remove();
        }, 1000);
    }

    /**
     * 显示强度反馈
     */
    showIntensityFeedback(intensity, remainingSeconds) {
        if (!this.elements.root) return;
        
        // 添加临时的视觉反馈
        const feedback = createElement('div', {
            class: 'intensity-feedback'
        }, `${intensity.toUpperCase()}!`);
        
        feedback.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:3rem;font-weight:bold;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.8);pointer-events:none;z-index:999;animation:fadeIn 0.5s ease-out,fadeOut 0.5s ease-in 1.5s forwards;';
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        this.showUserMessage('欢迎！春节倒计时已开始', 'success');
    }

    /**
     * 显示完成消息
     */
    showCompletionMessage() {
        this.showUserMessage('🎉 春节快乐！2026年已到来！', 'success', 5000);
    }

    /**
     * 显示目标日期已过消息
     */
    showTargetDatePassedMessage() {
        const message = '2026年春节已到来！感谢使用本应用。';
        
        const div = createElement('div', {
            class: 'target-date-passed'
        }, message);
        
        div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#ffd700,#ffed4e);color:#0a1a3a;padding:3rem;border-radius:16px;font-size:1.5rem;font-weight:bold;text-align:center;z-index:10000;box-shadow:0 0 40px rgba(255,215,0,0.8);';
        
        document.body.appendChild(div);
    }

    /**
     * 显示用户消息
     */
    showUserMessage(message, type = 'info', duration = null) {
        if (!CONFIG.ERRORS.showUserMessages) return;
        
        const durationToUse = duration || CONFIG.ERRORS.messageDuration;
        
        const messageDiv = createElement('div', {
            class: `user-message ${type}`
        }, message);
        
        const bgColor = type === 'error' ? '#ff4444' :
                       type === 'success' ? '#44ff44' : '#0088ff';
        
        messageDiv.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:${bgColor};color:white;padding:1rem 2rem;border-radius:8px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:slideUp 0.3s ease-out;`;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => messageDiv.remove(), 300);
        }, durationToUse);
    }

    /**
     * 屏幕阅读器通知
     */
    announceToScreenReader(message) {
        if (!this.elements.liveRegion) return;
        
        this.elements.liveRegion.textContent = message;
        
        // 清空消息以便下次通知
        setTimeout(() => {
            this.elements.liveRegion.textContent = '';
        }, 1000);
    }

    /**
     * 分发应用程序就绪事件
     */
    dispatchAppReady() {
        const event = new CustomEvent(EVENTS.APP_READY, {
            detail: { app: this }
        });
        document.dispatchEvent(event);
    }

    /**
     * 分发应用程序错误事件
     */
    dispatchAppError(message) {
        const event = new CustomEvent(EVENTS.APP_ERROR, {
            detail: { message, app: this }
        });
        document.dispatchEvent(event);
    }

    /**
     * 获取应用程序状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            modules: {
                countdown: this.countdownTimer?.getStatus(),
                particles: this.particleSystem?.getStatus(),
                wishes: this.wishManager?.getStatus()
            },
            performance: {
                uptime: this.performance.startTime ? Date.now() - this.performance.startTime : 0,
                frameCount: this.performance.frameCount
            }
        };
    }

    /**
     * 初始化游戏集成
     */
    async initGameIntegration() {
        try {
            // 延迟初始化，避免影响主应用性能
            setTimeout(async () => {
                try {
                    this.gameIntegration = new GameIntegration(this);
                    await this.gameIntegration.init();
                    console.log('🎮 游戏系统集成成功');
                    
                    // 检查URL哈希，自动加入房间
                    const hash = window.location.hash;
                    if (hash.startsWith('#room-')) {
                        const roomId = hash.substr(6);
                        console.log(`🔗 检测到房间链接: ${roomId}，准备自动加入...`);
                    }
                } catch (error) {
                    console.warn('游戏系统初始化失败:', error);
                    // 游戏系统不是核心功能，不影响主应用
                }
            }, 1000); // 延迟1秒初始化游戏系统
        } catch (error) {
            console.warn('游戏集成初始化异常:', error);
        }
    }

    /**
     * 获取游戏集成实例
     */
    getGameIntegration() {
        return this.gameIntegration;
    }

    /**
     * 销毁应用程序
     */
    destroy() {
        console.log('Destroying application...');
        
        this.stop();
        
        if (this.countdownTimer) {
            this.countdownTimer.destroy();
        }
        
        if (this.particleSystem) {
            this.particleSystem.destroy();
        }
        
        if (this.wishManager) {
            this.wishManager.destroy();
        }
        
        if (this.gameIntegration) {
            this.gameIntegration.destroy();
        }
        
        // 清理事件监听器
        document.removeEventListener('visibilitychange', () => {});
        
        this.isInitialized = false;
        this.isRunning = false;
        
        console.log('Application destroyed');
    }
}

/**
 * 应用程序启动器
 */
class AppLauncher {
    constructor() {
        this.app = null;
    }

    /**
     * 启动应用程序
     */
    async launch() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // 创建并初始化应用
        this.app = new NewYearCountdownApp();
        
        // 绑定全局事件
        this.bindGlobalEvents();
        
        // 初始化
        await this.app.init();
        
        return this.app;
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 应用程序就绪事件
        document.addEventListener(EVENTS.APP_READY, (e) => {
            console.log('🚀 App Ready Event:', e.detail.app.getStatus());
        });
        
        // 应用程序错误事件
        document.addEventListener(EVENTS.APP_ERROR, (e) => {
            console.error('❌ App Error Event:', e.detail.message);
        });
    }

    /**
     * 获取应用实例
     */
    getApp() {
        return this.app;
    }
}

// 自动启动（如果不在模块环境中）
if (typeof window !== 'undefined') {
    // 等待页面加载完成后自动启动
    window.addEventListener('load', () => {
        // 延迟一小段时间确保所有资源加载完成
        setTimeout(() => {
            const launcher = new AppLauncher();
            launcher.launch().then(app => {
                // 挂载到全局以便调试
                window.newYearApp = app;
                
                // 显示调试信息
                if (isDevelopment()) {
                    console.log('%c🎉 春节倒计时应用已启动', 'color: #ffd700; font-size: 16px; font-weight: bold;');
                    console.log('开发者工具中可以使用 window.newYearApp 访问应用实例');
                }
            }).catch(error => {
                console.error('启动失败:', error);
            });
        }, 500);
    });
}

// 导出供模块化使用
export { NewYearCountdownApp, AppLauncher };
export default NewYearCountdownApp;