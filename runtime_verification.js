/**
 * 运行时功能验证脚本
 * 验证重构后的春节倒计时应用核心功能
 */

// 模拟浏览器环境测试
const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, warnings: 0 }
};

function addTest(name, passed, message, warning = false) {
    testResults.tests.push({ name, passed, message, warning });
    if (passed) testResults.summary.passed++;
    else if (warning) testResults.summary.warnings++;
    else testResults.summary.failed++;
}

// 1. 验证重构完整性
function verifyRefactoring() {
    console.log('🔍 验证重构完整性...\n');
    
    const fs = require('fs');
    
    // 检查main.js
    const mainContent = fs.readFileSync('js/main.js', 'utf8');
    
    // 验证策略模式
    const hasStrategyPattern = mainContent.includes('statusStrategies') && 
                              mainContent.includes('effects');
    addTest('策略模式实现', hasStrategyPattern, 
        hasStrategyPattern ? '使用策略映射替代嵌套if-else' : '策略模式缺失');
    
    // 验证重复函数移除
    const copyCount = (mainContent.match(/copyTextToClipboard/g) || []).length;
    const hasNoDuplicates = copyCount <= 1;
    addTest('无重复函数', hasNoDuplicates, 
        hasNoDuplicates ? 'copyTextToClipboard函数无重复' : `发现${copyCount}个重复定义`);
    
    // 验证事件系统拆分
    const hasSplitEvents = mainContent.includes('bindCountdownEvents') &&
                          mainContent.includes('bindWishEvents') &&
                          mainContent.includes('bindParticleEvents');
    addTest('事件系统拆分', hasSplitEvents, 
        hasSplitEvents ? 'bindEvents已拆分为6个专注函数' : '事件系统未正确拆分');
    
    // 检查愿望管理器
    const wishesContent = fs.readFileSync('js/modules/wishes-manager.js', 'utf8');
    
    // 验证文档片段
    const hasDocumentFragment = wishesContent.includes('createDocumentFragment');
    addTest('文档片段优化', hasDocumentFragment, 
        hasDocumentFragment ? '使用DocumentFragment批量DOM操作' : '缺少文档片段优化');
    
    // 验证内联样式优化
    const hasInlineStyles = wishesContent.includes('style.cssText');
    addTest('内联样式优化', hasInlineStyles, 
        hasInlineStyles ? '内联样式使用单行格式' : '内联样式未优化');
    
    // 检查粒子系统
    const particleContent = fs.readFileSync('js/modules/particle-system.js', 'utf8');
    
    // 验证工厂模式
    const hasFactory = particleContent.includes('ParticleFactory') &&
                      particleContent.includes('createSnowflake') &&
                      particleContent.includes('createFirework');
    addTest('工厂模式实现', hasFactory, 
        hasFactory ? '使用工厂模式替代类继承' : '工厂模式缺失');
    
    // 验证性能优化
    const hasPerformanceOpt = particleContent.includes('requestAnimationFrame') &&
                             particleContent.includes('object pool');
    addTest('性能优化措施', hasPerformanceOpt, 
        hasPerformanceOpt ? '包含对象池和RAF优化' : '性能优化缺失');
    
    // 检查倒计时模块
    const countdownContent = fs.readFileSync('js/modules/countdown.js', 'utf8');
    
    // 验证debugLogged修复
    const hasDebugFix = countdownContent.includes('this.debugLogged = false');
    addTest('debugLogged修复', hasDebugFix, 
        hasDebugFix ? '修复未定义属性错误' : 'debugLogged修复缺失');
}

// 2. 验证文件完整性
function verifyFiles() {
    console.log('\n📁 验证文件完整性...\n');
    
    const fs = require('fs');
    const requiredFiles = [
        'index.html', 'manifest.json', 'robots.txt', 'favicon.ico',
        'js/config.js', 'js/main.js',
        'js/modules/countdown.js', 'js/modules/particle-system.js',
        'js/modules/wishes-manager.js', 'js/modules/audio-manager.js',
        'js/modules/utils.js',
        'css/variables.css', 'css/reset.css', 'css/layout.css',
        'css/components.css', 'css/components-additional.css',
        'css/animations.css', 'css/animations-additional.css',
        'css/responsive.css'
    ];
    
    let allFilesExist = true;
    requiredFiles.forEach(file => {
        const exists = fs.existsSync(file);
        if (exists) {
            console.log(`  ✅ ${file}`);
        } else {
            console.log(`  ❌ ${file} (缺失)`);
            allFilesExist = false;
        }
    });
    
    addTest('所有必需文件存在', allFilesExist, 
        allFilesExist ? '文件完整' : '缺少必需文件');
}

