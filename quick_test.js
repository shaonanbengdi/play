// 快速测试脚本 - 验证倒计时计算

// 从utils.js复制的formatTimeDifference函数
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

// 测试数据
const now = new Date();
const targetDate = new Date('2026-02-16T00:00:00');
const diff = targetDate - now;
const formatted = formatTimeDifference(diff);

console.log('=== 快速倒计时测试 ===');
console.log('当前时间:', now.toLocaleString('zh-CN'));
console.log('目标时间:', targetDate.toLocaleString('zh-CN'));
console.log('时间差(毫秒):', diff);
console.log('时间差(天):', (diff / (1000 * 60 * 60 * 24)).toFixed(2));
console.log('格式化结果:', formatted);
console.log('显示值:', {
    days: String(formatted.days).padStart(2, '0'),
    hours: String(formatted.hours).padStart(2, '0'),
    minutes: String(formatted.minutes).padStart(2, '0'),
    seconds: String(formatted.seconds).padStart(2, '0')
});

// 检查问题
if (diff > 0 && formatted.days === 0 && formatted.hours === 0 && formatted.minutes === 0 && formatted.seconds === 0) {
    console.error('❌ 问题：时间差为正，但格式化结果全为0');
} else if (diff <= 0) {
    console.warn('⚠️ 目标日期已过');
} else {
    console.log('✅ 计算正常');
}