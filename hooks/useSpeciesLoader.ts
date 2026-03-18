import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { FISH_SPECIES, normalizeName, type Species } from '@/constants/species';

export function useSpeciesLoader() {
  const [speciesOptions, setSpeciesOptions] = useState<Species[]>(FISH_SPECIES);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const fetchIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    let next: Species[] | null = null;
    try {
      const { data, error } = await supabase.from('species').select('*');
      if (!error && Array.isArray(data)) {
        const mapped: Species[] = (data as any[])
          .map((r) => ({
            name: r.name || r.french_name || r.english_name || r.nom || '',
            image: r.image_url || r.image_path || undefined,
          }))
          .filter((s) => s.name);

        const byKey = new Map<string, Species>();
        for (const option of mapped) {
          const key = normalizeName(option.name);
          if (!byKey.has(key)) byKey.set(key, option);
        }
        next = Array.from(byKey.values());
      }
    } catch (e) {
      console.error('Species load error', e);
    }

    if (!isMountedRef.current || requestId !== fetchIdRef.current) return;
    if (next?.length) {
      setSpeciesOptions(next);
    } else if (!hasLoadedRef.current) {
      setSpeciesOptions(FISH_SPECIES);
    }
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    refresh();
    return () => { isMountedRef.current = false; };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedRef.current) refresh();
    }, [refresh]),
  );

  const isKnownSpecies = useCallback(
    (name: string) => {
      const normalized = normalizeName(name);
      return speciesOptions.some((o) => normalizeName(o.name) === normalized);
    },
    [speciesOptions],
  );

  const filterSpecies = useCallback(
    (query: string) => {
      const q = normalizeName(query);
      if (!q) return speciesOptions.slice(0, 8);
      return speciesOptions.filter((s) => normalizeName(s.name).includes(q)).slice(0, 8);
    },
    [speciesOptions],
  );

  return { speciesOptions, isKnownSpecies, filterSpecies } as const;
}
