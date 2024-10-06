// 获取页面滚动条的位置
function getScrollTop() {
    return window?.pageYOffset || document.documentElement?.scrollTop;
}

// 获取页面总高度
function getPageHeight() {
    return Math.max(
        document.body?.scrollHeight,
        document.documentElement?.scrollHeight,
        document.body?.offsetHeight,
        document.documentElement?.offsetHeight,
        document.body?.clientHeight,
        document.documentElement?.clientHeight
    );
}

// 获取视口高度
function getClientHeight() {
    return window.innerHeight || document.documentElement?.clientHeight;
}

// 创建进度条元素并初始化
const progressBar = document.createElement('div');
progressBar.id = 'progress';
progressBar.style.pointerEvents = 'none'; // 允许点击穿透
document.body.insertBefore(progressBar, document.body?.firstChild);

const bar = document.createElement('div');
bar.className = 'bar';
bar.style.cssText = `
    position: fixed;
    z-index: 999999999;
    top: 0;
    left: 0;
    width: 0%;
    height: 2px;
    background: linear-gradient(90deg, #03a9f4, #f441a5);
    box-shadow: 0 0 40px #03a9f4, 0 0 50px #f441a5, 0 0 60px #03a9f4;
    border-radius: 0.5em;
    transition: width 0.4s ease;
`;
progressBar.appendChild(bar);

// 创建按钮并初始化
const scrollButtons = (() => {
    const scrollBtns = document.createElement("div");
    scrollBtns.className = "goto_top_end";
    scrollBtns.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 5rem;
        z-index: 1000000000;
        display: none;
    `;

    const buttons = [
        { text: "⬆️顶部", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
        { text: "⬇️最新", action: () => window.scrollTo({ top: getPageHeight() - getClientHeight(), behavior: "smooth" }) }
    ];

    buttons.forEach(({ text, action }) => {
        const button = document.createElement("button");
        button.innerText = text;
        button.onclick = action;
        button.style.cssText = `
            background-color: #0005;
            color: #eee;
            border: none;
            font-size: 16px;
            padding: 10px;
            margin: 0px 5px;
            border-radius: 5px;
            cursor: pointer;
        `;
        scrollBtns.appendChild(button);
    });

    document.body.appendChild(scrollBtns);
    return scrollBtns;
})();

// 更新进度条宽度和切换按钮显示状态的主函数
const updateUI = (() => {
    let pageHeight = getPageHeight();
    let clientHeight = getClientHeight();

    return () => {
        const scrollTop = getScrollTop();
        const maxScroll = pageHeight - clientHeight;

        // 更新进度条宽度
        const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        bar.style.width = `${Math.min(progress, 100)}%`;

        // 切换按钮显示状态
        const shouldShowButtons = pageHeight > clientHeight;
        scrollButtons.style.display = shouldShowButtons ? "block" : "none";
        if (shouldShowButtons) {
            scrollButtons.children[0].style.display = scrollTop > clientHeight ? "inline-block" : "none";
            scrollButtons.children[1].style.display = (scrollTop + clientHeight >= pageHeight - 20) ? "none" : "inline-block";
        }
    };
})();

// 事件去抖函数
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 页面加载和滚动时更新UI（使用去抖动处理）
window.addEventListener('load', updateUI);
window.addEventListener('resize', debounce(() => {
    // 当视口大小改变时，重新计算页面高度和视口高度
    updateUI();
}, 100));
window.addEventListener('scroll', debounce(updateUI, 50));
