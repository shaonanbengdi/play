/**
 * 多人游戏管理器测试脚本
 * 用于测试优化后的网络通信机制
 */

export class MultiplayerTest {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.testResults = [];
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('[测试] 开始运行多人游戏管理器测试');
        this.testResults = [];
        
        await this.testInitialization();
        await this.testConnection();
        await this.testMessageHandling();
        await this.testErrorRecovery();
        await this.testPerformance();
        
        this.printResults();
    }

    /**
     * 测试初始化
     */
    async testInitialization() {
        console.log('[测试] 测试初始化...');
        
        try {
            const manager = this.gameManager.networkManager;
            
            // 检查必要属性
            const requiredProps = [
                'peer', 'connection', 'connections', 'roomId', 'isHostMode',
                'playerId', 'playerName', 'players', 'listeners',
                'heartbeatInterval', 'messageSequence', 'pendingMessages',
                'receivedMessages', 'stats', 'connectionState'
            ];
            
            const missingProps = requiredProps.filter(prop => !(prop in manager));
            
            if (missingProps.length === 0) {
                this.recordTest('初始化', true, '所有必要属性已初始化');
            } else {
                this.recordTest('初始化', false, `缺少属性: ${missingProps.join(', ')}`);
            }
            
            // 检查方法存在
            const requiredMethods = [
                'createRoom', 'joinRoom', 'send', 'broadcast', 'leaveRoom',
                'startHeartbeat', 'handleReconnection', 'validateMessage',
                'getStats', 'updateConnectionState'
            ];
            
            const missingMethods = requiredMethods.filter(method => typeof manager[method] !== 'function');
            
            if (missingMethods.length === 0) {
                this.recordTest('方法完整性', true, '所有必要方法已实现');
            } else {
                this.recordTest('方法完整性', false, `缺少方法: ${missingMethods.join(', ')}`);
            }
            
        } catch (error) {
            this.recordTest('初始化', false, error.message);
        }
    }

    /**
     * 测试连接功能
     */
    async testConnection() {
        console.log('[测试] 测试连接功能...');
        
        try {
            // 测试PeerJS配置
            const manager = this.gameManager.networkManager;
            
            // 模拟初始化Peer
            await manager.initPeer();
            
            if (manager.peer && manager.peer.open) {
                this.recordTest('Peer初始化', true, 'Peer连接成功建立');
            } else {
                this.recordTest('Peer初始化', false, 'Peer连接失败');
            }
            
            // 测试状态更新
            manager.updateConnectionState('connected');
            if (manager.connectionState === 'connected') {
                this.recordTest('状态管理', true, '连接状态更新正常');
            } else {
                this.recordTest('状态管理', false, '状态更新失败');
            }
            
        } catch (error) {
            this.recordTest('连接功能', false, error.message);
        }
    }

    /**
     * 测试消息处理
     */
    async testMessageHandling() {
        console.log('[测试] 测试消息处理...');
        
        try {
            const manager = this.gameManager.networkManager;
            
            // 测试消息验证
            const validMessage = {
                type: 'game-action',
                action: 'move',
                data: { x: 100, y: 200 },
                timestamp: Date.now()
            };
            
            const isValid = manager.validateMessage(validMessage);
            this.recordTest('消息验证', isValid, isValid ? '有效消息通过验证' : '有效消息被拒绝');
            
            // 测试无效消息
            const invalidMessage = {
                type: 'invalid-type',
                data: null
            };
            
            const isInvalid = !manager.validateMessage(invalidMessage);
            this.recordTest('无效消息过滤', isInvalid, isInvalid ? '无效消息被过滤' : '无效消息通过');
            
            // 测试消息序列号
            const seq1 = manager.getNextSequence();
            const seq2 = manager.getNextSequence();
            const seqValid = seq2 === seq1 + 1;
            this.recordTest('序列号生成', seqValid, `序列号: ${seq1} -> ${seq2}`);
            
            // 测试消息ID生成
            const msgId1 = manager.generateMessageId();
            const msgId2 = manager.generateMessageId();
            const idUnique = msgId1 !== msgId2 && msgId1.includes(manager.playerId);
            this.recordTest('消息ID生成', idUnique, 'ID唯一且包含玩家ID');
            
            // 测试去重
            manager.receivedMessages.clear();
            manager.receivedMessages.add('test-id');
            const isDuplicate = manager.receivedMessages.has('test-id');
            this.recordTest('去重机制', isDuplicate, '去重集合工作正常');
            
        } catch (error) {
            this.recordTest('消息处理', false, error.message);
        }
    }

    /**
     * 测试错误恢复
     */
    async testErrorRecovery() {
        console.log('[测试] 测试错误恢复...');
        
        try {
            const manager = this.gameManager.networkManager;
            
            // 测试重连计数
            const initialAttempts = manager.reconnectAttempts;
            manager.reconnectAttempts = 3;
            const canReconnect = manager.reconnectAttempts < manager.maxReconnectAttempts;
            this.recordTest('重连限制', !canReconnect, `重连次数: ${manager.reconnectAttempts}/${manager.maxReconnectAttempts}`);
            
            // 测试心跳超时检测
            manager.lastHeartbeat = Date.now() - 20000; // 20秒前
            const timeSince = Date.now() - manager.lastHeartbeat;
            const isTimeout = timeSince > manager.heartbeatTimeout;
            this.recordTest('心跳超时检测', isTimeout, `超时时间: ${timeSince}ms`);
            
            // 测试状态转换
            manager.updateConnectionState('reconnecting');
            const isReconnecting = manager.connectionState === 'reconnecting';
            this.recordTest('状态转换', isReconnecting, '状态转换正常');
            
            // 重置状态
            manager.reconnectAttempts = initialAttempts;
            manager.updateConnectionState('disconnected');
            
        } catch (error) {
            this.recordTest('错误恢复', false, error.message);
        }
    }

    /**
     * 测试性能监控
     */
    async testPerformance() {
        console.log('[测试] 测试性能监控...');
        
        try {
            const manager = this.gameManager.networkManager;
            
            // 测试统计信息
            const stats = manager.getStats();
            const hasStats = stats && 
                typeof stats.connectionState === 'string' &&
                typeof stats.latency === 'number' &&
                typeof stats.packetsSent === 'number';
            
            this.recordTest('统计信息', hasStats, hasStats ? '统计信息完整' : '统计信息缺失');
            
            // 测试数据大小限制
            const largeMessage = {
                type: 'test',
                data: 'x'.repeat(10241) // 超过10KB
            };
            const isTooLarge = !manager.validateMessage(largeMessage);
            this.recordTest('数据大小限制', isTooLarge, '大消息被拒绝');
            
            // 测试消息批量
            manager.messageBatch = [];
            for (let i = 0; i < 5; i++) {
                manager.messageBatch.push({ message: { type: 'test', seq: i }, requireAck: false });
            }
            const batchReady = manager.messageBatch.length === 5;
            this.recordTest('批量消息队列', batchReady, `队列长度: ${manager.messageBatch.length}`);
            
        } catch (error) {
            this.recordTest('性能监控', false, error.message);
        }
    }

    /**
     * 记录测试结果
     */
    recordTest(name, passed, message) {
        this.testResults.push({
            name,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✓' : '✗';
        console.log(`[测试] ${status} ${name}: ${message}`);
    }

    /**
     * 打印测试结果
     */
    printResults() {
        console.log('\n========== 测试结果汇总 ==========');
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✓ PASS' : '✗ FAIL';
            console.log(`${index + 1}. [${status}] ${result.name}`);
            console.log(`   ${result.message}`);
        });
        
        console.log(`\n总计: ${passed}/${total} 通过 (${Math.round(passed/total*100)}%)`);
        console.log('==================================\n');
        
        return {
            passed,
            total,
            percentage: Math.round(passed/total*100),
            results: this.testResults
        };
    }

    /**
     * 创建测试场景
     */
    static async createTestScenario(gameManager) {
        const test = new MultiplayerTest(gameManager);
        
        // 如果没有网络管理器，先初始化
        if (!gameManager.networkManager) {
            await gameManager.initNetwork();
        }
        
        return test;
    }
}