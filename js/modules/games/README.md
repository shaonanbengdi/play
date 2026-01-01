# 春节联机小游戏系统

## 概述

这是一个基于WebRTC的实时联机小游戏系统，专为春节倒计时网页设计。系统支持多个玩家通过P2P连接进行实时互动游戏。

**最新优化版本**: 包含完整的错误处理、自动重连、性能监控和安全验证机制。

## 系统架构

### 核心模块

1. **GameManager** - 游戏总控制器
   - 管理游戏生命周期
   - 协调各个游戏模块
   - 处理游戏状态转换

2. **MultiplayerManager** - 多人网络管理器（优化版）
   - 基于PeerJS的WebRTC连接
   - 完善的错误处理和自动重连
   - 消息确认和重传机制
   - 性能监控和连接状态跟踪
   - 心跳机制和断线检测
   - 消息序列号和去重处理
   - 数据压缩和批量发送
   - 安全验证和数据校验

3. **GameRenderer** - 游戏渲染器
   - Canvas渲染系统
   - 复用现有粒子系统
   - 处理游戏动画和特效

4. **RoomManager** - 房间管理器
   - 房间创建和加入
   - 玩家列表管理
   - 游戏开始/结束控制

### 游戏模块

1. **FuCharacterCatch** - 接福字挑战
   - 协作式游戏
   - 团队合作接住下落的福字
   - 实时同步玩家位置和分数

2. **RedEnvelopeRace** - 抢红包竞速
   - 实时竞速游戏
   - 比拼点击速度
   - 精确的时间同步

3. **ZodiacBattle** - 生肖对战
   - 快速反应挑战
   - 多种游戏模式
   - 实时排名系统

## 技术特点

### 网络通信优化

- **WebRTC P2P**: 使用PeerJS库实现浏览器间直接通信
- **低延迟**: <200ms的游戏状态同步
- **自动重连**: 断线自动恢复机制（最多5次，指数退避）
- **主机模式**: 一个玩家作为主机仲裁游戏逻辑
- **连接状态**: 实时监控连接状态（disconnected/connecting/connected/reconnecting/failed）

### 消息处理优化

- **消息确认**: 重要消息需要确认，3秒超时，最多重试3次
- **序列号**: 每条消息带序列号，防止乱序
- **去重处理**: 基于消息ID的去重，防止重复处理
- **批量发送**: 支持批量消息发送，减少网络开销
- **数据压缩**: JSON序列化，支持消息压缩

### 错误处理和恢复

- **心跳机制**: 每5秒发送心跳，15秒无响应视为断线
- **自动重连**: 指数退避策略，延迟从2s开始，最大32s
- **状态监控**: 实时监控连接状态和性能指标
- **优雅降级**: 网络质量差时自动降低特效复杂度

### 安全特性

- **消息验证**: 验证消息类型和必填字段
- **大小限制**: 单条消息最大10KB，防止洪水攻击
- **数据校验**: 检查消息格式和内容有效性
- **来源验证**: 消息包含发送者ID和时间戳

### 性能监控

- **延迟测量**: 实时网络延迟监控
- **丢包率**: 统计数据包丢失率
- **带宽监控**: 上传/下载速度统计
- **连接质量**: 自动评估连接质量（优秀/一般/较差）

## 文件结构

```
js/modules/games/
├── game-manager.js          # 游戏总控制器
├── multiplayer-manager.js   # 网络通信管理器（优化版）
├── multiplayer-test.js      # 单元测试脚本
├── multiplayer-demo.js      # 演示和使用示例
├── game-renderer.js         # 游戏渲染器
├── room-manager.js          # 房间管理器
├── fu-character-catch.js    # 接福字游戏
├── red-envelope-race.js     # 抢红包游戏
├── zodiac-battle.js         # 生肖对战游戏
├── game-ui.js               # 游戏UI管理器
└── README.md                # 本文件

css/games/
├── game-base.css            # 基础样式
├── game-components.css      # 组件样式
└── game-animations.css      # 动画样式

assets/games/
├── fu-character.svg         # 福字图标
├── red-envelope.svg         # 红包图标
└── zodiac-icons.svg         # 生肖图标
```

