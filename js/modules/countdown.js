/* 倒计时计时器模块 */

import { formatTimeDifference } from './utils.js';

/**
 * 倒计时计时器类
 */
export class CountdownTimer {
    /**
     * @param {string} targetDate - 目标日期字符串，如 '2026-02-16T00:00:00'
     * @param {Object} elements - DOM元素引用对象
     */
    constructor(targetDate, elements) {
        this.targetDate = new Date(targetDate);
        this.elements = elements;
        this.intervalId = null;
        this.isRunning = false;
        this.lastUpdateTime = null;
        this.debugLogged = false;
        
        // 自定义事件
        this.events = {
            tick: new CustomEvent('countdown-tick', { detail: { time: null } }),
            completed: new CustomEvent('countdown-completed'),
            intensityIncreased: new CustomEvent('countdown-intensity-increased')
        };
        
        // 强度阈值（秒）
        this.intensityThresholds = {
            normal: 0,
            medium: 300,    // 5分钟
            high: 60,       // 1分钟
            critical: 10    // 10秒
        };
        
        this.currentIntensity = 'normal';
    }

    /**
     * 计算剩余时间
     * @returns {Object} 剩余时间对象
     */
    getTimeRemaining() {
        const now = new Date();
        const diff = this.targetDate - now;
        
        // 调试日志
        if (!this.debugLogged) {
            console.log('=== Countdown Debug ===');
            console.log('当前时间 (now):', now);
            console.log('目标时间 (targetDate):', this.targetDate);
            console.log('时间差 (diff):', diff, '毫秒');
            console.log('时间差 (秒):', diff / 1000);
            console.log('时间差 (分钟):', diff / (1000 * 60));
            console.log('时间差 (小时):', diff / (1000 * 60 * 60));
            console.log('时间差 (天):', diff / (1000 * 60 * 60 * 24));
            console.log('是否已过期:', diff <= 0);
            this.debugLogged = true;
        }
        
        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
        }
        
        const time = formatTimeDifference(diff);
        time.total = diff;
        
