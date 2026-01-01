// 调试测试脚本
console.log('=== 春节倒计时应用调试测试 ===');

// 1. 测试当前时间
const now = new Date();
console.log('当前时间:', now.toLocaleString('zh-CN'));

// 2. 测试目标日期
const targetDate = new Date('2026-02-16T00:00:00');
console.log('目标日期:', targetDate.toLocaleString('zh-CN'));

// 3. 测试时间差
const diff = targetDate - now;
console.log('时间差(毫秒):', diff);
console.log('时间差(天):', diff / (1000 * 60 * 60 * 24));

// 4. 测试formatTimeDifference函数
function formatTimeDifference(diffMs) {
    if (diffMs <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
}

const formatted = formatTimeDifference(diff);
console.log('格式化时间:', formatted);

// 5. 测试DOM元素
console.log('DOM元素检查:');
console.log('- 倒计时容器:', document.querySelector('.countdown-display') ? '存在' : '缺失');
console.log('- 天数元素:', document.getElementById('days') ? '存在' : '缺失');
console.log('- 小时元素:', document.getElementById('hours') ? '存在' : '缺失');
console.log('- 分钟元素:', document.getElementById('minutes') ? '存在' : '缺失');
console.log('- 秒数元素:', document.getElementById('seconds') ? '存在' : '缺失');

// 6. 测试模块导入
console.log('模块导入测试:');
try {
    import('./js/config.js').then(() => {
        console.log('- config.js: 导入成功');
    }).catch(e => {
        console.log('- config.js: 导入失败', e.message);
    });
} catch (e) {
    console.log('- config.js: 导入异常', e.message);
}

// 7. 测试本地存储
try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('- 本地存储: 可用');
} catch (e) {
    console.log('- 本地存储: 不可用', e.message);
}

console.log('=== 调试测试完成 ===');