/**
 * 游戏系统集成模块
 * 将游戏系统集成到主应用中
 * @module game-integration
 */

export class GameIntegration {
    constructor(app) {
        this.app = app;
        this.gameManager = null;
        this.gameUI = null;
        this.isInitialized = false;
        
        // 绑定方法
        this.handleGameButton = this.handleGameButton.bind(this);
        this.handleCreateRoom = this.handleCreateRoom.bind(this);
        this.handleJoinRoom = this.handleJoinRoom.bind(this);
        this.handleLeaveRoom = this.handleLeaveRoom.bind(this);
        this.handleStartGame = this.handleStartGame.bind(this);
    }

    /**
     * 初始化游戏集成
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            // 动态导入游戏模块
            const { GameManager } = await import('./games/game-manager.js');
            const { GameUI } = await import('./games/game-ui.js');
            
            // 创建游戏管理器
            this.gameManager = new GameManager(this.app);
            
            // 创建游戏UI
            this.gameUI = new GameUI(this.gameManager);
            
            // 绑定游戏按钮事件
            this.bindGameEvents();
            
            // 监听游戏管理器事件
            this.setupGameListeners();
            
            this.isInitialized = true;
            console.log('🎮 游戏系统集成完成');
            
        } catch (error) {
            console.error('游戏系统初始化失败:', error);
            this.showGameError('游戏系统初始化失败，请刷新页面重试');
        }
    }

    /**
     * 绑定游戏按钮事件
     */
    bindGameEvents() {
        // 游戏入口按钮
        const gameButtons = document.querySelectorAll('.game-btn');
        gameButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameType = e.target.dataset.game;
                this.handleGameButton(gameType);
            });
        });
        
        // 游戏控制按钮
        const createRoomBtn = document.getElementById('create-room-btn');
        const joinRoomBtn = document.getElementById('join-room-btn');
        const leaveRoomBtn = document.getElementById('leave-room-btn');
        const startGameBtn = document.getElementById('start-game-btn');
        
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', this.handleCreateRoom);
        }
        
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', this.handleJoinRoom);
        }
        
        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', this.handleLeaveRoom);
        }
        
        if (startGameBtn) {
            startGameBtn.addEventListener('click', this.handleStartGame);
        }
        
        // 房间ID输入框回车
        const roomInput = document.getElementById('room-id-input');
        if (roomInput) {
            roomInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleJoinRoom();
                }
            });
        }
    }

    /**
     * 设置游戏监听器
     */
    setupGameListeners() {
        if (!this.gameManager) return;
        
        // 游戏事件监听
        this.gameManager.on('room-created', (data) => {
            this.updateGameStatus('房间创建成功', data.roomId);
            this.showGameControls(true);
        });
        
        this.gameManager.on('room-joined', (data) => {
            this.updateGameStatus('已加入房间', data.roomId);
            this.showGameControls(true);
        });
        
        this.gameManager.on('game-started', (data) => {
            this.updateGameStatus('游戏进行中', data.gameType);
            this.hideGamePanel();
            this.showGameCanvas();
            
            // 暂停主应用的粒子系统
            if (this.app.particleSystem) {
                this.app.particleSystem.pause();
            }
        });
        
        this.gameManager.on('game-ended', (data) => {
            this.updateGameStatus('游戏结束');
            this.showGamePanel();
            this.hideGameCanvas();
            
            // 恢复主应用的粒子系统
            if (this.app.particleSystem) {
                this.app.particleSystem.resume();
            }
            
            // 显示游戏结果
            if (data.results) {
                this.showGameResults(data.results);
            }
        });
        
        this.gameManager.on('player-joined', (data) => {
            this.updatePlayerCount();
            this.showNotification(`${data.player.name} 加入游戏`, 'info');
        });
        
        this.gameManager.on('player-left', (data) => {
            this.updatePlayerCount();
            this.showNotification('玩家离开游戏', 'warning');
        });
        
        this.gameManager.on('game-error', (data) => {
            this.showGameError(data.error);
        });
    }

    /**
     * 处理游戏按钮点击
     */
    handleGameButton(gameType) {
        if (!this.isInitialized) {
            this.showNotification('游戏系统正在初始化...', 'warning');
            return;
        }
        
        // 显示游戏面板
        this.showGamePanel();
        
        // 更新游戏选择
        const gameSelect = document.getElementById('game-select');
        if (gameSelect) {
            gameSelect.value = gameType;
        }
        
        // 滚动到游戏区域
        const gameSection = document.querySelector('.game-section');
        if (gameSection) {
            gameSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        this.showNotification(`已选择: ${this.getGameName(gameType)}`, 'info');
    }

    /**
     * 处理创建房间
     */
    async handleCreateRoom() {
        const gameSelect = document.getElementById('game-select');
        if (!gameSelect) return;
        
        const gameType = gameSelect.value;
        
        // 显示加载状态
        this.setLoadingState(true);
        
        try {
            await this.gameManager.roomManager.createRoom(gameType);
        } catch (error) {
            this.showGameError('创建房间失败: ' + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * 处理加入房间
     */
    async handleJoinRoom() {
        const roomInput = document.getElementById('room-id-input');
        const gameSelect = document.getElementById('game-select');
        
        if (!roomInput || !gameSelect) return;
        
        const roomId = roomInput.value.trim().toUpperCase();
        const gameType = gameSelect.value;
        
        if (!roomId || roomId.length !== 6) {
            this.showGameError('请输入有效的6位房间ID');
            return;
        }
        
        // 显示加载状态
        this.setLoadingState(true);
        
        try {
            await this.gameManager.roomManager.joinRoom(roomId, gameType);
        } catch (error) {
            this.showGameError('加入房间失败: ' + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * 处理离开房间
     */
    async handleLeaveRoom() {
        try {
            await this.gameManager.roomManager.leaveRoom();
            this.showNotification('已离开房间', 'info');
            this.showGameControls(false);
        } catch (error) {
            this.showGameError('离开房间失败: ' + error.message);
        }
    }

    /**
     * 处理开始游戏
     */
    async handleStartGame() {
        if (!this.gameManager.isHost()) {
            this.showGameError('只有主机可以开始游戏');
            return;
        }
        
        try {
            await this.gameManager.roomManager.startGame();
        } catch (error) {
            this.showGameError('开始游戏失败: ' + error.message);
        }
    }

    /**
     * 显示游戏面板
     */
    showGamePanel() {
        const statusPanel = document.getElementById('game-status-panel');
        const controls = document.getElementById('game-controls');
        const roomInput = document.getElementById('game-room-input');
        
        if (statusPanel) statusPanel.style.display = 'block';
        if (controls) controls.style.display = 'flex';
        if (roomInput) roomInput.style.display = 'block';
    }

    /**
     * 隐藏游戏面板
     */
    hideGamePanel() {
        const statusPanel = document.getElementById('game-status-panel');
        const controls = document.getElementById('game-controls');
        const roomInput = document.getElementById('game-room-input');
        
        if (statusPanel) statusPanel.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (roomInput) roomInput.style.display = 'none';
    }

    /**
     * 显示游戏画布
     */
    showGameCanvas() {
        const container = document.getElementById('game-canvas-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * 隐藏游戏画布
     */
    hideGameCanvas() {
        const container = document.getElementById('game-canvas-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * 显示/隐藏游戏控制按钮
     */
    showGameControls(show) {
        const leaveBtn = document.getElementById('leave-room-btn');
        const startBtn = document.getElementById('start-game-btn');
        const createBtn = document.getElementById('create-room-btn');
        const joinBtn = document.getElementById('join-room-btn');
        
        if (leaveBtn) leaveBtn.style.display = show ? 'inline-block' : 'none';
        if (startBtn) {
            startBtn.style.display = show && this.gameManager.isHost() ? 'inline-block' : 'none';
        }
        if (createBtn) createBtn.style.display = show ? 'none' : 'inline-block';
        if (joinBtn) joinBtn.style.display = show ? 'none' : 'inline-block';
    }

    /**
     * 更新游戏状态
     */
    updateGameStatus(status, roomId = null) {
        const statusText = document.getElementById('game-status-text');
        const roomIdEl = document.getElementById('game-room-id');
        
        if (statusText) {
            statusText.textContent = status;
        }
        
        if (roomIdEl && roomId) {
            roomIdEl.textContent = roomId;
        }
    }

    /**
     * 更新玩家计数
     */
    updatePlayerCount() {
        if (!this.gameManager) return;
        
        const playerCount = document.getElementById('game-player-count');
        if (playerCount) {
            const players = this.gameManager.getPlayers();
            playerCount.textContent = players.length;
        }
    }

    /**
     * 设置加载状态
     */
    setLoadingState(loading) {
        const buttons = [
            document.getElementById('create-room-btn'),
            document.getElementById('join-room-btn'),
            document.getElementById('leave-room-btn'),
            document.getElementById('start-game-btn')
        ];
        
        buttons.forEach(btn => {
            if (btn) {
                btn.disabled = loading;
                btn.classList.toggle('loading', loading);
            }
        });
    }

    /**
     * 显示游戏结果
     */
    showGameResults(results) {
        // 结果由GameUI处理，这里只显示通知
        this.showNotification('游戏结束，查看结果', 'success');
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 复用主应用的通知系统
        if (this.app && this.app.showUserMessage) {
            this.app.showUserMessage(message, type);
        } else {
            // 备用方案
            const notification = document.createElement('div');
            notification.className = `game-message show ${type}`;
            notification.textContent = message;
            notification.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:3000;';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    }

    /**
     * 显示游戏错误
     */
    showGameError(message) {
        this.showNotification(message, 'error');
        console.error('Game Error:', message);
    }

    /**
     * 获取游戏名称
     */
    getGameName(gameType) {
        const names = {
            'fu-character-catch': '接福字挑战',
            'red-envelope-race': '抢红包竞速',
            'zodiac-battle': '生肖对战'
        };
        return names[gameType] || gameType;
    }

    /**
     * 获取游戏状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasGameManager: !!this.gameManager,
            hasGameUI: !!this.gameUI,
            currentRoom: this.gameManager ? this.gameManager.getRoomId() : null,
            isPlaying: this.gameManager ? this.gameManager.getState().gameState === 'playing' : false
        };
    }

    /**
     * 清理资源
     */
    destroy() {
        if (this.gameUI) {
            this.gameUI.destroy();
        }
        
        if (this.gameManager) {
            this.gameManager.destroy();
        }
        
        this.isInitialized = false;
        console.log('🎮 游戏系统已清理');
    }
}

// 导出单例
let gameIntegrationInstance = null;

export function getGameIntegration(app) {
    if (!gameIntegrationInstance && app) {
        gameIntegrationInstance = new GameIntegration(app);
    }
    return gameIntegrationInstance;
}

export default GameIntegration;