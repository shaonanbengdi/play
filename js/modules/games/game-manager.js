/**
 * 游戏管理器 - 协调所有游戏，管理游戏生命周期
 * @module game-manager
 */

export class GameManager {
    constructor(app) {
        this.app = app;
        this.currentGame = null;
        this.roomManager = null;
        this.networkManager = null;
        this.gameState = 'idle'; // idle, waiting, playing, ended
        this.playerId = this.generatePlayerId();
        this.playerName = this.generatePlayerName();
        
        // 游戏配置
        this.games = {
            'fu-character-catch': () => import('./fu-character-catch.js').then(m => new m.FuCharacterCatch(this)),
            'red-envelope-race': () => import('./red-envelope-race.js').then(m => new m.RedEnvelopeRace(this)),
            'zodiac-battle': () => import('./zodiac-battle.js').then(m => new m.ZodiacBattle(this))
        };
        
        // 事件系统
        this.listeners = {};
        
        // 绑定方法
        this.handleNetworkMessage = this.handleNetworkMessage.bind(this);
        this.handleGameAction = this.handleGameAction.bind(this);
    }

    /**
     * 生成玩家ID
     */
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 生成玩家名称
     */
    generatePlayerName() {
        const adjectives = ['幸运', '快乐', '勇敢', '智慧', '热情'];
        const nouns = ['福星', '龙仔', '虎妹', '兔宝', '蛇仙'];
        return adjectives[Math.floor(Math.random() * adjectives.length)] + 
               nouns[Math.floor(Math.random() * nouns.length)];
    }

    /**
     * 初始化网络管理器
     */
    async initNetwork() {
        try {
            // 动态导入PeerJS
            if (!window.Peer) {
                await this.loadPeerJS();
            }
            
            const { MultiplayerManager } = await import('./multiplayer-manager.js');
            this.networkManager = new MultiplayerManager(this);
            this.networkManager.on('message', this.handleNetworkMessage);
            
            return true;
        } catch (error) {
            console.warn('网络初始化失败:', error);
            return false;
        }
    }

    /**
     * 加载PeerJS库
     */
    async loadPeerJS() {
        return new Promise((resolve, reject) => {
            if (window.Peer) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load PeerJS'));
            document.head.appendChild(script);
        });
    }

    /**
     * 创建房间
     */
    async createRoom(gameType) {
        if (!this.networkManager) {
            await this.initNetwork();
        }
        
        if (!this.networkManager) {
            alert('网络初始化失败，无法创建房间');
            return null;
        }
        
        const roomId = this.generateRoomId();
        const success = await this.networkManager.createRoom(roomId);
        
        if (success) {
            this.gameState = 'waiting';
            this.currentGameType = gameType;
            
            // 更新URL
            window.location.hash = `room-${roomId}`;
            
            // 触发事件
            this.emit('room-created', { roomId, gameType });
            
            return roomId;
        }
        
        return null;
    }

    /**
     * 加入房间
     */
    async joinRoom(roomId, gameType) {
        if (!this.networkManager) {
            await this.initNetwork();
        }
        
        if (!this.networkManager) {
            alert('网络初始化失败，无法加入房间');
            return false;
        }
        
        const success = await this.networkManager.joinRoom(roomId);
        
        if (success) {
            this.gameState = 'waiting';
            this.currentGameType = gameType;
            
            // 触发事件
            this.emit('room-joined', { roomId, gameType });
            
            return true;
        }
        
        return false;
    }

    /**
     * 开始游戏
     */
    async startGame() {
        if (!this.currentGameType) {
            console.error('未选择游戏类型');
            return;
        }
        
        if (this.gameState !== 'waiting') {
            console.error('游戏状态错误:', this.gameState);
            return;
        }
        
        // 加载游戏模块
        const gameLoader = this.games[this.currentGameType];
        if (!gameLoader) {
            console.error('未知游戏类型:', this.currentGameType);
            return;
        }
        
        try {
            this.currentGame = await gameLoader();
            this.gameState = 'playing';
            
            // 通知其他玩家开始游戏
            if (this.networkManager) {
                this.networkManager.send({
                    type: 'game-start',
                    gameType: this.currentGameType,
                    timestamp: Date.now()
                });
            }
            
            // 触发事件
            this.emit('game-started', { gameType: this.currentGameType });
            
            // 启动游戏
            await this.currentGame.start();
            
        } catch (error) {
            console.error('启动游戏失败:', error);
            this.gameState = 'idle';
            this.emit('game-error', { error: error.message });
        }
    }

