export const hasType = (docs: any, symbol: string): boolean => {
  return '!type' in docs[symbol];
};

export const hasOnlyInternalSymbols = (docs: any, symbol: string): boolean => {
  return Object.keys(docs[symbol]).every(symbol => symbol.startsWith('!'));
};

export const hasNonInternalSymbols = (docs: any, symbol: string): boolean => {
  return !hasOnlyInternalSymbols(docs, symbol);
};

export const isFunction = (type: string): boolean => {
  return type.startsWith('fn(');
};

export const isConstructor = (type: string, symbol: string): boolean => {
  return isFunction(type) && type.endsWith(`+${symbol}`);
};
