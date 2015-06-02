# hapi-webpack-connection

[![Maintenance Status][status-image]][status-url] [![Dependency Status][deps-image]][deps-url] [![NPM version][npm-image]][npm-url]


Bridge between [Hapi](https://github.com/hapijs/hapi) and [Webpack](https://github.com/webpack/webpack-dev-server)

## Installation

```js
npm install hapi-webpack-dev-server
```

## Usage

**Create the connection object**

```js
// Read configuration from process.cwd() + '/webpack.config.js'
var WebpackConnection = require('hapi-webpack-connection')();


// Or define configuration
var webpackConfig = {
  // ... webpack options
  // See http://webpack.github.io/docs/configuration.html

  devServer: {
    // ... webpack-dev-server options
    // See http://webpack.github.io/docs/webpack-dev-server.html
  }
};
var WebpackConnection = require('hapi-webpack-connection')(webpackConfig);
```

**And use it with Hapi**

The connection has a `webpack` label and Webpack configuration can be accessed via `connection.settings.app`.

```js
var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection(WebpackConnection);

server.start(function () {
  console.log('Server running at:', server.info.uri);
});
```

## Configuration

```js
// Defaut configuration
{
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
      // colors: true or false, turned on if the terminal supports it
      context: process.cwd()
    }
  },
  output: {
    filename: 'bundle.js',
    path: process.cwd(),
    publicPath: '/'
  }
}
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
var WebpackConnection = require('hapi-webpack-connection')(webpackConfig);

var server = new Hapi.Server();
server.connection(WebpackConnection);

server.start(function () {
  console.log('Server running at:', server.info.uri);
});
```

**Using shortcut**

```js
var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection(require('hapi-webpack-connection')());

server.start(function () {
  console.log('Server running at:', server.info.uri);
});
```

**Using [glue](https://github.com/hapijs/glue)**

```js
var Glue = require('glue');
var WebpackConnection = require('hapi-webpack-connection')();

var manifest = {
  connections: [
    WebpackConnection,
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

  console.log('Server running at:', server.info.uri);
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