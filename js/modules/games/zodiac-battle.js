/**
 * 生肖对战游戏 - 快速反应对战
 * @module zodiac-battle
 */

export class ZodiacBattle {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.renderer = null;
        this.gameState = {
            isRunning: false,
            phase: 'selecting', // selecting, playing, ended
            players: new Map(), // 玩家状态
            currentPlayer: null, // 当前选择的玩家
            zodiacs: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'],
            currentChallenge: null, // 当前挑战
            challenges: [], // 挑战序列
            score: 0,
            timeLeft: 60, // 60秒
            round: 0,
            maxRounds: 10
        };
        
        // 绑定方法
        this.handleInput = this.handleInput.bind(this);
        this.handleRemoteAction = this.handleRemoteAction.bind(this);
        
        // 输入状态
        this.inputState = {
            selectedZodiac: null,
            canSelect: false
        };
        
        // 挑战类型
        this.challengeTypes = [
            { type: 'match', text: '选择生肖:', target: null },
            { type: 'speed', text: '快速点击!', target: 5 }, // 点击5次
            { type: 'pattern', text: '按顺序选择:', target: [] } // 序列
        ];
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
                zodiac: null,
                score: 0,
                clicks: 0,
                correct: 0,
                wrong: 0
            });
        });
        
        // 重置状态
        this.gameState.phase = 'selecting';
        this.gameState.score = 0;
        this.gameState.timeLeft = 60;
        this.gameState.round = 0;
        this.gameState.challenges = [];
        this.gameState.currentChallenge = null;
        
        // 绑定输入（仅本地）
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (localPlayer) {
            this.bindInputEvents();
        }
        
        // 启动渲染器
        this.renderer.start();
        
        // 主机控制游戏流程
        if (this.gameManager.isHost()) {
            this.startSelectionPhase();
        }
        
        console.log('生肖对战游戏开始');
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
        console.log('生肖对战游戏结束');
    }

    /**
     * 生肖选择阶段
     */
    startSelectionPhase() {
        this.gameState.phase = 'selecting';
        this.gameState.isRunning = true;
        
        // 广播选择阶段
        this.gameManager.handleGameAction('game-phase', {
            phase: 'selecting',
            timestamp: Date.now()
        });
        
        // 10秒选择时间
        setTimeout(() => {
            if (this.gameState.isRunning) {
                this.startPlayingPhase();
            }
        }, 10000);
    }

    /**
     * 游戏进行阶段
     */
    startPlayingPhase() {
        this.gameState.phase = 'playing';
        this.gameState.round = 0;
        
        // 生成挑战序列（仅主机）
        if (this.gameManager.isHost()) {
            this.generateChallenges();
        }
        
        // 广播开始游戏
        this.gameManager.handleGameAction('game-phase', {
            phase: 'playing',
            timestamp: Date.now(),
            challenges: this.gameState.challenges
        });
        
        // 启动计时器
        this.startTimer();
        
        // 开始第一轮
        this.nextRound();
    }

    /**
     * 生成挑战序列
     */
    generateChallenges() {
        this.gameState.challenges = [];
        
        for (let i = 0; i < this.gameState.maxRounds; i++) {
            const typeIndex = Math.floor(Math.random() * this.challengeTypes.length);
            const challengeType = this.challengeTypes[typeIndex];
            
            let challenge = {
                id: `challenge_${i}`,
                type: challengeType.type,
                text: challengeType.text,
                options: this.shuffleArray([...this.gameState.zodiacs]).slice(0, 4),
                correct: null,
                timeLimit: 3000 // 3秒
            };
            
            // 根据类型设置正确答案
            if (challenge.type === 'match') {
                challenge.correct = challenge.options[Math.floor(Math.random() * challenge.options.length)];
            } else if (challenge.type === 'speed') {
                challenge.correct = challengeType.target;
                challenge.clicks = 0;
            } else if (challenge.type === 'pattern') {
                const patternLength = 3;
                challenge.correct = this.shuffleArray([...this.gameState.zodiacs]).slice(0, patternLength);
                challenge.patternIndex = 0;
            }
            
            this.gameState.challenges.push(challenge);
        }
    }

    /**
     * 下一轮
     */
    nextRound() {
        if (this.gameState.round >= this.gameState.maxRounds) {
            this.endGame();
            return;
        }
        
        this.gameState.round++;
        this.gameState.currentChallenge = this.gameState.challenges[this.gameState.round - 1];
        
        // 广播新挑战
        this.gameManager.handleGameAction('new-challenge', {
            challenge: this.gameState.currentChallenge,
            round: this.gameState.round
        });
        
        // 允许输入
        this.inputState.canSelect = true;
        
        // 设置超时
        setTimeout(() => {
            if (this.gameState.isRunning && this.gameState.phase === 'playing') {
                this.handleTimeout();
            }
        }, this.gameState.currentChallenge.timeLimit);
    }

    /**
     * 处理超时
     */
    handleTimeout() {
        // 错误处理
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (localPlayer && this.inputState.canSelect) {
            localPlayer.wrong++;
            this.createWrongEffect();
        }
        
        this.inputState.canSelect = false;
        
        // 下一轮
        setTimeout(() => {
            if (this.gameState.isRunning) {
                this.nextRound();
            }
        }, 1000);
    }

    /**
     * 处理本地输入
     */
    handleInput(event) {
        if (!this.gameState.isRunning || this.gameState.phase !== 'playing') return;
        if (!this.inputState.canSelect) return;
        
        const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
        if (!localPlayer) return;
        
        const challenge = this.gameState.currentChallenge;
        if (!challenge) return;
        
        // 处理不同类型的输入
        if (challenge.type === 'match') {
            // 选择生肖
            const zodiac = event.target?.dataset?.zodiac;
            if (zodiac) {
                this.handleZodiacSelection(zodiac, localPlayer);
            }
        } else if (challenge.type === 'speed') {
            // 快速点击
            if (event.type === 'click' || event.type === 'touchstart') {
                this.handleSpeedClick(localPlayer);
            }
        } else if (challenge.type === 'pattern') {
            // 模式选择
            const zodiac = event.target?.dataset?.zodiac;
            if (zodiac) {
                this.handlePatternSelection(zodiac, localPlayer);
            }
        }
    }

    /**
     * 处理生肖选择
     */
    handleZodiacSelection(zodiac, player) {
        this.inputState.canSelect = false;
        const challenge = this.gameState.currentChallenge;
        
        if (zodiac === challenge.correct) {
            // 正确
            player.score += 10;
            player.correct++;
            this.createCorrectEffect();
            this.playSuccessSound();
        } else {
            // 错误
            player.wrong++;
            this.createWrongEffect();
            this.playErrorSound();
        }
        
        // 发送到网络
        this.gameManager.handleGameAction('player-answer', {
            playerId: player.id,
            type: 'match',
            answer: zodiac,
            correct: zodiac === challenge.correct,
            score: player.score
        });
        
        // 下一轮
        setTimeout(() => {
            if (this.gameState.isRunning) {
                this.nextRound();
            }
        }, 800);
    }

    /**
     * 处理快速点击
     */
    handleSpeedClick(player) {
        const challenge = this.gameState.currentChallenge;
        challenge.clicks = (challenge.clicks || 0) + 1;
        player.clicks++;
        
        // 点击效果
        this.createClickEffect();
        
        // 发送到网络
        this.gameManager.handleGameAction('player-answer', {
            playerId: player.id,
            type: 'speed',
            clicks: challenge.clicks,
            target: challenge.correct
        });
        
        // 检查是否完成
        if (challenge.clicks >= challenge.correct) {
            this.inputState.canSelect = false;
            player.score += 15;
            player.correct++;
            this.createCorrectEffect();
            
            setTimeout(() => {
                if (this.gameState.isRunning) {
                    this.nextRound();
                }
            }, 800);
        }
    }

    /**
     * 处理模式选择
     */
    handlePatternSelection(zodiac, player) {
        const challenge = this.gameState.currentChallenge;
        
        if (zodiac === challenge.correct[challenge.patternIndex]) {
            // 正确
            challenge.patternIndex++;
            
            // 点击效果
            this.createClickEffect();
            
            // 检查是否完成模式
            if (challenge.patternIndex >= challenge.correct.length) {
                this.inputState.canSelect = false;
                player.score += 20;
                player.correct++;
                this.createCorrectEffect();
                this.playSuccessSound();
                
                setTimeout(() => {
                    if (this.gameState.isRunning) {
                        this.nextRound();
                    }
                }, 800);
            }
        } else {
            // 错误
            this.inputState.canSelect = false;
            player.wrong++;
            this.createWrongEffect();
            this.playErrorSound();
            
            setTimeout(() => {
                if (this.gameState.isRunning) {
                    this.nextRound();
                }
            }, 800);
        }
        
        // 发送到网络
        this.gameManager.handleGameAction('player-answer', {
            playerId: player.id,
            type: 'pattern',
            answer: zodiac,
            progress: challenge.patternIndex,
            correct: zodiac === challenge.correct[challenge.patternIndex - 1],
            score: player.score
        });
    }

    /**
     * 处理远程动作
     */
    handleRemoteAction(message) {
        switch (message.action) {
            case 'game-phase':
                this.handleGamePhase(message.data);
                break;
                
            case 'new-challenge':
                this.handleNewChallenge(message.data);
                break;
                
            case 'player-answer':
                this.handlePlayerAnswer(message.data);
                break;
        }
    }

    /**
     * 处理游戏阶段
     */
    handleGamePhase(data) {
        this.gameState.phase = data.phase;
        
        if (data.phase === 'selecting') {
            // 选择阶段
            this.gameState.isRunning = true;
            
        } else if (data.phase === 'playing') {
            // 游戏阶段
            if (!this.gameManager.isHost()) {
                this.gameState.challenges = data.challenges;
                this.startTimer();
            }
        }
    }

    /**
     * 处理新挑战
     */
    handleNewChallenge(data) {
        this.gameState.round = data.round;
        this.gameState.currentChallenge = data.challenge;
        
        // 客户端准备输入
        if (!this.gameManager.isHost()) {
            this.inputState.canSelect = true;
        }
    }

    /**
     * 处理玩家答案
     */
    handlePlayerAnswer(data) {
        const player = this.gameState.players.get(data.playerId);
        if (player && !player.isLocal) {
            if (data.type === 'speed') {
                player.clicks = data.clicks;
            }
            if (data.score !== undefined) {
                player.score = data.score;
            }
            if (data.correct !== undefined) {
                if (data.correct) {
                    player.correct++;
                } else {
                    player.wrong++;
                }
            }
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
        if (state.phase) this.gameState.phase = state.phase;
        if (state.score !== undefined) this.gameState.score = state.score;
        if (state.timeLeft !== undefined) this.gameState.timeLeft = state.timeLeft;
    }

    /**
     * 计时器
     */
    startTimer() {
        if (this.timerInterval) return;
        
        this.timerInterval = setInterval(() => {
            if (!this.gameState.isRunning || this.gameState.phase !== 'playing') {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                return;
            }
            
            this.gameState.timeLeft--;
            
            if (this.gameState.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
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
            case 'selecting':
                this.renderSelection(ctx);
                break;
            case 'playing':
                this.renderPlaying(ctx, timestamp);
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
     * 渲染选择阶段
     */
    renderSelection(ctx) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('选择你的生肖角色', window.innerWidth / 2, window.innerHeight / 2 - 100);
        
        // 生肖选择网格
        const gridCols = 6;
        const gridRows = 2;
        const cellWidth = 60;
        const cellHeight = 40;
        const startX = (window.innerWidth - gridCols * cellWidth) / 2;
        const startY = window.innerHeight / 2 - 30;
        
        this.gameState.zodiacs.forEach((zodiac, index) => {
            const col = index % gridCols;
            const row = Math.floor(index / gridCols);
            const x = startX + col * cellWidth;
            const y = startY + row * cellHeight;
            
            // 检查是否已选择
            const localPlayer = Array.from(this.gameState.players.values()).find(p => p.isLocal);
            const isSelected = localPlayer && localPlayer.zodiac === zodiac;
            
            // 绘制按钮
            ctx.fillStyle = isSelected ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x, y, cellWidth - 4, cellHeight - 4);
            
            // 绘制文字
            ctx.fillStyle = isSelected ? '#000' : '#fff';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zodiac, x + (cellWidth - 4) / 2, y + (cellHeight - 4) / 2);
        });
        
        ctx.restore();
        
        // 提示
        ctx.save();
        ctx.fillStyle = '#aaa';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('点击选择，10秒后自动开始', window.innerWidth / 2, startY + gridRows * cellHeight + 20);
        ctx.restore();
    }

    /**
     * 渲染游戏进行
     */
    renderPlaying(ctx, timestamp) {
        if (!this.gameState.currentChallenge) return;
        
        const challenge = this.gameState.currentChallenge;
        
        ctx.save();
        
        // 挑战文字
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(challenge.text, window.innerWidth / 2, 80);
        
        // 轮数
        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        ctx.fillText(`第 ${this.gameState.round}/${this.gameState.maxRounds} 轮`, window.innerWidth / 2, 120);
        
        // 根据类型渲染
        if (challenge.type === 'match') {
            this.renderMatchChallenge(ctx, challenge);
        } else if (challenge.type === 'speed') {
            this.renderSpeedChallenge(ctx, challenge, timestamp);
        } else if (challenge.type === 'pattern') {
            this.renderPatternChallenge(ctx, challenge);
        }
        
        ctx.restore();
    }

    /**
     * 渲染匹配挑战
     */
    renderMatchChallenge(ctx, challenge) {
        const gridCols = 4;
        const cellWidth = 80;
        const cellHeight = 50;
        const startX = (window.innerWidth - gridCols * cellWidth) / 2;
        const startY = 180;
        
        challenge.options.forEach((zodiac, index) => {
            const x = startX + (index % gridCols) * cellWidth;
            const y = startY + Math.floor(index / gridCols) * cellHeight;
            
            // 绘制按钮
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(x, y, cellWidth - 4, cellHeight - 4);
            
            // 绘制文字
            ctx.fillStyle = '#fff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zodiac, x + (cellWidth - 4) / 2, y + (cellHeight - 4) / 2);
        });
    }

    /**
     * 渲染速度挑战
     */
    renderSpeedChallenge(ctx, challenge, timestamp) {
        const progress = (challenge.clicks || 0) / challenge.correct;
        
        // 进度条
        const barWidth = 300;
        const barHeight = 30;
        const barX = (window.innerWidth - barWidth) / 2;
        const barY = 200;
        
        // 背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 进度
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // 文字
        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`点击: ${challenge.clicks || 0}/${challenge.correct}`, window.innerWidth / 2, barY + barHeight + 20);
        
        // 点击区域提示
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.fillRect(barX, barY + 50, barWidth, 60);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('点击这里快速点击!', window.innerWidth / 2, barY + 80);
    }

    /**
     * 渲染模式挑战
     */
    renderPatternChallenge(ctx, challenge) {
        // 显示已选择的模式
        const selected = challenge.correct.slice(0, challenge.patternIndex);
        const remaining = challenge.correct.slice(challenge.patternIndex);
        
        const startY = 180;
        
        // 已选择
        if (selected.length > 0) {
            ctx.fillStyle = '#4ecdc4';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`已选: ${selected.join(' ')}`, window.innerWidth / 2, startY);
        }
        
        // 剩余
        if (remaining.length > 0) {
            ctx.fillStyle = '#aaa';
            ctx.font = '18px Arial';
            ctx.fillText(`待选: ${remaining.join(' ? ')}`, window.innerWidth / 2, startY + 30);
        }
        
        // 选择网格
        const gridCols = 6;
        const cellWidth = 50;
        const cellHeight = 40;
        const startX = (window.innerWidth - gridCols * cellWidth) / 2;
        const gridY = startY + 80;
        
        challenge.options.forEach((zodiac, index) => {
            const x = startX + (index % gridCols) * cellWidth;
            const y = gridY + Math.floor(index / gridCols) * cellHeight;
            
            // 绘制按钮
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(x, y, cellWidth - 4, cellHeight - 4);
            
            // 绘制文字
            ctx.fillStyle = '#fff';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zodiac, x + (cellWidth - 4) / 2, y + (cellHeight - 4) / 2);
        });
    }

    /**
     * 渲染结束
     */
    renderEnded(ctx) {
        // 计算排名
        const players = Array.from(this.gameState.players.values());
        const sorted = players.sort((a, b) => b.score - a.score);
        
        ctx.save();
        
        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', window.innerWidth / 2, 100);
        
        // 排名
        sorted.forEach((player, index) => {
            const y = 180 + index * 40;
            
            // 名次
            ctx.fillStyle = index === 0 ? '#ffd700' : '#fff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${index + 1}.`, 50, y);
            
            // 名字
            ctx.fillText(player.name, 100, y);
            
            // 分数
            ctx.textAlign = 'right';
            ctx.fillText(`${player.score}分`, window.innerWidth - 50, y);
            
            // 统计
            ctx.font = '14px Arial';
            ctx.fillStyle = '#aaa';
            ctx.textAlign = 'left';
            ctx.fillText(`正确: ${player.correct} | 错误: ${player.wrong} | 点击: ${player.clicks}`, 
                        100, y + 18);
        });
        
        ctx.restore();
    }

    /**
     * 渲染玩家状态
     */
    renderPlayerStatus(ctx) {
        const players = Array.from(this.gameState.players.values());
        const startX = 20;
        const startY = 20;
        const itemHeight = 20;
        
        ctx.save();
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        
        players.forEach((player, index) => {
            const y = startY + index * itemHeight;
            
            // 玩家名字
            ctx.fillStyle = player.isLocal ? '#4ecdc4' : '#fff';
            ctx.fillText(player.name, startX, y);
            
            // 分数
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`${player.score}分`, startX + 80, y);
            
            // 生肖
            if (player.zodiac) {
                ctx.fillStyle = '#aaa';
                ctx.fillText(player.zodiac, startX + 130, y);
            }
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
        ctx.fillRect(window.innerWidth - 180, padding, 160, 80);
        
        // 阶段
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        const phaseText = {
            'selecting': '选择中',
            'playing': '进行中',
            'ended': '已结束'
        }[this.gameState.phase] || '未知';
        
        ctx.fillText(`状态: ${phaseText}`, window.innerWidth - padding, padding + 20);
        
        // 时间
        if (this.gameState.phase === 'playing') {
            ctx.fillStyle = this.gameState.timeLeft <= 10 ? '#ff6b6b' : '#fff';
            ctx.fillText(`时间: ${this.gameState.timeLeft}s`, window.innerWidth - padding, padding + 40);
            
            // 轮数
            ctx.fillStyle = '#fff';
            ctx.fillText(`轮数: ${this.gameState.round}/${this.gameState.maxRounds}`, 
                        window.innerWidth - padding, padding + 60);
        }
        
        ctx.restore();
    }

    /**
     * 创建正确效果
     */
    createCorrectEffect() {
        if (this.renderer && this.renderer.createParticles) {
            const x = window.innerWidth / 2;
            const y = window.innerHeight / 2;
            this.renderer.createParticles(x, y, 20, '#4ecdc4');
        }
    }

    /**
     * 创建错误效果
     */
    createWrongEffect() {
        if (this.renderer && this.renderer.createParticles) {
            const x = window.innerWidth / 2;
            const y = window.innerHeight / 2;
            this.renderer.createParticles(x, y, 15, '#ff6b6b');
        }
    }

    /**
     * 创建点击效果
     */
    createClickEffect() {
        if (this.renderer && this.renderer.createParticles) {
            const x = window.innerWidth / 2;
            const y = 250;
            this.renderer.createParticles(x, y, 8, '#ffd700');
        }
    }

    /**
     * 播放成功音效
     */
    playSuccessSound() {
        if (window.audioManager && window.audioManager.play) {
            window.audioManager.play('success', { volume: 0.3 });
        }
    }

    /**
     * 播放错误音效
     */
    playErrorSound() {
        if (window.audioManager && window.audioManager.play) {
            window.audioManager.play('error', { volume: 0.3 });
        }
    }

    /**
     * 绑定输入事件
     */
    bindInputEvents() {
        this.clickHandler = (e) => this.handleInput(e);
        
        // 为生肖选择绑定点击事件
        document.addEventListener('click', this.clickHandler);
        document.addEventListener('touchstart', this.clickHandler);
    }

    /**
     * 解绑输入事件
     */
    unbindInputEvents() {
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
            document.removeEventListener('touchstart', this.clickHandler);
        }
    }

    /**
     * 处理窗口大小变化
     */
    onResize(oldWidth, oldHeight, newWidth, newHeight) {
        // 无需特殊处理
    }

    /**
     * 结束游戏
     */
    endGame() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.gameState.phase = 'ended';
        this.inputState.canSelect = false;
        
        // 收集结果
        const results = {
            players: Array.from(this.gameState.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                correct: p.correct,
                wrong: p.wrong,
                clicks: p.clicks,
                zodiac: p.zodiac
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
            phase: this.gameState.phase,
            isRunning: this.gameState.isRunning,
            players: Array.from(this.gameState.players.values()),
            round: this.gameState.round,
            timeLeft: this.gameState.timeLeft,
            score: this.gameState.score
        };
    }

    /**
     * 数组洗牌
     */
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}