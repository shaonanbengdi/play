/* 应用程序配置 */

/**
 * 应用程序配置对象
 */
export const CONFIG = {
    // 倒计时目标日期（农历除夕 2026-02-16 午夜）
    COUNTDOWN_TARGET: '2026-02-16T00:00:00',
    
    // 粒子系统配置
    PARTICLES: {
        // 雪花配置
        snowflakeRate: 0.2,           // 雪花发射率（每帧）
        snowflakeColor: 'rgba(255, 255, 255, 0.8)',
        snowflakeSpeed: { min: 0.5, max: 2 },
        snowflakeSize: { min: 2, max: 5 },
        
        // 烟花配置
        fireworkRate: 0.01,           // 烟花发射率（每帧）
        fireworkColors: [
            'rgba(255, 100, 100, 1)',  // 红色
            'rgba(100, 255, 100, 1)',  // 绿色
            'rgba(100, 100, 255, 1)',  // 蓝色
            'rgba(255, 255, 100, 1)',  // 黄色
            'rgba(255, 100, 255, 1)',  // 紫色
            'rgba(100, 255, 255, 1)'   // 青色
        ],
        fireworkParticleCount: { min: 20, max: 40 },
        fireworkSpeed: { min: 2, max: 6 },
        
        // 性能配置
        maxParticles: 500,            // 最大粒子数量
        performanceThreshold: 30,     // 性能阈值（FPS）
        targetFPS: 60,                // 目标FPS
        
        // 强度倍数配置
        intensityMultipliers: {
            normal: 1.0,
            medium: 1.5,
            high: 2.0,
            critical: 3.0
        },
        
        // 强度变化时的发射率调整
        intensityEmissionRates: {
            normal: { snowflake: 1.0, firework: 1.0 },
            medium: { snowflake: 0.8, firework: 2.0 },      // 雪花减少，烟花增加
            high: { snowflake: 0.5, firework: 3.0 },        // 雪花大幅减少，烟花大幅增加
            critical: { snowflake: 0.3, firework: 5.0 }     // 雪花最少，烟花最多
        }
    },
    
    // 许愿功能配置
    WISHES: {
        storageKey: 'lunar-new-year-wishes-2026',
        maxWishes: 20,
        maxChars: 200
    },
    
    // 动画配置
    ANIMATIONS: {
        intensityThresholds: {
            medium: 300,    // 5分钟
            high: 60,       // 1分钟
            critical: 10    // 10秒
        },
        grandFinaleDelay: 5000 // 午夜后延迟显示盛大结局
    },
    
    // 性能配置
    PERFORMANCE: {
        useRequestAnimationFrame: true,
        targetFPS: 60,
        particleCleanupInterval: 1000
    },
    
    // 可访问性配置
    ACCESSIBILITY: {
        announceUpdates: true,
        liveRegionId: 'a11y-announcer'
    },
    
    // 错误处理配置
    ERRORS: {
        showUserMessages: true,
        messageDuration: 3000
    }
};

/**
 * DOM元素选择器配置
 */
export const SELECTORS = {
    // 倒计时元素
    countdown: {
        root: '.countdown-display',
        days: '#days',
        hours: '#hours',
        minutes: '#minutes',
        seconds: '#seconds'
    },
    
    // 许愿功能元素
    wishes: {
        form: '#wish-form',
        input: '#wish-input',
        submitBtn: '#wish-submit-btn',
        gallery: '#wish-gallery',
        stats: '#wish-stats',
        clearBtn: '#clear-wish-btn',
        exportBtn: '#export-wishes-btn',
        charCount: '#char-count'
    },
    
    // 画布元素
    canvas: '#particle-canvas',
    
    // 页面根元素
    root: 'body'
};

/**
 * 事件名称常量
 */
export const EVENTS = {
    // 倒计时事件
    COUNTDOWN_TICK: 'countdown-tick',
    COUNTDOWN_COMPLETED: 'countdown-completed',
    COUNTDOWN_INTENSITY_INCREASED: 'countdown-intensity-increased',
    
    // 许愿事件
    WISH_ADDED: 'wish-added',
    WISH_REMOVED: 'wish-removed',
    STORAGE_ERROR: 'storage-error',
    VALIDATION_ERROR: 'validation-error',
    WISH_STATS_UPDATED: 'wish-stats-updated',
    
    // 粒子系统事件
    PARTICLE_SYSTEM_STARTED: 'particle-system-started',
    PARTICLE_SYSTEM_STOPPED: 'particle-system-stopped',
    
    // 应用程序事件
    APP_READY: 'app-ready',
    APP_ERROR: 'app-error'
};

/**
 * 辅助函数：获取配置值
 * @param {string} path - 配置路径，如 'PARTICLES.maxParticles'
 * @param {any} defaultValue - 默认值
 * @returns {any} 配置值
 */
export function getConfig(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
}

/**
 * 辅助函数：检查是否为开发环境
 * @returns {boolean} 是否为开发环境
 */
export function isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
}

/**
 * 辅助函数：获取目标日期
 * @returns {Date} 目标日期对象
 */
export function getTargetDate() {
    return new Date(CONFIG.COUNTDOWN_TARGET);
}

/**
 * 辅助函数：检查是否已过目标日期
 * @returns {boolean} 是否已过目标日期
 */
export function isTargetDatePassed() {
    return Date.now() > getTargetDate().getTime();
}

/**
 * 辅助函数：格式化配置用于调试
 * @returns {string} 格式化的配置字符串
 */
export function formatConfigForDebug() {
    return JSON.stringify(CONFIG, null, 2);
}