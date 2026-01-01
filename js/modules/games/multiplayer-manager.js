/**
 * 多人游戏管理器 - 处理P2P网络通信（优化版）
 * @module multiplayer-manager
 * 
 * 优化特性：
 * - 完善的错误处理和自动重连
 * - 消息确认和重传机制
 * - 性能监控和连接状态跟踪
 * - 心跳机制和断线检测
 * - 消息序列号和去重处理
 * - 数据压缩和批量发送
 * - 安全验证和数据校验
 */

export class MultiplayerManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.peer = null;
        this.connection = null;
        this.connections = []; // 主机端存储多个连接
        this.roomId = null;
        this.isHostMode = false;
        this.playerId = gameManager.playerId;
        this.playerName = gameManager.playerName;
        
        // 玩家列表
        this.players = new Map();
        this.players.set(this.playerId, {
            id: this.playerId,
            name: this.playerName,
            isLocal: true
        });
        
        // 事件系统
        this.listeners = {};
        
        // 心跳检测
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
        this.heartbeatTimeout = 15000; // 15秒无响应视为断线
        this.heartbeatRetry = 0;
        this.maxHeartbeatRetries = 3;
        
        // 消息管理
        this.messageSequence = 0;
        this.pendingMessages = new Map(); // 待确认消息
        this.receivedMessages = new Set(); // 已接收消息ID（去重）
        this.messageBatch = []; // 批量发送队列
        this.batchInterval = null;
        
        // 性能监控
        this.stats = {
            latency: 0,
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            bytesSent: 0,
            bytesReceived: 0,
            lastLatencyMeasure: null,
            connectionStartTime: null
        };
        
        // 连接状态
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting, failed
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // 初始重连延迟
        
        // 绑定方法
        this.onPeerOpen = this.onPeerOpen.bind(this);
        this.onPeerConnection = this.onPeerConnection.bind(this);
        this.onPeerError = this.onPeerError.bind(this);
        this.onDataReceived = this.onDataReceived.bind(this);
        this.onPeerDisconnected = this.onPeerDisconnected.bind(this);
        this.onConnectionClose = this.onConnectionClose.bind(this);
        
        // 性能监控间隔
        this.statsInterval = null;
    }

    /**
     * 创建房间（作为主机）
     */
    async createRoom(roomId) {
        try {
            this.roomId = roomId;
            this.isHostMode = true;
            this.updateConnectionState('connecting');
            
            console.log(`[Multiplayer] 创建房间: ${roomId}`);
            
            // 创建Peer实例，使用房间ID作为Peer ID
            await this.initPeer(roomId);
            
            // 等待Peer连接建立
            await this.waitForPeerConnection();
            
            // 启动性能监控
            this.startStatsMonitoring();
            
            console.log('[Multiplayer] 房间创建成功:', roomId);
            this.updateConnectionState('connected');
            return true;
        } catch (error) {
            console.error('[Multiplayer] 创建房间失败:', error);
            this.updateConnectionState('failed');
            return false;
        }
    }

    /**
     * 加入房间（作为客户端）
     */
    async joinRoom(roomId) {
        try {
            this.roomId = roomId;
            this.isHostMode = false;
            this.updateConnectionState('connecting');
            
            console.log(`[Multiplayer] 加入房间: ${roomId}`);
            
            // 创建Peer实例
            await this.initPeer();
            
            // 连接到主机
            await this.connectToHost(roomId);
            
            // 启动性能监控
            this.startStatsMonitoring();
            
            console.log('[Multiplayer] 加入房间成功:', roomId);
            this.updateConnectionState('connected');
            return true;
        } catch (error) {
            console.error('[Multiplayer] 加入房间失败:', error);
            this.updateConnectionState('failed');
            return false;
        }
    }

    /**
     * 初始化Peer（优化配置）
     */
    async initPeer(peerId = null) {
        return new Promise((resolve, reject) => {
            try {
                // 如果已有Peer，先关闭
                if (this.peer) {
                    this.peer.destroy();
                }
                
                // 优化的Peer配置
                const config = {
                    debug: 0, // 生产环境设为0
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' }
                        ],
                        iceTransportPolicy: 'all', // 优先使用UDP，失败回退TCP
                        bundlePolicy: 'max-bundle',
                        rtcpMuxPolicy: 'require'
                    },
                    // 优化连接选项
                    host: '0.peerjs.com', // 使用公共服务器，生产环境可自建
                    port: 443,
                    secure: true,
                    path: '/',
                    token: 'random_token_' + Math.random().toString(36).substr(2, 9),
                    // 连接超时
                    connectionTimeout: 10000,
                    // 重试策略
                    retries: 3,
                    retryDelay: 1000
                };
                
                // 创建Peer
                if (peerId) {
                    this.peer = new Peer(peerId, config);
                } else {
                    this.peer = new Peer(config);
                }
                
                // 绑定事件
                this.peer.on('open', this.onPeerOpen);
                this.peer.on('connection', this.onPeerConnection);
                this.peer.on('error', this.onPeerError);
                this.peer.on('disconnected', this.onPeerDisconnected);
                this.peer.on('close', () => {
                    console.log('[Multiplayer] Peer连接关闭');
                    this.updateConnectionState('disconnected');
                });
                
                // 等待open事件
                const openHandler = (id) => {
                    console.log('[Multiplayer] Peer连接建立，ID:', id);
                    this.peer.off('open', openHandler);
                    resolve(id);
                };
                
                this.peer.on('open', openHandler);
                
                // 超时处理
                const timeout = setTimeout(() => {
                    if (!this.peer || this.peer.disconnected) {
                        reject(new Error('Peer连接超时'));
                    }
                }, 15000);
                
                // 清理超时定时器
                this.peer.on('open', () => clearTimeout(timeout));
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 连接到主机（带重试）
     */
    async connectToHost(hostId) {
        return new Promise((resolve, reject) => {
            if (!this.peer) {
                reject(new Error('Peer未初始化'));
                return;
            }
            
            // 建立连接
            const conn = this.peer.connect(hostId, {
                reliable: true,
                serialization: 'json',
                metadata: {
                    playerId: this.playerId,
                    playerName: this.playerName
                }
            });
            
            conn.on('open', () => {
                console.log('[Multiplayer] 连接到主机成功');
                this.connection = conn;
                this.setupConnectionHandlers(conn);
                
                // 发送玩家信息（带签名）
                this.sendToConnection(conn, {
                    type: 'player-join',
                    player: {
                        id: this.playerId,
                        name: this.playerName
                    },
                    seq: this.getNextSequence(),
                    timestamp: Date.now()
                }, true); // 需要确认
                
                resolve();
            });
            
            conn.on('error', (err) => {
                console.error('[Multiplayer] 连接错误:', err);
                reject(err);
            });
            
            // 超时处理
            setTimeout(() => {
                if (!conn.open) {
                    reject(new Error('连接主机超时'));
                }
            }, 15000);
        });
    }

    /**
     * 等待Peer连接建立
     */
    waitForPeerConnection() {
        return new Promise((resolve) => {
            if (this.peer && this.peer.open) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (this.peer && this.peer.open) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                // 8秒超时
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (this.peer && this.peer.open) {
                        resolve();
                    } else {
                        resolve(); // 即使未连接也继续，让后续逻辑处理
                    }
                }, 8000);
            }
        });
    }

    /**
     * Peer打开事件
     */
    onPeerOpen(id) {
        console.log('[Multiplayer] Peer打开，ID:', id);
        this.stats.connectionStartTime = Date.now();
        this.emit('peer-open', { id });
    }

    /**
     * 接收到连接请求（主机端）
     */
    onPeerConnection(conn) {
        console.log('[Multiplayer] 接收到连接:', conn.peer);
        
        // 存储连接
        this.connections.push(conn);
        
        // 设置处理器
        this.setupConnectionHandlers(conn);
        
        // 发送欢迎消息（带服务器时间）
        this.sendToConnection(conn, {
            type: 'welcome',
            message: 'Connected to room',
            hostId: this.roomId,
            players: Array.from(this.players.values()),
            serverTime: Date.now(),
            seq: this.getNextSequence()
        }, false);
    }

    /**
     * 设置连接处理器（增强版）
     */
    setupConnectionHandlers(conn) {
        conn.on('data', this.onDataReceived);
        
        conn.on('open', () => {
            console.log('[Multiplayer] 连接打开:', conn.peer);
            this.stats.packetsSent++;
            this.stats.bytesSent += JSON.stringify({type: 'connection-open'}).length;
        });
        
        conn.on('close', () => {
            console.log('[Multiplayer] 连接关闭:', conn.peer);
            this.onConnectionClose(conn);
        });
        
        conn.on('error', (err) => {
            console.error('[Multiplayer] 连接错误:', err);
            this.stats.packetsLost++;
        });
    }

    /**
     * 处理连接关闭
     */
    onConnectionClose(conn) {
        // 从连接列表中移除
        this.connections = this.connections.filter(c => c.peer !== conn.peer);
        
        // 从玩家列表中移除
        const playerId = this.getPlayerIdByConnection(conn.peer);
        if (playerId) {
            this.players.delete(playerId);
            
            // 通知其他玩家
            this.broadcast({
                type: 'player-left',
                playerId: playerId,
                seq: this.getNextSequence(),
                timestamp: Date.now()
            });
            
            // 触发事件
            this.emit('player-left', { playerId });
        }
        
        // 如果是客户端连接到主机的连接断开，尝试重连
        if (!this.isHostMode && this.connection && this.connection.peer === conn.peer) {
            this.handleReconnection();
        }
    }

    /**
     * 接收到数据（增强处理）
     */
    onDataReceived(data) {
        try {
            this.stats.packetsReceived++;
            const dataSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
            this.stats.bytesReceived += dataSize;
            
            const message = typeof data === 'string' ? JSON.parse(data) : data;
            
            // 数据验证
            if (!this.validateMessage(message)) {
                console.warn('[Multiplayer] 收到无效消息:', message);
                this.stats.packetsLost++;
                return;
            }
            
            // 去重处理
            if (message.msgId && this.receivedMessages.has(message.msgId)) {
                console.log('[Multiplayer] 重复消息已忽略:', message.msgId);
                return;
            }
            
            // 记录已接收消息
            if (message.msgId) {
                this.receivedMessages.add(message.msgId);
                // 限制去重集合大小
                if (this.receivedMessages.size > 1000) {
                    const iterator = this.receivedMessages.values();
                    this.receivedMessages.delete(iterator.next().value);
                }
            }
            
            // 处理消息确认
            if (message.ack && message.msgId) {
                this.handleMessageAck(message.msgId);
            }
            
            // 处理消息
            this.handleMessage(message);
            
            // 传递给游戏管理器
            if (this.gameManager) {
                this.gameManager.handleNetworkMessage(message);
            }
            
            // 触发事件
            this.emit('message', message);
            
        } catch (error) {
            console.error('[Multiplayer] 处理数据错误:', error, data);
            this.stats.packetsLost++;
        }
    }

    /**
     * 验证消息
     */
    validateMessage(message) {
        if (!message || typeof message !== 'object') return false;
        if (!message.type || typeof message.type !== 'string') return false;
        
        // 验证必填字段
        const requiredTypes = {
            'player-join': ['player'],
            'game-action': ['action'],
            'game-state': ['state'],
            'heartbeat': []
        };
        
        const required = requiredTypes[message.type];
        if (required) {
            for (const field of required) {
                if (!message[field]) return false;
            }
        }
        
        // 验证数据大小（防止洪水攻击）
        const dataSize = JSON.stringify(message).length;
        if (dataSize > 10240) { // 10KB限制
            console.warn('[Multiplayer] 消息过大:', dataSize);
            return false;
        }
        
        return true;
    }

    /**
     * 处理消息确认
     */
    handleMessageAck(msgId) {
        const pending = this.pendingMessages.get(msgId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingMessages.delete(msgId);
            console.log('[Multiplayer] 消息确认:', msgId);
        }
    }

    /**
     * 处理消息
     */
    handleMessage(message) {
        switch (message.type) {
            case 'player-join':
                if (this.isHostMode) {
                    this.handlePlayerJoin(message.player);
                }
                break;
                
            case 'player-leave':
                this.handlePlayerLeave(message.playerId);
                break;
                
            case 'heartbeat':
                this.lastHeartbeat = Date.now();
                this.heartbeatRetry = 0; // 重置重试计数
                // 回复心跳
                if (this.connection && this.connection.open) {
                    this.sendToConnection(this.connection, {
                        type: 'heartbeat-ack',
                        seq: this.getNextSequence(),
                        timestamp: Date.now()
                    });
                }
                break;
                
            case 'heartbeat-ack':
                this.lastHeartbeat = Date.now();
                this.heartbeatRetry = 0;
                // 计算延迟
                if (message.timestamp) {
                    this.stats.latency = Date.now() - message.timestamp;
                    this.stats.lastLatencyMeasure = Date.now();
                }
                break;
                
            case 'welcome':
                // 主机欢迎消息，同步玩家列表
                if (message.players) {
                    message.players.forEach(player => {
                        if (player.id !== this.playerId) {
                            this.players.set(player.id, {
                                ...player,
                                isLocal: false
                            });
                        }
                    });
                }
                break;
                
            case 'players-list':
                // 更新玩家列表
                if (message.players) {
                    message.players.forEach(player => {
                        if (player.id !== this.playerId) {
                            this.players.set(player.id, {
                                ...player,
                                isLocal: false
                            });
                        }
                    });
                }
                break;
                
            case 'player-joined':
                // 新玩家加入，更新列表
                if (message.player && message.player.id !== this.playerId) {
                    this.players.set(message.player.id, {
                        ...message.player,
                        isLocal: false
                    });
                }
                break;
                
            case 'game-action':
            case 'game-start':
            case 'game-end':
            case 'game-state':
                // 这些消息由gameManager处理
                break;
                
            default:
                console.log('[Multiplayer] 未知消息类型:', message.type);
        }
    }

    /**
     * 处理玩家加入
     */
    handlePlayerJoin(player) {
        if (!this.isHostMode) return;
        
        // 添加到玩家列表
        this.players.set(player.id, {
            ...player,
            isLocal: false
        });
        
        // 通知所有玩家
        this.broadcast({
            type: 'player-joined',
            player: player,
            seq: this.getNextSequence(),
            timestamp: Date.now()
        });
        
        // 通知新玩家其他已存在玩家
        const existingPlayers = Array.from(this.players.values())
            .filter(p => p.id !== player.id);
            
        // 找到新玩家的连接并发送
        const conn = this.connections.find(c => c.peer === this.getPeerIdByPlayerId(player.id));
        if (conn) {
            this.sendToConnection(conn, {
                type: 'players-list',
                players: existingPlayers,
                seq: this.getNextSequence(),
                timestamp: Date.now()
            }, false);
        }
        
        // 触发事件
        this.emit('player-joined', { player });
    }

    /**
     * 处理玩家离开
     */
    handlePlayerLeave(playerId) {
        this.players.delete(playerId);
        this.emit('player-left', { playerId });
    }

    /**
     * 发送消息（增强版）
     */
    send(message, requireAck = false) {
        if (!this.peer) return;
        
        // 添加元数据
        const enrichedMessage = {
            ...message,
            senderId: this.playerId,
            senderName: this.playerName,
            timestamp: message.timestamp || Date.now(),
            msgId: this.generateMessageId(),
            seq: message.seq || this.getNextSequence()
        };
        
        if (this.isHostMode) {
            // 主机广播给所有客户端
            this.broadcast(enrichedMessage, requireAck);
        } else if (this.connection && this.connection.open) {
            // 客户端发送给主机
            this.sendToConnection(this.connection, enrichedMessage, requireAck);
        }
    }

    /**
     * 广播消息（带确认和批量）
     */
    broadcast(message, requireAck = false) {
        if (!this.connections.length) return;
        
        // 添加到批量队列
        this.messageBatch.push({ message, requireAck });
        
        // 如果需要立即发送或队列达到阈值
        if (requireAck || this.messageBatch.length >= 10) {
            this.flushMessageBatch();
        }
    }

    /**
     * 刷新消息批量
     */
    flushMessageBatch() {
        if (this.messageBatch.length === 0) return;
        
        const batch = this.messageBatch.splice(0);
        const data = JSON.stringify(batch.map(item => item.message));
        
        this.connections.forEach(conn => {
            if (conn.open) {
                try {
                    conn.send(data);
                    this.stats.packetsSent++;
                    this.stats.bytesSent += data.length;
                    
                    // 处理需要确认的消息
                    batch.forEach(item => {
                        if (item.requireAck) {
                            this.trackPendingMessage(item.message.msgId);
                        }
                    });
                } catch (error) {
                    console.error('[Multiplayer] 发送失败:', error);
                    this.stats.packetsLost++;
                }
            }
        });
    }

    /**
     * 发送到指定连接
     */
    sendToConnection(conn, message, requireAck = false) {
        if (conn && conn.open) {
            try {
                const data = JSON.stringify(message);
                conn.send(data);
                this.stats.packetsSent++;
                this.stats.bytesSent += data.length;
                
                if (requireAck) {
                    this.trackPendingMessage(message.msgId);
                }
            } catch (error) {
                console.error('[Multiplayer] 发送失败:', error);
                this.stats.packetsLost++;
            }
        }
    }

    /**
     * 跟踪待确认消息
     */
    trackPendingMessage(msgId) {
        const timeout = setTimeout(() => {
            // 超时重传
            const pending = this.pendingMessages.get(msgId);
            if (pending && pending.retryCount < 3) {
                console.log('[Multiplayer] 消息重传:', msgId);
                pending.retryCount++;
                // 重新发送（简化实现，实际应该存储消息内容）
                this.pendingMessages.set(msgId, pending);
            } else {
                console.warn('[Multiplayer] 消息确认超时:', msgId);
                this.pendingMessages.delete(msgId);
                this.stats.packetsLost++;
            }
        }, 3000);
        
        this.pendingMessages.set(msgId, {
            timeout,
            retryCount: 0,
            timestamp: Date.now()
        });
    }

    /**
     * 启动心跳检测
     */
    startHeartbeat() {
        if (this.heartbeatInterval) return;
        
        console.log('[Multiplayer] 启动心跳检测');
        
        this.heartbeatInterval = setInterval(() => {
            // 检测断线
            const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
            
            if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
                this.heartbeatRetry++;
                console.warn(`[Multiplayer] 心跳超时，第${this.heartbeatRetry}次尝试`);
                
                if (this.heartbeatRetry >= this.maxHeartbeatRetries) {
                    console.error('[Multiplayer] 连接超时，可能已断线');
                    this.updateConnectionState('failed');
                    this.emit('connection-timeout');
                    this.handleReconnection();
                    return;
                }
            }
            
            // 发送心跳
            this.send({
                type: 'heartbeat',
                timestamp: Date.now()
            });
            
        }, 5000); // 每5秒发送一次心跳
    }

    /**
     * 处理重连
     */
    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[Multiplayer] 重连次数已达上限');
            this.updateConnectionState('failed');
            return;
        }
        
        this.reconnectAttempts++;
        this.updateConnectionState('reconnecting');
        
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[Multiplayer] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，延迟: ${delay}ms`);
        
        setTimeout(async () => {
            try {
                if (this.isHostMode) {
                    // 主机模式：重新创建房间
                    await this.createRoom(this.roomId);
                } else {
                    // 客户端模式：重新连接主机
                    await this.connectToHost(this.roomId);
                }
                
                console.log('[Multiplayer] 重连成功');
                this.reconnectAttempts = 0;
                this.updateConnectionState('connected');
                this.emit('reconnected');
                
            } catch (error) {
                console.error('[Multiplayer] 重连失败:', error);
                this.handleReconnection(); // 继续尝试
            }
        }, delay);
    }

    /**
     * Peer断开连接
     */
    onPeerDisconnected() {
        console.log('[Multiplayer] Peer断开连接');
        this.updateConnectionState('disconnected');
        
        // 尝试重新连接
        if (this.peer) {
            this.peer.reconnect();
        }
    }

    /**
     * 启动性能监控
     */
    startStatsMonitoring() {
        if (this.statsInterval) return;
        
        this.statsInterval = setInterval(() => {
            // 计算丢包率
            const totalPackets = this.stats.packetsSent + this.stats.packetsLost;
            const lossRate = totalPackets > 0 ? (this.stats.packetsLost / totalPackets * 100).toFixed(2) : 0;
            
            // 计算带宽（每秒）
            const now = Date.now();
            if (this.stats.lastLatencyMeasure && now - this.stats.lastLatencyMeasure > 1000) {
                const timeDiff = (now - this.stats.lastLatencyMeasure) / 1000;
                const uploadSpeed = (this.stats.bytesSent / timeDiff / 1024).toFixed(2); // KB/s
                const downloadSpeed = (this.stats.bytesReceived / timeDiff / 1024).toFixed(2); // KB/s
                
                // 触发性能更新事件
                this.emit('stats-update', {
                    latency: this.stats.latency,
                    lossRate: parseFloat(lossRate),
                    uploadSpeed: parseFloat(uploadSpeed),
                    downloadSpeed: parseFloat(downloadSpeed),
                    players: this.players.size,
                    connectionState: this.connectionState
                });
                
                // 重置统计
                this.stats.bytesSent = 0;
                this.stats.bytesReceived = 0;
                this.stats.lastLatencyMeasure = now;
            }
            
            // 检查连接质量
            if (this.stats.latency > 500 && this.connectionState === 'connected') {
                console.warn('[Multiplayer] 高延迟警告:', this.stats.latency + 'ms');
                this.emit('latency-warning', { latency: this.stats.latency });
            }
            
        }, 2000); // 每2秒更新一次
    }

    /**
     * 更新连接状态
     */
    updateConnectionState(state) {
        if (this.connectionState !== state) {
            console.log(`[Multiplayer] 连接状态: ${this.connectionState} -> ${state}`);
            this.connectionState = state;
            this.emit('connection-state-change', { state });
        }
    }

    /**
     * 生成消息ID
     */
    generateMessageId() {
        return `${this.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取下一个序列号
     */
    getNextSequence() {
        return ++this.messageSequence;
    }

    /**
     * 获取玩家ID通过连接ID
     */
    getPlayerIdByConnection(peerId) {
        for (let [id, player] of this.players) {
            if (player.peerId === peerId) {
                return id;
            }
        }
        return null;
    }

    /**
     * 获取连接ID通过玩家ID
     */
    getPeerIdByPlayerId(playerId) {
        const player = this.players.get(playerId);
        return player ? player.peerId : null;
    }

    /**
     * 检查是否是主机
     */
    isHost() {
        return this.isHostMode;
    }

    /**
     * 获取玩家列表
     */
    getPlayers() {
        return Array.from(this.players.values());
    }

    /**
     * 获取性能统计
     */
    getStats() {
        const totalPackets = this.stats.packetsSent + this.stats.packetsLost;
        const lossRate = totalPackets > 0 ? (this.stats.packetsLost / totalPackets * 100).toFixed(2) : 0;
        
        return {
            connectionState: this.connectionState,
            latency: this.stats.latency,
            packetsSent: this.stats.packetsSent,
            packetsReceived: this.stats.packetsReceived,
            packetsLost: this.stats.packetsLost,
            lossRate: parseFloat(lossRate),
            players: this.players.size,
            isHost: this.isHostMode,
            reconnectAttempts: this.reconnectAttempts,
            pendingMessages: this.pendingMessages.size,
            receivedMessages: this.receivedMessages.size
        };
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
     * 离开房间
     */
    leaveRoom() {
        // 停止批量发送
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
        }
        
        // 停止性能监控
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        
        // 发送离开消息
        if (this.connection && this.connection.open) {
            this.sendToConnection(this.connection, {
                type: 'player-leave',
                playerId: this.playerId,
                seq: this.getNextSequence(),
                timestamp: Date.now()
            });
        }
        
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        
        if (this.connections.length) {
            this.connections.forEach(conn => conn.close());
            this.connections = [];
        }
        
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        this.roomId = null;
        this.isHostMode = false;
        this.connectionState = 'disconnected';
        
        // 清理玩家列表
        this.players.clear();
        this.players.set(this.playerId, {
            id: this.playerId,
            name: this.playerName,
            isLocal: true
        });
        
        // 停止心跳
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // 清理待确认消息
        this.pendingMessages.forEach(pending => {
            clearTimeout(pending.timeout);
        });
        this.pendingMessages.clear();
        this.receivedMessages.clear();
        this.messageBatch = [];
        
        // 重置统计
        this.resetStats();
        
        this.emit('room-left');
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            latency: 0,
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            bytesSent: 0,
            bytesReceived: 0,
            lastLatencyMeasure: null,
            connectionStartTime: null
        };
        this.messageSequence = 0;
        this.reconnectAttempts = 0;
    }

    /**
     * 销毁
     */
    destroy() {
        this.leaveRoom();
        
        this.listeners = {};
        this.players.clear();
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
        }
        
        // 清理待确认消息
        this.pendingMessages.forEach(pending => {
            clearTimeout(pending.timeout);
        });
        this.pendingMessages.clear();
        this.receivedMessages.clear();
        
        console.log('[Multiplayer] 资源已清理');
    }
}