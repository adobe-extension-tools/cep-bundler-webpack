const path = require('path');
const webpack = require('webpack')
const NodeExternals = require('webpack-node-externals')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const WrapperPlugin = require('wrapper-webpack-plugin')
const CepBundlerCore = require('cep-bundler-core')

class CepWebpackPlugin {
  constructor(props) {
    this.props = props
  }

  apply(compiler) {
    compiler.hooks.watchRun.tap('CepWebpackPlugin', () => {
      CepBundlerCore.compile({
        out: compiler.outputPath,
        ...this.props
      })
    })
  }
}

exports.CepWebpackPlugin = CepWebpackPlugin

exports.createConfig = function createConfig(opts) {
  return {
    entry: opts.entry,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: [
            'file-loader'
          ]
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          use: [
            'file-loader'
          ]
        }
      ]
    },
    resolve: {
      alias: {
        '@dist': path.resolve(__dirname, 'dist'),
      }
    },
    devServer: {
      contentBase: './dist',
      hot: true
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      filename: opts.type === 'cep' ? 'cep.js' : 'extendscript.js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: opts.type === 'cep' ? [
      new HtmlWebpackPlugin({
        title: 'CEP Extension'
      }),
      new CepWebpackPlugin({
        devPort: 8080
      }),
      new webpack.HotModuleReplacementPlugin(),
      new WrapperPlugin({
        header: `if (typeof window !== 'undefined' && window.hasOwnProperty('cep_node')) {
    require = window.cep_node.require
    Buffer = window.cep_node.Buffer
    process = window.cep_node.process
    __dirname = window.cep_node.__dirname
}`
      })
    ] : [
        new CleanWebpackPlugin(),
      ],
    mode: 'development',
    externals: opts.type === 'cep'
      ? [
        NodeExternals({
          modulesFromFile: true,
          modulesFromFile: {
            exclude: ['devDependencies']
          }
        })
      ]
      : []
  }
}