const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',  // 진입점 파일 경로를 프로젝트에 맞게 수정하세요
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.ejs$/,
        loader: 'ejs-loader',
        options: {
          esModule: false
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
        use: ['file-loader']
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.ejs',  // EJS 템플릿 파일 경로를 프로젝트에 맞게 수정하세요
      filename: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true
      },
      templateParameters: {
        include: function(filepath) {
          return require('fs').readFileSync(path.resolve(__dirname, filepath), 'utf8');
        }
      }
    })
  ],
  resolve: {
    extensions: ['.js', '.ejs']
  },
  devServer: {
    contentBase: './dist',
    port: 3000
  }
};