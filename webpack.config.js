/* eslint-disable */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const babelExclude = /node_modules/;

var config = {
  entry: path.join(__dirname, 'src/index.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: ['babel-loader'],
        exclude: babelExclude,
      },
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  externals: /^(aws-sdk|uuid\/v1|lodash(\/.*)?)$/,
  plugins: [
  ],
  target: 'node'
}

module.exports = config
