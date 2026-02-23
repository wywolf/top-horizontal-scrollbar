// 获取页面滚动条的位置
function getScrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop;
}

// 获取页面总高度
function getPageHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

// 更新进度条百分比和旋转角度
function updateProgress() {
    const scrollTop = getScrollTop();
    const pageHeight = getPageHeight();
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;
    const maxScroll = pageHeight - clientHeight;

    // 避免除以零的情况
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

    // 确保进度不会超过100%
    const clampedProgress = Math.min(progress, 100);

    // 更新circle的旋转角度
    circle.style.transform = `rotate(${(clampedProgress / 100) * 360}deg)`;
    percentage.textContent = `${clampedProgress.toFixed(0)}%`;
}

// 创建进度条元素
const progressBar = document.createElement('div');
progressBar.id = 'progress';
progressBar.className = 'progress-circle';
progressBar.style.pointerEvents = 'none'; // 允许点击穿透
progressBar.style.position = 'fixed';
progressBar.style.top = '15px';
progressBar.style.right = '15px';
progressBar.style.width = '50px';
progressBar.style.height = '50px';
progressBar.style.borderRadius = '50%';
progressBar.style.border = '2px solid gray';
progressBar.style.display = 'flex';
progressBar.style.alignItems = 'center';
progressBar.style.justifyContent = 'center';
progressBar.style.zIndex = '999999999'; // 设置z-index为最高
document.body.insertBefore(progressBar, document.body.firstChild);

// 创建进度条的circle元素
const circle = document.createElement('div');
circle.className = 'circle';
circle.id = 'circle';
circle.style.width = '40px';
circle.style.height = '40px';
circle.style.borderRadius = '50%';
circle.style.border = '4px solid transparent';
// circle.style.borderTopColor = '#20894d'; // 设置进度条颜色
// circle.style.borderImage = 'linear-gradient(to right, #ee3f4d, #ff7f50, #ffa07a) 1'; // 渐变色
// circle.style.borderImage = 'linear-gradient(to right, #20894d, #64d87d, #f2f2f2) 1';
// circle.style.boxShadow = '0 0 5px #20894d, 0 0 10px #64d87d, 0 0 15px #f2f2f2';
circle.style.boxShadow = '0 0 20px #ee3f4d, 0 0 30px #ff7f50, 0 0 40px #ffa07a'; // 增强渐变荧光效果
progressBar.appendChild(circle);

// 创建进度条的percentage元素
const percentage = document.createElement('div');
percentage.className = 'percentage';
percentage.id = 'percentage';
percentage.style.position = 'absolute';
percentage.style.fontSize = '12px';
percentage.style.top = '50%'; // 垂直居中
percentage.style.left = '50%'; // 水平居中
percentage.style.transform = 'translate(-50%, -50%)'; // 移动到圆圈的中心
percentage.style.color = '#ee3f4d';
progressBar.appendChild(percentage);

// 初始化进度条
updateProgress();

// 监听滚动事件
window.addEventListener('scroll', updateProgress);
