# Web RPG Maker 修复集合

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

本仓库收集了一系列 Tampermonkey 用户脚本，用于修复和增强 **RPG Maker MV/MZ 网页游戏** 在浏览器中运行时的各种兼容性问题。

## 📦 收录脚本

| 文件名称 | 脚本名称 | 功能描述 | 安装链接 |
|----------|----------|----------|----------|
| rpgmaker-require-fix.user.js | **RPG Maker Require Fix** | 补齐缺失的 `require` 函数，支持 Node.js 风格模块加载（`@` 映射根目录），并模拟 `fs`、`path` 等核心模块，避免插件因调用 Node.js API 而崩溃。 | [安装](https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-require-fix.user.js) |

*更多修复脚本即将添加……*

---

## 🚀 如何使用

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 点击上表中对应脚本的 **安装链接**，Tampermonkey 会自动检测并提示安装。
3. 刷新目标 RPG Maker 游戏页面，修复即生效。

---

## 🛠 贡献指南

欢迎提交 Pull Request 或 Issue，帮助完善现有脚本或添加新的修复方案。

### 添加新修复脚本的要求
- 脚本头部必须包含完整的 Tampermonkey 元数据（`@name`、`@namespace`、`@version`、`@description`、`@match`、`@run-at`、`@grant`、`@license`）。
- 提供 `@updateURL` 和 `@downloadURL` 指向本仓库的 raw 地址。
- 在 README 的“收录脚本”表格中补充条目。

---

## 📄 许可证

MIT License © 2026 sqxy090123
