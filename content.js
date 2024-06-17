// 获取页面滚动条的位置
function getScrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop;
}

// 获取页面总高度
function getPageHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

// 获取视口高度
function getClientHeight() {
    return window.innerHeight || document.documentElement.clientHeight;
}

// 创建进度条元素
const progressBar = document.createElement('div');
progressBar.id = 'progress';
progressBar.style.pointerEvents = 'none'; // 允许点击穿透
document.body.insertBefore(progressBar, document.body.firstChild);

// 创建进度条的 bar 元素
const bar = document.createElement('div');
bar.className = 'bar';
bar.style.position = 'fixed';
bar.style.zIndex = '999999999';
bar.style.top = '0';
bar.style.left = '0';
bar.style.width = '0%'; // 设置初始宽度为 0%
bar.style.height = '2px';
bar.style.backgroundColor = '#ee3f4d';
bar.style.boxShadow = '0 0 20px #ee3f4d, 0 0 30px #ff7f50, 0 0 40px #ffa07a'; // 增强渐变荧光效果
progressBar.appendChild(bar);

// 更新进度条宽度
function updateProgress() {
    const scrollTop = getScrollTop();
    const pageHeight = getPageHeight();
    const clientHeight = getClientHeight();
    const maxScroll = pageHeight - clientHeight;

    // 避免除以零的情况
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

    // 确保进度不会超过 100%
    const clampedProgress = Math.min(progress, 100);
    bar.style.width = `${clampedProgress}%`;
}

// 页面加载时恢复进度条宽度
window.addEventListener('load', function () {
    updateProgress();
});

// 监听滚动事件
window.addEventListener('scroll', function () {
    updateProgress();
});
