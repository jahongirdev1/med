export function asArray<T = any>(input: any, altKeys: Array<'data' | 'items' | 'results'> = ['data','items','results']): T[] {
  if (Array.isArray(input)) return input as T[];
  for (const k of altKeys) {
    const v = input?.[k];
    if (Array.isArray(v)) return v as T[];
  }
  return [] as T[];
}
