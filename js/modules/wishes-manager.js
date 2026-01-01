/* 许愿功能管理模块 */

import { createElement, isLocalStorageAvailable, safeJSONParse } from './utils.js';

/**
 * 许愿管理器类
 */
export class WishManager {
    /**
     * @param {Object} elements - DOM元素引用对象
     * @param {Object} config - 配置参数
     */
    constructor(elements, config = {}) {
        this.elements = {
            form: elements.form,
            input: elements.input,
            submitBtn: elements.submitBtn,
            gallery: elements.gallery,
            stats: elements.stats,
            clearBtn: elements.clearBtn,
            exportBtn: elements.exportBtn,
            importBtn: elements.importBtn,
            charCount: elements.charCount,
            ...elements
        };
        this.config = config;
        
        // 存储键名
        this.storageKey = config.storageKey || 'lunar-new-year-wishes-2026';
        
        // 最大愿望数量
        this.maxWishes = config.maxWishes || 20;
        
        // 最大字符数
        this.maxChars = config.maxChars || 200;
        
        // 愿望数组
        this.wishes = [];
        
        // 是否已初始化
        this.isInitialized = false;
        
        // 自定义事件（使用事件名称常量）
        this.events = {
            wishAdded: new CustomEvent('wish-added', { detail: { wish: null } }),
            wishRemoved: new CustomEvent('wish-removed', { detail: { index: null } }),
            storageError: new CustomEvent('storage-error', { detail: { message: '' } }),
            validationError: new CustomEvent('validation-error', { detail: { message: '' } })
        };
    }

