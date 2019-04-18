const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const NodeExternals = require('webpack-node-externals')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const WrapperPlugin = require('wrapper-webpack-plugin')
const CepBundlerCore = require('cep-bundler-core')
const CopyPlugin = require('copy-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')

class CepWebpackPlugin {
  constructor(props) {
    this.props = props
  }

  apply(compiler) {
    const pluginName = 'CepWebpackPlugin'
    compiler.hooks.compile.tap(pluginName, () => {
      const isDev = compiler.watchMode
      if (isDev) {
        process.env.IS_DEV = '1'
      }
      CepBundlerCore.compile({
        out: compiler.outputPath,
        isDev: !!isDev,
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
  if (
    !opts.hasOwnProperty('type')
    || ['cep', 'extendscript'].indexOf(opts.type) === -1
  ) {
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
      extensions: ['.tsx', '.ts', '.js', '.json']
    },
    output: {
      filename: opts.type === 'cep' ? 'cep.js' : 'extendscript.js',
      path: opts.out
    },
    devtool: false,
    plugins: opts.type === 'cep' ? [
      new WriteFilePlugin(),
      new CopyPlugin([
        { from: 'public/', to: '.' }
      ]),
      new CepWebpackPlugin({
        devPort: opts.hasOwnProperty('devPort') ? opts.devPort : 8080,
        devHost: opts.hasOwnProperty('devHost') ? opts.devHost : 'localhost',
        env: opts.hasOwnProperty('env') ? opts.env : undefined,
        root: opts.hasOwnProperty('root') ? opts.root : undefined,
        htmlFilename: opts.hasOwnProperty('htmlFilename') ? opts.htmlFilename : undefined,
        pkg: opts.hasOwnProperty('pkg') ? opts.pkg : undefined
      }),
      new HtmlWebpackPlugin({
        title: 'CEP Extension'
      }),
      new webpack.EnvironmentPlugin(Object.keys(process.env)),
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
      new webpack.EnvironmentPlugin(Object.keys(process.env)),
      new WrapperPlugin({
        header: fs.readFileSync(path.join(process.cwd(), 'node_modules', 'extendscript-es5-shim-ts', 'index.js'), 'utf8')
      })
    ],
    mode: 'development',
    target: opts.type === 'cep' ? 'node-webkit' : 'web',
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