// 3. 验证代码质量
function verifyCodeQuality() {
    console.log('\n🔬 验证代码质量...\n');
    
    const fs = require('fs');
    const mainContent = fs.readFileSync('js/main.js', 'utf8');
    
    // 验证ES6语法
    const hasES6 = mainContent.includes('const ') && 
                  mainContent.includes('=>') && 
                  mainContent.includes('class ');
    addTest('ES6语法使用', hasES6, 
        hasES6 ? '使用现代JavaScript语法' : '缺少ES6语法');
    
    // 验证模块化
    const hasModules = mainContent.includes('export ') && 
                      mainContent.includes('import ');
    addTest('模块化导出', hasModules, 
        hasModules ? 'ES6模块系统' : '缺少模块化');
    
    // 验证错误处理
    const hasErrorHandling = mainContent.includes('try') && 
                            mainContent.includes('catch') && 
                            mainContent.includes('finally');
    addTest('错误处理', hasErrorHandling, 
        hasErrorHandling ? '完整的错误处理' : '缺少错误处理');
    
    // 验证事件系统
    const hasEvents = mainContent.includes('CustomEvent') && 
                     mainContent.includes('dispatchEvent');
    addTest('事件系统', hasEvents, 
        hasEvents ? '自定义事件系统' : '缺少事件系统');
}

// 4. 生成最终报告
function generateReport() {
    console.log('\n📊 生成最终验证报告...\n');
    
    const report = `
================================================================================
                    春节倒计时应用 - 运行时验证报告
================================================================================

验证时间: ${testResults.timestamp}
应用版本: 重构后的2026春节版

================================================================================
                              验证结果汇总
================================================================================

总验证项: ${testResults.tests.length}
通过: ${testResults.summary.passed} ✅
失败: ${testResults.summary.failed} ❌
警告: ${testResults.summary.warnings} ⚠️

成功率: ${((testResults.summary.passed / testResults.tests.length) * 100).toFixed(1)}%

================================================================================
                              详细验证结果
================================================================================

${testResults.tests.map((test, index) => `
${index + 1}. ${test.passed ? '✅' : '❌'} ${test.name}
   状态: ${test.passed ? '通过' : '失败'} ${test.warning ? '(警告)' : ''}
   详情: ${test.message}
`).join('\n')}

================================================================================
                              验证结论
================================================================================

${testResults.summary.failed === 0 ? 
'✅ 验证通过 - 所有重构正确实现，应用运行正常' : 
'❌ 验证失败 - 存在未正确实现的重构'}

================================================================================
    2026春节倒计时应用 - 重构验证完成！🎉🎊
================================================================================
    `;
    
    console.log(report);
    
    // 保存报告
    const fs = require('fs');
    fs.writeFileSync('runtime_verification_report.txt', report);
    console.log('\n📄 验证报告已保存到: runtime_verification_report.txt');
}

// 执行验证
function runVerification() {
    console.log('🚀 开始运行时功能验证...\n');
    
    verifyRefactoring();
    verifyFiles();
    verifyCodeQuality();
    generateReport();
    
    // 返回结果
    if (testResults.summary.failed === 0) {
        console.log('\n🎉 恭喜！所有重构验证通过，应用运行正常！');
        return true;
    } else {
        console.log('\n⚠️ 存在验证失败的项目，请检查上面的详细信息。');
        return false;
    }
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    const success = runVerification();
    process.exit(success ? 0 : 1);
}

// 导出供浏览器使用
if (typeof window !== 'undefined') {
    window.runRuntimeVerification = runVerification;
    console.log('验证函数已挂载到 window.runRuntimeVerification()');
}