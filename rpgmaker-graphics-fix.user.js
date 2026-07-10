// ==UserScript==
// @name         RPG Maker MZ Graphics Fix
// @namespace    https://github.com/sqxy090123/webrpgfix
// @version      1.0.0.1
// @description  修复 RPG Maker MZ 网页游戏中 Graphics 初始化失败的问题，确保游戏正常启动
// @author       sqxy090123
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-mz-graphics-fix.user.js
// @downloadURL  https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-mz-graphics-fix.user.js
// @icon         https://raw.githubusercontent.com/sqxy090123/webrpgfix/refs/heads/main/rpgmaker.png
// ==/UserScript==

(function() {
    // 不使用 'use strict' 以确保 this 指向全局

    // ---------- 创建或修补 Graphics 对象 ----------
    function patchGraphics() {
        // 确保 window.Graphics 存在且完整
        if (!window.Graphics) {
            window.Graphics = {
                _isInitialized: false,
                initialize: function() {
                    console.log('[Graphics Fix] 模拟 Graphics.initialize');
                    this._isInitialized = true;
                    return true;
                },
                _isReady: function() { return this._isInitialized; },
                width: 816,
                height: 624,
                _app: null,
                _renderer: null
            };
            console.log('[Graphics Fix] 创建了 Graphics 模拟对象');
        }

        // 如果 Graphics.initialize 未定义或不是我们修补的，则修补它
        if (typeof Graphics.initialize === 'function' && !Graphics._patched) {
            const original = Graphics.initialize;
            Graphics.initialize = function() {
                try {
                    console.log('[Graphics Fix] 调用原始 Graphics.initialize');
                    return original.apply(this, arguments);
                } catch (e) {
                    console.error('[Graphics Fix] Graphics.initialize 失败，使用备用', e);
                    this._isInitialized = true;
                    // 确保基本属性存在
                    this.width = this.width || 816;
                    this.height = this.height || 624;
                    // 如果 PIXI 存在，尝试创建一个 Canvas 渲染器
                    if (typeof PIXI !== 'undefined' && !this._app) {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = this.width;
                            canvas.height = this.height;
                            document.body.appendChild(canvas);
                            this._app = { view: canvas };
                            console.log('[Graphics Fix] 创建了后备 Canvas');
                        } catch (e2) {
                            console.warn('[Graphics Fix] 无法创建 Canvas', e2);
                        }
                    }
                    return true;
                }
            };
            Graphics._patched = true;
            console.log('[Graphics Fix] 已修补 Graphics.initialize');
        }

        // 全局暴露 Graphics（确保 window.Graphics 和全局 Graphics 一致）
        try {
            this.Graphics = window.Graphics;
        } catch (e) {
            try {
                window.eval('var Graphics = window.Graphics;');
            } catch (e2) {
                (new Function('return this'))().Graphics = window.Graphics;
            }
        }
    }

    // ---------- 修补 SceneManager.initGraphics ----------
    function patchSceneManager() {
        if (typeof SceneManager === 'undefined') return;

        if (typeof SceneManager.initGraphics === 'function' && !SceneManager._patched) {
            const original = SceneManager.initGraphics;
            SceneManager.initGraphics = function() {
                try {
                    console.log('[Graphics Fix] 调用原始 SceneManager.initGraphics');
                    return original.apply(this, arguments);
                } catch (e) {
                    console.error('[Graphics Fix] SceneManager.initGraphics 失败，强制恢复', e);
                    // 强制设置 Graphics 已初始化
                    if (window.Graphics) {
                        window.Graphics._isInitialized = true;
                    }
                    // 设置屏幕尺寸
                    this._screenWidth = 816;
                    this._screenHeight = 624;
                    this._boxWidth = 816;
                    this._boxHeight = 624;
                    // 如果 Graphics 没有 app，创建占位
                    if (window.Graphics && !window.Graphics._app) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 816;
                        canvas.height = 624;
                        document.body.appendChild(canvas);
                        window.Graphics._app = { view: canvas };
                    }
                    // 标记初始化完成
                    this._initialized = true;
                    return true;
                }
            };
            SceneManager._patched = true;
            console.log('[Graphics Fix] 已修补 SceneManager.initGraphics');
        }
    }

    // ---------- 主流程：尽早修补 Graphics，并轮询等待 SceneManager ----------
    // 立即修补 Graphics（即使 Graphics 未定义，我们也创建模拟对象）
    patchGraphics();

    // 轮询检测 SceneManager 是否出现
    let attempts = 0;
    const maxAttempts = 50; // 最多尝试 5 秒
    const interval = setInterval(function() {
        attempts++;
        if (typeof SceneManager !== 'undefined') {
            patchSceneManager();
            // 一旦修补完成，可以停止轮询（但为了确保，可以继续几次）
            if (SceneManager._patched) {
                clearInterval(interval);
                console.log('[Graphics Fix] SceneManager 修补完成，停止轮询');
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.log('[Graphics Fix] 未检测到 SceneManager，放弃修补');
        }
    }, 100);

    // 同时监听 DOMContentLoaded，以防 SceneManager 在之后定义
    document.addEventListener('DOMContentLoaded', function() {
        // 再次尝试修补
        patchGraphics();
        if (typeof SceneManager !== 'undefined') {
            patchSceneManager();
        }
    });

    // 在 load 事件也尝试一次（某些游戏可能更晚）
    window.addEventListener('load', function() {
        patchGraphics();
        if (typeof SceneManager !== 'undefined') {
            patchSceneManager();
        }
    });

    // 确保全局 Graphics 始终可用
    try {
        this.Graphics = window.Graphics;
    } catch (e) {
        (new Function('return this'))().Graphics = window.Graphics;
    }

    console.log('[Graphics Fix] 图形修复脚本已加载');
})();
