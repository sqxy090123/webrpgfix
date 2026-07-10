// ==UserScript==
// @name         RPG Maker Require Fix
// @namespace    https://github.com/sqxy090123/webrpgfix
// @version      1.0.0.1
// @description  为 RPG Maker 网页游戏补齐 require，支持 @ 根目录，模拟 fs/path 等核心模块
// @author       sqxy090123
// @match        *://*/*
// @run-at       document-start
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-require-fix.user.js
// @downloadURL  https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-require-fix.user.js
// @icon         https://raw.githubusercontent.com/sqxy090123/webrpgfix/refs/heads/main/rpgmaker.png
// ==/UserScript==

(function() {
    // 不使用 'use strict'，确保 this 指向全局对象

    // ---------- 路径解析 ----------
    function resolvePath(path, addExtension) {
        const baseDir = location.pathname.replace(/\/[^\/]*$/, '/');
        let url;
        if (path.startsWith('@')) {
            url = location.origin + '/' + path.slice(1);
        } else if (path.startsWith('/')) {
            url = location.origin + path;
        } else {
            url = location.origin + baseDir + path;
        }
        if (addExtension && !url.includes('.') && !url.endsWith('/')) {
            url += '.js';
        }
        return url;
    }

    // ---------- 模拟 Node.js 核心模块 ----------
    function createCoreModules() {
        const fs = {
            existsSync: function(path) { return true; },
            readFileSync: function(path, encoding) {
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', resolvePath(path, false), false);
                    xhr.send();
                    if (xhr.status === 200) {
                        const content = xhr.responseText;
                        return encoding ? content : (typeof Buffer !== 'undefined' ? Buffer.from(content) : content);
                    }
                    return encoding ? '' : (typeof Buffer !== 'undefined' ? Buffer.from('') : '');
                } catch (e) {
                    return encoding ? '' : (typeof Buffer !== 'undefined' ? Buffer.from('') : '');
                }
            },
            writeFileSync: function() {},
            statSync: function() { return { isFile: true, isDirectory: false, size: 0 }; },
            mkdirSync: function() {},
            readdirSync: function() { return []; },
            createReadStream: function() { return { pipe: function() {} }; },
            unlinkSync: function() {},
            rmdirSync: function() {},
        };

        const path = {
            join: function(...args) { return args.join('/').replace(/\/+/g, '/'); },
            resolve: function(...args) { return args.join('/').replace(/\/+/g, '/'); },
            dirname: function(p) { return p.replace(/\/[^\/]*$/, '') || '/'; },
            basename: function(p, ext) {
                let base = p.replace(/^.*\//, '');
                if (ext && base.endsWith(ext)) base = base.slice(0, -ext.length);
                return base;
            },
            extname: function(p) { return (p.match(/\.[^\.]+$/) || [''])[0]; },
            relative: function(from, to) { return to; },
            normalize: function(p) { return p.replace(/\/+/g, '/'); }
        };

        const os = {
            platform: function() { return 'browser'; },
            type: function() { return 'Browser'; },
            tmpdir: function() { return '/tmp'; },
            homedir: function() { return '/home/user'; },
            cpus: function() { return []; },
            totalmem: function() { return 0; },
            freemem: function() { return 0; }
        };

        const util = {
            promisify: function(fn) { return fn; },
            inherits: function(ctor, superCtor) {
                ctor.prototype = Object.create(superCtor.prototype);
                ctor.prototype.constructor = ctor;
            },
            format: function(...args) { return args.join(' '); }
        };

        return { fs, path, os, util };
    }

    const coreModules = createCoreModules();

    // ---------- 定义 require ----------
    function defineRequire() {
        if (typeof window.require !== 'undefined') return;

        const cache = {};

        window.require = function(moduleName) {
            // 通知逻辑（第一次调用时触发，使用 GM 存储去重）
            if (typeof GM_notification !== 'undefined' && !GM_getValue('rpg_notified', false)) {
                GM_setValue('rpg_notified', true);
                GM_notification({
                    title: 'RPG Maker Require Fix',
                    text: '✅ require 异常已修复 (版本 1.0.0.5)',
                    timeout: 5000,
                    onclick: function() {
                        console.log('[RPG Maker Require] 通知被点击');
                    }
                });
            }

            if (moduleName in coreModules) {
                return coreModules[moduleName];
            }

            const url = resolvePath(moduleName, true);
            if (cache[url]) return cache[url];

            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                xhr.send();
                if (xhr.status === 200) {
                    const module = { exports: {} };
                    const code = xhr.responseText;
                    new Function('module', 'exports', 'require', code)(module, module.exports, window.require);
                    cache[url] = module.exports;
                    return module.exports;
                }
                return {};
            } catch (e) {
                return {};
            }
        };

        window.require.cache = cache;

        // ---------- 关键修复：在全局作用域创建变量 require ----------
        // 方法1：通过 this（非严格模式下 this === window）
        try {
            this.require = window.require;
        } catch (e) {
            // 方法2：使用 window.eval 强制在全局执行
            try {
                window.eval('var require = window.require;');
            } catch (e2) {
                // 方法3：使用 Function 构造器在全局执行
                try {
                    (new Function('return this'))().require = window.require;
                } catch (e3) {
                    console.error('[RPG Maker Require] 无法暴露 require:', e3);
                }
            }
        }

        console.log('[RPG Maker Require] 已定义（根目录：' + location.origin + '）');
    }

    defineRequire();
})();
