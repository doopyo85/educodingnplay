const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/main.js', // 메인 진입점
  output: {
    path: path.resolve(__dirname, 'public'), // 빌드 파일을 public 폴더에 저장
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.vue$/, // .vue 파일 로더 설정
        loader: 'vue-loader'
      },
      {
        test: /\.js$/, // 자바스크립트 파일을 Babel로 처리
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/, // CSS 로더 추가
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ejs$/, // EJS 로더 추가
        loader: 'ejs-loader',
        options: {
          esModule: false
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(), // Vue 로더 플러그인
    new HtmlWebpackPlugin({
      template: './views/index.ejs', // EJS 파일 위치
      inject: 'body' // 번들된 자바스크립트를 body 끝에 삽입
    })
  ],
  resolve: {
    alias: {
      vue$: 'vue/dist/vue.esm-bundler.js' // Vue 파일 설정
    },
    extensions: ['*', '.js', '.vue', '.json']
  },
  devServer: {
    contentBase: './public',
    hot: true
  }
};

