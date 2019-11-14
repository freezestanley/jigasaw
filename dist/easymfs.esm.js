/*!
 * easymfs.js v1.0.0
 * (c) 2019-2019 ZA-FE
 * Released under the MIT License.
 */
import _regeneratorRuntime from "@babel/runtime/regenerator";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _typeof from "@babel/runtime/helpers/typeof";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _possibleConstructorReturn from "@babel/runtime/helpers/possibleConstructorReturn";
import _getPrototypeOf from "@babel/runtime/helpers/getPrototypeOf";
import _inherits from "@babel/runtime/helpers/inherits";
import { importEntry } from "html-entry";
import EventEmitter from "eventemitter2";

var PREFIX = "[easy-mfs]:";
var logger = {};
["log", "info", "error"].forEach(function(item) {
  logger[item] = function() {
    console[item].apply(console, getArgs(arguments));
    return this;
  };
});

function getArgs(args) {
  var ret = Array.prototype.slice.call(args);
  var date = new Date();
  ret.unshift(
    ""
      .concat(date.getHours(), ":")
      .concat(date.getMinutes(), ":")
      .concat(date.getSeconds(), ".")
      .concat(date.getMilliseconds())
  );
  ret.unshift(PREFIX);
  return ret;
}

/**
 * 一个应用既一个Fragment， 包含了应用所有的生命周期
 * @class Fragment
 */
var Fragment =
  /*#__PURE__*/
  (function() {
    function Fragment(app, parent) {
      var _this = this;

      _classCallCheck(this, Fragment);

      this.app = app;
      this.parent = parent;
      this.mounted = false;
      this.style = [];

      if (app.styles) {
        app.styles.map(function(ele) {
          _this._addStyle(ele);
        });
      }
    }

    _createClass(Fragment, [
      {
        key: "bootstrap",
        value: function bootstrap() {
          this.app.module.default.bootstrap(this);
        }
      },
      {
        key: "unmount",
        value: function unmount() {
          if (this.mounted) {
            this.app.module.default.unmount(this.app.contain);
            this.mounted = false;
          }
        }
      },
      {
        key: "mount",
        value: function mount() {
          if (!this.mounted) {
            this.app.module.default.mount(
              this.app.contain,
              this.app.baseUrl,
              this.app,
              this
            );
            this.mounted = true;
          }
        }
      },
      {
        key: "destroy",
        value: function destroy() {
          // unmount的时候不能释放资源，因为还有可能mount
          // 所以增加 destroy 方法，彻底释放不会再次mount的应用
          this.unmount();
          this.app.free();
          this.style.map(function(e) {
            e.parentNode && e.parentNode.removeChild(e);
          });
        }
      },
      {
        key: "_addStyle",
        value: function _addStyle(txt) {
          var link = document.createElement("style");
          link.innerHTML = txt;
          var result = this.style.find(function(e) {
            return e.innerHTML === txt;
          });

          if (!result) {
            var heads = document.getElementsByTagName("head");

            if (heads.length) {
              heads[0].appendChild(link);
            } else {
              document.documentElement.appendChild(link);
            }

            this.style.push(link);
          }
        }
      }
    ]);

    return Fragment;
  })();

// 当pushstate的时候主动触发popstate， 因为其他应用依赖popstate触发显示
function hijackHistory() {
  if (!window.history.__EASY_MFS_DECORATED) {
    var dispatchPopStateEvent = function dispatchPopStateEvent(state) {
      var evt = null;

      try {
        evt = new PopStateEvent("popstate", {
          state: state
        });
      } catch (err) {
        evt = document.createEvent("PopStateEvent");
        evt.initPopStateEvent("popstate", false, false, state);
      }

      window.dispatchEvent(evt);
    };

    window.history.__EASY_MFS_DECORATED = true;
    var originalPushState = window.history.pushState;

    window.history.pushState = function(state) {
      var result = originalPushState.apply(this, arguments);
      dispatchPopStateEvent(state);
      return result;
    };

    var originalReplaceState = window.history.replaceState;

    window.history.replaceState = function(state) {
      var result = originalReplaceState.apply(this, arguments);
      dispatchPopStateEvent(state);
      return result;
    };
  }
}

