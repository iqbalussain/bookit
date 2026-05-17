import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromDb, toDb } from '@/lib/dbCase';

/**
 * Mirrors a Supabase table as a local React array, with diff-based push on every set.
 * The `id` column is the text primary key the app already generates.
 */
export function useSupabaseTable<T extends { id: string }>(
  table: string,
  options: {
    ready: boolean;
    jsonbCols?: string[];
    initial?: T[];
    onFirstLoad?: (rows: T[]) => void | Promise<void>;
  }
): [T[], (next: T[] | ((prev: T[]) => T[])) => void, boolean] {
  const { ready, jsonbCols = [], initial = [], onFirstLoad } = options;
  const [value, setValue] = useState<T[]>(initial);
  const [loaded, setLoaded] = useState(false);
  const previousRef = useRef<T[]>(initial);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase.from as any)(table).select('*');
      if (cancelled) return;
      if (error) {
        console.warn(`[supabase] select ${table}:`, error.message);
        setLoaded(true);
        return;
      }
      const mapped = (data ?? []).map((r: any) => fromDb<T>(r, jsonbCols));
      setValue(mapped);
      previousRef.current = mapped;
      setLoaded(true);
      if (onFirstLoad) await onFirstLoad(mapped);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, table]);

  const setAndPush = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      setValue((prev) => {
        const computed = typeof next === 'function' ? (next as (p: T[]) => T[])(prev) : next;
        if (ready) {
          const before = new Map(previousRef.current.map((r) => [r.id, r]));
          const after = new Map(computed.map((r) => [r.id, r]));
          for (const [id, row] of after) {
            const old = before.get(id);
            if (!old || JSON.stringify(old) !== JSON.stringify(row)) {
              (supabase.from as any)(table)
                .upsert(toDb(row, jsonbCols))
                .then(({ error }: any) => {
                  if (error) console.warn(`[supabase] upsert ${table}/${id}:`, error.message);
                });
            }
          }
          for (const id of before.keys()) {
            if (!after.has(id)) {
              (supabase.from as any)(table)
                .delete()
                .eq('id', id)
                .then(({ error }: any) => {
                  if (error) console.warn(`[supabase] delete ${table}/${id}:`, error.message);
                });
            }
          }
          previousRef.current = computed;
        }
        return computed;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, table]
  );

  return [value, setAndPush, loaded];
}