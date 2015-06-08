/**
 * Import dependencies
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

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
 * Merge array with array or string
 */
var mergeArrayOrString = function mergeArrayOrString(a, b) {
  return Array.isArray(b) ? [].concat(_toConsumableArray(a), _toConsumableArray(b)) : [].concat(_toConsumableArray(a), [b]);
};

/**
 * Get devServer url from config
 */
var getUrl = function getUrl(_ref) {
  var devServer = _ref.devServer;
  var pathname = arguments[1] === undefined ? '' : arguments[1];
  return _url2['default'].format({
    protocol: devServer.https ? 'https' : 'http',
    hostname: devServer.host,
    port: devServer.port,
    pathname: pathname
  });
};

/**
 * Normalize configuration
 */
var normalizeConfig = function normalizeConfig(config) {

  // Normalize publicPath
  config.output.publicPath = getUrl(config, config.output.publicPath);

  if (!config.devServer.publicPath) {
    config.devServer.publicPath = config.output.publicPath;
  } else {
    config.devServer.publicPath = getUrl(config, config.devServer.publicPath);
  }

  // Normalize filename
  if (!config.devServer.filename) {
    config.devServer.filename = config.output.filename;
  }
  config.output.path = '/';

  // Normalize contenBase
  if (typeof config.devServer.contentBase === 'object') {
    throw new Error('Using contentBase as a proxy is deprecated. Use the proxy option instead');
  } else if (/^[0-9]$/.test(config.devServer.contentBase)) {
    config.devServer.contentBase = parseInt(config.devServer.contentBase, 10);
  } else if (!/^(https?:)?\/\//.test(config.devServer.contentBase)) {
    config.devServer.contentBase = _path2['default'].resolve(config.devServer.contentBase);
  }

  // Normalize entry
  if (config.devServer.inline) {
    (function () {
      var client = ['webpack-dev-server/client?' + getUrl(config)];

      if (config.devServer.hot) {
        client.push('webpack/hot/dev-server');
      }

      if (typeof config.entry === 'object' && !Array.isArray(config.entry)) {
        Object.keys(config.entry).forEach(function (key) {
          return config.entry[key] = mergeArrayOrString(client, config.entry[key]);
        });
      } else {
        config.entry = mergeArrayOrString(client, config.entry);
      }
    })();
  }

  // Return normalized config
  return config;
};

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
 * Export WebpackConnection constructor
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

  // Normalize configuration
  var config = normalizeConfig(_hoek2['default'].applyToDefaults(defaults, options));

  // Create compiler
  var compiler = (0, _webpack2['default'])(config);

  // Get assets
  var assets = {};
  compiler.plugin('done', function (stats) {
    var _stats$toJson = stats.toJson();

    var assetsByChunkName = _stats$toJson.assetsByChunkName;

    assets = Object.keys(assetsByChunkName).reduce(function (obj, chunkName) {
      obj[chunkName] = config.devServer.publicPath + assetsByChunkName[chunkName];
      return obj;
    }, {});
  });
  var getAssets = function getAssets() {
    return _hoek2['default'].clone(assets);
  };

  // Create devServer
  var devServer = new _webpackDevServer2['default'](compiler, config.devServer);

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

    // Send stats
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

  // Return object
  return {
    compiler: compiler,
    getAssets: getAssets,
    connection: {
      host: config.devServer.host,
      port: config.devServer.port,
      tls: config.devServer.https,
      listener: devServer.listeningApp,
      labels: ['webpack'],
      app: {
        webpack: config
      }
    }
  };
};

module.exports = exports['default'];