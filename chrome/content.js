(function () {
    // 解构赋值获取 documentElement 和 body
    const { documentElement: docEl, body } = document;
    let pageHeight = 0, clientHeight = 0, maxScroll = 0;
    let lastScrollTop = -1, lastMaxScroll = -1;

    // 进度条类
    class ProgressBar {
        constructor() {
            this._progress = -1;
            this.bar = this._createBar();
        }

        // 创建进度条元素
        _createBar() {
            const bar = document.createElement('div');
            bar.id = 'progress-bar';
            bar.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 2px; transform: scaleX(0);
                background: linear-gradient(90deg, #03a9f4, #f441a5); z-index: 999999999;
                pointer-events: none; transform-origin: left;
            `;
            document.body.insertBefore(bar, document.body.firstChild);
            return bar;
        }

        // 更新进度条的进度
        update(progress) {
            if (this._progress !== progress) {
                this.bar.style.transform = `scaleX(${progress / 100})`;
                this._progress = progress;
            }
        }
    }

    // 滚动按钮类
    class ScrollButtons {
        constructor() {
            this._visible = false;
            this.buttons = this._createButtons();
            this.scrollableElements = new Set(); // 新增：存储可滚动元素
            this._initMutationObserver(); // 新增：初始化DOM观察器
            
            // 添加页面加载完成的监听
            window.addEventListener('load', () => {
                console.log('%c页面加载完成，滚动条已就绪', 'color: red; font-size: 20px');
                this._detectScrollableElements();
            });
        }

        // 创建滚动按钮
        _createButtons() {
            const scrollBtns = document.createElement('div');
            scrollBtns.className = 'scroll-buttons';
            scrollBtns.style.cssText = `
                position: fixed; bottom: 10px; right: 5rem; z-index: 99999999999; display: none;
            `;

            // 创建顶部和最新按钮
            ['⬆️顶部', '⬇️最新'].forEach((text, i) => {
                const button = document.createElement('button');
                button.innerText = text;
                button.onclick = () => smoothScroll(i ? maxScroll : 0);
                button.style.cssText = `
                    background-color: #0005; color: #eee; border: none; font-size: 16px;
                    padding: 10px; margin: 0 5px; border-radius: 5px; cursor: pointer;
                `;
                scrollBtns.appendChild(button);
            });

            document.body.appendChild(scrollBtns);
            return scrollBtns;
        }

        // 更新按钮的显示状态
        update(scrollTop) {
            // 优化：考虑所有可滚动元素的状态
            const showScrollButtons = Array.from(this.scrollableElements).some(el =>
                el.scrollHeight > el.clientHeight
            ) || maxScroll > 0;

            if (this._visible !== showScrollButtons) {
                this.buttons.style.display = showScrollButtons ? 'block' : 'none';
                this._visible = showScrollButtons;
            }

            // 优化：更精确的按钮显示逻辑
            const topButton = this.buttons.children[0];
            const bottomButton = this.buttons.children[1];

            // 顶部按钮显示逻辑
            topButton.style.display = scrollTop > 100 ? 'inline-block' : 'none';

            // 底部按钮显示逻辑
            bottomButton.style.display = (maxScroll - scrollTop > 100) ? 'inline-block' : 'none';
        }

        // 新增：初始化DOM观察器
        _initMutationObserver() {
            const observer = new MutationObserver(() => {
                // 优化：增加防抖，避免频繁触发
                debounce(() => this._detectScrollableElements(), 100);
            });

            // 优化：增加更具体的配置
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class'] // 只监听可能影响滚动的属性
            });
        }

        // 新增：检测可滚动元素
        _detectScrollableElements() {
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
                // 优化：增加更多的滚动容器判断条件
                const computedStyle = window.getComputedStyle(el);
                const hasVerticalScroll = (
                    el.scrollHeight > el.clientHeight &&
                    (computedStyle.overflowY === 'auto' ||
                        computedStyle.overflowY === 'scroll' ||
                        computedStyle.overflow === 'auto' ||
                        computedStyle.overflow === 'scroll')
                );

                if (hasVerticalScroll && !this.scrollableElements.has(el)) {
                    this.scrollableElements.add(el);
                    this._addScrollListener(el);
                }
            });
        }

        // 新增：为可滚动元素添加滚动监听
        _addScrollListener(element) {
            element.addEventListener('scroll', () => {
                const progress = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
                progressBar.update(progress);
            }, { passive: true });
        }
    }

    // 实例化进度条和滚动按钮
    const progressBar = new ProgressBar();
    const scrollButtons = new ScrollButtons();

    // 更新页面尺寸
    const updatePageDimensions = () => {
        const newClientHeight = docEl.clientHeight;
        const newPageHeight = Math.max(
            body.scrollHeight, docEl.scrollHeight,
            body.offsetHeight, docEl.offsetHeight,
            body.clientHeight, docEl.clientHeight
        );

        if (newPageHeight !== pageHeight || newClientHeight !== clientHeight) {
            clientHeight = newClientHeight;
            pageHeight = newPageHeight;
            maxScroll = pageHeight - clientHeight;
            return true;
        }
        return false;
    };

    // 滚动事件处理函数，使用节流
    const scrollHandler = throttle(() => {
        requestAnimationFrame(updateUI);
    }, 16);

    // 窗口大小改变事件处理函数，使用防抖
    const resizeHandler = debounce(() => {
        if (updatePageDimensions()) updateUI();
    }, 100);

    // 添加事件监听器
    const addListeners = () => {
        window.addEventListener('scroll', scrollHandler, { passive: true });
        window.addEventListener('resize', resizeHandler, { passive: true });
    };

    // 更新UI，包括进度条和滚动按钮
    function updateUI() {
        const scrollTop = window.scrollY;
        if (scrollTop === lastScrollTop && maxScroll === lastMaxScroll) return;

        lastScrollTop = scrollTop;
        lastMaxScroll = maxScroll;

        const progress = maxScroll ? (scrollTop / maxScroll) * 100 : 0;
        progressBar.update(progress);
        scrollButtons.update(scrollTop);
    }

    // 平滑滚动到目标位置
    function smoothScroll(target) {
        const start = window.scrollY;
        const change = target - start;
        const duration = 400;
        const increment = 16;

        const animateScroll = (startTime) => {
            const currentTime = performance.now() - startTime;
            const val = easeInOutQuad(currentTime, start, change, duration);
            window.scrollTo(0, val);
            if (currentTime < duration) requestAnimationFrame(() => animateScroll(startTime));
        };
        requestAnimationFrame((startTime) => animateScroll(startTime));
    }

    // 缓动函数
    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        return t < 1 ? c / 2 * t * t + b : -c / 2 * (--t * (t - 2) - 1) + b;
    }

    // 节流函数
    function throttle(fn, delay) {
        let lastTime = 0;
        return (...args) => {
            const now = performance.now();
            if (now - lastTime >= delay) {
                lastTime = now;
                fn(...args);
            }
        };
    }

    // 防抖函数
    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    // 初始化函数
    function init() {
        updatePageDimensions();
        updateUI();
        addListeners();
        scrollButtons._detectScrollableElements(); // 新增：初始检测可滚动元素
    }

    // 执行初始化
    init();
})();
