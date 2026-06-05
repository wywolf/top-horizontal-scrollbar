<div align="center">
  <h1>Page Progress Bar</h1>
  <p>一个用于网页阅读进度展示的轻量级项目集合，包含横向 Chrome 扩展、环形 Chrome 扩展和 Tampermonkey 脚本三种实现。</p>

  <p>
    <a href="https://github.com/wywolf/top-horizontal-scrollbar/stargazers"><img src="https://img.shields.io/github/stars/wywolf/top-horizontal-scrollbar" alt="Stars Badge"/></a>
    <a href="https://github.com/wywolf/top-horizontal-scrollbar/blob/main/LICENSE"><img src="https://img.shields.io/github/license/wywolf/top-horizontal-scrollbar" alt="License Badge"/></a>
  </p>
</div>

## 项目简介

这个仓库提供了 3 个可直接使用的网页阅读进度方案：

- `packages/chrome-horizontal`：顶部横向阅读进度条 + 右下角“顶部 / 最新”快捷按钮的 Chrome 扩展。
- `packages/chrome-circle`：页面角落悬浮环形百分比进度条的 Chrome 扩展。
- `packages/tampermonkey`：无需打包、可直接粘贴到 Tampermonkey 的简化脚本版本。

整体实现均基于原生 JavaScript 和 CSS，没有额外构建步骤。

## 功能概览

### Chrome 横向扩展

`packages/chrome-horizontal` 是当前功能最完整的版本，主要能力包括：

- 顶部固定阅读进度条，随滚动实时更新。
- 右下角快捷按钮，根据当前位置自动显示“顶部”或“最新”。
- 按钮组支持拖拽，并会保存上次位置。
- 自动约束按钮位置，避免拖出可视区域。
- 支持内部滚动容器检测，适配部分单页应用和内容区域滚动页面。
- 通过 `MutationObserver` 监听页面变化，动态内容更新后自动重新检测滚动区域。
- 兼容减少动画偏好，移动端会自动缩小按钮尺寸。

### Chrome 环形扩展

`packages/chrome-circle` 提供更轻量的环形阅读进度展示：

- 页面角落悬浮环形进度指示器。
- 中心显示当前阅读百分比。
- 进度随页面滚动实时更新。

### Tampermonkey 脚本

`packages/tampermonkey/Script.js` 提供一个更直接的油猴版本：

- 顶部横向进度条。
- “顶部 / 最新”快捷按钮。
- 平滑滚动动画。
- 节流和防抖处理，减少滚动时的更新开销。

## 目录结构

```text
.
├── LICENSE
├── README.md
└── packages
    ├── chrome-circle
    │   ├── assets
    │   ├── content.js
    │   ├── manifest.json
    │   └── progress.css
    ├── chrome-horizontal
    │   ├── README.md
    │   ├── assets
    │   ├── content.js
    │   ├── manifest.json
    │   └── progress.css
    └── tampermonkey
        └── Script.js
```

## 安装方式

### 1. 加载 Chrome 扩展

横向版和环形版都可以通过 Chrome 开发者模式直接加载：

1. 打开 `chrome://extensions/`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择以下任一目录：
   - `packages/chrome-horizontal`
   - `packages/chrome-circle`
5. 打开任意网页后滚动页面，即可看到对应效果。

修改扩展代码后，需要在扩展管理页点击刷新，并重新刷新目标网页。

### 2. 安装 Tampermonkey 脚本

1. 先在浏览器中安装 Tampermonkey。
2. 打开 [packages/tampermonkey/Script.js](/Users/wxy/code/ChromePlugin/progressBar/packages/tampermonkey/Script.js)。
3. 复制脚本内容并粘贴到 Tampermonkey 新建脚本页。
4. 保存后刷新目标网页。

## 主要文件说明

- `packages/chrome-horizontal/content.js`：横向扩展核心逻辑，负责进度计算、滚动按钮、拖拽、位置恢复和滚动容器检测。
- `packages/chrome-horizontal/progress.css`：横向扩展的进度条与按钮样式。
- `packages/chrome-horizontal/manifest.json`：横向扩展的 Manifest V3 配置。
- `packages/chrome-circle/content.js`：环形扩展逻辑，负责百分比与环形旋转更新。
- `packages/chrome-circle/progress.css`：环形扩展样式。
- `packages/tampermonkey/Script.js`：油猴脚本实现。

## 开发说明

这个仓库目前不需要构建工具。直接修改对应包下的 `content.js`、`progress.css` 或 `manifest.json` 即可。

如果你主要维护横向扩展，建议优先阅读：

- [packages/chrome-horizontal/README.md](/Users/wxy/code/ChromePlugin/progressBar/packages/chrome-horizontal/README.md)
- [packages/chrome-horizontal/content.js](/Users/wxy/code/ChromePlugin/progressBar/packages/chrome-horizontal/content.js)

## 许可

项目基于 [MIT License](./LICENSE) 开源。
