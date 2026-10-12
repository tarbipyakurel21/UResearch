/**
 * Flatten a nested object to dotted paths.
 * The original object is NOT mutated.
 *
 * Example:
 *   { a: { b: 1 }, c: [1,2] }  →  { "a.b": 1, "c": [1,2] }
 *
 * Arrays are kept as-is (not spread), since array index paths
 * are rarely useful for research filtering.
 */
export function flattenRecord(
  obj: Record<string, unknown>,
  prefix = "",
  maxDepth = 5
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  function recurse(current: unknown, path: string, depth: number): void {
    if (depth > maxDepth) {
      result[path] = current;
      return;
    }
    if (
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      const entries = Object.entries(current as Record<string, unknown>);
      if (entries.length === 0) {
        result[path] = current;
        return;
      }
      for (const [key, val] of entries) {
        const newPath = path ? `${path}.${key}` : key;
        recurse(val, newPath, depth + 1);
      }
    } else {
      result[path] = current;
    }
  }

  recurse(obj, prefix, 0);
  return result;
}

/**
 * Get all dotted-path keys from a flat record.
 */
export function getFlatKeys(flat: Record<string, unknown>): string[] {
  return Object.keys(flat);
}

/**
 * Get value from a flat record by dotted path.
 */
export function getFlatValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  if (!path) return undefined;
  // Try flat key first
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  // Fall back to nested traversal
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
