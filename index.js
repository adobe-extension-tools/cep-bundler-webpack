const fs = require('fs')
const path = require('path')
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
  if (!opts.hasOwnProperty('out')) {
    throw new Error('Please specify the output directory using the "out" parameter.')
  }
  if (!opts.hasOwnProperty('entry')) {
    throw new Error('Please specify the entry file using the "entry" parameter.')
  }
  if (!opts.hasOwnProperty('type')) {
    throw new Error('Please specify the compilation type using the "type" parameter (valid values are "cep" or "extendscript").')
  }
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
    devServer: {
      contentBase: opts.out,
      hot: true,
      port: opts.hasOwnProperty('devPort') ? opts.devPort : 8080,
      host: opts.hasOwnProperty('devHost') ? opts.devHost : 'localhost',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      filename: opts.type === 'cep' ? 'cep.js' : 'extendscript.js',
      path: opts.out
    },
    devtool: false,
    plugins: opts.type === 'cep' ? [
      new HtmlWebpackPlugin({
        title: 'CEP Extension'
      }),
      new CepWebpackPlugin({
        devPort: opts.hasOwnProperty('devPort') ? opts.devPort : 8080,
        devHost: opts.hasOwnProperty('devHost') ? opts.devHost : 'localhost'
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
      new WrapperPlugin({
        header: fs.readFileSync(path.join(process.cwd(), 'node_modules', 'extendscript-es5-shim-ts', 'index.js'), 'utf8')
      })
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