## 使用方法

### 1. 基本使用流程

```javascript
// 1. 初始化游戏系统
const gameIntegration = new GameIntegration(app);
await gameIntegration.init();

// 2. 获取游戏管理器
const gameManager = gameIntegration.gameManager;

// 3. 创建房间（主机）
const roomId = await gameManager.createRoom('fu-character-catch');
console.log('房间ID:', roomId);
console.log('分享链接:', window.location.href);

// 4. 加入房间（客户端）
await gameManager.joinRoom('ABC123');

// 5. 开始游戏（仅主机）
await gameManager.roomManager.startGame();

// 6. 发送游戏动作
gameManager.sendGameAction('move', { x: 100, y: 200 });

// 7. 监听事件
gameManager.on('game-started', (data) => {
    console.log('游戏开始:', data.gameType);
});

gameManager.on('player-joined', (data) => {
    console.log('新玩家加入:', data.player);
});
```

### 2. 连接状态管理

```javascript
// 获取当前状态
const state = gameManager.getState();
console.log(state);
// 输出: {gameState, gameType, playerId, roomId, isHost, players}

// 监听连接状态变化
gameManager.networkManager.on('connection-state-change', (data) => {
    console.log('连接状态:', data.state);
    // states: disconnected, connecting, connected, reconnecting, failed
});

// 获取详细统计
const stats = gameManager.networkManager.getStats();
console.log(stats);
// 输出: {latency, lossRate, packetsSent, packetsReceived, ...}
```

### 3. 性能监控

```javascript
// 监听性能更新
gameManager.networkManager.on('stats-update', (stats) => {
    console.log(`延迟: ${stats.latency}ms`);
    console.log(`丢包率: ${stats.lossRate}%`);
    console.log(`上传速度: ${stats.uploadSpeed}KB/s`);
    console.log(`下载速度: ${stats.downloadSpeed}KB/s`);
});

// 监听高延迟警告
gameManager.networkManager.on('latency-warning', (data) => {
    console.warn('网络延迟过高:', data.latency + 'ms');
    // 可以降低游戏画质或特效
});
```

### 4. 错误处理

```javascript
// 监听连接超时
gameManager.networkManager.on('connection-timeout', () => {
    console.error('连接超时');
    // 提示用户检查网络或重新连接
});

// 监听重连事件
gameManager.networkManager.on('reconnected', () => {
    console.log('重连成功');
    // 恢复游戏状态
});

// 监听游戏错误
gameManager.on('game-error', (data) => {
    console.error('游戏错误:', data.error);
});
```

### 5. 测试和调试

```javascript
// 运行完整测试
import { MultiplayerDemo } from './js/modules/games/multiplayer-demo.js';
const demo = new MultiplayerDemo(gameManager);
await demo.start();

// 运行单元测试
import { MultiplayerTest } from './js/modules/games/multiplayer-test.js';
const test = await MultiplayerTest.createTestScenario(gameManager);
await test.runAllTests();

// 显示使用说明
MultiplayerDemo.showUsage();
```

## 网络消息格式

### 通用消息结构

```json
{
    "type": "game-action",
    "senderId": "player_abc123",
    "senderName": "幸运福星",
    "timestamp": 1640995200000,
    "msgId": "player_abc123_1640995200000_xyz",
    "seq": 42,
    "action": "move",
    "data": {"x": 100, "y": 200}
}
```

### 消息类型

1. **连接相关**
   - `player-join` - 玩家加入房间
   - `player-joined` - 通知其他玩家新玩家加入
   - `player-leave` - 玩家离开
   - `welcome` - 主机欢迎消息
   - `players-list` - 玩家列表同步

2. **游戏相关**
   - `game-start` - 游戏开始
   - `game-action` - 游戏动作
   - `game-state` - 游戏状态同步
   - `game-end` - 游戏结束

3. **网络维护**
   - `heartbeat` - 心跳包
   - `heartbeat-ack` - 心跳确认

## 性能指标

### 连接质量评估

