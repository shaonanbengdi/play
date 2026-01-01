/**
 * 房间管理器 - 处理房间创建、加入、离开等逻辑
 * @module room-manager
 */

export class RoomManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentRoomId = null;
        this.roomState = 'idle'; // idle, waiting, playing
        this.roomSettings = {
            maxPlayers: 4,
            gameType: null,
            isPublic: false
        };
        
        // 事件系统
        this.listeners = {};
        
        // 绑定方法
        this.handleUrlHashChange = this.handleUrlHashChange.bind(this);
        
        // 监听URL哈希变化
        window.addEventListener('hashchange', this.handleUrlHashChange);
    }

    /**
     * 创建房间
     */
    async createRoom(gameType, settings = {}) {
        try {
            // 验证游戏类型
            if (!this.isValidGameType(gameType)) {
                throw new Error(`无效的游戏类型: ${gameType}`);
            }
            
            // 生成房间ID
            const roomId = this.generateRoomId();
            
            // 合并设置
            this.roomSettings = {
                ...this.roomSettings,
                ...settings,
                gameType: gameType
            };
            
            // 通知游戏管理器创建房间
            const success = await this.gameManager.createRoom(roomId);
            
            if (success) {
                this.currentRoomId = roomId;
                this.roomState = 'waiting';
                
                // 更新URL
                this.updateUrl(roomId);
                
                // 触发事件
                this.emit('room-created', {
                    roomId: roomId,
                    gameType: gameType,
                    settings: this.roomSettings
                });
                
                return {
                    success: true,
                    roomId: roomId,
                    url: this.getRoomUrl(roomId)
                };
            } else {
                throw new Error('创建房间失败');
            }
            
        } catch (error) {
            console.error('创建房间错误:', error);
            this.emit('room-error', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 加入房间
     */
    async joinRoom(roomId, gameType = null) {
        try {
            // 验证房间ID格式
            if (!this.isValidRoomId(roomId)) {
                throw new Error(`无效的房间ID: ${roomId}`);
            }
            
            // 通知游戏管理器加入房间
            const success = await this.gameManager.joinRoom(roomId, gameType);
            
            if (success) {
                this.currentRoomId = roomId;
                this.roomState = 'waiting';
                
                // 如果没有指定游戏类型，尝试从URL或设置获取
                if (!gameType && this.roomSettings.gameType) {
                    gameType = this.roomSettings.gameType;
                }
                
                // 触发事件
                this.emit('room-joined', {
                    roomId: roomId,
                    gameType: gameType
                });
                
                return {
                    success: true,
                    roomId: roomId
                };
            } else {
                throw new Error('加入房间失败');
            }
            
        } catch (error) {
            console.error('加入房间错误:', error);
            this.emit('room-error', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 离开房间
     */
    async leaveRoom() {
        if (!this.currentRoomId) {
            return { success: true };
        }
        
        try {
            // 通知游戏管理器离开房间
            await this.gameManager.leaveRoom();
            
            const oldRoomId = this.currentRoomId;
            this.currentRoomId = null;
            this.roomState = 'idle';
            
            // 清除URL哈希
            if (window.location.hash.startsWith('#room-')) {
                window.location.hash = '';
            }
            
            // 触发事件
            this.emit('room-left', { roomId: oldRoomId });
            
            return { success: true };
            
        } catch (error) {
            console.error('离开房间错误:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 开始游戏
     */
    async startGame() {
        if (!this.currentRoomId) {
            return { success: false, error: '未在房间中' };
        }
        
        if (this.roomState !== 'waiting') {
            return { success: false, error: '房间状态错误' };
        }
        
        // 检查是否是主机
        if (!this.gameManager.isHost()) {
            return { success: false, error: '只有主机可以开始游戏' };
        }
        
        try {
            await this.gameManager.startGame();
            this.roomState = 'playing';
            
            this.emit('game-started', {
                roomId: this.currentRoomId,
                gameType: this.roomSettings.gameType
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('开始游戏错误:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 结束游戏
     */
    async endGame(results = null) {
        if (this.roomState === 'idle') {
            return { success: true };
        }
        
        try {
            await this.gameManager.endGame(results);
            this.roomState = 'waiting';
            
            this.emit('game-ended', {
                roomId: this.currentRoomId,
                results: results
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('结束游戏错误:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取房间信息
     */
    getRoomInfo() {
        return {
            roomId: this.currentRoomId,
            state: this.roomState,
            settings: this.roomSettings,
            isHost: this.gameManager.isHost(),
            players: this.gameManager.getPlayers(),
            url: this.currentRoomId ? this.getRoomUrl(this.currentRoomId) : null
        };
    }

    /**
     * 更新房间设置
     */
    updateSettings(settings) {
        this.roomSettings = {
            ...this.roomSettings,
            ...settings
        };
        
        this.emit('settings-updated', {
            settings: this.roomSettings
        });
    }

    /**
     * 生成房间ID
     */
    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 验证游戏类型
     */
    isValidGameType(gameType) {
        const validTypes = ['fu-character-catch', 'red-envelope-race', 'zodiac-battle'];
        return validTypes.includes(gameType);
    }

    /**
     * 验证房间ID格式
     */
    isValidRoomId(roomId) {
        return /^[A-Z0-9]{6}$/.test(roomId);
    }

    /**
     * 获取房间URL
     */
    getRoomUrl(roomId) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}#room-${roomId}`;
    }

    /**
     * 更新URL
     */
    updateUrl(roomId) {
        window.location.hash = `room-${roomId}`;
    }

    /**
     * 处理URL哈希变化
     */
    handleUrlHashChange() {
        const hash = window.location.hash;
        
        if (hash.startsWith('#room-')) {
            const roomId = hash.substr(6);
            
            // 如果不在房间中，尝试自动加入
            if (!this.currentRoomId && roomId) {
                this.emit('url-room-detected', { roomId });
            }
        } else if (this.currentRoomId && !hash.startsWith('#room-')) {
            // 用户手动清除了哈希，离开房间
            this.leaveRoom();
        }
    }

    /**
     * 检查是否可以加入房间
     */
    canJoinRoom(roomId) {
        if (!this.isValidRoomId(roomId)) {
            return { canJoin: false, reason: '无效的房间ID' };
        }
        
        if (this.currentRoomId) {
            return { canJoin: false, reason: '已经在房间中' };
        }
        
        return { canJoin: true };
    }

    /**
     * 获取玩家列表
     */
    getPlayers() {
        return this.gameManager.getPlayers();
    }

    /**
     * 检查房间是否准备好开始游戏
     */
    isReadyToStart() {
        if (this.roomState !== 'waiting') return false;
        if (!this.gameManager.isHost()) return false;
        
        const players = this.getPlayers();
        return players.length >= 2; // 至少2个玩家
    }

    /**
     * 事件监听
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
        
        // 全局事件
        const globalEvent = new CustomEvent(`room:${event}`, { detail: data });
        document.dispatchEvent(globalEvent);
    }

    /**
     * 移除监听器
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * 从URL自动恢复房间
     */
    async autoJoinFromUrl() {
        const hash = window.location.hash;
        if (hash.startsWith('#room-')) {
            const roomId = hash.substr(6);
            if (this.isValidRoomId(roomId)) {
                // 尝试加入，但不指定游戏类型（需要后续确定）
                const result = await this.joinRoom(roomId);
                return result;
            }
        }
        return { success: false };
    }

    /**
     * 清理资源
     */
    destroy() {
        this.leaveRoom();
        this.listeners = {};
        window.removeEventListener('hashchange', this.handleUrlHashChange);
    }

    /**
     * 获取房间统计
     */
    getStats() {
        const players = this.getPlayers();
        return {
            roomId: this.currentRoomId,
            state: this.roomState,
            playerCount: players.length,
            maxPlayers: this.roomSettings.maxPlayers,
            isHost: this.gameManager.isHost()
        };
    }
}