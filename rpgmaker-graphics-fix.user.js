// ==UserScript==
// @name         RPG Maker MZ Graphics Fix
// @namespace    https://github.com/sqxy090123/webrpgfix
// @version      1.0.0.0
// @description  修复 RPG Maker MZ 网页游戏中 Graphics 初始化失败的问题
// @author       sqxy090123
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-graphics-fix.user.js
// @downloadURL  https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-graphics-fix.user.js
// @icon         https://raw.githubusercontent.com/sqxy090123/webrpgfix/refs/heads/main/rpgmaker.png
// ==/UserScript==

(function() {
    'use strict';

    // 检测是否为 RPG Maker MZ 游戏（通过检查 MZ 特有的全局对象）
    function isRpgMakerMZ() {
        return typeof window.SceneManager !== 'undefined' &&
               typeof window.Graphics !== 'undefined' &&
               typeof window.Graphics.initialize === 'function';
    }

    // 修补 Graphics 和 SceneManager 初始化
    function fixGraphics() {
        // 1. 确保 Graphics 对象存在
        if (!window.Graphics) {
            console.warn('[Graphics Fix] Graphics 未定义，创建模拟对象');
            window.Graphics = {
                _isInitialized: false,
                initialize: function() {
                    console.log('[Graphics Fix] 模拟 Graphics.initialize');
                    this._isInitialized = true;
                    return true;
                },
                _isReady: function() { return true; },
                width: 816,
                height: 624,
                _app: null,
                _renderer: null
            };
        }

        // 2. 修补 Graphics.initialize（如果未修补）
        if (typeof Graphics.initialize === 'function' && !Graphics._fixed) {
            const originalInitialize = Graphics.initialize;
            Graphics.initialize = function() {
                try {
                    console.log('[Graphics Fix] 调用原始 Graphics.initialize');
                    return originalInitialize.apply(this, arguments);
                } catch (e) {
                    console.error('[Graphics Fix] Graphics.initialize 失败，使用备用', e);
                    // 强制标记为已初始化
                    this._isInitialized = true;
                    // 设置默认尺寸
                    this.width = this.width || 816;
                    this.height = this.height || 624;
                    // 如果 PIXI 存在，尝试创建一个 Canvas 渲染器作为后备
                    if (typeof PIXI !== 'undefined' && !this._app) {
                        try {
                            this._app = new PIXI.Application({
                                width: this.width,
                                height: this.height,
                                backgroundColor: 0x000000,
                                resolution: 1,
                                view: document.createElement('canvas') // 避免自动添加到 DOM
                            });
                            // 手动将 canvas 添加到 body
                            document.body.appendChild(this._app.view);
                            console.log('[Graphics Fix] 已创建 PIXI Canvas 后备');
                        } catch (e2) {
                            console.warn('[Graphics Fix] 无法创建 PIXI 应用', e2);
                        }
                    }
                    return true;
                }
            };
            Graphics._fixed = true;
            console.log('[Graphics Fix] 已修补 Graphics.initialize');
        }

        // 3. 修补 SceneManager.initGraphics（如果未修补）
        if (typeof SceneManager !== 'undefined' &&
            typeof SceneManager.initGraphics === 'function' &&
            !SceneManager._fixed) {
            const originalInitGraphics = SceneManager.initGraphics;
            SceneManager.initGraphics = function() {
                try {
                    console.log('[Graphics Fix] 调用原始 SceneManager.initGraphics');
                    return originalInitGraphics.apply(this, arguments);
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
                    // 如果 Graphics 没有 app，尝试创建一个空占位
                    if (window.Graphics && !window.Graphics._app) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 816;
                        canvas.height = 624;
                        document.body.appendChild(canvas);
                        window.Graphics._app = { view: canvas };
                    }
                    return true;
                }
            };
            SceneManager._fixed = true;
            console.log('[Graphics Fix] 已修补 SceneManager.initGraphics');
        }
    }

    // 尽早执行（页面脚本加载前）
    // 如果当前已经加载完毕，直接修复；否则等待 DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (isRpgMakerMZ()) {
                fixGraphics();
            }
        });
    } else {
        if (isRpgMakerMZ()) {
            fixGraphics();
        }
    }

    // 也立即尝试（可能在 DOM 加载前但全局对象已定义）
    fixGraphics();

})();
