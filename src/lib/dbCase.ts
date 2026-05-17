// Generic snake_case <-> camelCase converter for top-level DB row keys.
// Inner JSONB column values are preserved as-is.

const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export function fromDb<T = any>(row: any, jsonbCols: string[] = []): T {
  if (!row || typeof row !== 'object') return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'user_id') continue; // strip auth-managed col
    const camelKey = toCamel(k);
    // JSONB cols come back with camelCase contents (we stored them that way)
    out[camelKey] = v;
  }
  return out as T;
}

export function toDb(row: any, jsonbCols: string[] = []): any {
  if (!row || typeof row !== 'object') return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    const snakeKey = toSnake(k);
    out[snakeKey] = v;
  }
  return out;
}