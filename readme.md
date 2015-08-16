# hapi-webpack-connection

[![Maintenance Status][status-image]][status-url] [![Dependency Status][deps-image]][deps-url] [![NPM version][npm-image]][npm-url]


Bridge between [Hapi](https://github.com/hapijs/hapi) and [Webpack](https://github.com/webpack/webpack-dev-server)

## Installation

```js
npm install hapi-webpack-connection
```

## API

### WebpackConnection([options])

The `WebpackConnection()` function is a top-level function exported by the `hapi-webpack-connection` module.

```js
var WebpackConnection = require('hapi-webpack-connection');
var Webpack = WebpackConnection();
```

Creates a `Webpack` object where:

- `options` - optional webpack configuration object. See the [webpack documentation](http://webpack.github.io/docs/configuration.html#configuration-object-content) for all available options.

  This object includes also the `webpack-dev-server` configuration via the `devServer` property. See the [webpack-dev-server documentation](http://webpack.github.io/docs/webpack-dev-server.html#webpack-dev-server-cli) for all available options.

  If omitted, the module will try to read the `webpack.config.js` file in the current working directory. This file should export the configuration object:

  ```js
    module.exports = {
      // configuration
    };
  ```

  This is the defaults merged with the options by the module:

  ```js
  // Defaut configuration
  {
    devServer: {
      contentBase: process.cwd(),
      filename: null, // Get from output.filename
      historyApiFallback: false,
      host: 'localhost',
      port: 0, // 0 = Randomly selected
      hot: false,
      https: false,
      inline: false,
      lazy: false,
      noInfo: false,
      outputPath: '/',
      publicPath: null, // Get from output.publicPath
      proxy: {},
      quiet: false,
      stats: {
        cached: false,
        cachedAssets: false,
        // colors: true or false, turned on if the terminal supports it
        context: process.cwd()
      }
    },
    output: {
      filename: 'bundle.js',
      path: process.cwd(),
      publicPath: '/'
    }
  ```

### Webpack properties

##### webpack.compiler

The webpack `compiler` instance.

```js
var WebpackConnection = require('hapi-webpack-connection');
var Webpack = WebpackConnection();

Webpack.compiler.plugin('done', function(stats) {
  console.log(stats.toString());
});
```

##### webpack.connection

The hapi `connection` configuration object. See the [hapi documentaion](http://hapijs.com/api#serverconnectionoptions) for all available options.

The connection has a `webpack` label and exposes the webpack configuration via `app.webpack` which can later be accessed via `connection.settings.app.webpack`.

```js
var WebpackConnection = require('hapi-webpack-connection');
var Webpack = WebpackConnection();

var Hapi = require('hapi');
var server = new Hapi.Server();

server.connection(Webpack.connection);

server.start(function () {
  console.log('Server running at:', server.info.uri);
});
```

### webpack.getAssets()

Returns an object where each key is the name of the chunk and the value is the full url of the chunk.

This object will not have any properties until the compilation is done.

```js
var webpackConfig = {
  entry: {
    main: './entry.js'
  }
  output: {
    publicPath: '/assets',
    filename: '[name]-compiled.js'
  }
  devServer: {
    port: 3001
  }
};

var WebpackConnection = require('hapi-webpack-connection');
var Webpack = WebpackConnection(webpackConfig);

console.log(Webpack.getAssets());
// Compiling...
// Print:
// {}

console.log(Webpack.getAssets());
// Compiled...
// Print:
// {
//   main: 'http://localhost:3001/assets/main-compiled.js'
// }
```

## Examples

**Using hot-reloading**

```js
var webpackConfig = {
  entry: './entry.js',
  output: {
    path: __dirname + '/dist'
  },
  devServer: {
    port: 3000,
    inline: true,
    hot: true
  }
}

// The entry will become
// [
//   'webpack-dev-server/client?http://localhost:3000', // from inline
//   'webpack/hot/dev-server', // from inline and hot
//   './entry.js'
// ]

var Hapi = require('hapi');
var Webpack = require('hapi-webpack-connection')(webpackConfig);

var server = new Hapi.Server();
server.connection(Webpack.connection);

server.start(function () {
  console.log('Server running at:', server.info.uri);
});
```

**Using `getAssets()`**

```js
var Hapi = require('hapi');
var Webpack = require('hapi-webpack-connection')();

var server = new Hapi.Server();
server.connection(Webpack.connection);

server.ext('onPreHandler', (request, reply) => {
  request.pre.assets = Webpack.getAssets();
  return reply.continue();
});

server.route({
  path: '/',
  method: 'GET',
  handler: function(request, reply) {
    return reply(request.pre.assets);
  }
});

server.start(function () {
  console.log('Server running at:', server.info.uri);
});
```

**Using [glue](https://github.com/hapijs/glue)**

```js
var Glue = require('glue');
var Webpack = require('hapi-webpack-connection')();

var manifest = {
  connections: [
    Webpack.connection,
    {
      port: 3001,
      labels: [
        'myApp'
      ]
    }
  ],
  server: {
    // ... some server options
  },
  plugins: {
    // ... some plugins to register
  }
}

Glue.compose(manifest, function (error, server) {
  if (error) {
    return console.error(error);
  }

  server.start(function () {
    console.log('Server running at:', server.info.uri);
  });
});
```

## Licence

The MIT License (MIT)

Copyright (c) 2015 Simon Degraeve

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[npm-url]: https://npmjs.org/package/hapi-webpack-connection
[npm-image]: http://img.shields.io/npm/v/hapi-webpack-connection.svg?style=flat-square

[deps-url]: https://david-dm.org/SimonDegraeve/hapi-webpack-connection
[deps-image]: https://img.shields.io/david/SimonDegraeve/hapi-webpack-connection.svg?style=flat-square

[status-url]: https://github.com/SimonDegraeve/hapi-webpack-connection/pulse
[status-image]: http://img.shields.io/badge/status-maintained-brightgreen.svg?style=flat-square
