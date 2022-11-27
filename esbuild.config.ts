import { build, type Loader, type Plugin } from 'esbuild';
import { clean } from 'esbuild-plugin-clean';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { dependencies } from './package.json';

const isWatchMode = process.argv.includes('--watch');

// @todo: provide as separate plugin?
const entryPointsHeaders = (header: string): Plugin => ({
  name: 'esbuild-plugin-entrypoints-headers',
  setup(build) {
    // https://stackoverflow.com/a/6969486/1146207
    const escapeRegExp = (string: string): string => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    if (build.initialOptions.entryPoints === undefined) return;
    const entryPoints = Array.isArray(build.initialOptions.entryPoints)
      ? build.initialOptions.entryPoints
      : Object.values(build.initialOptions.entryPoints);
    const entryPointsMatch = entryPoints
      .map(entryPoint => entryPoint.replace(/^\./, ''))
      .map(entryPoint => `(${escapeRegExp(entryPoint)})`)
      .join('|');
    const matchEntrypoints = new RegExp(`${entryPointsMatch}$`);

    build.onLoad({ filter: matchEntrypoints }, async args => {
      const source = await readFile(args.path, 'utf8');
      const loader = extname(args.path).slice(1) as Loader;
      try {
        const contents = header.concat('\n', source);
        return { contents, loader };
      } catch (error) {
        return { errors: [error] };
      }
    });
  }
});

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
  logLevel: 'info',
  // prettier-ignore
  plugins: [
    clean({ patterns: ['./dist'] }),
    entryPointsHeaders('#!/usr/bin/env node')
  ]
})
  .then(() => !isWatchMode && process.exit(0))
  .catch(() => process.exit(1));