    /**
     * 结束游戏
     */
    async endGame(results = null) {
        if (this.currentGame) {
            await this.currentGame.stop();
            this.currentGame = null;
        }
        
        this.gameState = 'ended';
        
        // 通知其他玩家
        if (this.networkManager) {
            this.networkManager.send({
                type: 'game-end',
                results: results,
                timestamp: Date.now()
            });
        }
        
        // 触发事件
        this.emit('game-ended', { results });
        
        // 清理房间
        if (this.networkManager) {
            this.networkManager.leaveRoom();
        }
        
        // 清除URL哈希
        if (window.location.hash.startsWith('#room-')) {
            window.location.hash = '';
        }
        
        this.gameState = 'idle';
        this.currentGameType = null;
    }

    /**
     * 发送游戏动作
     */
    sendGameAction(action, data) {
        if (!this.networkManager || this.gameState !== 'playing') {
            return;
        }
        
        this.networkManager.send({
            type: 'game-action',
            action: action,
            data: data,
            playerId: this.playerId,
            timestamp: Date.now()
        });
    }

    /**
     * 处理网络消息
     */
    handleNetworkMessage(message) {
        switch (message.type) {
            case 'game-start':
                if (message.gameType && !this.currentGame) {
                    this.currentGameType = message.gameType;
                    this.startGame();
                }
                break;
                
            case 'game-action':
                if (this.currentGame && this.gameState === 'playing') {
                    this.currentGame.handleRemoteAction(message);
                }
                break;
                
            case 'game-state':
                if (this.currentGame && this.gameState === 'playing') {
                    this.currentGame.syncState(message.state);
                }
                break;
                
            case 'game-end':
                if (this.currentGame) {
                    this.endGame(message.results);
                }
                break;
                
            case 'player-joined':
                this.emit('player-joined', message);
                break;
                
            case 'player-left':
                this.emit('player-left', message);
                break;
        }
        
        // 传递给当前游戏
        if (this.currentGame && this.currentGame.handleNetworkMessage) {
            this.currentGame.handleNetworkMessage(message);
        }
    }

    /**
     * 处理本地游戏动作
     */
    handleGameAction(action, data) {
        // 本地处理
        if (this.currentGame && this.currentGame.handleLocalAction) {
            this.currentGame.handleLocalAction(action, data);
        }
        
        // 发送到网络
        this.sendGameAction(action, data);
        
        // 触发事件
        this.emit('action-performed', { action, data });
    }

    /**
     * 生成房间ID
     */
    generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    /**
     * 获取当前房间ID
     */
    getRoomId() {
        const hash = window.location.hash;
        if (hash.startsWith('#room-')) {
            return hash.substr(6);
        }
        return null;
    }

    /**
     * 检查是否是主机
     */
    isHost() {
        return this.networkManager ? this.networkManager.isHost() : true;
    }

    /**
     * 获取玩家列表
     */
    getPlayers() {
        return this.networkManager ? this.networkManager.getPlayers() : [{
            id: this.playerId,
            name: this.playerName,
            isLocal: true
        }];
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
        const globalEvent = new CustomEvent(`game:${event}`, { detail: data });
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
     * 清理资源
     */
    destroy() {
        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }
        
        if (this.networkManager) {
            this.networkManager.destroy();
            this.networkManager = null;
        }
        
        this.listeners = {};
        this.gameState = 'idle';
        this.currentGameType = null;
    }

    /**
     * 获取游戏状态
     */
    getState() {
        return {
            gameState: this.gameState,
            gameType: this.currentGameType,
            playerId: this.playerId,
            playerName: this.playerName,
            roomId: this.getRoomId(),
            isHost: this.isHost(),
            players: this.getPlayers()
        };
    }
}