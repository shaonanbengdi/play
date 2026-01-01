/**
 * 抢红包游戏 - 实时多人竞速
 * @module red-envelope-race
 */

export class RedEnvelopeRace {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.renderer = null;
        this.gameState = {
            isRunning: false,
            phase: 'waiting', // waiting, ready, racing, ended
            players: new Map(), // 玩家状态
            redEnvelope: null, // 红包对象
            clickTimes: [], // 点击时间记录
            winner: null,
            startTime: null,
            clickWindow: 3000, // 3秒点击窗口
            readyTime: 2000 // 准备时间
        };
        
        // 绑定方法
        this.handleInput = this.handleInput.bind(this);
        this.handleRemoteAction = this.handleRemoteAction.bind(this);
        
        // 输入状态
        this.inputState = {
            canClick: false,
            clickCount: 0
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
        
        // 初始化玩家
        const players = this.gameManager.getPlayers();
        players.forEach(player => {
            this.gameState.players.set(player.id, {
                id: player.id,
                name: player.name,
                isLocal: player.isLocal,
                ready: false,
                clicked: false,
                clickTime: null,
                score: 0
            });
        });
        
        // 重置状态
        this.gameState.phase = 'waiting';
        this.gameState.winner = null;
        this.gameState.clickTimes = [];
        this.gameState.redEnvelope = null;
        
        // 绑定输入（仅本地）
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (localPlayer) {
            this.bindInputEvents();
        }
        
        // 启动渲染器
        this.renderer.start();
        
        // 主机控制游戏流程
        if (this.gameManager.isHost()) {
            this.startReadyPhase();
        }
        
        console.log('抢红包游戏开始');
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
        
        this.unbindInputEvents();
        console.log('抢红包游戏结束');
    }

    /**
     * 准备阶段（主机控制）
     */
    startReadyPhase() {
        this.gameState.phase = 'ready';
        this.gameState.isRunning = true;
        
        // 广播准备阶段
        this.gameManager.handleGameAction('game-phase', {
            phase: 'ready',
            timestamp: Date.now()
        });
        
        // 等待准备时间
        setTimeout(() => {
            if (this.gameState.isRunning) {
                this.startRacePhase();
            }
        }, this.gameState.readyTime);
    }

    /**
     * 竞速阶段（主机控制）
     */
    startRacePhase() {
        this.gameState.phase = 'racing';
        this.gameState.startTime = Date.now();
        
        // 创建红包
        this.gameState.redEnvelope = {
            id: `red_${Date.now()}`,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            size: 80,
            pulsePhase: 0
        };
        
        // 允许点击
        this.inputState.canClick = true;
        
        // 广播竞速开始
        this.gameManager.handleGameAction('game-phase', {
            phase: 'racing',
            timestamp: this.gameState.startTime,
            redEnvelope: this.gameState.redEnvelope
        });
        
        // 设置超时结束
        setTimeout(() => {
            if (this.gameState.isRunning && this.gameState.phase === 'racing') {
                this.endRace();
            }
        }, this.gameState.clickWindow);
    }

    /**
     * 结束竞速
     */
    endRace() {
        this.gameState.phase = 'ended';
        this.inputState.canClick = false;
        
        // 计算获胜者
        if (this.gameState.clickTimes.length > 0) {
            // 按时间排序
            const sorted = this.gameState.clickTimes.sort((a, b) => a.time - b.time);
            const winner = sorted[0];
            
            this.gameState.winner = winner.playerId;
            
            // 更新获胜者分数
            const winnerPlayer = this.gameState.players.get(winner.playerId);
            if (winnerPlayer) {
                winnerPlayer.score += 100;
            }
            
            // 广播结果
            this.gameManager.handleGameAction('race-result', {
                winner: winner.playerId,
                winnerName: winnerPlayer ? winnerPlayer.name : 'Unknown',
                clickTime: winner.time - this.gameState.startTime,
                allTimes: sorted
            });
            
            // 胜利特效
            if (winnerPlayer) {
                this.createVictoryEffect(winnerPlayer);
            }
        } else {
            // 没人点击，平局
            this.gameManager.handleGameAction('race-result', {
                winner: null,
                message: '无人点击，平局'
            });
        }
        
        // 2秒后可以重新开始
        setTimeout(() => {
            if (this.gameManager.isHost() && this.gameState.isRunning) {
                this.startReadyPhase();
            }
        }, 2000);
    }

