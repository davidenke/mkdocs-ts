import { build } from 'esbuild';
import { clean } from 'esbuild-plugin-clean';
import { dependencies } from './package.json';

const isWatchMode = process.argv.includes('--watch');

build({
  entryPoints: ['./src/generator.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: './dist/generator.js',
  minify: !isWatchMode,
  sourcemap: isWatchMode,
  watch: isWatchMode,
  external: Object.keys(dependencies),
  plugins: [clean({ patterns: ['./dist'] })]
})
  .then(() => !isWatchMode && process.exit(0))
  .catch(() => process.exit(1));
