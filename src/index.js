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
 * Export Hapi connection constructor
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

  // Merge defaults and options
  const {devServer: serverConfig, ...compilerConfig} = Hoek.applyToDefaults(defaults, options);

  // Normalize publicPath
  if (!serverConfig.publicPath) {
    serverConfig.publicPath = compilerConfig.output.publicPath;
    if (!/^(https?:)?\/\//.test(serverConfig.publicPath) && serverConfig.publicPath[0] !== '/') {
      serverConfig.publicPath = `/${serverConfig.publicPath}`;
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
  }
  else if (!/^(https?:)?\/\//.test(serverConfig.contentBase)) {
    serverConfig.contentBase = Path.resolve(serverConfig.contentBase);
  }

  // Handle inline client
  const serverUrl = Url.format({
    protocol: serverConfig.https ? 'https' : 'http',
    hostname: serverConfig.host,
    port: serverConfig.port
  });

  if (serverConfig.inline) {
    const client = [`webpack-dev-server/client?${serverUrl}`];

    if (serverConfig.hot) {
      client.push('webpack/hot/dev-server');
    }

    if (typeof compilerConfig.entry === 'object' && !Array.isArray(compilerConfig.entry)) {
      Object.keys(compilerConfig.entry).forEach((key) =>
        compilerConfig.entry[key] = [...client, compilerConfig.entry[key]]
      );
    }
    else {
      compilerConfig.entry = [...client, compilerConfig.entry];
    }
  }

  // Create devServer
  const compiler = Webpack(compilerConfig);
  const devServer = new WebpackDevServer(compiler, serverConfig);

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

  // Return Hapi connection object
  return {
    connection: {
      app: {
        devServer: serverConfig,
        ...compilerConfig
      },
      host: serverConfig.host,
      port: serverConfig.port,
      labels: ['webpack'],
      listener: devServer.listeningApp,
      tls: serverConfig.https
    },
    compiler
  };
};
