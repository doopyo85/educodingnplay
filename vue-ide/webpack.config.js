const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, '../public/vue-app'),
      filename: isProduction ? '[name].[contenthash].js' : 'bundle.js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        filename: 'index.html'
      }),
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(!isProduction),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(!isProduction),
      }),
    ],
    resolve: {
      alias: {
        'vue': 'vue/dist/vue.esm-bundler.js'
      },
      extensions: ['*', '.js', '.vue', '.json']
    },
    devServer: {
      static: {
        directory: path.join(__dirname, '../public'),
      },
      compress: true,
      port: 8080,
      hot: true,
    },
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map'
  };
};