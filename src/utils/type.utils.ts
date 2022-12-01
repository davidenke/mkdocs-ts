export const alignType = (type: string): string => {
  if (type === 'bool') {
    return 'boolean';
  }
  if (type.startsWith('[') && type.endsWith(']')) {
    return `${alignType(type.slice(1, -1))}[]`;
  }
  if (type.startsWith('{') && type.endsWith('}')) {
    const [, key, value] = /^{\s*(.*)\s*:\s*(.*)}$/g.exec(type)!;
    return `Record<${alignType(key)}, ${alignType(value)}>`;
  }
  if (type.startsWith('Promise')) {
    const resolve = type.match(/Promise\[:t=(.*)\]$/);
    if (resolve === null) return 'Promise<void>';
    return `Promise<${alignType(resolve[1])}>`;
  }
  if (type.startsWith('fn(')) {
    return `(${alignParameters(type)}) => ${alignReturnType(type)}`;
  }
  return type;
};

export const alignParameters = (fnType: string): string => {
  const parameters = fnType.match(/^fn\((.*)\)/);
  if (parameters === null) return '';
  const [, args] = parameters;
  if (args === '') return '';
  return args
    .split(/\s?,\s?/)
    .map((arg: string, index: number) => {
      if (!arg.includes(':') || arg.startsWith('{')) {
        return `arg${index}: ${alignType(arg)}`;
      }
      const [name, type] = arg.split(/\s?:\s?/);
      return `${name}: ${alignType(type)}`;
    })
    .join(', ');
};

export const alignReturnType = (fnType: string): string => {
  const returns = fnType.match(/->\s*\+?(.*)$/);
  if (returns === null) return 'void';
  return alignType(returns[1]);
};