/**
 * Import dependencies
 */
import Hoek from 'hoek';
import Path from 'path';
import SocketIO from 'socket.io';
import SupportsColor from 'supports-color';
import Url from 'url';
import Webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';


/**
 * Merge array with array or string
 */
const mergeArrayOrString = (a, b) => Array.isArray(b) ? [...a, ...b] : [...a, b];


/**
 * Find module locally or in parent package
 */
const getModulePath = (path) => {
  try {
    return require.resolve(Path.join(__dirname, '../node_modules/', path));
  }
  catch (e) {
    return path;
  }
};


/**
 * Get devServer url from config
 */
const getUrl = ({devServer}, pathname = '') =>
  Url.format({
    protocol: devServer.https ? 'https' : 'http',
    hostname: devServer.host,
    port: devServer.port,
    pathname
  });


/**
 * Normalize configuration
 */
const normalizeConfig = (config) => {

  // Normalize publicPath
  config.output.publicPath = getUrl(config, config.output.publicPath);

  if (!config.devServer.publicPath) {
    config.devServer.publicPath = config.output.publicPath;
  }
  else {
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
  }
  else if (/^[0-9]$/.test(config.devServer.contentBase)) {
    config.devServer.contentBase = parseInt(config.devServer.contentBase, 10);
  }
  else if (!/^(https?:)?\/\//.test(config.devServer.contentBase)) {
    config.devServer.contentBase = Path.resolve(config.devServer.contentBase);
  }


  // Normalize entry
  if (config.devServer.inline) {

    const client = [getModulePath('webpack-dev-server/client') + '?' + getUrl(config)];

    if (config.devServer.hot) {
      client.push(getModulePath('webpack/hot/dev-server'));
    }

    if (typeof config.entry === 'object' && !Array.isArray(config.entry)) {
      Object.keys(config.entry).forEach((key) =>
        config.entry[key] = mergeArrayOrString(client, config.entry[key])
      );
    }
    else {
      config.entry = mergeArrayOrString(client, config.entry);
    }
  }


  // Return normalized config
  return config;
};


/**
 * Default configuration
 */
const defaults = {
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
      colors: SupportsColor,
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
export default (options) => {

  // If no options, look for `webpack.config.js`
  if (typeof options === 'undefined') {
    try {
      options = require(Path.join(process.cwd(), 'webpack.config.js'));
    }
    catch (error) {
      throw new Error('Webpack configuration not found');
    }
  }


  // Normalize configuration
  const config = normalizeConfig(Hoek.applyToDefaults(defaults, options));


  // Create compiler
  const compiler = Webpack(config);


  // Get assets
  let assets = {};
  compiler.plugin('done', (stats) => {
    const {assetsByChunkName} = stats.toJson();
    assets = Object.keys(assetsByChunkName).reduce((obj, chunkName) => {
      obj[chunkName] = config.devServer.publicPath + assetsByChunkName[chunkName];
      return obj;
    }, {});
  });
  const getAssets = () => Hoek.clone(assets);


  // Create devServer
  const devServer = new WebpackDevServer(compiler, config.devServer);


  // Server is started
  devServer.listeningApp.on('listening', () => {

    // Remove Hapi listeners
    devServer.listeningApp.listeners('request').slice(1).forEach((listener) => {
      devServer.listeningApp.removeListener('request', listener);
    });

    // Start SocketIO
    devServer.io = SocketIO.listen(devServer.listeningApp, {
      'log level': 1
    });

    // Send stats
    devServer.io.sockets.on('connection', (socket) => {
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
    compiler,
    getAssets,
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