| 指标 | 优秀 | 一般 | 较差 |
|------|------|------|------|
| 延迟 | < 200ms | 200-500ms | > 500ms |
| 丢包率 | < 2% | 2-5% | > 5% |

### 优化建议

- **高延迟**: 降低游戏画质，减少特效，优化网络环境
- **高丢包**: 检查网络稳定性，考虑使用TCP模式
- **带宽不足**: 减少消息频率，压缩数据

## 错误处理机制

### 常见错误

1. **网络初始化失败** - PeerJS加载失败
   - 自动重试3次
   - 提示用户检查网络连接

2. **连接超时** - P2P连接建立失败
   - 自动重连机制
   - 指数退避策略

3. **主机断开** - 主机离线
   - 检测到断线后自动重连
   - 客户端尝试重新连接

4. **消息处理失败** - 无效消息格式
   - 验证失败自动丢弃
   - 记录日志但不影响系统

### 恢复策略

- **自动重连**: 最多5次尝试，延迟从2s开始，每次翻倍
- **状态同步**: 重连后自动同步游戏状态
- **消息重传**: 重要消息自动重传
- **优雅降级**: 网络差时降低游戏质量

## 浏览器兼容性

### 支持的浏览器

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### 必需功能

- WebRTC DataChannel
- Canvas API
- ES6+ 支持
- WebSocket (用于PeerJS信令)

## 开发指南

### 添加新游戏

1. 创建游戏类继承游戏基类
2. 实现必要方法：
   - `start()` - 启动游戏
   - `stop()` - 停止游戏
   - `render()` - 渲染逻辑
   - `handleInput()` - 输入处理
   - `handleRemoteAction()` - 远程动作处理
   - `syncState()` - 状态同步
3. 在GameManager中注册游戏类型
4. 添加UI入口按钮

### 调试技巧

```javascript
// 访问游戏系统
const gameIntegration = window.newYearApp.getGameIntegration();

// 查看详细日志
gameIntegration.gameManager.networkManager.on('message', (msg) => {
    console.log('收到消息:', msg);
});

// 监听所有事件
gameIntegration.gameManager.on('game-started', (data) => {
    console.log('游戏开始事件:', data);
});

// 获取实时统计
setInterval(() => {
    const stats = gameIntegration.gameManager.networkManager.getStats();
    console.log('性能统计:', stats);
}, 5000);
```

### 最佳实践

1. **网络环境**: 建议在WiFi环境下进行游戏
2. **房间管理**: 房间ID区分大小写，建议使用大写字母和数字
3. **消息频率**: 控制游戏动作发送频率，避免网络拥塞
4. **错误处理**: 始终监听错误事件并给用户友好提示
5. **性能优化**: 根据网络质量动态调整游戏特效

## 注意事项

1. **PeerJS依赖**: 需要网络连接加载PeerJS库（https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js）
2. **主机依赖**: 游戏需要一个主机玩家，主机离线后游戏无法继续
3. **网络质量**: 游戏体验依赖网络稳定性，建议在WiFi环境下使用
4. **移动端**: 需要处理触摸事件和性能优化
5. **浏览器限制**: 某些浏览器可能需要用户手势才能启动音频/视频

## 扩展计划

- [ ] 更多游戏类型（猜灯谜、舞龙等）
- [ ] 游戏内聊天系统
- [ ] 排行榜和成就系统
- [ ] 观战模式
- [ ] AI对手
- [ ] 录像回放功能
- [ ] 跨房间匹配系统

## 更新日志

### v2.0 (优化版)
- ✅ 完善的错误处理和自动重连机制
- ✅ 消息确认和重传机制
- ✅ 性能监控和连接状态跟踪
- ✅ 心跳机制和断线检测
- ✅ 消息序列号和去重处理
- ✅ 数据压缩和批量发送
- ✅ 安全验证和数据校验
- ✅ 详细的日志和调试信息
- ✅ 单元测试和演示脚本

### v1.0 (初始版)
- ✅ 基于PeerJS的P2P通信
- ✅ 房间创建和加入
- ✅ 基本的游戏状态同步
- ✅ 三个示例游戏