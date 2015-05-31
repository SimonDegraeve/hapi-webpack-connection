/**
 * Import dependencies
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var _hoek = require('hoek');

var _hoek2 = _interopRequireDefault(_hoek);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _socketIo = require('socket.io');

var _socketIo2 = _interopRequireDefault(_socketIo);

var _supportsColor = require('supports-color');

var _supportsColor2 = _interopRequireDefault(_supportsColor);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _webpackDevServer = require('webpack-dev-server');

var _webpackDevServer2 = _interopRequireDefault(_webpackDevServer);

/**
 * Default configuration
 */
var defaults = {
  devServer: {
    contentBase: process.cwd(),
    filename: null, // Get from compiler configuration
    historyApiFallback: false,
    host: 'localhost',
    port: 0, // 0 = Randomly selected
    hot: false,
    https: false,
    inline: false,
    lazy: false,
    noInfo: false,
    outputPath: '/',
    publicPath: null, // Get from compiler configuration
    proxy: {},
    quiet: false,
    stats: {
      cached: false,
      cachedAssets: false,
      colors: _supportsColor2['default'],
      context: process.cwd()
    }
  },
  output: {
    filename: 'bundle.js',
    path: process.cwd(),
    publicPath: '/'
  }
};

/**
 * Export Hapi connection constructor
 */

exports['default'] = function (options) {

  // If no options, look for `webpack.config.js`
  if (typeof options === 'undefined') {
    try {
      options = require(_path2['default'].join(process.cwd(), 'webpack.config.js'));
    } catch (error) {
      throw new Error('Webpack configuration not found');
    }
  }

  // Merge defaults and options

  var _Hoek$applyToDefaults = _hoek2['default'].applyToDefaults(defaults, options);

  var serverConfig = _Hoek$applyToDefaults.devServer;

  var compilerConfig = _objectWithoutProperties(_Hoek$applyToDefaults, ['devServer']);

  // Normalize publicPath
  if (!serverConfig.publicPath) {
    serverConfig.publicPath = compilerConfig.output.publicPath;
    if (!/^(https?:)?\/\//.test(serverConfig.publicPath) && serverConfig.publicPath[0] !== '/') {
      serverConfig.publicPath = '/' + serverConfig.publicPath;
    }
  }

  // Normalize filename
  if (!serverConfig.filename) {
    serverConfig.filename = compilerConfig.output.filename;
  }
  compilerConfig.output.path = '/';

  // Normalize contentBase (port or full URL)
  if (typeof serverConfig.contentBase === 'object') {
    throw new Error('Using contentBase as a proxy is deprecated. Use the proxy option instead');
  }
  if (/^[0-9]$/.test(serverConfig.contentBase)) {
    serverConfig.contentBase = parseInt(serverConfig.contentBase, 10);
  } else if (!/^(https?:)?\/\//.test(serverConfig.contentBase)) {
    serverConfig.contentBase = _path2['default'].resolve(serverConfig.contentBase);
  }

  // Handle inline client
  var serverUrl = _url2['default'].format({
    protocol: serverConfig.https ? 'https' : 'http',
    hostname: serverConfig.host,
    port: serverConfig.port
  });

  if (serverConfig.inline) {
    (function () {
      var client = ['webpack-dev-server/client?' + serverUrl];

      if (serverConfig.hot) {
        client.push('webpack/hot/dev-server');
      }

      if (typeof compilerConfig.entry === 'object' && !Array.isArray(compilerConfig.entry)) {
        Object.keys(compilerConfig.entry).forEach(function (key) {
          return compilerConfig.entry[key] = [].concat(client, [compilerConfig.entry[key]]);
        });
      } else {
        compilerConfig.entry = [].concat(client, [compilerConfig.entry]);
      }
    })();
  }

  // Create devServer
  var devServer = new _webpackDevServer2['default']((0, _webpack2['default'])(compilerConfig), serverConfig);

  // Server is started
  devServer.listeningApp.on('listening', function () {

    // Remove Hapi listeners
    devServer.listeningApp.listeners('request').slice(1).forEach(function (listener) {
      devServer.listeningApp.removeListener('request', listener);
    });

    // Start SocketIO
    devServer.io = _socketIo2['default'].listen(devServer.listeningApp, {
      'log level': 1
    });

    devServer.io.sockets.on('connection', function (socket) {
      if (devServer.hot) {
        socket.emit('hot');
      }
      if (!devServer._stats) {
        return;
      }
      devServer._sendStats(socket, devServer._stats.toJson(), true);
    });
  });

  // Return Hapi connection object
  return {
    app: _extends({
      devServer: serverConfig }, compilerConfig),
    host: serverConfig.host,
    port: serverConfig.port,
    labels: ['webpack'],
    listener: devServer.listeningApp,
    tls: serverConfig.https
  };
};

module.exports = exports['default'];