    /**
     * 处理本地输入
     */
    handleInput(event) {
        if (!this.gameState.isRunning || this.gameState.phase !== 'racing') return;
        if (!this.inputState.canClick) return;
        
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (!localPlayer || localPlayer.clicked) return;
        
        // 检查是否是点击红包（点击屏幕任意位置）
        if (event.type === 'click' || event.type === 'touchstart') {
            const now = Date.now();
            const clickTime = now - this.gameState.startTime;
            
            // 标记已点击
            localPlayer.clicked = true;
            localPlayer.clickTime = clickTime;
            this.inputState.canClick = false;
            
            // 记录点击时间
            const clickRecord = {
                playerId: localPlayer.id,
                time: clickTime
            };
            
            // 发送到主机
            this.gameManager.handleGameAction('player-click', clickRecord);
            
            // 本地点击效果
            this.createClickEffect();
            
            console.log(`玩家 ${localPlayer.name} 点击时间: ${clickTime}ms`);
        }
    }

    /**
     * 处理远程动作
     */
    handleRemoteAction(message) {
        switch (message.action) {
            case 'game-phase':
                this.handleGamePhase(message.data);
                break;
                
            case 'player-click':
                if (this.gameManager.isHost()) {
                    // 主机收集点击时间
                    this.gameState.clickTimes.push(message.data);
                }
                // 客户端更新其他玩家状态
                const player = this.gameState.players.get(message.data.playerId);
                if (player && !player.isLocal) {
                    player.clicked = true;
                    player.clickTime = message.data.time;
                }
                break;
                
            case 'race-result':
                this.handleRaceResult(message.data);
                break;
        }
    }

    /**
     * 处理游戏阶段
     */
    handleGamePhase(data) {
        this.gameState.phase = data.phase;
        
        if (data.phase === 'ready') {
            // 重置玩家状态
            this.gameState.players.forEach(player => {
                player.clicked = false;
                player.clickTime = null;
            });
            this.gameState.clickTimes = [];
            this.gameState.winner = null;
            this.gameState.redEnvelope = null;
            
        } else if (data.phase === 'racing') {
            this.gameState.startTime = data.timestamp;
            this.gameState.redEnvelope = data.redEnvelope;
            
            // 客户端准备点击
            if (!this.gameManager.isHost()) {
                setTimeout(() => {
                    this.inputState.canClick = true;
                }, 100); // 小延迟确保同步
            }
        }
    }

    /**
     * 处理竞速结果
     */
    handleRaceResult(data) {
        this.gameState.winner = data.winner;
        
        if (data.winner) {
            // 更新获胜者分数
            const winnerPlayer = this.gameState.players.get(data.winner);
            if (winnerPlayer) {
                winnerPlayer.score += 100;
            }
            
            // 胜利特效
            if (winnerPlayer) {
                this.createVictoryEffect(winnerPlayer);
            }
        }
        
        // 重置点击状态
        this.gameState.players.forEach(player => {
            player.clicked = false;
            player.clickTime = null;
        });
        
        this.inputState.canClick = false;
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
        // 抢红包游戏主要是事件驱动，状态同步较少
        if (state.phase) this.gameState.phase = state.phase;
        if (state.winner) this.gameState.winner = state.winner;
    }

    /**
     * 渲染游戏
     */
    render(ctx, timestamp) {
        if (!this.renderer) return;
        
        // 绘制背景
        this.renderer.drawGradientBackground(['#1a1a2e', '#16213e']);
        
        // 根据阶段渲染
        switch (this.gameState.phase) {
            case 'waiting':
                this.renderWaiting(ctx);
                break;
            case 'ready':
                this.renderReady(ctx);
                break;
            case 'racing':
                this.renderRacing(ctx, timestamp);
                break;
            case 'ended':
                this.renderEnded(ctx);
                break;
        }
        
        // 绘制玩家状态
        this.renderPlayerStatus(ctx);
        
        // 绘制UI
        this.renderGameUI(ctx);
    }

    /**
     * 渲染等待阶段
     */
    renderWaiting(ctx) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('等待玩家准备...', window.innerWidth / 2, window.innerHeight / 2 - 50);
        
