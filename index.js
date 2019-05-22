const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const NodeExternals = require('webpack-node-externals')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const WrapperPlugin = require('wrapper-webpack-plugin')
const CepBundlerCore = require('cep-bundler-core')
const CopyPlugin = require('copy-webpack-plugin')
// const WriteFilePlugin = require('write-file-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

class CepWebpackPlugin {
  constructor(props) {
    this.props = props
  }

  apply(compiler) {
    const pluginName = 'CepWebpackPlugin'
    compiler.hooks.compile.tap(pluginName, () => {
      const isDev = this.props.isDev !== undefined ? this.props.isDev : compiler.watchMode
      CepBundlerCore.compile({
        out: compiler.outputPath,
        isDev: isDev,
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

  if (!opts.root) {
    opts.root = process.cwd()
  }

  const common = {
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
      extensions: ['.tsx', '.ts', '.js', '.json']
    },
    mode: opts.isDev === false ? 'production' : 'development',
  }

  if (opts.type === 'extendscript') {
    return {
      ...common,
      output: {
        filename: 'extendscript.js',
        path: opts.out
      },
      devtool: false,
      plugins: [
        new CleanWebpackPlugin(),
        new webpack.EnvironmentPlugin(Object.keys(process.env)),
        new WrapperPlugin({
          header: fs.readFileSync(path.join(process.cwd(), 'node_modules', 'extendscript-es5-shim-ts', 'index.js'), 'utf8')
        })
      ],
      target: 'web',
      optimization: opts.isDev ? { minimize: false } : {
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                collapse_vars: false,
                conditionals: false,
                comparisons: false
              },
              output: {
                comments: false
              }
            }
          })
        ]
      }
    }
  } else if (opts.type === 'cep') {
    const env = opts.env ? opts.env : process.env.NODE_ENV
    const pkg = opts.pkg ? opts.pkg : require(path.join(opts.root, '/package.json'))
    const config = CepBundlerCore.getConfig(pkg, env)

    let devPort = opts.hasOwnProperty('devPort') ? opts.devPort : 8080
    let devHost = opts.hasOwnProperty('devHost') ? opts.devHost : 'localhost'
    let htmlFilename = opts.htmlFilename
    let name = config.name
    let outName = opts.outName ? opts.outName : path.basename(path.dirname(opts.entry)) + '.js'

    if (opts.id && config.extensions) {
      const extensionConfig = config.extensions.filter(extension => extension.id === opts.id)
      if (extensionConfig.length === 1) {
        devPort = extensionConfig[0].devPort
        devHost = extensionConfig[0].devHost
        htmlFilename = extensionConfig[0].htmlFilename
        name = extensionConfig[0].name
      }
    }
    
    return {
      ...common,
      devServer: {
        contentBase: opts.out,
        hot: true,
        port: devPort,
        host: devHost,
      },
      output: {
        filename: outName,
        path: opts.out
      },
      devtool: opts.isDev ? 'eval-source-map' : false,
      plugins: [
        // new WriteFilePlugin(),
        new CopyPlugin([
          { from: 'public/', to: '.' }
        ]),
        new CepWebpackPlugin(opts),
        new HtmlWebpackPlugin({
          filename: htmlFilename,
          title: name
        }),
        new webpack.EnvironmentPlugin(Object.keys(process.env)),
        ...(opts.isDev === false ? [] : [
          new webpack.HotModuleReplacementPlugin()
        ]),
        new WrapperPlugin({	
          header: `if (typeof window !== 'undefined' && window.hasOwnProperty('cep_node')) {
  require = window.cep_node.require
  Buffer = window.cep_node.Buffer
  process = window.cep_node.process
  __dirname = window.cep_node.__dirname
}`
        })
      ],
      target: 'node-webkit',
      externals: [
        NodeExternals({
          modulesFromFile: true,
          modulesFromFile: {
            exclude: ['devDependencies']
          }
        })
      ],
      optimization: opts.isDev ? { minimize: false } : {
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: true,
              output: {
                comments: false
              }
            }
          })
        ]
      }
    }
  }
}
