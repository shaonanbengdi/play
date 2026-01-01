/* 音频管理器模块 - 负责处理所有音效和背景音乐 */

export class AudioManager {
    constructor() {
        this.isInitialized = false;
        this.isMuted = false;
        this.volume = 0.7; // 70%音量
        this.sounds = {};
        this.backgroundMusic = null;
        
        // Web Audio API 上下文
        this.audioContext = null;
    }

    /**
     * 初始化音频管理器
     */
    init() {
        if (this.isInitialized) return;

        // 初始化Web Audio API
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API 不可用:', e);
            return;
        }

        this.isInitialized = true;
        console.log('AudioManager initialized');
    }

    /**
     * 创建简单的音效
     * @param {Object} options - 音效参数
     * @returns {AudioBuffer} 音频缓冲
     */
    async createSimpleSound(options = {}) {
        if (!this.isInitialized || !this.audioContext) return null;

        const {
            frequency = 440,  // 频率
            duration = 0.5,   // 时长
            type = 'sine',    // 波形类型
            volume = 0.5      // 音量
        } = options;

        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        // 生成波形
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const amplitude = t < 0.1 ? t / 0.1 : (1 - (t - 0.1) / (duration - 0.1)); // 淡入淡出
            const wave = Math.sin(2 * Math.PI * frequency * t); // 正弦波
            data[i] = wave * amplitude * volume;
        }

        return buffer;
    }

    /**
     * 播放音效
     * @param {string} soundName - 音效名称
     */
    async playSound(soundName) {
        if (!this.isInitialized || this.isMuted || !this.audioContext) return;

        let buffer = this.sounds[soundName];

        // 如果音效不存在，创建它
        if (!buffer) {
            buffer = await this.createDefaultSound(soundName);
            if (buffer) {
                this.sounds[soundName] = buffer;
            }
        }

        if (buffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // 创建增益节点控制音量
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.volume * 0.5; // 音效音量为背景音乐的一半
            
            // 连接音频节点
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 播放
            source.start();
        }
    }

    /**
     * 创建默认音效
     * @param {string} soundName - 音效名称
     */
    async createDefaultSound(soundName) {
        const soundConfigs = {
            'celebration': { frequency: 523, duration: 1.0, type: 'sine', volume: 0.8 }, // 庆祝音效 - C调
            'wish-success': { frequency: 659, duration: 0.3, type: 'triangle', volume: 0.5 }, // 愿望成功 - E调
            'firework': { frequency: 784, duration: 0.6, type: 'sawtooth', volume: 0.7 } // 烟花 - G调
        };

        if (soundConfigs[soundName]) {
            return this.createSimpleSound(soundConfigs[soundName]);
        }

        return null;
    }

    /**
     * 播放倒计时完成音效
     */
    playCountdownComplete() {
        this.playSound('celebration');
    }

    /**
     * 播放愿望提交成功音效
     */
    playWishSuccess() {
        this.playSound('wish-success');
    }

    /**
     * 播放烟花音效
     */
    playFirework() {
        this.playSound('firework');
    }

    /**
     * 切换静音
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.backgroundMusic) {
            this.backgroundMusic.muted = this.isMuted;
        }
        return this.isMuted;
    }

    /**
     * 设置音量
     * @param {number} volume - 音量值 (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.volume;
        }
        return this.volume;
    }

    /**
     * 获取当前音量
     * @returns {number} 音量值 (0-1)
     */
    getVolume() {
        return this.volume;
    }

    /**
     * 检查是否静音
     * @returns {boolean} 是否静音
     */
    isMutedState() {
        return this.isMuted;
    }

    /**
     * 销毁音频管理器
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.isInitialized = false;
        console.log('AudioManager destroyed');
    }
}