    /**
     * 初始化
     */
    init() {
        if (this.isInitialized) return;
        
        // 加载存储的愿望
        this.loadFromStorage();
        
        // 绑定表单事件
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
        
        // 绑定输入验证和字符计数
        if (this.elements.input) {
            this.elements.input.addEventListener('input', () => {
                this.updateCharCount();
                this.validateInput();
            });
            
            this.elements.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.handleFormSubmit();
                }
            });
        }
        
        // 绑定清空按钮
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => {
                if (this.elements.input) {
                    this.elements.input.value = '';
                    this.updateCharCount();
                    this.elements.input.classList.remove('error', 'success');
                }
            });
        }
        
        // 绑定导出按钮
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => {
                this.exportWishesToFile();
            });
        }
        
        // 绑定导入按钮
        if (this.elements.importBtn) {
            this.elements.importBtn.addEventListener('click', () => {
                this.importWishesFromFile();
            });
        }

        // 渲染现有愿望
        this.renderGallery();
        
        this.isInitialized = true;
        console.log('WishManager initialized');
    }
    
    /**
     * 更新字符计数
     */
    updateCharCount() {
        if (!this.elements.input || !this.elements.charCount) return;
        
        const currentLength = this.elements.input.value.length;
        const max = this.maxChars;
        
        this.elements.charCount.textContent = `${currentLength} / ${max}`;
        
        // 根据长度改变样式
        const counter = this.elements.charCount.parentElement;
        if (counter) {
            counter.classList.remove('warning', 'error');
            
            if (currentLength > max * 0.9) {
                counter.classList.add('error');
            } else if (currentLength > max * 0.7) {
                counter.classList.add('warning');
            }
        }
        
        // 更新输入框状态
        if (currentLength > max) {
            this.elements.input.classList.add('error');
            this.elements.input.classList.remove('success');
        } else if (currentLength > 0) {
            this.elements.input.classList.remove('error');
        }
    }

    /**
     * 从本地存储加载愿望
     */
    loadFromStorage() {
        if (!isLocalStorageAvailable()) {
            this.dispatchStorageError('本地存储不可用');
            return;
        }
        
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = safeJSONParse(stored, []);
                if (Array.isArray(data)) {
                    this.wishes = data;
                }
            }
        } catch (error) {
            this.dispatchStorageError('读取存储数据失败');
            console.error('Load from storage error:', error);
        }
    }

    /**
     * 保存到本地存储
     */
    saveToStorage() {
        if (!isLocalStorageAvailable()) {
            this.dispatchStorageError('本地存储不可用');
            return false;
        }
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.wishes));
            return true;
        } catch (error) {
            this.dispatchStorageError('保存到存储失败');
            console.error('Save to storage error:', error);
            return false;
        }
    }

    /**
     * 处理表单提交
     */
    async handleFormSubmit() {
        const text = this.elements.input?.value.trim();
        
        // 验证输入
        if (!this.validateInput(text)) {
            return;
        }
        
        // 设置加载状态
        if (this.elements.submitBtn) {
            this.elements.submitBtn.classList.add('loading');
            this.elements.submitBtn.disabled = true;
            this.elements.submitBtn.textContent = '保存中...';
        }
        
        try {
            // 模拟异步操作（300ms延迟）
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 创建愿望对象
            const wish = {
                text: text,
                timestamp: Date.now(),
                formattedDate: new Date().toLocaleString('zh-CN')
            };
            
            // 添加到愿望数组
            this.wishes.unshift(wish); // 添加到开头
            
            // 限制愿望数量
            if (this.wishes.length > this.maxWishes) {
                this.wishes = this.wishes.slice(0, this.maxWishes);
            }
            
            // 保存到存储
            if (this.saveToStorage()) {
                // 清空输入框
                if (this.elements.input) {
                    this.elements.input.value = '';
                    this.elements.input.classList.remove('error');
                    this.elements.input.classList.add('success');
                    
                    setTimeout(() => {
                        this.elements.input?.classList.remove('success');
                    }, 1000);
                }
                
                // 重新渲染画廊
                this.renderGallery();
                
                // 触发添加事件
                this.dispatchWishAdded(wish);
                
                // 添加视觉反馈
                this.showSuccessAnimation();
                
                // 屏幕阅读器通知
                this.announceToScreenReader('愿望已成功保存');
            }
        } catch (error) {
            console.error('保存愿望失败:', error);
            this.showTemporaryMessage('保存失败，请重试', 'error');
            this.announceToScreenReader('保存失败，请重试');
        } finally {
            // 恢复按钮状态
            if (this.elements.submitBtn) {
                this.elements.submitBtn.classList.remove('loading');
                this.elements.submitBtn.disabled = false;
                this.elements.submitBtn.textContent = '✨ 点亮愿望';
            }
        }
    }

    /**
     * 验证输入
     * @param {string} text - 要验证的文本
     * @returns {boolean} 是否有效
     */
    validateInput(text) {
        if (!text) {
            this.showValidationError('请输入您的愿望');
            return false;
        }
        
        if (text.length > this.maxChars) {
            this.showValidationError(`愿望不能超过${this.maxChars}个字符`);
            return false;
        }
        
        if (text.length < 2) {
            this.showValidationError('愿望太短了，请多写一些');
            return false;
        }
        
        // 检查是否包含不当内容（简单示例）
        const forbiddenWords = ['暴力', '仇恨', '歧视'];
        const hasForbidden = forbiddenWords.some(word => text.includes(word));
        
        if (hasForbidden) {
            this.showValidationError('愿望包含不当内容，请修改');
            return false;
        }
        
        // 清除错误状态
        if (this.elements.input) {
            this.elements.input.classList.remove('error');
        }
        
        return true;
    }

    /**
     * 显示验证错误
     * @param {string} message - 错误消息
     */
    showValidationError(message) {
        if (this.elements.input) {
            this.elements.input.classList.add('error');
            this.elements.input.classList.remove('success');
            this.elements.input.setAttribute('aria-invalid', 'true');
            this.elements.input.setAttribute('aria-describedby', 'wish-error-message');
            
            // 创建或更新错误消息元素
            let errorElement = document.getElementById('wish-error-message');
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = 'wish-error-message';
                errorElement.className = 'wish-message error';
                errorElement.setAttribute('role', 'alert');
                if (this.elements.form) {
                    this.elements.form.appendChild(errorElement);
                }
            }
            errorElement.textContent = message;
        }
        
        // 触发验证错误事件
        this.dispatchValidationError(message);
        
        // 显示错误提示
        this.showTemporaryMessage(message, 'error');
        
        // 屏幕阅读器通知
        this.announceToScreenReader(message);
    }
    
    /**
     * 屏幕阅读器通知
     * @param {string} message - 消息内容
     */
    announceToScreenReader(message) {
        // 检查是否存在全局实时区域
        let liveRegion = document.getElementById('a11y-announcer');
        if (!liveRegion) {
            // 创建临时实时区域
            liveRegion = document.createElement('div');
            liveRegion.id = 'a11y-announcer';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
            document.body.appendChild(liveRegion);
        }
        
        liveRegion.textContent = message;
        
        // 清空消息以便下次通知
        setTimeout(() => { liveRegion.textContent = ''; }, 1000);
    }

    /**
     * 显示临时消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 ('error' | 'success')
     */
    showTemporaryMessage(message, type = 'error') {
        if (!this.elements.form) return;
        
        // 移除现有消息
        const existingMsg = this.elements.form.querySelector('.wish-message');
        if (existingMsg) existingMsg.remove();
        
        // 创建消息元素
        const msgElement = createElement('div', {
            class: `wish-message ${type} animate-slide-up wish-message-${type}`
        }, message);
        
        this.elements.form.appendChild(msgElement);
        
        // 3秒后移除
        setTimeout(() => msgElement.remove(), 3000);
    }

    /**
     * 显示成功动画
     */
    showSuccessAnimation() {
        if (!this.elements.form) return;
        
        // 在表单位置显示一个临时的愿望卡片预览
        const previewCard = createElement('div', {
            class: 'wish-preview-card wish-preview-enter'
        });
        
        const text = this.elements.input?.value.trim() || '愿望已保存';
        previewCard.innerHTML = `<div class="wish-text">${text}</div><div class="wish-timestamp">已点亮 ✨</div>`;
        
        // 临时添加到body
        document.body.appendChild(previewCard);
        
        // 1秒后移除
        setTimeout(() => previewCard.remove(), 1000);
    }
    
    /**
     * 显示烟花效果（与粒子系统集成）
     */
    showFireworkEffect() {
        // 触发自定义事件，让主应用处理粒子效果
        const event = new CustomEvent('wish-firework', {
            detail: {
                timestamp: Date.now(),
                position: this.getFormPosition()
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 获取表单位置
     */
    getFormPosition() {
        if (!this.elements.form) return null;
        const rect = this.elements.form.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }
    
    /**
     * 添加愿望卡片进入动画
     */
    addCardEnterAnimation() {
        setTimeout(() => {
            const wishCards = this.elements.gallery?.querySelectorAll('.wish-card');
            if (wishCards && wishCards.length > 0) {
                const lastCard = wishCards[wishCards.length - 1];
                lastCard.classList.add('wish-card-enter');
                
                // 触发粒子效果
                this.showFireworkEffect();
            }
        }, 50);
    }
    
    /**
     * 显示愿望删除动画
     */
    showDeleteAnimation(cardElement) {
        if (!cardElement) return;
        
        // 添加消失动画
        cardElement.style.transition = 'all 0.3s ease';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.8) translateY(-10px)';
        
        // 触发删除事件
        setTimeout(() => {
            const event = new CustomEvent('wish-delete-effect', {
                detail: { timestamp: Date.now() }
            });
            document.dispatchEvent(event);
        }, 150);
    }

    /**
     * 渲染愿望画廊 - 使用文档片段优化性能
     */
    renderGallery() {
        if (!this.elements.gallery) return;
        
        // 设置aria-busy状态
        this.elements.gallery.setAttribute('aria-busy', 'true');
        
        const previousCount = this.elements.gallery.querySelectorAll('.wish-card').length;
        
        // 使用文档片段批量操作DOM
        const fragment = document.createDocumentFragment();
        
        if (this.wishes.length === 0) {
            // 显示空状态
            const emptyState = createElement('div', {
                class: 'wish-empty-state'
            }, '还没有愿望，快来许下第一个愿望吧！');
            fragment.appendChild(emptyState);
        } else {
            // 批量创建愿望卡片
            const cards = this.wishes.map((wish, index) =>
                this.createWishCard(wish, index)
            );
            
            // 一次性添加到文档片段
            cards.forEach(card => fragment.appendChild(card));
            
            // 批量应用动画（使用requestAnimationFrame）
            requestAnimationFrame(() => {
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0) scale(1)';
                    }, index * 50);
                });
            });
        }
        
        // 清空并批量更新DOM
        this.elements.gallery.innerHTML = '';
        this.elements.gallery.appendChild(fragment);
        
        // 更新统计
        this.updateStats();
        
        // 通知屏幕阅读器
        const newCount = this.wishes.length;
        if (newCount !== previousCount) {
            const announcement = `愿望列表已更新，现在有 ${newCount} 个愿望`;
            this.announceToScreenReader(announcement);
        }
        
        // 恢复aria-busy状态
        this.elements.gallery.setAttribute('aria-busy', 'false');
    }
    
    /**
     * 更新愿望统计
     */
    updateStats() {
        if (!this.elements.stats) return;
        
        const count = this.wishes.length;
        const badge = this.elements.stats.querySelector('#wish-count-badge');
        
        if (badge) {
            badge.textContent = `${count} 个愿望`;
        }
        
        // 触发统计更新事件
        const event = new CustomEvent('wish-stats-updated', {
            detail: {
                count: count,
                maxWishes: this.maxWishes,
                remaining: this.maxWishes - count
            }
        });
        
        if (this.elements.gallery) {
            this.elements.gallery.dispatchEvent(event);
        }
        
        // 同时更新提交按钮状态
        if (this.elements.submitBtn) {
            if (count >= this.maxWishes) {
                this.elements.submitBtn.disabled = true;
                this.elements.submitBtn.textContent = '愿望已满';
                this.elements.submitBtn.title = `已达到最大愿望数量 (${this.maxWishes})`;
            } else {
                this.elements.submitBtn.disabled = false;
                this.elements.submitBtn.textContent = '✨ 点亮愿望';
                this.elements.submitBtn.title = '提交愿望';
            }
        }
    }

    /**
     * 创建愿望卡片
     * @param {Object} wish - 愿望对象
     * @param {number} index - 索引
     * @returns {HTMLElement} 卡片元素
     */
    createWishCard(wish, index) {
        const card = createElement('div', {
            class: 'wish-card wish-card-enter',
            'data-index': index
        });
        
        const text = createElement('div', {
            class: 'wish-text'
        }, wish.text);
        
        const timestamp = createElement('div', {
            class: 'wish-timestamp'
        }, wish.formattedDate);
        
        // 删除按钮
        const deleteBtn = createElement('button', {
            class: 'wish-delete-btn',
            'aria-label': '删除愿望'
        }, '×');
        
        // 删除按钮点击事件
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeWish(index);
        });
        
        // 批量添加子元素
        card.append(text, timestamp, deleteBtn);
        
        return card;
    }

    /**
     * 删除愿望
     * @param {number} index - 索引
     */
    removeWish(index) {
        if (index < 0 || index >= this.wishes.length) return;
        
        // 确认删除
        if (!confirm('确定要删除这个愿望吗？')) {
            return;
        }
        
        // 从数组中移除
        this.wishes.splice(index, 1);
        
        // 保存到存储
        if (this.saveToStorage()) {
            // 重新渲染
            this.renderGallery();
            
            // 触发删除事件
            this.dispatchWishRemoved(index);
            
            // 显示提示
            this.showTemporaryMessage('愿望已删除', 'success');
        }
    }

    /**
     * 清空所有愿望
     */
    clearAll() {
        if (this.wishes.length === 0) return;
        
        if (!confirm(`确定要清空所有 ${this.wishes.length} 个愿望吗？`)) {
            return;
        }
        
        this.wishes = [];
        
        if (this.saveToStorage()) {
            this.renderGallery();
            this.showTemporaryMessage('所有愿望已清空', 'success');
        }
    }

    /**
     * 获取愿望数量
     * @returns {number} 愿望数量
     */
    getWishCount() {
        return this.wishes.length;
    }

    /**
     * 导出愿望数据
     * @returns {string} JSON字符串
     */
    exportWishes() {
        return JSON.stringify(this.wishes, null, 2);
    }
    
    /**
     * 导出愿望到文件
     */
    exportWishesToFile() {
        if (this.wishes.length === 0) {
            this.showTemporaryMessage('没有愿望可导出', 'error');
            this.announceToScreenReader('没有愿望可导出');
            return;
        }
        
        // 获取导出按钮并设置加载状态
        const exportBtn = document.getElementById('export-wishes-btn');
        if (exportBtn) {
            exportBtn.classList.add('loading');
            exportBtn.textContent = '导出中...';
        }
        
        // 使用setTimeout避免UI冻结
        setTimeout(() => {
            try {
                const data = this.exportWishes();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                
                const timestamp = new Date().toISOString().split('T')[0];
                a.href = url;
                a.download = `wishes-lunar-2026-${timestamp}.json`;
                a.click();
                
                URL.revokeObjectURL(url);
                this.showTemporaryMessage('愿望已导出', 'success');
                this.announceToScreenReader('愿望导出成功');
            } catch (error) {
                console.error('导出失败:', error);
                this.showTemporaryMessage('导出失败', 'error');
                this.announceToScreenReader('导出失败，请重试');
            } finally {
                // 恢复按钮状态
                if (exportBtn) {
                    exportBtn.classList.remove('loading');
                    exportBtn.textContent = '📤 导出愿望';
                }
            }
        }, 100);
    }
    
    /**
     * 分享愿望（使用Web Share API）
     */
    async shareWishes() {
        if (this.wishes.length === 0) {
            this.showTemporaryMessage('没有愿望可分享', 'error');
            return;
        }
        
        const text = this.wishes.map((wish, index) =>
            `${index + 1}. ${wish.text} (${wish.formattedDate})`
        ).join('\n');
        
        const shareText = `我的2026年春节愿望清单 (${this.wishes.length}个):\n\n${text}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: '我的2026年春节愿望',
                    text: shareText
                });
                this.showTemporaryMessage('愿望已分享', 'success');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.copyToClipboard(shareText);
                }
            }
        } else {
            this.copyToClipboard(shareText);
        }
    }
    
    /**
     * 复制到剪贴板
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showTemporaryMessage('已复制到剪贴板', 'success');
            }).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }
    
    /**
     * 降级复制方法
     */
    fallbackCopyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            this.showTemporaryMessage('已复制到剪贴板', 'success');
        } catch (error) {
            this.showTemporaryMessage('复制失败，请手动复制', 'error');
        }
        
        document.body.removeChild(textarea);
    }
    
    /**
     * 获取愿望统计信息
     */
    getWishStats() {
        const totalChars = this.wishes.reduce((sum, wish) => sum + wish.text.length, 0);
        const avgChars = this.wishes.length > 0 ? Math.round(totalChars / this.wishes.length) : 0;
        
        return {
            count: this.wishes.length,
            maxWishes: this.maxWishes,
            remaining: this.maxWishes - this.wishes.length,
            totalChars: totalChars,
            avgChars: avgChars,
            capacity: Math.round((this.wishes.length / this.maxWishes) * 100)
        };
    }

    /**
     * 导入愿望数据
     * @param {string} jsonString - JSON字符串
     * @returns {boolean} 是否成功
     */
    importWishes(jsonString) {
        try {
            const data = safeJSONParse(jsonString, null);
            if (!data || !Array.isArray(data)) {
                this.showValidationError('无效的数据格式');
                return false;
            }
            
            // 验证每个愿望对象
            const validWishes = data.filter(wish => 
                wish && 
                typeof wish.text === 'string' && 
                typeof wish.timestamp === 'number' &&
                wish.text.trim().length > 0
            );
            
            if (validWishes.length === 0) {
                this.showValidationError('没有有效的愿望数据');
                return false;
            }
            
            // 合并愿望（去重）
            const existingTexts = new Set(this.wishes.map(w => w.text));
            const newWishes = validWishes.filter(w => !existingTexts.has(w.text));
            
            this.wishes = [...newWishes, ...this.wishes].slice(0, this.maxWishes);
            
            if (this.saveToStorage()) {
                this.renderGallery();
                this.showTemporaryMessage(`成功导入 ${newWishes.length} 个愿望`, 'success');
                return true;
            }
            
            return false;
            
        } catch (error) {
            this.showValidationError('导入失败：数据解析错误');
            console.error('Import error:', error);
            return false;
        }
    }

    /**
     * 从文件导入愿望
     */
    importWishesFromFile() {
        // 创建隐藏的文件输入框
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        // 监听文件选择
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 读取文件内容
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                this.importWishes(content);
            };
            
            reader.onerror = () => {
                this.showTemporaryMessage('文件读取失败', 'error');
            };
            
            reader.readAsText(file);
        });
        
        // 触发文件选择对话框
        input.click();
    }

    /**
     * 事件分发方法
     */
    dispatchWishAdded(wish) {
        // 创建新的事件实例，确保数据是最新的
        const event = new CustomEvent('wish-added', {
            detail: { wish: wish }
        });
        if (this.elements.gallery) {
            this.elements.gallery.dispatchEvent(event);
        }
    }

    dispatchWishRemoved(index) {
        const event = new CustomEvent('wish-removed', {
            detail: { index: index }
        });
        if (this.elements.gallery) {
            this.elements.gallery.dispatchEvent(event);
        }
    }

    dispatchStorageError(message) {
        const event = new CustomEvent('storage-error', {
            detail: { message: message }
        });
        if (this.elements.gallery) {
            this.elements.gallery.dispatchEvent(event);
        }
    }

    dispatchValidationError(message) {
        const event = new CustomEvent('validation-error', {
            detail: { message: message }
        });
        if (this.elements.form) {
            this.elements.form.dispatchEvent(event);
        }
    }

    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(eventName, callback) {
        let target;
        switch(eventName) {
            case 'validation-error':
                target = this.elements.form;
                break;
            case 'wish-added':
            case 'wish-removed':
            case 'storage-error':
            case 'wish-stats-updated':
                target = this.elements.gallery;
                break;
            default:
                target = this.elements.gallery;
        }
        
        if (target) {
            target.addEventListener(eventName, callback);
        }
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(eventName, callback) {
        let target;
        switch(eventName) {
            case 'validation-error':
                target = this.elements.form;
                break;
            case 'wish-added':
            case 'wish-removed':
            case 'storage-error':
            case 'wish-stats-updated':
                target = this.elements.gallery;
                break;
            default:
                target = this.elements.gallery;
        }
        
        if (target) {
            target.removeEventListener(eventName, callback);
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        // 移除事件监听器
        if (this.elements.form) {
            this.elements.form.replaceWith(this.elements.form.cloneNode(true));
        }
        
        if (this.elements.input) {
            this.elements.input.replaceWith(this.elements.input.cloneNode(true));
        }
        
        this.isInitialized = false;
        console.log('WishManager destroyed');
    }

    /**
     * 获取状态信息
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            wishCount: this.wishes.length,
            maxWishes: this.maxWishes,
            maxChars: this.maxChars,
            storageAvailable: isLocalStorageAvailable()
        };
    }
}