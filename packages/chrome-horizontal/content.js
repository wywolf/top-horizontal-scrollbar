(function () {
    // 解构赋值获取 documentElement 和 body
    const { documentElement: docEl, body } = document;
    let pageHeight = 0, clientHeight = 0, maxScroll = 0;
    let lastScrollTop = -1, lastMaxScroll = -1;
    let lastScroller = window;
    let activeScroller = null; // null 表示使用 window 作为滚动容器

    // 进度条类
    class ProgressBar {
        constructor() {
            this._progress = -1;
            this.bar = this._createBar();
        }

        // 创建进度条元素
        _createBar() {
            const existing = document.getElementById('progress-bar');
            if (existing) return existing;

            const bar = document.createElement('div');
            bar.id = 'progress-bar';
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
            this._scrollHandlers = new Map();
            this._mutationRoots = new Set();
            this._handleMutations = debounce(() => {
                this._flushMutationRoots();
            }, 100);
            this._initMutationObserver(); // 新增：初始化DOM观察器
            
            // 添加页面加载完成的监听
            window.addEventListener('load', () => {
                this._detectScrollableElements(document.body);
                updatePageDimensions();
                updateUI(true);
            });
        }

        // 创建滚动按钮
        _createButtons() {
            const existing = document.querySelector('.scroll-buttons');
            if (existing) return existing;

            const scrollBtns = document.createElement('div');
            scrollBtns.className = 'scroll-buttons';

            // 创建顶部和最新按钮
            ['⬆️顶部', '⬇️最新'].forEach((text, i) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'scroll-button';
                button.innerText = text;
                button.onclick = () => scrollToBoundary(i === 1);
                scrollBtns.appendChild(button);
            });

            document.body.appendChild(scrollBtns);
            return scrollBtns;
        }

        // 更新按钮的显示状态
        update(scrollState) {
            const { scrollTop, maxScroll: activeMaxScroll } = scrollState;
            const showScrollButtons = this.scrollableElements.size > 0 || maxScroll > 0;

            if (this._visible !== showScrollButtons) {
                this.buttons.style.display = showScrollButtons ? 'flex' : 'none';
                this._visible = showScrollButtons;
            }

            // 优化：更精确的按钮显示逻辑
            const topButton = this.buttons.children[0];
            const bottomButton = this.buttons.children[1];

            // 顶部按钮显示逻辑
            topButton.style.display = scrollTop > 100 ? 'inline-block' : 'none';

            // 底部按钮显示逻辑
            bottomButton.style.display = (activeMaxScroll - scrollTop > 100) ? 'inline-block' : 'none';
        }

        // 新增：初始化DOM观察器
        _initMutationObserver() {
            const observer = new MutationObserver((records) => {
                records.forEach(record => {
                    if (record.type === 'childList') {
                        if (record.target.nodeType === Node.ELEMENT_NODE) {
                            this._mutationRoots.add(record.target);
                        }
                        record.addedNodes.forEach(node => {
                            if (
                                node.nodeType === Node.ELEMENT_NODE ||
                                node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
                            ) {
                                this._mutationRoots.add(node);
                            }
                        });
                    } else if (record.type === 'attributes' && record.target.nodeType === Node.ELEMENT_NODE) {
                        this._mutationRoots.add(record.target);
                    }
                });

                if (this._mutationRoots.size > 0) {
                    // 优化：使用同一个防抖函数，确保回调真正执行
                    this._handleMutations();
                }
            });

            // 优化：增加更具体的配置
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class'] // 只监听可能影响滚动的属性
            });
        }

        _flushMutationRoots() {
            const roots = Array.from(this._mutationRoots);
            this._mutationRoots.clear();

            roots.forEach(root => this._detectScrollableElements(root));
            this._pruneScrollableElements();
            updatePageDimensions();
            updateUI(true);
        }

        // 新增：检测可滚动元素
        _detectScrollableElements(root = document.body) {
            if (!root) return;

            this._checkScrollableElement(root);

            if (typeof root.querySelectorAll !== 'function') return;
            root.querySelectorAll('*').forEach(el => this._checkScrollableElement(el));
        }

        _checkScrollableElement(el) {
            if (el.nodeType !== Node.ELEMENT_NODE) return;
            if (el === body || el === docEl) return;

            const hasVerticalScroll = isElementVerticallyScrollable(el);

            if (hasVerticalScroll && !this.scrollableElements.has(el)) {
                this.scrollableElements.add(el);
                this._addScrollListener(el);
                return;
            }

            if (!hasVerticalScroll && this.scrollableElements.has(el)) {
                this._removeScrollableElement(el);
            }
        }

        _pruneScrollableElements() {
            Array.from(this.scrollableElements).forEach(el => {
                if (!el.isConnected || !isElementVerticallyScrollable(el)) {
                    this._removeScrollableElement(el);
                }
            });
        }

        _removeScrollableElement(element) {
            const handler = this._scrollHandlers.get(element);
            if (handler) {
                element.removeEventListener('scroll', handler);
                this._scrollHandlers.delete(element);
            }
            this.scrollableElements.delete(element);
            if (activeScroller === element) setActiveScroller(null);
        }

        // 新增：为可滚动元素添加滚动监听
        _addScrollListener(element) {
            if (this._scrollHandlers.has(element)) return;

            const handler = throttle(() => {
                setActiveScroller(element);
                requestAnimationFrame(() => updateUI());
            }, 16);

            element.addEventListener('scroll', handler, { passive: true });
            this._scrollHandlers.set(element, handler);
        }
    }

    // 实例化进度条和滚动按钮
    const progressBar = new ProgressBar();
    const scrollButtons = new ScrollButtons();

    function isElementVerticallyScrollable(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

        const computedStyle = window.getComputedStyle(el);
        return el.scrollHeight > el.clientHeight &&
            (computedStyle.overflowY === 'auto' ||
                computedStyle.overflowY === 'scroll' ||
                computedStyle.overflow === 'auto' ||
                computedStyle.overflow === 'scroll');
    }

    function setActiveScroller(scroller) {
        if (scroller && !scroller.isConnected) {
            activeScroller = null;
            return;
        }
        activeScroller = scroller;
    }

    function getActiveScrollState() {
        let scroller = activeScroller;

        if (scroller && !scroller.isConnected) {
            activeScroller = null;
            scroller = null;
        }

        if (scroller) {
            const elementMaxScroll = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
            if (elementMaxScroll > 0) {
                return {
                    scroller,
                    scrollTop: scroller.scrollTop,
                    maxScroll: elementMaxScroll
                };
            }
            activeScroller = null;
            scroller = null;
        }

        return {
            scroller: null,
            scrollTop: window.scrollY,
            maxScroll
        };
    }

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
        setActiveScroller(null);
        requestAnimationFrame(() => updateUI());
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
    function updateUI(force = false) {
        const scrollState = getActiveScrollState();
        const scroller = scrollState.scroller || window;

        if (
            !force &&
            scrollState.scrollTop === lastScrollTop &&
            scrollState.maxScroll === lastMaxScroll &&
            scroller === lastScroller
        ) return;

        lastScrollTop = scrollState.scrollTop;
        lastMaxScroll = scrollState.maxScroll;
        lastScroller = scroller;

        const progress = scrollState.maxScroll ? (scrollState.scrollTop / scrollState.maxScroll) * 100 : 0;
        progressBar.update(progress);
        scrollButtons.update(scrollState);
    }

    function setScrollTop(scroller, value) {
        if (scroller) {
            scroller.scrollTop = value;
            return;
        }
        window.scrollTo(0, value);
    }

    function scrollToBoundary(toBottom) {
        const scrollState = getActiveScrollState();
        const target = toBottom ? scrollState.maxScroll : 0;
        smoothScroll(scrollState.scroller, target);
    }

    // 平滑滚动到目标位置
    function smoothScroll(scroller, target) {
        const start = scroller ? scroller.scrollTop : window.scrollY;
        const change = target - start;
        const duration = 400;

        const animateScroll = (startTime) => {
            const currentTime = performance.now() - startTime;
            const val = easeInOutQuad(currentTime, start, change, duration);
            setScrollTop(scroller, val);
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
        updateUI(true);
        addListeners();
        scrollButtons._detectScrollableElements(document.body); // 新增：初始检测可滚动元素
        updateUI(true);
    }

    // 执行初始化
    init();
})();
