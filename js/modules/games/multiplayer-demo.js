/**
 * 多人游戏联机功能演示和测试
 * 展示优化后的网络通信机制
 */

import { MultiplayerTest } from './multiplayer-test.js';

export class MultiplayerDemo {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.isRunning = false;
    }

    /**
     * 启动演示
     */
    async start() {
        if (this.isRunning) {
            console.log('[演示] 已在运行中');
            return;
        }

        console.log('[演示] 启动多人游戏演示');
        this.isRunning = true;

        // 1. 初始化网络管理器
        console.log('\n=== 步骤1: 初始化网络 ===');
        const initSuccess = await this.gameManager.initNetwork();
        if (!initSuccess) {
            console.error('[演示] 网络初始化失败');
            return;
        }
        console.log('[演示] ✓ 网络初始化成功');

        // 2. 运行单元测试
        console.log('\n=== 步骤2: 运行单元测试 ===');
        const test = await MultiplayerTest.createTestScenario(this.gameManager);
        const testResult = await test.runAllTests();

        if (testResult.percentage < 80) {
            console.warn('[演示] 测试通过率较低，可能存在功能问题');
        }

        // 3. 演示连接流程
        console.log('\n=== 步骤3: 演示连接流程 ===');
        await this.demoConnectionFlow();

        // 4. 演示消息传输
        console.log('\n=== 步骤4: 演示消息传输 ===');
        await this.demoMessageTransfer();

        // 5. 演示错误处理
        console.log('\n=== 步骤5: 演示错误处理 ===');
        await this.demoErrorHandling();

        // 6. 演示性能监控
        console.log('\n=== 步骤6: 演示性能监控 ===');
        await this.demoPerformanceMonitoring();

        console.log('\n=== 演示完成 ===');
        this.isRunning = false;
    }

    /**
     * 演示连接流程
     */
    async demoConnectionFlow() {
        const manager = this.gameManager.networkManager;
        
        console.log('[演示] 模拟创建房间...');
        const roomId = 'TEST' + Math.random().toString(36).substr(2, 3).toUpperCase();
        
        // 模拟创建房间
        try {
            // 这里我们只测试初始化，不实际连接
            await manager.initPeer(roomId);
            console.log(`[演示] ✓ 房间ID生成: ${roomId}`);
            console.log(`[演示] ✓ Peer状态: ${manager.peer ? '已创建' : '未创建'}`);
            console.log(`[演示] ✓ 连接状态: ${manager.connectionState}`);
        } catch (error) {
            console.log('[演示] 房间创建测试完成 (预期会失败，因为没有真实网络)');
        }

        // 演示状态转换
        console.log('\n[演示] 状态转换演示:');
        const states = ['disconnected', 'connecting', 'connected', 'reconnecting', 'failed'];
        states.forEach(state => {
            manager.updateConnectionState(state);
            console.log(`  ${state} -> ${manager.connectionState}`);
        });
    }

    /**
     * 演示消息传输
     */
    async demoMessageTransfer() {
        const manager = this.gameManager.networkManager;
        
        console.log('[演示] 消息传输测试:');
        
        // 测试消息构建
        const testMessages = [
            { type: 'game-action', action: 'move', data: { x: 100, y: 200 } },
            { type: 'game-state', state: { score: 150, level: 3 } },
            { type: 'heartbeat', timestamp: Date.now() }
        ];

        testMessages.forEach((msg, i) => {
            const enriched = {
                ...msg,
                senderId: manager.playerId,
                senderName: manager.playerName,
                timestamp: Date.now(),
                msgId: manager.generateMessageId(),
                seq: manager.getNextSequence()
            };
            
            const size = JSON.stringify(enriched).length;
            const isValid = manager.validateMessage(enriched);
            
            console.log(`  消息${i+1}: ${enriched.type} | 大小: ${size}B | 有效: ${isValid}`);
        });

        // 演示批量发送
        console.log('\n[演示] 批量消息演示:');
        manager.messageBatch = [];
        for (let i = 0; i < 3; i++) {
            manager.messageBatch.push({
                message: { type: 'test', seq: i },
                requireAck: false
            });
        }
        console.log(`  队列长度: ${manager.messageBatch.length}`);
        console.log(`  批量发送阈值: 10`);
        console.log(`  状态: ${manager.messageBatch.length >= 10 ? '立即发送' : '等待更多消息'}`);
    }

    /**
     * 演示错误处理
     */
    async demoErrorHandling() {
        const manager = this.gameManager.networkManager;
        
        console.log('[演示] 错误处理测试:');
        
        // 1. 无效消息
        const invalidMsg = { type: 'invalid', data: null };
        const result1 = manager.validateMessage(invalidMsg);
        console.log(`  无效消息过滤: ${result1 ? '失败' : '成功'}`);
        
        // 2. 超大消息
        const largeMsg = { type: 'test', data: 'x'.repeat(10241) };
        const result2 = manager.validateMessage(largeMsg);
        console.log(`  超大消息过滤: ${result2 ? '失败' : '成功'}`);
        
        // 3. 重连演示
        manager.reconnectAttempts = 0;
        console.log(`  初始重连次数: ${manager.reconnectAttempts}`);
        console.log(`  最大重连次数: ${manager.maxReconnectAttempts}`);
        console.log(`  重连延迟: ${manager.reconnectDelay}ms`);
        
        // 4. 心跳超时
        manager.lastHeartbeat = Date.now() - 20000;
        const isTimeout = (Date.now() - manager.lastHeartbeat) > manager.heartbeatTimeout;
        console.log(`  心跳超时检测: ${isTimeout ? '超时' : '正常'}`);
        
        // 5. 状态监控
        const stats = manager.getStats();
        console.log(`  当前状态: ${stats.connectionState}`);
        console.log(`  待确认消息: ${stats.pendingMessages}`);
    }

    /**
     * 演示性能监控
     */
    async demoPerformanceMonitoring() {
        const manager = this.gameManager.networkManager;
        
        console.log('[演示] 性能监控演示:');
        
        // 模拟一些统计数据
        manager.stats.packetsSent = 100;
        manager.stats.packetsReceived = 95;
        manager.stats.packetsLost = 5;
        manager.stats.latency = 45;
        manager.stats.bytesSent = 50000;
        manager.stats.bytesReceived = 30000;
        
        const stats = manager.getStats();
        
        console.log(`  延迟: ${stats.latency}ms`);
        console.log(`  丢包率: ${stats.lossRate}%`);
        console.log(`  发送包: ${stats.packetsSent}`);
        console.log(`  接收包: ${stats.packetsReceived}`);
        console.log(`  丢失包: ${stats.packetsLost}`);
        console.log(`  玩家数: ${stats.players}`);
        console.log(`  连接状态: ${stats.connectionState}`);
        
        // 连接质量评估
        let quality = '优秀';
        if (stats.latency > 200) quality = '一般';
        if (stats.latency > 500 || stats.lossRate > 5) quality = '较差';
        
        console.log(`  连接质量: ${quality}`);
    }

    /**
     * 创建测试房间（用于实际测试）
     */
    async createTestRoom() {
        console.log('\n[测试] 创建真实测试房间');
        console.log('注意: 这需要真实网络连接和PeerJS服务器');
        
        const roomId = 'DEMO' + Math.random().toString(36).substr(2, 4).toUpperCase();
        console.log(`[测试] 房间ID: ${roomId}`);
        console.log(`[测试] 分享链接: ${window.location.origin}${window.location.pathname}#room-${roomId}`);
        
        const success = await this.gameManager.createRoom(roomId);
        
        if (success) {
            console.log('[测试] ✓ 房间创建成功');
            console.log('[测试] 等待其他玩家加入...');
            
            // 监听事件
            this.gameManager.on('player-joined', (data) => {
                console.log('[测试] ✓ 新玩家加入:', data.player);
            });
            
            this.gameManager.on('connection-state-change', (data) => {
                console.log('[测试] 连接状态变化:', data.state);
            });
            
            return roomId;
        } else {
            console.log('[测试] ✗ 房间创建失败');
            return null;
        }
    }

    /**
     * 加入测试房间
     */
    async joinTestRoom(roomId) {
        console.log(`\n[测试] 尝试加入房间: ${roomId}`);
        
        const success = await this.gameManager.joinRoom(roomId);
        
        if (success) {
            console.log('[测试] ✓ 加入房间成功');
            
            // 监听事件
            this.gameManager.on('player-left', (data) => {
                console.log('[测试] 玩家离开:', data.playerId);
            });
            
            this.gameManager.on('connection-timeout', () => {
                console.log('[测试] ⚠ 连接超时');
            });
            
            return true;
        } else {
            console.log('[测试] ✗ 加入房间失败');
            return false;
        }
    }

    /**
     * 显示使用说明
     */
    static showUsage() {
        console.log(`
=== 多人游戏联机功能使用说明 ===

1. 基本流程:
   - 创建房间: gameManager.createRoom(roomId)
   - 加入房间: gameManager.joinRoom(roomId)
   - 发送消息: gameManager.sendGameAction(action, data)
   - 离开房间: gameManager.endGame()

2. 连接状态:
   - disconnected: 未连接
   - connecting: 正在连接
   - connected: 已连接
   - reconnecting: 正在重连
   - failed: 连接失败

3. 性能指标:
   - 延迟: < 200ms 优秀, 200-500ms 一般, > 500ms 较差
   - 丢包率: < 2% 优秀, 2-5% 一般, > 5% 较差

4. 错误处理:
   - 自动重连: 最多5次，指数退避
   - 心跳检测: 每5秒一次，15秒超时
   - 消息确认: 3秒超时，最多重试3次

5. 安全特性:
   - 消息验证: 类型和必填字段检查
   - 大小限制: 单条消息最大10KB
   - 去重处理: 基于消息ID
   - 序列号: 防止乱序

6. 监控命令:
   - 获取状态: gameManager.getState()
   - 获取统计: gameManager.networkManager.getStats()
   - 监听事件: gameManager.on('event', callback)

7. 测试命令:
   const demo = new MultiplayerDemo(gameManager);
   await demo.start();  // 运行完整测试
   await demo.createTestRoom();  // 创建测试房间
   await demo.joinTestRoom('ROOMID');  // 加入测试房间
        `);
    }
}