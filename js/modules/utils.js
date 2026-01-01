/* 工具函数模块 */

/**
 * 格式化日期时间为字符串
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串，如 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 生成指定范围内的随机数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机数
 */
export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 生成指定范围内的随机整数
 * @param {number} min - 最小值（包含）
 * @param {number} max - 最大值（包含）
 * @returns {number} 随机整数
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 创建DOM元素
 * @param {string} tag - 标签名
 * @param {Object} attributes - 属性对象
 * @param {string} content - 内容
 * @returns {HTMLElement} 创建的元素
 */
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });
    
    if (content) {
        element.textContent = content;
    }
    
    return element;
}

/**
 * 错误处理包装器
 * @param {Function} func - 要包装的函数
 * @param {string} context - 错误上下文信息
 * @returns {Function} 包装后的函数
 */
export function withErrorHandling(func, context = 'Unknown operation') {
    return async function(...args) {
        try {
            return await func(...args);
        } catch (error) {
            console.error(`Error in ${context}:`, error);
            // 可以在这里添加用户友好的错误提示
            return null;
        }
    };
}

/**
 * 检查本地存储是否可用
 * @returns {boolean} 是否可用
 */
export function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 安全地解析JSON
 * @param {string} jsonString - JSON字符串
 * @param {any} fallback - 解析失败时的默认值
 * @returns {any} 解析结果
 */
export function safeJSONParse(jsonString, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return fallback;
    }
}

/**
 * 格式化时间差（天、小时、分钟、秒）
 * @param {number} diffMs - 时间差（毫秒）
 * @returns {Object} 格式化的时间对象
 */
export function formatTimeDifference(diffMs) {
    if (diffMs <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
}

/**
 * 检查是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 获取CSS变量值
 * @param {string} variableName - 变量名（包括--前缀）
 * @returns {string} 变量值
 */
export function getCSSVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

/**
 * 添加CSS变量
 * @param {string} variableName - 变量名
 * @param {string} value - 变量值
 */
export function setCSSVariable(variableName, value) {
    document.documentElement.style.setProperty(variableName, value);
}