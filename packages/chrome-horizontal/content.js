(function () {
  // 解构赋值获取 documentElement 和 body
  const { documentElement: docEl, body } = document;

  let pageHeight = 0;
  let clientHeight = 0;
  let maxScroll = 0;

  let lastScrollTop = -1;
  let lastMaxScroll = -1;
  let lastScroller = window;

  // null 表示使用 window 作为滚动容器
  let activeScroller = null;

  /**
   * 顶部阅读进度条
   */
  class ProgressBar {
    constructor() {
      this._progress = -1;
      this.bar = this._createBar();
    }

    // 创建进度条元素
    _createBar() {
      const existing = document.getElementById("progress-bar");
      if (existing) return existing;

      const bar = document.createElement("div");
      bar.id = "progress-bar";
      document.body.insertBefore(bar, document.body.firstChild);

      return bar;
    }

    // 更新进度条进度
    update(progress) {
      if (this._progress !== progress) {
        this.bar.style.transform = `scaleX(${progress / 100})`;
        this._progress = progress;
      }
    }
  }

  /**
   * 右下角滚动按钮
   */
  class ScrollButtons {
    constructor() {
      this._visible = false;
      this.buttons = this._createButtons();

      // 拖拽相关状态：记录起点和容器位置，用于计算拖动偏移量
      this._isDragging = false;
      this._dragMoved = false;
      this._dragStartX = 0;
      this._dragStartY = 0;
      this._startLeft = 0;
      this._startTop = 0;

      // 可滚动元素集合
      this.scrollableElements = new Set();
      this._scrollHandlers = new Map();

      // MutationObserver 相关
      this._mutationRoots = new Set();
      this._handleMutations = debounce(() => {
        this._flushMutationRoots();
      }, 100);

      this._initMutationObserver();

      // 初始化拖拽能力，并优先恢复用户上次拖动后保存的位置
      this._enableDrag();
      this._restorePosition();

      window.addEventListener("load", () => {
        this._detectScrollableElements(document.body);
        updatePageDimensions();
        updateUI(true);
        this._restorePosition();
      });
    }

    // 创建滚动按钮
    _createButtons() {
      const existing = document.querySelector(".scroll-buttons");
      if (existing) return existing;

      const scrollBtns = document.createElement("div");
      scrollBtns.className = "scroll-buttons";

      // JS 兜底样式，避免 CSS 未加载时按钮不可用；拖拽依赖 fixed 定位
      Object.assign(scrollBtns.style, {
        position: "fixed",
        right: "40px",
        bottom: "40px",
        zIndex: "2147483647",
        display: "none",
        alignItems: "center",
        gap: "12px",
        userSelect: "none",
        touchAction: "none",
        cursor: "move",
      });

      ["⬆️顶部", "⬇️最新"].forEach((text, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "scroll-button";
        button.innerText = text;

        button.onclick = (event) => {
          // 拖拽结束后浏览器仍可能触发 click，这里拦截避免误滚动
          if (this._dragMoved) {
            event.preventDefault();
            event.stopPropagation();
            this._dragMoved = false;
            return;
          }

          scrollToBoundary(index === 1);
        };

        scrollBtns.appendChild(button);
      });

      document.body.appendChild(scrollBtns);

      return scrollBtns;
    }

    // 更新按钮显示状态
    update(scrollState) {
      const { scrollTop, maxScroll: activeMaxScroll } = scrollState;
      const showScrollButtons = this.scrollableElements.size > 0 || maxScroll > 0;

      if (this._visible !== showScrollButtons) {
        this.buttons.style.display = showScrollButtons ? "flex" : "none";
        this._visible = showScrollButtons;
      }

      const topButton = this.buttons.children[0];
      const bottomButton = this.buttons.children[1];

      if (!topButton || !bottomButton) return;

      // 顶部按钮：向下滚动超过一定距离后显示
      topButton.style.display = scrollTop > 100 ? "inline-flex" : "none";

      // 最新按钮：距离底部超过一定距离后显示
      bottomButton.style.display =
        activeMaxScroll - scrollTop > 100 ? "inline-flex" : "none";
    }

    /**
     * 启用拖拽：使用 Pointer Events 同时兼容鼠标、触控板和触屏
     */
    _enableDrag() {
      this.buttons.addEventListener("pointerdown", (event) => {
        // 鼠标只响应左键
        if (event.pointerType === "mouse" && event.button !== 0) return;

        this._isDragging = true;
        this._dragMoved = false;

        const rect = this.buttons.getBoundingClientRect();

        this._dragStartX = event.clientX;
        this._dragStartY = event.clientY;
        this._startLeft = rect.left;
        this._startTop = rect.top;

        // 首次拖动时从 right/bottom 切换为 left/top，后续保存和恢复更直观
        this.buttons.style.left = `${rect.left}px`;
        this.buttons.style.top = `${rect.top}px`;
        this.buttons.style.right = "auto";
        this.buttons.style.bottom = "auto";

        try {
          // 捕获指针后，拖动过程中即使光标离开按钮也能继续收到事件
          this.buttons.setPointerCapture(event.pointerId);
        } catch (error) {
          // 某些页面环境可能不支持，忽略即可
        }
      });

      this.buttons.addEventListener("pointermove", (event) => {
        if (!this._isDragging) return;

        const deltaX = event.clientX - this._dragStartX;
        const deltaY = event.clientY - this._dragStartY;

        // 小于 3px 的位移视为普通点击，避免点击按钮时被误判为拖拽
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
          this._dragMoved = true;
        }

        const nextLeft = this._startLeft + deltaX;
        const nextTop = this._startTop + deltaY;

        // 实时限制位置，保证拖动过程中按钮不会跑出可视区域
        const safePosition = this._getSafePosition(nextLeft, nextTop);

        this.buttons.style.left = `${safePosition.left}px`;
        this.buttons.style.top = `${safePosition.top}px`;
      });

      this.buttons.addEventListener("pointerup", (event) => {
        if (!this._isDragging) return;

        this._isDragging = false;

        const rect = this.buttons.getBoundingClientRect();
        // 松手时再次修正位置，最终落点以修正后的坐标为准
        const safePosition = this._getSafePosition(rect.left, rect.top);

        this.buttons.style.left = `${safePosition.left}px`;
        this.buttons.style.top = `${safePosition.top}px`;
        this.buttons.style.right = "auto";
        this.buttons.style.bottom = "auto";

        // 仅在拖拽完成后保存，减少频繁写入 chrome.storage
        this._savePosition(safePosition);

        try {
          this.buttons.releasePointerCapture(event.pointerId);
        } catch (error) {
          // pointer capture 可能已释放，忽略即可
        }

        // 避免拖拽结束后立即触发 click
        setTimeout(() => {
          this._dragMoved = false;
        }, 0);
      });

      this.buttons.addEventListener("pointercancel", () => {
        // 触控中断或页面抢占指针时清理拖拽状态
        this._isDragging = false;
      });

      // 浏览器窗口变化时，防止按钮跑出屏幕
      window.addEventListener(
        "resize",
        debounce(() => {
          const rect = this.buttons.getBoundingClientRect();
          const safePosition = this._getSafePosition(rect.left, rect.top);

          this.buttons.style.left = `${safePosition.left}px`;
          this.buttons.style.top = `${safePosition.top}px`;
          this.buttons.style.right = "auto";
          this.buttons.style.bottom = "auto";

          this._savePosition(safePosition);
        }, 100)
      );
    }

    /**
     * 限制按钮不能拖出可视区域，返回修正后的 left/top 坐标
     */
    _getSafePosition(left, top) {
      const rect = this.buttons.getBoundingClientRect();

      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;

      return {
        left: Math.min(Math.max(0, left), Math.max(0, maxLeft)),
        top: Math.min(Math.max(0, top), Math.max(0, maxTop)),
      };
    }

    /**
     * 保存按钮位置：扩展环境使用 chrome.storage，普通页面调试时回退 localStorage
     */
    _savePosition(position) {
      const data = {
        left: position.left,
        top: position.top,
      };

      // content script 正常运行在扩展环境中，优先使用跨页面可用的扩展存储
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        chrome.storage.local.set({
          scrollButtonsPosition: data,
        });
      } else {
        localStorage.setItem("scrollButtonsPosition", JSON.stringify(data));
      }
    }

    /**
     * 恢复按钮位置：读取用户上次保存的坐标，并重新应用到按钮容器
     */
    _restorePosition() {
      const applyPosition = (position) => {
        // 存储数据异常时直接忽略，避免影响按钮显示和滚动功能
        if (
          !position ||
          typeof position.left !== "number" ||
          typeof position.top !== "number"
        ) {
          return;
        }

        requestAnimationFrame(() => {
          // 等浏览器完成布局后再计算边界，避免刚插入 DOM 时宽高不准确
          const safePosition = this._getSafePosition(
            position.left,
            position.top
          );

          this.buttons.style.left = `${safePosition.left}px`;
          this.buttons.style.top = `${safePosition.top}px`;
          this.buttons.style.right = "auto";
          this.buttons.style.bottom = "auto";
        });
      };

      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        // chrome.storage.local 会在不同网页间共享该扩展的按钮位置
        chrome.storage.local.get("scrollButtonsPosition", (result) => {
          applyPosition(result.scrollButtonsPosition);
        });
      } else {
        const raw = localStorage.getItem("scrollButtonsPosition");
        if (!raw) return;

        try {
          applyPosition(JSON.parse(raw));
        } catch (error) {
          // 清理损坏的本地数据，避免后续每次恢复都重复解析失败
          localStorage.removeItem("scrollButtonsPosition");
        }
      }
    }

    /**
     * 初始化 DOM 观察器
     * 用于动态页面，比如 React/Vue 页面内容变化后重新检测滚动容器
     */
    _initMutationObserver() {
      const observer = new MutationObserver((records) => {
        records.forEach((record) => {
          if (record.type === "childList") {
            if (record.target.nodeType === Node.ELEMENT_NODE) {
              this._mutationRoots.add(record.target);
            }

            record.addedNodes.forEach((node) => {
              if (
                node.nodeType === Node.ELEMENT_NODE ||
                node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
              ) {
                this._mutationRoots.add(node);
              }
            });
          } else if (
            record.type === "attributes" &&
            record.target.nodeType === Node.ELEMENT_NODE
          ) {
            this._mutationRoots.add(record.target);
          }
        });

        if (this._mutationRoots.size > 0) {
          this._handleMutations();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    _flushMutationRoots() {
      const roots = Array.from(this._mutationRoots);
      this._mutationRoots.clear();

      roots.forEach((root) => this._detectScrollableElements(root));

      this._pruneScrollableElements();
      updatePageDimensions();
      updateUI(true);
    }

    /**
     * 检测可滚动元素
     */
    _detectScrollableElements(root = document.body) {
      if (!root) return;

      this._checkScrollableElement(root);

      if (typeof root.querySelectorAll !== "function") return;

      root.querySelectorAll("*").forEach((el) => {
        this._checkScrollableElement(el);
      });
    }

    _checkScrollableElement(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
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
      Array.from(this.scrollableElements).forEach((el) => {
        if (!el.isConnected || !isElementVerticallyScrollable(el)) {
          this._removeScrollableElement(el);
        }
      });
    }

    _removeScrollableElement(element) {
      const handler = this._scrollHandlers.get(element);

      if (handler) {
        element.removeEventListener("scroll", handler);
        this._scrollHandlers.delete(element);
      }

      this.scrollableElements.delete(element);

      if (activeScroller === element) {
        setActiveScroller(null);
      }
    }

    /**
     * 为可滚动元素添加滚动监听
     */
    _addScrollListener(element) {
      if (this._scrollHandlers.has(element)) return;

      const handler = throttle(() => {
        setActiveScroller(element);
        requestAnimationFrame(() => updateUI());
      }, 16);

      element.addEventListener("scroll", handler, { passive: true });
      this._scrollHandlers.set(element, handler);
    }
  }

  // 实例化进度条和滚动按钮
  const progressBar = new ProgressBar();
  const scrollButtons = new ScrollButtons();

  /**
   * 判断元素是否支持垂直滚动
   */
  function isElementVerticallyScrollable(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

    const computedStyle = window.getComputedStyle(el);

    return (
      el.scrollHeight > el.clientHeight &&
      (computedStyle.overflowY === "auto" ||
        computedStyle.overflowY === "scroll" ||
        computedStyle.overflow === "auto" ||
        computedStyle.overflow === "scroll")
    );
  }

  /**
   * 设置当前活跃滚动容器
   */
  function setActiveScroller(scroller) {
    if (scroller && !scroller.isConnected) {
      activeScroller = null;
      return;
    }

    activeScroller = scroller;
  }

  /**
   * 获取当前滚动状态
   */
  function getActiveScrollState() {
    let scroller = activeScroller;

    if (scroller && !scroller.isConnected) {
      activeScroller = null;
      scroller = null;
    }

    if (scroller) {
      const elementMaxScroll = Math.max(
        scroller.scrollHeight - scroller.clientHeight,
        0
      );

      if (elementMaxScroll > 0) {
        return {
          scroller,
          scrollTop: scroller.scrollTop,
          maxScroll: elementMaxScroll,
        };
      }

      activeScroller = null;
      scroller = null;
    }

    return {
      scroller: null,
      scrollTop: window.scrollY,
      maxScroll,
    };
  }

  /**
   * 更新页面尺寸
   */
  const updatePageDimensions = () => {
    const newClientHeight = docEl.clientHeight;

    const newPageHeight = Math.max(
      body.scrollHeight,
      docEl.scrollHeight,
      body.offsetHeight,
      docEl.offsetHeight,
      body.clientHeight,
      docEl.clientHeight
    );

    if (newPageHeight !== pageHeight || newClientHeight !== clientHeight) {
      clientHeight = newClientHeight;
      pageHeight = newPageHeight;
      maxScroll = Math.max(pageHeight - clientHeight, 0);
      return true;
    }

    return false;
  };

  /**
   * window 滚动事件
   */
  const scrollHandler = throttle(() => {
    setActiveScroller(null);
    requestAnimationFrame(() => updateUI());
  }, 16);

  /**
   * window resize 事件
   */
  const resizeHandler = debounce(() => {
    if (updatePageDimensions()) {
      updateUI(true);
    }
  }, 100);

  /**
   * 添加全局监听
   */
  const addListeners = () => {
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("resize", resizeHandler, { passive: true });
  };

  /**
   * 更新 UI：进度条 + 按钮状态
   */
  function updateUI(force = false) {
    const scrollState = getActiveScrollState();
    const scroller = scrollState.scroller || window;

    if (
      !force &&
      scrollState.scrollTop === lastScrollTop &&
      scrollState.maxScroll === lastMaxScroll &&
      scroller === lastScroller
    ) {
      return;
    }

    lastScrollTop = scrollState.scrollTop;
    lastMaxScroll = scrollState.maxScroll;
    lastScroller = scroller;

    const progress = scrollState.maxScroll
      ? (scrollState.scrollTop / scrollState.maxScroll) * 100
      : 0;

    progressBar.update(progress);
    scrollButtons.update(scrollState);
  }

  /**
   * 设置滚动位置
   */
  function setScrollTop(scroller, value) {
    if (scroller) {
      scroller.scrollTop = value;
      return;
    }

    window.scrollTo(0, value);
  }

  /**
   * 滚动到顶部或底部
   */
  function scrollToBoundary(toBottom) {
    const scrollState = getActiveScrollState();
    const target = toBottom ? scrollState.maxScroll : 0;

    smoothScroll(scrollState.scroller, target);
  }

  /**
   * 平滑滚动到目标位置
   */
  function smoothScroll(scroller, target) {
    const start = scroller ? scroller.scrollTop : window.scrollY;
    const change = target - start;
    const duration = 400;

    const animateScroll = (startTime) => {
      const currentTime = performance.now() - startTime;
      const val = easeInOutQuad(currentTime, start, change, duration);

      setScrollTop(scroller, val);

      if (currentTime < duration) {
        requestAnimationFrame(() => animateScroll(startTime));
      }
    };

    requestAnimationFrame((startTime) => animateScroll(startTime));
  }

  /**
   * 缓动函数
   */
  function easeInOutQuad(t, b, c, d) {
    t /= d / 2;

    return t < 1
      ? (c / 2) * t * t + b
      : (-c / 2) * (--t * (t - 2) - 1) + b;
  }

  /**
   * 节流函数
   */
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

  /**
   * 防抖函数
   */
  function debounce(fn, delay) {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * 初始化
   */
  function init() {
    updatePageDimensions();
    updateUI(true);

    addListeners();

    scrollButtons._detectScrollableElements(document.body);

    updatePageDimensions();
    updateUI(true);
  }

  init();
})();
