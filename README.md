<div align="center">
  <h1>Page Progress Bar</h1>
  <p>一款轻量级、美观的网页滚动阅读进度条插件，支持横向顶部进度条与右下角环形进度条。</p>

  <p>
    <a href="https://github.com/wywolf/top-horizontal-scrollbar/stargazers"><img src="https://img.shields.io/github/stars/wywolf/top-horizontal-scrollbar" alt="Stars Badge"/></a>
    <a href="https://github.com/wywolf/top-horizontal-scrollbar/blob/main/LICENSE"><img src="https://img.shields.io/github/license/wywolf/top-horizontal-scrollbar" alt="License Badge"/></a>
  </p>
</div>

## 🌟 简介 (Introduction)

**Page Progress Bar** 帮助用户在浏览长文章、长网页时，直观地掌握当前的阅读进度。它提供了两种形态：

- 🟢 **ScrollProgressBar**：附着在浏览器顶部的横向色彩进度条。
- 🔵 **CircleScrollBar**：悬浮在页面右下角的环形百分比进度条。

同时提供 **Chrome 扩展程序 (Extension)** 和 **油猴脚本 (Tampermonkey)** 双版本支持。

## ✨ 特性 (Features)

- 🚀 **极轻量**：原生 JavaScript 编写，无第三方依赖，不会拖慢网页加载速度。
- 🎨 **平滑动画**：滚动过程中的过度动画纵享丝滑。
- 🧩 **多形态支持**：根据喜好选择顶部线形或悬浮圆形。
- 🛠️ **多环境适配**：支持作为 Chrome 插件独立安装，或作为 Tampermonkey 脚本运行。

## 📦 安装指南 (Installation)

### 选项 A：Chrome 扩展程序 (开发者模式)

1. 克隆或下载本仓库代码到本地。
2. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/` 回车。
3. 在右上角开启 **开发者模式**。
4. 点击 **加载已解压的扩展程序**。
5. 选择下载的 `ScrollProgressBar/chrome/` 或 `CircleScrollBar/` 文件夹即可。

### 选项 B：油猴脚本 (Tampermonkey)

_(需要先在浏览器安装 Tampermonkey 插件)_

1. 打开 `ScrollProgressBar/tampermonkey/` 目录中的 `.user.js` 文件。
2. 复制全部代码。
3. 在 Tampermonkey 控制面板点击**添加新脚本**。
4. 粘贴代码并保存完成安装。

## 🔨 开发与构建 (Development)

本项目使用原生前端技术栈。你可以直接修改 `content.js` 或 `progress.css` 并在 Chrome 扩展页面点击刷新按钮实时预览效果。

## 📄 许可协议 (License)

本项目基于 [MIT License](./LICENSE) 协议开源。欢迎提交 Issue 和 Pull Request！
