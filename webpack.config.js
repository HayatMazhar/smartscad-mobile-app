const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const appDir = __dirname;
const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

/**
 * Read .env (key=value lines) into an object — Expo-style EXPO_PUBLIC_* vars.
 * We do NOT use a runtime polyfill; values are inlined via DefinePlugin.
 */
function loadDotEnv() {
  const out = {};
  const file = path.join(appDir, '.env');
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}
const dotEnv = loadDotEnv();

/** Webpack 5: `process/browser` must resolve to a real file (install `process` in package.json). */
const processBrowserShim = require.resolve('process/browser', { paths: [appDir] });
const compileModules = [
  'react-native-web',
  '@react-navigation',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-gesture-handler',
  'react-native-vector-icons',
  '@react-native',
  'expo',
  'expo-modules-core',
  'expo-document-picker',
  'expo-asset',
  'expo-font',
  'expo-constants',
  '@expo',
];
const compileModulesRegex = new RegExp(
  `node_modules[/\\\\](${compileModules.join('|')})`,
);

module.exports = {
  mode: 'development',
  entry: path.join(appDir, 'index.web.js'),

  output: {
    path: path.join(appDir, 'dist/web'),
    filename: 'bundle.web.js',
    publicPath: '/',
  },

  // Avoid webpack serializing huge stats objects (also sidesteps buggy/partial installs
  // missing webpack/package.json that can crash Stats.toString in DefaultStatsFactoryPlugin).
  stats: false,

  devServer: {
    port: 8088,
    hot: true,
    historyApiFallback: true,
    open: true,
    devMiddleware: {
      stats: false,
    },
    // Fixed filename is `bundle.web.js` — without this, browsers keep an old
    // copy and the UI looks "stuck" on an older build after you change code.
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    // Serve `public/` (favicon, etc.) — fonts come from CopyWebpackPlugin below.
    static: [
      {
        directory: path.join(appDir, 'public'),
        publicPath: '/',
        watch: true,
      },
    ],
  },

  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
      {
        test: /\.mjs$/,
        type: 'javascript/auto',
        include: /node_modules/,
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: (filePath) => {
          if (/node_modules/.test(filePath) && !compileModulesRegex.test(filePath)) {
            return true;
          }
          return false;
        },
        use: {
          loader: 'babel-loader',
          options: {
            configFile: false,
            babelrc: false,
            cacheDirectory: false,
            presets: [
              ['@babel/preset-env', {
                targets: { browsers: ['last 2 versions'] },
                // Let webpack handle import/export natively — do NOT transform them.
                modules: false,
              }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
            plugins: [
              ['@babel/plugin-transform-runtime', { useESModules: true }],
            ],
          },
        },
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8192 } },
      },
      {
        test: /\.(ttf|otf|woff|woff2|eot)$/,
        type: 'asset/resource',
        generator: { filename: 'assets/fonts/[name].[hash:8][ext]' },
      },
    ],
  },

  resolve: {
    // Webpack-dev-server injects its ESM client (import "../foo/index.js").
    // fullySpecified:true (default for some paths) breaks those subpaths and yields
    // runtime "Cannot find module ... webpack-dev-server/client/modules/logger/index.js".
    fullySpecified: false,
    // Node-style `process` / `process/browser` imports (RTK, Expo, react-dom dev build, etc.)
    fallback: {
      process: processBrowserShim,
    },
    alias: {
      'react-native$': 'react-native-web',
      'process/browser': processBrowserShim,
    },
    extensions: [
      '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
      '.tsx', '.ts', '.jsx', '.js',
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(appDir, 'public/index.html'),
    }),
    // index.html @font-face loads /fonts/*.ttf for react-native-vector-icons on web.
    // RNVI v10+ npm tarball does not ship ./Fonts; Expo vendors the same .ttf files here.
    new CopyWebpackPlugin({
      patterns: [
        {
          context: path.join(
            appDir,
            'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts',
          ),
          from: '*.ttf',
          to: 'fonts',
        },
      ],
    }),
    // Expose React Native's __DEV__ global + Expo-style env vars.
    // We inline EXPO_PUBLIC_* from .env so `process.env.X` works in the bundle
    // without needing a runtime `process` polyfill.
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(isDev),
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      ...Object.fromEntries(
        Object.entries(dotEnv)
          .filter(([k]) => k.startsWith('EXPO_PUBLIC_'))
          .map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
      ),
    }),
    // Some libs (e.g. RN core) read other process.env keys. Provide an empty
    // default so accessing unknown env vars doesn't throw.
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
};
