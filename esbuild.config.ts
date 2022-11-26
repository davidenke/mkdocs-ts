import { build } from 'esbuild';
import { clean } from 'esbuild-plugin-clean';

const isWatchMode = process.argv.includes('--watch');

build({
  entryPoints: ['./src/generator.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: './dist/generator.js',
  minify: !isWatchMode,
  sourcemap: isWatchMode,
  watch: isWatchMode,
  plugins: [clean({ patterns: ['./dist'] })]
})
  .then(() => !isWatchMode && process.exit(0))
  .catch(() => process.exit(1));
