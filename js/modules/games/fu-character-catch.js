/**
 * 接福字游戏 - 协作式挑战
 * @module fu-character-catch
 */

export class FuCharacterCatch {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.renderer = null;
        this.gameState = {
            score: 0,
            timeLeft: 120, // 2分钟
            isRunning: false,
            players: new Map(), // 玩家位置
            fuCharacters: [], // 福字对象
            lastSpawnTime: 0,
            spawnInterval: 2000, // 2秒生成一个福字
            difficulty: 1
        };
        
        // 游戏配置
        this.config = {
            fuSpeed: 2, // 福字下落速度
            catchRadius: 30, // 接住半径
            scorePerCatch: 10, // 每个福字分数
            maxFuCount: 5 // 同时最多福字数量
        };
        
        // 绑定方法
        this.update = this.update.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleRemoteAction = this.handleRemoteAction.bind(this);
        
        // 输入状态
        this.inputState = {
            left: false,
            right: false,
            x: window.innerWidth / 2
        };
    }

    /**
     * 启动游戏
     */
    async start() {
        // 获取渲染器
        if (!this.renderer) {
            const { GameRenderer } = await import('./game-renderer.js');
            this.renderer = new GameRenderer(this.gameManager);
            await this.renderer.init();
        }
        
        // 设置渲染器游戏
        this.renderer.setGame(this);
        
        // 初始化玩家位置
        const players = this.gameManager.getPlayers();
        players.forEach((player, index) => {
            const x = (window.innerWidth / (players.length + 1)) * (index + 1);
            this.gameState.players.set(player.id, {
                id: player.id,
                name: player.name,
                x: x,
                y: window.innerHeight - 100,
                width: 60,
                height: 40,
                isLocal: player.isLocal
            });
        });
        
        // 绑定输入事件（仅本地玩家）
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (localPlayer) {
            this.bindInputEvents();
        }
        
        // 重置游戏状态
        this.gameState.score = 0;
        this.gameState.timeLeft = 120;
        this.gameState.isRunning = true;
        this.gameState.fuCharacters = [];
        this.gameState.lastSpawnTime = Date.now();
        
        // 启动渲染器
        this.renderer.start();
        
        // 启动游戏循环
        this.gameLoop();
        
        console.log('接福字游戏开始');
    }

    /**
     * 停止游戏
     */
    async stop() {
        this.gameState.isRunning = false;
        
        if (this.renderer) {
            this.renderer.stop();
            this.renderer.destroy();
            this.renderer = null;
        }
        
        // 移除输入事件
        this.unbindInputEvents();
        
        console.log('接福字游戏结束');
    }

    /**
     * 游戏主循环
     */
    gameLoop() {
        if (!this.gameState.isRunning) return;
        
        const now = Date.now();
        
        // 更新时间
        this.updateTime();
        
        // 生成福字（仅主机）
        if (this.gameManager.isHost()) {
            this.spawnFuCharacters(now);
        }
        
        // 更新福字位置
        this.updateFuCharacters();
        
        // 检查碰撞（仅主机）
        if (this.gameManager.isHost()) {
            this.checkCollisions();
        }
        
        // 发送状态同步（仅主机）
        if (this.gameManager.isHost() && now % 50 < 16) { // 约20Hz
            this.sendStateSync();
        }
        
        // 继续循环
        requestAnimationFrame(this.gameLoop);
    }

    /**
     * 更新时间
     */
    updateTime() {
        if (!this.gameState.isRunning) return;
        
        // 每秒更新一次
        const now = Date.now();
        if (!this.lastTimeUpdate) {
            this.lastTimeUpdate = now;
        }
        
        if (now - this.lastTimeUpdate >= 1000) {
            this.gameState.timeLeft--;
            this.lastTimeUpdate = now;
            
            // 检查游戏结束
            if (this.gameState.timeLeft <= 0) {
                this.endGame();
            }
            
            // 增加难度
            if (this.gameState.timeLeft % 30 === 0 && this.gameState.timeLeft < 90) {
                this.gameState.difficulty += 0.2;
                this.config.fuSpeed += 0.3;
            }
        }
    }

    /**
     * 生成福字
     */
    spawnFuCharacters(now) {
        if (!this.gameState.isRunning) return;
        
        // 检查是否需要生成
        if (this.gameState.fuCharacters.length >= this.config.maxFuCount) return;
        
        if (now - this.gameState.lastSpawnTime >= this.gameState.spawnInterval / this.gameState.difficulty) {
            // 随机位置
            const x = Math.random() * (window.innerWidth - 100) + 50;
            
            const fu = {
                id: `fu_${now}_${Math.random()}`,
                x: x,
                y: -50,
                width: 40,
                height: 40,
                speed: this.config.fuSpeed * this.gameState.difficulty,
                rotation: 0
            };
            
            this.gameState.fuCharacters.push(fu);
            this.gameState.lastSpawnTime = now;
            
            // 广播新福字
            this.broadcastFuSpawn(fu);
        }
    }

    /**
     * 更新福字位置
     */
    updateFuCharacters() {
        this.gameState.fuCharacters.forEach(fu => {
            fu.y += fu.speed;
            fu.rotation += 0.05;
        });
        
        // 移除超出屏幕的福字
        this.gameState.fuCharacters = this.gameState.fuCharacters.filter(fu => {
            if (fu.y > window.innerHeight + 50) {
                // 福字掉落，扣分（仅主机）
                if (this.gameManager.isHost()) {
                    this.gameState.score = Math.max(0, this.gameState.score - 5);
                    this.broadcastScoreUpdate();
                }
                return false;
            }
            return true;
        });
    }

    /**
     * 检查碰撞
     */
    checkCollisions() {
        const players = Array.from(this.gameState.players.values());
        
        this.gameState.fuCharacters.forEach((fu, fuIndex) => {
            players.forEach(player => {
                const distance = Math.sqrt(
                    Math.pow(fu.x - player.x, 2) + 
                    Math.pow(fu.y - player.y, 2)
                );
                
                if (distance < this.config.catchRadius) {
                    // 接住福字
                    this.gameState.score += this.config.scorePerCatch;
                    
                    // 移除福字
                    this.gameState.fuCharacters.splice(fuIndex, 1);
                    
                    // 粒子效果
                    this.createCatchEffect(player.x, player.y);
                    
                    // 广播得分
                    this.broadcastScoreUpdate();
                    
                    // 音效（如果可用）
                    this.playCatchSound();
                }
            });
        });
    }

    /**
     * 处理本地输入
     */
    handleInput(event) {
        if (!this.gameState.isRunning) return;
        
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (!localPlayer) return;
        
        let moved = false;
        
        switch(event.key) {
            case 'ArrowLeft':
            case 'a':
                this.inputState.left = true;
                this.inputState.x = Math.max(50, localPlayer.x - 10);
                moved = true;
                break;
            case 'ArrowRight':
            case 'd':
                this.inputState.right = true;
                this.inputState.x = Math.min(window.innerWidth - 50, localPlayer.x + 10);
                moved = true;
                break;
        }
        
        if (moved) {
            // 更新本地玩家位置
            localPlayer.x = this.inputState.x;
            
            // 发送动作到网络
            this.gameManager.handleGameAction('player-move', {
                playerId: localPlayer.id,
                x: localPlayer.x,
                y: localPlayer.y
            });
        }
    }

    /**
     * 处理输入释放
     */
    handleInputUp(event) {
        switch(event.key) {
            case 'ArrowLeft':
            case 'a':
                this.inputState.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                this.inputState.right = false;
                break;
        }
    }

    /**
     * 处理远程动作
     */
    handleRemoteAction(message) {
        if (message.action === 'player-move') {
            const player = this.gameState.players.get(message.data.playerId);
            if (player && !player.isLocal) {
                player.x = message.data.x;
                player.y = message.data.y;
            }
        } else if (message.action === 'fu-spawn') {
            // 接收到主机生成的福字
            if (!this.gameManager.isHost()) {
                const fu = message.data;
                // 检查是否已存在
                const exists = this.gameState.fuCharacters.find(f => f.id === fu.id);
                if (!exists) {
                    this.gameState.fuCharacters.push(fu);
                }
            }
        } else if (message.action === 'score-update') {
            // 更新分数
            this.gameState.score = message.data.score;
        }
    }

    /**
     * 处理网络消息
     */
    handleNetworkMessage(message) {
        // 已在handleRemoteAction中处理
    }

    /**
     * 同步状态
     */
    syncState(state) {
        if (this.gameManager.isHost()) return;
        
        // 客户端接收状态同步
        if (state.score !== undefined) this.gameState.score = state.score;
        if (state.timeLeft !== undefined) this.gameState.timeLeft = state.timeLeft;
        if (state.fuCharacters !== undefined) {
            // 合并福字列表
            const existingIds = new Set(this.gameState.fuCharacters.map(f => f.id));
            state.fuCharacters.forEach(fu => {
                if (!existingIds.has(fu.id)) {
                    this.gameState.fuCharacters.push(fu);
                }
            });
        }
        if (state.players !== undefined) {
            state.players.forEach(p => {
                const player = this.gameState.players.get(p.id);
                if (player) {
                    player.x = p.x;
                    player.y = p.y;
                }
            });
        }
    }

    /**
     * 广播福字生成
     */
    broadcastFuSpawn(fu) {
        this.gameManager.handleGameAction('fu-spawn', fu);
    }

    /**
     * 广播分数更新
     */
    broadcastScoreUpdate() {
        this.gameManager.handleGameAction('score-update', {
            score: this.gameState.score,
            timeLeft: this.gameState.timeLeft
        });
    }

    /**
     * 创建接住效果
     */
    createCatchEffect(x, y) {
        if (this.renderer && this.renderer.createParticles) {
            this.renderer.createParticles(x, y, 15, '#ffd700');
        }
    }

    /**
     * 播放音效
     */
    playCatchSound() {
        // 尝试使用现有音频管理器
        if (window.audioManager && window.audioManager.play) {
            window.audioManager.play('catch', { volume: 0.3 });
        }
    }

    /**
     * 渲染游戏
     */
    render(ctx, timestamp) {
        if (!this.renderer) return;
        
        // 绘制背景
        this.renderer.drawGradientBackground(['#1a1a2e', '#16213e']);
        
        // 绘制福字
        this.gameState.fuCharacters.forEach(fu => {
            ctx.save();
            ctx.translate(fu.x, fu.y);
            ctx.rotate(fu.rotation);
            
            // 福字（使用文本或矩形）
            ctx.fillStyle = '#ff6b6b';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('福', 0, 0);
            
            // 外框
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(-20, -20, 40, 40);
            
            ctx.restore();
        });
        
        // 绘制玩家
        this.gameState.players.forEach(player => {
            ctx.save();
            
            // 福袋
            ctx.fillStyle = player.isLocal ? '#4ecdc4' : '#95e1d3';
            ctx.beginPath();
            ctx.ellipse(player.x, player.y, player.width/2, player.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 名字
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, player.x, player.y - player.height/2 - 10);
            
            ctx.restore();
        });
        
        // 绘制UI
        this.renderGameUI(ctx);
    }

    /**
     * 渲染游戏UI
     */
    renderGameUI(ctx) {
        const padding = 20;
        
        // 分数和时间背景
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(padding, padding, 200, 80);
        
        // 分数
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`分数: ${this.gameState.score}`, padding + 10, padding + 30);
        
        // 时间
        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        const minutes = Math.floor(this.gameState.timeLeft / 60);
        const seconds = this.gameState.timeLeft % 60;
        ctx.fillText(`时间: ${minutes}:${seconds.toString().padStart(2, '0')}`, padding + 10, padding + 60);
        
        // 难度提示
        if (this.gameState.difficulty > 1) {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = '14px Arial';
            ctx.fillText(`难度: ${this.gameState.difficulty.toFixed(1)}x`, padding + 120, padding + 60);
        }
        
        ctx.restore();
        
        // 操作说明（仅本地玩家）
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (localPlayer && this.gameState.isRunning) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(window.innerWidth - 220, padding, 200, 60);
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('操作: ← → 或 A D', window.innerWidth - 210, padding + 25);
            ctx.fillText('移动福袋接住福字', window.innerWidth - 210, padding + 45);
            ctx.restore();
        }
    }

    /**
     * 绑定输入事件
     */
    bindInputEvents() {
        this.keyDownHandler = (e) => this.handleInput(e);
        this.keyUpHandler = (e) => this.handleInputUp(e);
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        
        // 触摸支持（移动端）
        this.touchStartHandler = (e) => this.handleTouchStart(e);
        this.touchMoveHandler = (e) => this.handleTouchMove(e);
        
        document.addEventListener('touchstart', this.touchStartHandler);
        document.addEventListener('touchmove', this.touchMoveHandler);
    }

    /**
     * 解绑输入事件
     */
    unbindInputEvents() {
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
            document.removeEventListener('keyup', this.keyUpHandler);
        }
        
        if (this.touchStartHandler) {
            document.removeEventListener('touchstart', this.touchStartHandler);
            document.removeEventListener('touchmove', this.touchMoveHandler);
        }
    }

    /**
     * 处理触摸开始
     */
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.updatePlayerPositionFromTouch(touch.clientX);
    }

    /**
     * 处理触摸移动
     */
    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.updatePlayerPositionFromTouch(touch.clientX);
    }

    /**
     * 从触摸更新玩家位置
     */
    updatePlayerPositionFromTouch(clientX) {
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (!localPlayer) return;
        
        localPlayer.x = Math.max(50, Math.min(window.innerWidth - 50, clientX));
        
        // 发送到网络
        this.gameManager.handleGameAction('player-move', {
            playerId: localPlayer.id,
            x: localPlayer.x,
            y: localPlayer.y
        });
    }

    /**
     * 处理窗口大小变化
     */
    onResize(oldWidth, oldHeight, newWidth, newHeight) {
        // 更新玩家Y位置
        this.gameState.players.forEach(player => {
            player.y = newHeight - 100;
        });
    }

    /**
     * 结束游戏
     */
    endGame() {
        const results = {
            score: this.gameState.score,
            timeLeft: this.gameState.timeLeft,
            players: Array.from(this.gameState.players.values()).map(p => ({
                id: p.id,
                name: p.name
            }))
        };
        
        // 触发游戏结束
        this.gameManager.endGame(results);
    }

    /**
     * 获取游戏状态
     */
    getState() {
        return {
            score: this.gameState.score,
            timeLeft: this.gameState.timeLeft,
            isRunning: this.gameState.isRunning,
            players: Array.from(this.gameState.players.values()),
            fuCount: this.gameState.fuCharacters.length,
            difficulty: this.gameState.difficulty
        };
    }
}