import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { parse } from 'path';

import fetch from 'node-fetch';
import * as prettier from 'prettier';

import { isConstructor, isFunction, hasNonInternalSymbols, hasType } from './utils/check.utils';
import { alignParameters, alignReturnType, alignType } from './utils/type.utils';

// get source and target from run arguments
const [, , input, output] = process.argv;

(async (input: string, output: string) => {
  // parse JSON from provided input path or url
  const data = input.startsWith('http')
    ? await (await fetch(input, { method: 'GET', redirect: 'follow' })).json()
    : await JSON.parse(await readFile(input, 'utf8'));

  // https://github.com/prettier/prettier/issues/265
  const renderComments = (docs: any, symbol: string): string => {
    const clean = (comment?: string): string => comment?.replace(/\n/g, '$1 * ') ?? '';
    const comments = ['/**'];
    comments.push(clean(` * ${docs[symbol]?.['!doc']}`) || symbol);
    if (docs[symbol]?.['!scriptable.description']) {
      comments.push(` * @descr ${clean(docs[symbol]['!scriptable.description'])}`);
    }
    if (docs[symbol]?.['!url']) {
      comments.push(` * @see ${clean(docs[symbol]['!url'])}`);
    }
    comments.push('**/');

    return comments.join('\n');
  };

  const renderSimpleType = (
    docs: any,
    symbol: string,
    isProperty = false,
    isStatic = false
  ): string => {
    return `
  ${renderComments(docs, symbol)}
  ${isStatic ? 'static ' : ''}${!isProperty ? 'const ' : ''}${symbol}: ${alignType(
      docs[symbol]['!type']
    )};
  `;
  };

  const renderFunctionType = (
    docs: any,
    symbol: string,
    isProperty = false,
    isStatic = false
  ): string => {
    const isNew = isConstructor(docs[symbol]['!type'], symbol);
    return `
      ${renderComments(docs, symbol)}
      ${isStatic ? 'static ' : ''}${!isProperty ? 'function ' : ''}
      ${isNew ? 'constructor' : symbol}(${alignParameters(docs[symbol]['!type'])})
      ${!isNew ? `: ${alignReturnType(docs[symbol]['!type'])}` : ''};
    `;
  };

  const renderType = (docs: any, symbol: string, isProperty = false, isStatic = false): string => {
    if (isFunction(docs[symbol]['!type'])) {
      return renderFunctionType(docs, symbol, isProperty, isStatic);
    }
    return renderSimpleType(docs, symbol, isProperty, isStatic);
  };

  const renderComplexType = (docs: any, symbol: string, type: 'class' | 'interface'): string => {
    return `
      ${renderComments(docs, symbol)}
      ${type} ${symbol} {
        ${Object.keys(data[symbol])
          .filter(key => !key.startsWith('!'))
          .filter(key => hasType(data[symbol], key))
          .map(key => renderType(data[symbol], key, true, type === 'class'))
          .join('')}
        ${hasType(docs, symbol) ? renderFunctionType(data, symbol, true, false) : ''}
        ${Object.keys(data['!define'][symbol])
          .filter(key => !key.startsWith('!'))
          .filter(key => hasType(data['!define'][symbol], key))
          .map(key => renderType(data['!define'][symbol], key, true, false))
          .join('')}
      }
    `;
  };

  const renderClass = (docs: any, symbol: string): string => {
    return renderComplexType(docs, symbol, 'class');
  };

  const renderInterface = (docs: any, symbol: string): string => {
    return renderComplexType(docs, symbol, 'interface');
  };

  const renderSymbol = (docs: any, symbol: string): string => {
    const hasConstructor = hasType(docs, symbol) && isConstructor(docs[symbol]['!type'], symbol);
    const hasStaticMembers = hasNonInternalSymbols(docs, symbol);

    if (hasConstructor || hasStaticMembers) {
      return renderClass(docs, symbol);
    }

    if (!hasType(docs, symbol) && !hasStaticMembers) {
      return `
        ${renderInterface(docs, symbol)}
        // provide gloabl implementation of the interface with the same name
        const ${symbol}: ${symbol};
      `;
    }

    return renderType(docs, symbol);
  };

  const result = `
export {};

declare global {
  ${Object.keys(data)
    .filter(key => !key.startsWith('!'))
    .map(key => renderSymbol(data, key))
    .join('')}
}
`;

  // format result
  const { dir } = parse(output);
  const options = await prettier.resolveConfig(input);
  const formatted = prettier.format(result, { ...options, filepath: output });

  // prepare folder(s)
  if (dir !== '' && !existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // store to destination
  await writeFile(output, formatted);
})(input, output);