function hijackers() {
  hijackHistory();
  var listeners = [],
    timeouts = [],
    intervals = [];
  return {
    addEventListener: function addEventListener() {
      window.addEventListener.apply(window, arguments);
      var args = Array.prototype.slice.call(arguments);
      listeners.push(args);
    },
    setTimeout: (function(_setTimeout) {
      function setTimeout() {
        return _setTimeout.apply(this, arguments);
      }

      setTimeout.toString = function() {
        return _setTimeout.toString();
      };

      return setTimeout;
    })(function() {
      timeouts.push(setTimeout.apply(null, arguments));
    }),
    setInterval: (function(_setInterval) {
      function setInterval() {
        return _setInterval.apply(this, arguments);
      }

      setInterval.toString = function() {
        return _setInterval.toString();
      };

      return setInterval;
    })(function() {
      intervals.push(setInterval.apply(null, arguments));
    }),
    __easy_mfs_free: function __easy_mfs_free() {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      listeners.forEach(function(args) {
        return window.removeEventListener.apply(window, args);
      });
    }
  };
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly)
      symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(source, true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(source).forEach(function(key) {
        Object.defineProperty(
          target,
          key,
          Object.getOwnPropertyDescriptor(source, key)
        );
      });
    }
  }
  return target;
}
function getSandbox() {
  var proxyWindow = new Proxy(_objectSpread({}, hijackers()), {
    get: function get(target, name) {
      if (name === "undefined") return window.undefined;

      if (isConstructable(window[name])) {
        return window[name];
      }

      if (name in target) {
        return target[name];
      } else if (name in window) {
        var val = window[name];

        if (typeof val === "function") {
          target[name] = val.bind(window);
        } else {
          target[name] = window[name];
        }
      }

      return target[name];
    },
    set: function set(target, name, property) {
      target[name] = property;

      if (/^webpackJsonp/.test(name)) {
        window[name] = target[name];
      }

      return true;
    }
  });

  function isConstructable(fn) {
    if (typeof fn !== "function") return false;
    var constructableFunctionRegex = /^function\b\s[A-Z].*/;
    var classRegex = /^class\b/;
    return (
      (fn.prototype &&
        Object.getOwnPropertyNames(fn.prototype).filter(function(k) {
          return k !== "constructor";
        }).length) ||
      constructableFunctionRegex.test(fn.toString()) ||
      classRegex.test(fn.toString())
    );
  }

  return proxyWindow;
}

function ownKeys$1(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly)
      symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function _objectSpread$1(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys$1(source, true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys$1(source).forEach(function(key) {
        Object.defineProperty(
          target,
          key,
          Object.getOwnPropertyDescriptor(source, key)
        );
      });
    }
  }
  return target;
}

var globalEvent =
  window.__EASY_MFS_GLOBAL_EVENT ||
  (window.__EASY_MFS_GLOBAL_EVENT = new EventEmitter({
    wildcard: true,
    delimiter: ".",
    newListener: false,
    maxListeners: Number.MAX_VALUE,
    verboseMemoryLeak: false
  })); // 注册并管理各应用

