import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

const SPECIES_AI_FUNCTION = process.env.EXPO_PUBLIC_SPECIES_AI_FUNCTION ?? 'detect-species';
const AI_FALLBACK_MESSAGE =
  "Votre photo n'est pas assez nette pour determiner l'espece capturee. J'espere qu'au moins c'est un poisson :)";
const AI_UNMATCHED_MESSAGE =
  "Cette espece ne figure pas encore dans notre base. Notre equipe va verifier et l'ajoutera si elle s'avere etre une espece valide !";

export type AISuggestion = {
  species: string;
  confidence: number;
  matched?: boolean;
  source?: 'database' | 'ai';
};

type DetectSpeciesResponse = {
  suggestions?: AISuggestion[];
  unmatched?: boolean;
  error?: string;
};

export type PreparedImage = {
  arrayBuffer: ArrayBuffer;
  contentType: string;
  ext: string;
  base64: string;
};

export async function prepareImageForUpload(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PreparedImage> {
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  const base64 = manipulated.base64;
  if (!base64 || base64.length < 10) {
    throw new Error('Image invalide (base64 manquant)');
  }

  return {
    arrayBuffer: decode(base64),
    contentType: 'image/jpeg',
    ext: 'jpg',
    base64,
  };
}

export function useAiClassification() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const requestIdRef = useRef(0);

  const clearAi = useCallback(() => {
    requestIdRef.current += 1;
    setAiSuggestions([]);
    setAiError(null);
    setAiLoading(false);
  }, []);

  const classify = useCallback(
    async (
      asset: ImagePicker.ImagePickerAsset,
      onAutoFill?: (name: string) => void,
    ) => {
      if (!asset?.uri) return;
      const id = ++requestIdRef.current;
      setAiLoading(true);

      try {
        const prepared = await prepareImageForUpload(asset);
        if (requestIdRef.current !== id) return;

        const imageUrl = `data:${prepared.contentType};base64,${prepared.base64}`;
        const { data, error } = await supabase.functions.invoke<DetectSpeciesResponse>(
          SPECIES_AI_FUNCTION,
          { body: { image: imageUrl } },
        );

        if (requestIdRef.current !== id) return;
        if (error) {
          let debugBody = '';
          try {
            debugBody = JSON.stringify(await (error as any).context?.json());
          } catch {}
          console.error('[detect-species] ERROR body:', debugBody || error.message);
          throw new Error(error.message || 'Analyse indisponible');
        }

        console.log('[detect-species] response', JSON.stringify(data, null, 2));
        if (data?.error && !data?.unmatched) throw new Error(data.error);

        if (data?.unmatched) {
          setAiSuggestions([]);
          setAiError(AI_UNMATCHED_MESSAGE);
          return;
        }

        const suggestions = data?.suggestions || [];
        const cleaned = suggestions.filter((s) => {
          const name = (s?.species || '').trim();
          if (!name) return false;
          const lower = name.toLowerCase();
          return lower !== 'unknown' && lower !== 'unk' && lower !== 'inconnu';
        });

        if (!cleaned.length) {
          setAiSuggestions([]);
          setAiError(AI_FALLBACK_MESSAGE);
          return;
        }

        setAiError(null);
        setAiSuggestions(cleaned.slice(0, 3));
        if (onAutoFill && cleaned[0]) onAutoFill(cleaned[0].species);
      } catch (err: any) {
        console.error('AI classify error', err?.message || err);
        if (requestIdRef.current === id) {
          const msg = (err?.message || '')
            .toString()
            .toLowerCase()
            .includes('payload too large')
            ? 'Image trop lourde, reessaie apres recadrage'
            : err?.message || 'Analyse indisponible';
          setAiError(msg);
        }
      } finally {
        if (requestIdRef.current === id) setAiLoading(false);
      }
    },
    [],
  );

  return { aiLoading, aiError, aiSuggestions, clearAi, classify } as const;
}
