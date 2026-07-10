// ==UserScript==
// @name         RPG Maker Require Fix
// @namespace    https://github.com/sqxy090123/webrpgfix
// @version      10.0.0.1
// @description  为 RPG Maker 网页游戏补齐 require，支持 @ 根目录，模拟 fs/path 等核心模块，并实现 fs.readFileSync 从服务器读取文件
// @author       sqxy090123
// @match        *://*/*
// @run-at       document-start
// @grant        GM_notification
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-require-fix.user.js
// @downloadURL  https://raw.githubusercontent.com/sqxy090123/webrpgfix/main/rpgmaker-require-fix.user.js
// @icon         https://raw.githubusercontent.com/sqxy090123/webrpgfix/refs/heads/main/rpgmaker.png
// ==/UserScript==

(function() {
    'use strict';

    // ---------- 工具函数：路径解析 ----------
    function resolvePath(path, addExtension) {
        // 获取当前页面的目录部分（例如 /example/）
        const baseDir = location.pathname.replace(/\/[^\/]*$/, '/'); // 保留末尾斜杠

        let url;
        if (path.startsWith('@')) {
            // @ 映射到根目录
            url = location.origin + '/' + path.slice(1);
        } else if (path.startsWith('/')) {
            // 绝对路径，相对于根
            url = location.origin + path;
        } else {
            // 相对路径，拼接到当前目录
            url = location.origin + baseDir + path;
        }

        // 如果需要补 .js 扩展名（仅当路径不含点且不以 / 结尾）
        if (addExtension && !url.includes('.') && !url.endsWith('/')) {
            url += '.js';
        }

        return url;
    }

    // ---------- 模拟 Node.js 核心模块 ----------
    function createCoreModules() {
        const fs = {
            existsSync: function(path) {
                const url = resolvePath(path, false);
                console.warn('[fs.existsSync] 模拟调用，路径: ' + path + ' -> URL: ' + url + ' → 返回 true');
                return true;
            },
            readFileSync: function(path, encoding) {
                const url = resolvePath(path, false);
                console.warn('[fs.readFileSync] 尝试读取: ' + url);
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', url, false);
                    xhr.send();
                    if (xhr.status === 200) {
                        const content = xhr.responseText;
                        if (encoding && encoding.toLowerCase() === 'utf8') {
                            return content;
                        }
                        if (typeof Buffer !== 'undefined') {
                            return Buffer.from(content, 'utf8');
                        }
                        return content;
                    } else {
                        console.warn('[fs.readFileSync] 读取失败 (' + xhr.status + '): ' + url);
                        return encoding ? '' : (typeof Buffer !== 'undefined' ? Buffer.from('') : '');
                    }
                } catch (e) {
                    console.error('[fs.readFileSync] 异常:', e);
                    return encoding ? '' : (typeof Buffer !== 'undefined' ? Buffer.from('') : '');
                }
            },
            writeFileSync: function(path, data, encoding) {
                console.warn('[fs.writeFileSync] 模拟调用，路径: ' + path + '（未实际写入）');
                return;
            },
            statSync: function(path) {
                const url = resolvePath(path, false);
                console.warn('[fs.statSync] 模拟调用，路径: ' + path + ' -> URL: ' + url + '，返回虚拟 stat 对象');
                return {
                    isFile: function() { return true; },
                    isDirectory: function() { return false; },
                    size: 0
                };
            },
            mkdirSync: function(path) {
                console.warn('[fs.mkdirSync] 模拟调用，路径: ' + path + '（未实际创建）');
                return;
            },
            readdirSync: function(path) {
                console.warn('[fs.readdirSync] 模拟调用，路径: ' + path + '，返回空数组');
                return [];
            },
            createReadStream: function() {
                console.warn('[fs.createReadStream] 模拟调用，返回空流');
                return { pipe: function() {} };
            },
            unlinkSync: function() {},
            rmdirSync: function() {},
        };

        const path = {
            join: function(...args) {
                return args.join('/').replace(/\/+/g, '/');
            },
            resolve: function(...args) {
                return args.join('/').replace(/\/+/g, '/');
            },
            dirname: function(p) {
                return p.replace(/\/[^\/]*$/, '') || '/';
            },
            basename: function(p, ext) {
                let base = p.replace(/^.*\//, '');
                if (ext && base.endsWith(ext)) base = base.slice(0, -ext.length);
                return base;
            },
            extname: function(p) {
                const match = p.match(/\.[^\.]+$/);
                return match ? match[0] : '';
            },
            relative: function(from, to) {
                return to;
            },
            normalize: function(p) {
                return p.replace(/\/+/g, '/');
            }
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
            if (moduleName in coreModules) {
                return coreModules[moduleName];
            }

            const url = resolvePath(moduleName, true);

            if (cache[url]) {
                return cache[url];
            }

            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                xhr.send();

                if (xhr.status === 200) {
                    const module = { exports: {} };
                    const exports = module.exports;
                    const code = xhr.responseText;
                    const func = new Function('module', 'exports', 'require', code);
                    func(module, exports, window.require);

                    cache[url] = module.exports;
                    return module.exports;
                } else {
                    console.warn('[RPG Maker Require] 加载模块失败 (' + xhr.status + '): ' + url);
                    return {};
                }
            } catch (e) {
                console.error('[RPG Maker Require] 加载模块异常:', e);
                return {};
            }
        };

        window.require.cache = cache;
        console.log('[RPG Maker Require] 已定义（根目录：' + location.origin + '，核心模块已模拟）');

        // 发送系统通知，告知修复成功（仅首次定义时触发）
        GM_notification({
            title: 'RPG Maker Require Fix',
            text: '✅ require 异常已修复 (版本 10.0.0.0)',
            timeout: 5000,
            onclick: function() {
                console.log('[RPG Maker Require] 通知被点击');
            }
        });
    }

    // ---------- 检测 RPG Maker 并注入 ----------
    function isRpgMakerGame() {
        return typeof window.Utils !== 'undefined' ||
               typeof window.SceneManager !== 'undefined' ||
               typeof window.$gameTemp !== 'undefined' ||
               typeof window.DataManager !== 'undefined';
    }

    if (isRpgMakerGame()) {
        defineRequire();
    } else {
        let attempts = 0;
        const maxAttempts = 30;
        const interval = setInterval(function() {
            attempts++;
            if (isRpgMakerGame()) {
                defineRequire();
                clearInterval(interval);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.log('[RPG Maker Require] 未检测到 RPG Maker 游戏，跳过定义。');
            }
        }, 100);
    }
})();