var EasyMfs =
  /*#__PURE__*/
  (function(_EventEmitter) {
    _inherits(EasyMfs, _EventEmitter);

    function EasyMfs(appinfo) {
      var _this;

      _classCallCheck(this, EasyMfs);

      _this = _possibleConstructorReturn(
        this,
        _getPrototypeOf(EasyMfs).call(this)
      );
      _this._baseUrl = appinfo.baseUrl || ""; // 主应用的基本url

      _this._listenEvents();

      _this.sonApplication = [];
      _this.config = appinfo;
      _this.name = appinfo.name || "";
      _this.routerMode = appinfo.routerMode || "history";
      _this.parent = "";
      return _this;
    }

    _createClass(EasyMfs, [
      {
        key: "findApp",
        value: function findApp(name) {
          return this.sonApplication.find(function(app) {
            return name === app.name;
          });
        }
      },
      {
        key: "unregisterApps",
        value: function unregisterApps(name) {
          var index = this.sonApplication.findIndex(function(app) {
            return name === app.name;
          });

          if (index !== -1) {
            this.sonApplication[index].destroy();
            this.sonApplication.splice(index, 1);
          }
        }
      },
      {
        key: "registerApps",
        value: function registerApps(applist) {
          if (applist instanceof Array) {
            applist.forEach(this.registerApp.bind(this));
          } else if (_typeof(applist) === "object") {
            this.registerApp(applist);
          } else {
            logger.error(
              "registerApps: object or array is wanted but get " +
                _typeof(applist)
            );
          }
        }
      },
      {
        key: "registerApp",
        value: (function() {
          var _registerApp = _asyncToGenerator(
            /*#__PURE__*/
            _regeneratorRuntime.mark(function _callee(app) {
              var _this2 = this;

              var oldApp,
                dll,
                template,
                execScripts,
                getExternalScripts,
                getExternalStyleSheets,
                result,
                _result,
                sandbox;

              return _regeneratorRuntime.wrap(
                function _callee$(_context) {
                  while (1) {
                    switch ((_context.prev = _context.next)) {
                      case 0:
                        // in order to not modify the origin data by incident;
                        app = _objectSpread$1({}, app, {
                          originBaseUrl: app.baseUrl
                        });
                        app.routerMode = app.routerMode || "history";

                        if (
                          !(
                            !this._checkAppBaseUrl(app) ||
                            !this._validateParams(app)
                          )
                        ) {
                          _context.next = 4;
                          break;
                        }

                        return _context.abrupt("return");

                      case 4:
                        // handle duplicate registration
                        oldApp = this.findApp(app.name);

                        if (!oldApp) {
                          _context.next = 11;
                          break;
                        }

                        oldApp.mounted = false;
                        oldApp.contain = app.contain;
                        oldApp.baseUrl = this._getAppBaseUrl(app);

                        if (oldApp.app.canActive(oldApp.baseUrl)) {
                          oldApp.mount();
                        }

                        return _context.abrupt("return");

                      case 11:
                        if (typeof app.canActive !== "function") {
                          if (app.routerMode === "hash") {
                            app.canActive = function(path) {
                              window.location.hash
                                .replace(/^#/, "")
                                .startsWith(path);
                            };
                          } else {
                            app.canActive = function(path) {
                              return window.location.pathname.startsWith(path);
                            };
                          }
                        }

                        dll = window.__easy_mfs_dlls =
                          window.__easy_mfs_dlls || {};

                        if (!dll[app.entry]) {
                          _context.next = 21;
                          break;
                        }

                        result = dll[app.entry];
                        template = result.template;
                        execScripts = result.execScripts;
                        getExternalScripts = result.getExternalScripts;
                        getExternalStyleSheets = result.getExternalStyleSheets;
                        _context.next = 29;
                        break;

                      case 21:
                        _context.next = 23;
                        return importEntry(app.entry);

                      case 23:
                        _result = _context.sent;
                        template = _result.template;
                        execScripts = _result.execScripts;
                        getExternalScripts = _result.getExternalScripts;
                        getExternalStyleSheets = _result.getExternalStyleSheets;
                        dll[app.entry] = _result;

                      case 29:
                        sandbox = getSandbox();
                        Promise.all([
                          execScripts(sandbox),
                          getExternalScripts(sandbox),
                          getExternalStyleSheets()
                        ]).then(function(values) {
                          var script = values[0];
                          var extScript = values[1];
                          var styles = values[2];
                          app.template = template;
                          app.styles = styles;
                          var _module = sandbox[app.applicationName];

                          if (_module && _module.__esModule) {
                            app.module = sandbox[app.applicationName];
                            app.sandbox = sandbox;
                            app.free = sandbox.__easy_mfs_free;

                            var baseurl = _this2._getAppBaseUrl(app);

                            app.baseUrl = baseurl.replace(/\/+/, "/");
                            var sonApplication = new Fragment(app, _this2);
                            sonApplication.bootstrap(); // delete window[app.name]
                            // window[app.name] = null

                            if (
                              app.canActive(
                                app.baseUrl,
                                app.originBaseUrl,
                                _this2.baseUrl
                              )
                            ) {
                              sonApplication.mount();
                            }

                            _this2.sonApplication.push(sonApplication);
                          } else {
                            logger.error(
                              "child application ".concat(
                                app.applicationName,
                                " not found"
                              )
                            );
                          }
                        });

                      case 31:
                      case "end":
                        return _context.stop();
                    }
                  }
                },
                _callee,
                this
              );
            })
          );

          function registerApp(_x) {
            return _registerApp.apply(this, arguments);
          }

          return registerApp;
        })()
      },
      {
        key: "unregisterAllApps",
        value: function unregisterAllApps() {
          this.sonApplication.forEach(function(item) {
            item.destroy();
          });
          this.sonApplication = [];
        }
      },
      {
        key: "_validateParams",
        value: function _validateParams(app) {
          var emptyFields = [];
          ["name", "applicationName", "entry", "contain", "baseUrl"].forEach(
            function(field) {
              if (!app[field]) {
                emptyFields.push(field);
              }
            }
          );

          if (emptyFields.length) {
            logger.error(
              "'"
                .concat(emptyFields.join(","), "' is required for '")
                .concat(app.name || app.applicationName || app.entry, "'.")
            );
          }

          return emptyFields.length == 0;
        }
      },
      {
        key: "_checkAppBaseUrl",
        value: function _checkAppBaseUrl(app) {
          if (this.routerMode === "hash") {
            if (app.routerMode === "history") {
              logger.error(
                "".concat(
                  app.name,
                  " can NOT be 'history' mode when the master application is in 'hash' mode. ignored\uFF01"
                )
              );
              return false;
            }
          }

          return true;
        }
      },
      {
        key: "_getAppBaseUrl",
        value: function _getAppBaseUrl(app) {
          var baseUrl = app.baseUrl || "";

          if (this.routerMode === "history" && app.routerMode === "hash") {
            // restart the url chain
            return baseUrl;
          }

          return this.baseUrl + baseUrl;
        }
      },
      {
        key: "_handleLocationChange",
        value: function _handleLocationChange() {
          this.sonApplication.forEach(function(item) {
            if (item.app.canActive(item.app.baseUrl)) {
              item.mount();
            } else {
              item.unmount();
            }
          });
        }
      },
      {
        key: "_listenEvents",
        value: function _listenEvents() {
          window.addEventListener(
            "popstate",
            this._handleLocationChange.bind(this)
          );
          window.addEventListener(
            "hashchange",
            this._handleLocationChange.bind(this)
          );
        }
      },
      {
        key: "fullUrl",
        get: function get() {
          return (this.parent.fullUrl || "") + this._baseUrl;
        }
      },
      {
        key: "baseUrl",
        get: function get() {
          return this._baseUrl;
        },
        set: function set(val) {
          this._baseUrl = val;
        }
      }
    ]);

    return EasyMfs;
  })(EventEmitter);

export default EasyMfs;
export { globalEvent };