        ctx.font = '18px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText('点击任意位置准备', window.innerWidth / 2, window.innerHeight / 2 + 20);
        ctx.restore();
    }

    /**
     * 渲染准备阶段
     */
    renderReady(ctx) {
        const elapsed = Date.now() - (this.gameState.startTime || Date.now());
        const countdown = Math.ceil((this.gameState.readyTime - elapsed) / 1000);
        
        ctx.save();
        
        // 倒计时
        if (countdown > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(countdown, window.innerWidth / 2, window.innerHeight / 2);
        } else {
            ctx.fillStyle = '#4ecdc4';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('准备!', window.innerWidth / 2, window.innerHeight / 2);
        }
        
        ctx.restore();
    }

    /**
     * 渲染竞速阶段
     */
    renderRacing(ctx, timestamp) {
        if (!this.gameState.redEnvelope) return;
        
        const envelope = this.gameState.redEnvelope;
        
        // 脉冲动画
        envelope.pulsePhase += 0.1;
        const scale = 1 + Math.sin(envelope.pulsePhase) * 0.1;
        const size = envelope.size * scale;
        
        ctx.save();
        ctx.translate(envelope.x, envelope.y);
        
        // 红包主体
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 金色边框
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // "福"字
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('红包', 0, 0);
        
        // 闪烁效果
        if (Math.floor(timestamp / 200) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // 提示文字
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('点击屏幕抢红包!', window.innerWidth / 2, envelope.y + size / 2 + 40);
        ctx.restore();
    }

    /**
     * 渲染结束阶段
     */
    renderEnded(ctx) {
        if (this.gameState.winner) {
            const winner = this.gameState.players.get(this.gameState.winner);
            if (winner) {
                ctx.save();
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('获胜者!', window.innerWidth / 2, window.innerHeight / 2 - 60);
                
                ctx.fillStyle = '#fff';
                ctx.font = '36px Arial';
                ctx.fillText(winner.name, window.innerWidth / 2, window.innerHeight / 2 + 10);
                
                // 皇冠图标
                ctx.font = '48px Arial';
                ctx.fillText('👑', window.innerWidth / 2, window.innerHeight / 2 - 100);
                ctx.restore();
            }
        } else {
            ctx.save();
            ctx.fillStyle = '#aaa';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('无人获胜', window.innerWidth / 2, window.innerHeight / 2);
            ctx.restore();
        }
    }

    /**
     * 渲染玩家状态
     */
    renderPlayerStatus(ctx) {
        const players = Array.from(this.gameState.players.values());
        const startX = 20;
        const startY = 20;
        const itemHeight = 25;
        
        ctx.save();
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        players.forEach((player, index) => {
            const y = startY + index * itemHeight;
            
            // 玩家名字
            ctx.fillStyle = player.isLocal ? '#4ecdc4' : '#fff';
            ctx.fillText(player.name, startX, y);
            
            // 状态指示
            if (this.gameState.phase === 'racing' || this.gameState.phase === 'ended') {
                if (player.clicked) {
                    ctx.fillStyle = '#4ecdc4';
                    ctx.fillText(`✓ ${player.clickTime}ms`, startX + 100, y);
                } else {
                    ctx.fillStyle = '#ff6b6b';
                    ctx.fillText('等待中', startX + 100, y);
                }
            }
            
            // 分数
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`${player.score}分`, startX + 180, y);
        });
        
        ctx.restore();
    }

    /**
     * 渲染游戏UI
     */
    renderGameUI(ctx) {
        const padding = 20;
        
        // 状态背景
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(window.innerWidth - 180, padding, 160, 60);
        
        // 阶段
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        const phaseText = {
            'waiting': '等待',
            'ready': '准备',
            'racing': '竞速',
            'ended': '结束'
        }[this.gameState.phase] || '未知';
        
        ctx.fillText(`状态: ${phaseText}`, window.innerWidth - padding, padding + 20);
        
        // 获胜者
        if (this.gameState.winner) {
            const winner = this.gameState.players.get(this.gameState.winner);
            if (winner) {
                ctx.fillStyle = '#ffd700';
                ctx.fillText(`胜: ${winner.name}`, window.innerWidth - padding, padding + 45);
            }
        }
        
        ctx.restore();
    }

    /**
     * 创建点击效果
     */
    createClickEffect() {
        if (this.renderer && this.renderer.createParticles) {
            const x = window.innerWidth / 2;
            const y = window.innerHeight / 2;
            this.renderer.createParticles(x, y, 10, '#ff4757');
        }
    }

    /**
     * 创建胜利特效
     */
    createVictoryEffect(player) {
        if (this.renderer && this.renderer.createParticles) {
            // 连续创建粒子
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.renderer.createParticles(player.x || window.innerWidth / 2, 
                                                  player.y || window.innerHeight / 2, 
                                                  20, '#ffd700');
                }, i * 100);
            }
        }
    }

    /**
     * 绑定输入事件
     */
    bindInputEvents() {
        this.clickHandler = (e) => this.handleInput(e);
        this.touchHandler = (e) => this.handleInput(e);
        
        document.addEventListener('click', this.clickHandler);
        document.addEventListener('touchstart', this.touchHandler);
    }

    /**
     * 解绑输入事件
     */
    unbindInputEvents() {
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
            document.removeEventListener('touchstart', this.touchHandler);
        }
    }

    /**
     * 处理窗口大小变化
     */
    onResize(oldWidth, oldHeight, newWidth, newHeight) {
        // 更新红包位置
        if (this.gameState.redEnvelope) {
            this.gameState.redEnvelope.x = newWidth / 2;
            this.gameState.redEnvelope.y = newHeight / 2;
        }
    }

    /**
     * 获取游戏状态
     */
    getState() {
        return {
            phase: this.gameState.phase,
            isRunning: this.gameState.isRunning,
            players: Array.from(this.gameState.players.values()),
            winner: this.gameState.winner,
            clickCount: this.gameState.clickTimes.length
        };
    }
}