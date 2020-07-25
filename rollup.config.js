import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { uglify } from 'rollup-plugin-uglify';

export default {
  input: 'src/backbone-oauth.js',
  output: {
    compact: true,
    file: 'dist/index.js',
    format: 'umd',
    globals: {
      jquery: '$',
      backbone: 'Backbone',
    },
  },
  external: ['jquery', 'backbone'],
  plugins: [resolve(), babel({ babelHelpers: 'bundled' }), uglify()],
};
