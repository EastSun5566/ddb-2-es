import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';

import pkg from './package.json';

const extensions = ['.js', '.ts'];

export default {
  input: 'src/index.ts',
  output: {
    name: 'ddb-2-es',
    file: pkg.main,
    format: 'umd',
  },
  plugins: [
    resolve({ extensions }),
    commonjs(),
    json(),
    babel({
      extensions,
      include: 'src/**/*',
    }),
  ],
};