        return time;
    }

    /**
     * 更新DOM显示
     * @param {Object} time - 时间对象
     */
    updateDisplay(time) {
        if (!this.elements) return;
        
        if (this.elements.days) {
            this.elements.days.textContent = String(time.days).padStart(2, '0');
        }
        if (this.elements.hours) {
            this.elements.hours.textContent = String(time.hours).padStart(2, '0');
        }
        if (this.elements.minutes) {
            this.elements.minutes.textContent = String(time.minutes).padStart(2, '0');
        }
        if (this.elements.seconds) {
            this.elements.seconds.textContent = String(time.seconds).padStart(2, '0');
        }
    }

    /**
     * 检查并更新强度
     * @param {number} remainingSeconds - 剩余秒数
     */
    updateIntensity(remainingSeconds) {
        let newIntensity = 'normal';
        
        if (remainingSeconds <= this.intensityThresholds.critical) {
            newIntensity = 'critical';
        } else if (remainingSeconds <= this.intensityThresholds.high) {
            newIntensity = 'high';
        } else if (remainingSeconds <= this.intensityThresholds.medium) {
            newIntensity = 'medium';
        }
        
        if (newIntensity !== this.currentIntensity) {
            this.currentIntensity = newIntensity;
            
            // 触发强度变化事件
            this.elements.root?.dispatchEvent(
                new CustomEvent('countdown-intensity-increased', {
                    detail: { intensity: newIntensity, remainingSeconds }
                })
            );
            
            // 添加视觉反馈
            this.addIntensityVisualFeedback(newIntensity);
        }
    }

    /**
     * 添加强度视觉反馈
     * @param {string} intensity - 强度级别
     */
    addIntensityVisualFeedback(intensity) {
        if (!this.elements.root) return;
        
        const root = this.elements.root;
        
        // 移除之前的强度类
        root.classList.remove('intensity-medium', 'intensity-high', 'intensity-critical');
        
        // 添加新的强度类
        if (intensity === 'medium') {
            root.classList.add('intensity-medium');
        } else if (intensity === 'high') {
            root.classList.add('intensity-high');
        } else if (intensity === 'critical') {
            root.classList.add('intensity-critical');
            
            // 临界状态添加脉冲动画
            if (this.elements.seconds) {
                this.elements.seconds.classList.add('countdown-highlight');
                setTimeout(() => {
                    this.elements.seconds?.classList.remove('countdown-highlight');
                }, 1000);
            }
        }
    }

    /**
     * 检查是否已完成
     * @param {Object} time - 时间对象
     * @returns {boolean} 是否已完成
     */
    checkCompletion(time) {
        if (time.total <= 0 && this.isRunning) {
            this.stop();
            this.updateDisplay({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            
            // 触发完成事件
            if (this.elements.root) {
                this.elements.root.dispatchEvent(this.events.completed);
            }
            
            // 显示完成消息
            this.showCompletionMessage();
            
            return true;
        }
        return false;
    }

    /**
     * 显示完成消息
     */
    showCompletionMessage() {
        if (!this.elements.root) return;
        
        const completionDiv = document.createElement('div');
        completionDiv.className = 'completion-message animate-fade-in';
        completionDiv.textContent = '🎉 春节快乐！2026年已到来！';
        completionDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #0a1a3a;
            padding: 2rem 3rem;
            border-radius: 16px;
            font-size: 1.5rem;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
            text-align: center;
        `;
        
        document.body.appendChild(completionDiv);
        
        // 5秒后移除
        setTimeout(() => {
            completionDiv.remove();
        }, 5000);
    }

    /**
     * 单次计时器滴答
     */
    tick() {
        const time = this.getTimeRemaining();
        
        // 更新显示
        this.updateDisplay(time);
        
        // 检查强度变化
        this.updateIntensity(time.total / 1000);
        
        // 触发tick事件
        if (this.elements.root) {
            this.elements.root.dispatchEvent(
                new CustomEvent('countdown-tick', { detail: { time } })
            );
        }
        
        // 检查是否完成
        this.checkCompletion(time);
        
        this.lastUpdateTime = Date.now();
    }

    /**
     * 启动计时器
     * @param {number} interval - 更新间隔（毫秒），默认1000
     */
    start(interval = 1000) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // 立即执行一次
        this.tick();
        
        // 设置定时器
        this.intervalId = setInterval(() => {
            this.tick();
        }, interval);
        
        console.log('Countdown timer started');
    }

    /**
     * 停止计时器
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('Countdown timer stopped');
    }

    /**
     * 暂停计时器
     */
    pause() {
        if (!this.isRunning) return;
        
        this.stop();
        console.log('Countdown timer paused');
    }

    /**
     * 恢复计时器
     * @param {number} interval - 更新间隔（毫秒），默认1000
     */
    resume(interval = 1000) {
        if (this.isRunning) return;
        
        this.start(interval);
        console.log('Countdown timer resumed');
    }

    /**
     * 重置计时器
     */
    reset() {
        this.stop();
        this.currentIntensity = 'normal';
        
        if (this.elements.root) {
            this.elements.root.classList.remove('intensity-medium', 'intensity-high', 'intensity-critical');
        }
        
        this.updateDisplay({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        console.log('Countdown timer reset');
    }

    /**
     * 销毁计时器，清理资源
     */
    destroy() {
        this.stop();
        this.elements = null;
        console.log('Countdown timer destroyed');
    }

    /**
     * 获取当前状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            targetDate: this.targetDate,
            remainingTime: this.getTimeRemaining(),
            intensity: this.currentIntensity,
            lastUpdate: this.lastUpdateTime
        };
    }

    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(eventName, callback) {
        if (this.elements.root) {
            this.elements.root.addEventListener(eventName, callback);
        }
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(eventName, callback) {
        if (this.elements.root) {
            this.elements.root.removeEventListener(eventName, callback);
        }
    }
}