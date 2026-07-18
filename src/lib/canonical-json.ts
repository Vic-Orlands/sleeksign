function normalizeCanonicalValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeCanonicalValue);

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) result[key] = normalizeCanonicalValue(item);
      return result;
    }, {});
}

export function canonicalStringify(value: unknown) {
  return JSON.stringify(normalizeCanonicalValue(value));
}
