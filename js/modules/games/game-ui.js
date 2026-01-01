/**
 * 游戏UI组件管理器
 * @module game-ui
 */

export class GameUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentView = null;
        this.container = null;
        
        // 绑定方法
        this.handleCreateRoom = this.handleCreateRoom.bind(this);
        this.handleJoinRoom = this.handleJoinRoom.bind(this);
        this.handleStartGame = this.handleStartGame.bind(this);
        this.handleLeaveRoom = this.handleLeaveRoom.bind(this);
        this.handleGameSelect = this.handleGameSelect.bind(this);
        
        // 初始化
        this.init();
    }

    /**
     * 初始化UI
     */
    init() {
        // 创建主容器
        this.container = document.getElementById('game-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'game-container';
            this.container.className = 'game-lobby';
            document.body.appendChild(this.container);
        }
        
        // 监听游戏事件
        this.setupEventListeners();
        
        // 渲染初始视图
        this.renderLobby();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 游戏管理器事件
        this.gameManager.on('room-created', (data) => {
            this.showNotification(`房间创建成功！ID: ${data.roomId}`, 'success');
            this.renderRoomView(data.roomId, data.gameType);
        });

        this.gameManager.on('room-joined', (data) => {
            this.showNotification(`成功加入房间: ${data.roomId}`, 'success');
            this.renderRoomView(data.roomId, data.gameType);
        });

        this.gameManager.on('game-started', (data) => {
            this.showNotification(`游戏开始: ${this.getGameName(data.gameType)}`, 'success');
            this.hideGameUI();
        });

        this.gameManager.on('game-ended', (data) => {
            this.showGameResults(data.results);
            this.showGameUI();
        });

        this.gameManager.on('player-joined', (data) => {
            this.showNotification(`${data.player.name} 加入游戏`, 'info');
            this.updatePlayerList();
        });

        this.gameManager.on('player-left', (data) => {
            this.showNotification(`玩家离开游戏`, 'warning');
            this.updatePlayerList();
        });

        this.gameManager.on('game-error', (data) => {
            this.showNotification(data.error, 'error');
        });

        // URL哈希变化
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash;
            if (hash.startsWith('#room-')) {
                const roomId = hash.substr(6);
                this.handleAutoJoin(roomId);
            }
        });
    }

    /**
     * 渲染游戏大厅
     */
    renderLobby() {
        this.currentView = 'lobby';
        
        const html = `
            <div class="lobby-header">
                <h1 class="lobby-title">春节联机小游戏</h1>
                <p class="lobby-subtitle">与朋友一起欢度新春，实时联机互动</p>
            </div>
            
            <div class="lobby-actions">
                <div class="lobby-card" data-game="fu-character-catch">
                    <div class="lobby-card-icon">🧧</div>
                    <div class="lobby-card-title">接福字挑战</div>
                    <div class="lobby-card-desc">协作式游戏，团队合作接住下落的福字，考验默契与反应</div>
                </div>
                
                <div class="lobby-card" data-game="red-envelope-race">
                    <div class="lobby-card-icon">💰</div>
                    <div class="lobby-card-title">抢红包竞速</div>
                    <div class="lobby-card-desc">实时多人竞速，比拼手速，最快点击者获胜</div>
                </div>
                
                <div class="lobby-card" data-game="zodiac-battle">
                    <div class="lobby-card-icon">🐯</div>
                    <div class="lobby-card-title">生肖对战</div>
                    <div class="lobby-card-desc">快速反应挑战，生肖匹配、点击比拼、模式记忆</div>
                </div>
            </div>
            
            <div class="room-actions">
                <div class="room-action-card">
                    <h3>创建房间</h3>
                    <div class="input-group">
                        <label>选择游戏</label>
                        <select id="create-game-select">
                            <option value="fu-character-catch">接福字挑战</option>
                            <option value="red-envelope-race">抢红包竞速</option>
                            <option value="zodiac-battle">生肖对战</option>
                        </select>
                    </div>
                    <button class="action-btn" id="create-room-btn">创建房间</button>
                </div>
                
                <div class="room-action-card">
                    <h3>加入房间</h3>
                    <div class="input-group">
                        <label>房间ID（6位字符）</label>
                        <input type="text" id="join-room-input" placeholder="例如: ABC123" maxlength="6">
                    </div>
                    <button class="action-btn" id="join-room-btn">加入房间</button>
                </div>
            </div>
            
            <div class="game-status" id="game-status">
                <div class="status-item">
                    <span class="status-label">连接状态</span>
                    <span class="status-value" id="connection-status">未初始化</span>
                </div>
                <div class="status-item">
                    <span class="status-label">当前房间</span>
                    <span class="status-value" id="current-room">无</span>
                </div>
                <div class="status-item">
                    <span class="status-label">玩家ID</span>
                    <span class="status-value" id="player-id">-</span>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.attachLobbyEvents();
        this.updateStatus();
    }

    /**
     * 渲染房间视图
     */
    renderRoomView(roomId, gameType) {
        this.currentView = 'room';
        
        const gameName = this.getGameName(gameType);
        const isHost = this.gameManager.isHost();
        
        const html = `
            <div class="game-room">
                <div class="room-header">
                    <div class="room-id">${roomId}</div>
                    <div class="game-status-indicator">
                        <span class="status-dot waiting"></span>
                        <span>等待中</span>
                    </div>
                </div>
                
                <div class="room-info">
                    <div class="room-info-item">
                        <div class="label">游戏类型</div>
                        <div class="value">${gameName}</div>
                    </div>
                    <div class="room-info-item">
                        <div class="label">角色</div>
                        <div class="value">${isHost ? '主机' : '客户端'}</div>
                    </div>
                    <div class="room-info-item">
                        <div class="label">玩家数</div>
                        <div class="value" id="player-count">1</div>
                    </div>
                </div>
                
                <div class="player-list" id="player-list">
                    <h3 style="color: #ffd700; margin-bottom: 10px;">玩家列表</h3>
                    <!-- 玩家列表将在这里更新 -->
                </div>
                
                <div class="game-controls">
                    ${isHost ? `
                        <button class="control-btn primary" id="start-game-btn" ${!this.gameManager.roomManager.isReadyToStart() ? 'disabled' : ''}>
                            开始游戏
                        </button>
                    ` : `
                        <div class="game-status-indicator">
                            <span class="status-dot waiting"></span>
                            <span>等待主机开始游戏...</span>
                        </div>
                    `}
                    <button class="control-btn danger" id="leave-room-btn">离开房间</button>
                </div>
                
                <div class="game-stats" id="room-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="stat-latency">-</div>
                        <div class="stat-label">延迟(ms)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-players">1</div>
                        <div class="stat-label">在线玩家</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-status">等待</div>
                        <div class="stat-label">状态</div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.attachRoomEvents();
        this.updatePlayerList();
        
        // 自动更新房间信息
        this.startRoomInfoUpdate();
    }

    /**
     * 渲染游戏结果
     */
    renderGameResults(results) {
        if (!results) return;
        
        const resultsHtml = `
            <div class="game-results show" id="game-results">
                <div class="results-title">游戏结束</div>
                <div class="results-list">
                    ${this.generateResultsList(results)}
                </div>
                <div class="game-controls">
                    <button class="control-btn primary" id="back-to-room-btn">返回房间</button>
                    <button class="control-btn secondary" id="play-again-btn">再来一局</button>
                </div>
            </div>
        `;
        
        // 添加到页面
        const overlay = document.createElement('div');
        overlay.innerHTML = resultsHtml;
        document.body.appendChild(overlay);
        
        // 绑定事件
        document.getElementById('back-to-room-btn').addEventListener('click', () => {
            this.removeGameResults();
            this.showGameUI();
        });
        
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.removeGameResults();
            if (this.gameManager.isHost()) {
                this.gameManager.roomManager.startGame();
            }
        });
        
        // 3秒后自动显示返回按钮
        setTimeout(() => {
            this.showGameUI();
        }, 3000);
    }

    /**
     * 生成结果列表
     */
    generateResultsList(results) {
        if (!results.players) return '<p style="text-align: center; color: #aaa;">暂无结果</p>';
        
        // 排序
        const sorted = [...results.players].sort((a, b) => b.score - a.score);
        
        return sorted.map((player, index) => {
            const isWinner = index === 0;
            const isLocal = player.id === this.gameManager.playerId;
            
            return `
                <div class="result-item ${isWinner ? 'winner' : ''} ${isLocal ? 'is-local' : ''}">
                    <span class="result-rank">${index + 1}</span>
                    <span class="result-name">${player.name}${isLocal ? ' (你)' : ''}</span>
                    <span class="result-score">${player.score || 0}分</span>
                </div>
            `;
        }).join('');
    }

    /**
     * 附加大厅事件
     */
    attachLobbyEvents() {
        // 游戏卡片点击
        const cards = this.container.querySelectorAll('.lobby-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const gameType = card.dataset.game;
                this.handleGameSelect(gameType);
            });
        });
        
        // 创建房间按钮
        const createBtn = document.getElementById('create-room-btn');
        if (createBtn) {
            createBtn.addEventListener('click', this.handleCreateRoom);
        }
        
        // 加入房间按钮
        const joinBtn = document.getElementById('join-room-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', this.handleJoinRoom);
        }
        
        // 房间ID输入框回车
        const joinInput = document.getElementById('join-room-input');
        if (joinInput) {
            joinInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleJoinRoom();
                }
            });
        }
    }

    /**
     * 附加房间事件
     */
    attachRoomEvents() {
        // 开始游戏按钮
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', this.handleStartGame);
        }
        
        // 离开房间按钮
        const leaveBtn = document.getElementById('leave-room-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', this.handleLeaveRoom);
        }
    }

    /**
     * 处理游戏选择
     */
    handleGameSelect(gameType) {
        // 滚动到创建房间区域
        const createSelect = document.getElementById('create-game-select');
        if (createSelect) {
            createSelect.value = gameType;
            createSelect.focus();
            this.showNotification(`已选择: ${this.getGameName(gameType)}，请创建房间`, 'info');
        }
    }

    /**
     * 处理创建房间
     */
    async handleCreateRoom() {
        const select = document.getElementById('create-game-select');
        if (!select) return;
        
        const gameType = select.value;
        const result = await this.gameManager.roomManager.createRoom(gameType);
        
        if (!result.success) {
            this.showNotification('创建房间失败: ' + result.error, 'error');
        }
    }

    /**
     * 处理加入房间
     */
    async handleJoinRoom() {
        const input = document.getElementById('join-room-input');
        if (!input) return;
        
        const roomId = input.value.trim().toUpperCase();
        if (!roomId || roomId.length !== 6) {
            this.showNotification('请输入有效的6位房间ID', 'warning');
            return;
        }
        
        const result = await this.gameManager.roomManager.joinRoom(roomId);
        if (!result.success) {
            this.showNotification('加入房间失败: ' + result.error, 'error');
        }
    }

    /**
     * 处理自动加入
     */
    async handleAutoJoin(roomId) {
        if (this.currentView === 'room') return;
        
        const result = await this.gameManager.roomManager.joinRoom(roomId);
        if (!result.success) {
            this.showNotification('自动加入房间失败: ' + result.error, 'error');
            // 清除哈希
            window.location.hash = '';
        }
    }

    /**
     * 处理开始游戏
     */
    async handleStartGame() {
        if (!this.gameManager.isHost()) {
            this.showNotification('只有主机可以开始游戏', 'warning');
            return;
        }
        
        const result = await this.gameManager.roomManager.startGame();
        if (!result.success) {
            this.showNotification('开始游戏失败: ' + result.error, 'error');
        }
    }

    /**
     * 处理离开房间
     */
    async handleLeaveRoom() {
        const result = await this.gameManager.roomManager.leaveRoom();
        if (result.success) {
            this.showNotification('已离开房间', 'info');
            this.renderLobby();
        } else {
            this.showNotification('离开房间失败', 'error');
        }
    }

    /**
     * 更新玩家列表
     */
    updatePlayerList() {
        const playerList = document.getElementById('player-list');
        if (!playerList) return;
        
        const players = this.gameManager.getPlayers();
        
        // 更新玩家计数
        const playerCount = document.getElementById('player-count');
        if (playerCount) {
            playerCount.textContent = players.length;
        }
        
        // 生成玩家列表HTML
        const playersHtml = players.map(player => {
            const isLocal = player.isLocal;
            const isHost = this.gameManager.isHost() && isLocal;
            
            return `
                <div class="player-item ${isLocal ? 'is-local' : ''}">
                    <div>
                        <span class="player-name">${player.name}</span>
                        ${isHost ? '<span style="color: #ffd700; margin-left: 5px;">[主机]</span>' : ''}
                        ${isLocal ? '<span style="color: #4ecdc4; margin-left: 5px;">[你]</span>' : ''}
                    </div>
                    <div class="player-status">
                        ${player.ready ? '✅ 已就绪' : '⏳ 等待中'}
                    </div>
                </div>
            `;
        }).join('');
        
        // 更新DOM
        const existingList = playerList.querySelector('.player-item');
        if (existingList || players.length > 0) {
            playerList.innerHTML = `
                <h3 style="color: #ffd700; margin-bottom: 10px;">玩家列表</h3>
                ${playersHtml}
            `;
        }
        
        // 更新开始按钮状态
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            const canStart = this.gameManager.roomManager.isReadyToStart();
            startBtn.disabled = !canStart;
        }
    }

    /**
     * 更新状态信息
     */
    updateStatus() {
        const state = this.gameManager.getState();
        
        // 连接状态
        const connStatus = document.getElementById('connection-status');
        if (connStatus) {
            if (this.gameManager.networkManager) {
                connStatus.textContent = this.gameManager.networkManager.isHost() ? '主机模式' : '客户端模式';
                connStatus.style.color = '#4ecdc4';
            } else {
                connStatus.textContent = '未连接';
                connStatus.style.color = '#aaa';
            }
        }
        
        // 房间ID
        const roomStatus = document.getElementById('current-room');
        if (roomStatus) {
            roomStatus.textContent = state.roomId || '无';
        }
        
        // 玩家ID
        const playerId = document.getElementById('player-id');
        if (playerId) {
            playerId.textContent = state.playerId || '-';
        }
    }

    /**
     * 开始房间信息更新
     */
    startRoomInfoUpdate() {
        if (this.roomInfoInterval) {
            clearInterval(this.roomInfoInterval);
        }
        
        this.roomInfoInterval = setInterval(() => {
            if (this.currentView !== 'room') {
                clearInterval(this.roomInfoInterval);
                return;
            }
            
            // 更新延迟（模拟）
            const latencyEl = document.getElementById('stat-latency');
            if (latencyEl) {
                latencyEl.textContent = Math.floor(Math.random() * 50 + 20);
            }
            
            // 更新玩家数
            const playersEl = document.getElementById('stat-players');
            if (playersEl) {
                const players = this.gameManager.getPlayers();
                playersEl.textContent = players.length;
            }
            
            // 更新状态
            const statusEl = document.getElementById('stat-status');
            if (statusEl) {
                const state = this.gameManager.getState();
                const statusMap = {
                    'idle': '空闲',
                    'waiting': '等待',
                    'playing': '游戏中',
                    'ended': '已结束'
                };
                statusEl.textContent = statusMap[state.gameState] || '未知';
            }
            
            // 更新玩家列表
            this.updatePlayerList();
        }, 1000);
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 移除现有通知
        const existing = document.getElementById('game-notification');
        if (existing) {
            existing.remove();
        }
        
        // 创建新通知
        const notification = document.createElement('div');
        notification.id = 'game-notification';
        notification.className = `game-message show ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * 隐藏游戏UI
     */
    hideGameUI() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        
        // 显示连接状态
        this.showConnectionStatus();
    }

    /**
     * 显示游戏UI
     */
    showGameUI() {
        if (this.container) {
            this.container.style.display = 'block';
        }
        
        // 隐藏连接状态
        this.hideConnectionStatus();
    }

    /**
     * 显示连接状态
     */
    showConnectionStatus() {
        let statusEl = document.getElementById('connection-status-overlay');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'connection-status-overlay';
            statusEl.className = 'connection-status disconnected';
            statusEl.innerHTML = '<span class="indicator"></span><span>连接中...</span>';
            document.body.appendChild(statusEl);
        }
        
        // 更新状态
        if (this.gameManager.networkManager) {
            statusEl.className = 'connection-status connected';
            statusEl.innerHTML = '<span class="indicator"></span><span>已连接</span>';
        }
    }

    /**
     * 隐藏连接状态
     */
    hideConnectionStatus() {
        const statusEl = document.getElementById('connection-status-overlay');
        if (statusEl) {
            statusEl.remove();
        }
    }

    /**
     * 显示游戏结果
     */
    showGameResults(results) {
        this.renderGameResults(results);
    }

    /**
     * 移除游戏结果
     */
    removeGameResults() {
        const resultsEl = document.getElementById('game-results');
        if (resultsEl) {
            resultsEl.remove();
        }
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
     * 清理资源
     */
    destroy() {
        if (this.roomInfoInterval) {
            clearInterval(this.roomInfoInterval);
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 移除所有事件监听器
        if (this.gameManager) {
            this.gameManager.off('room-created');
            this.gameManager.off('room-joined');
            this.gameManager.off('game-started');
            this.gameManager.off('game-ended');
            this.gameManager.off('player-joined');
            this.gameManager.off('player-left');
            this.gameManager.off('game-error');
        }
    }
}