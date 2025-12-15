import React from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type GoogleAuthOptions = {
  onSuccess: (userId?: string | null) => Promise<void> | void;
};

export function useGoogleAuth({ onSuccess }: GoogleAuthOptions) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const redirectUri = React.useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: 'fishco',
        preferLocalhost: true,
      }),
    []
  );

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId ?? iosClientId ?? androidClientId ?? '',
    iosClientId,
    androidClientId,
    responseType: 'id_token',
    redirectUri,
  });

  const signInWithGoogle = React.useCallback(async () => {
    if (!webClientId && !iosClientId && !androidClientId) {
      throw new Error('Ajoute tes IDs client Google (web/Android/iOS) dans .env pour activer la connexion Google.');
    }

    if (!request) {
      throw new Error("La demande OAuth Google n'est pas prete. Reessaie dans une seconde.");
    }

    const result = await promptAsync({ useProxy: Platform.OS === 'web' });

    if (result.type !== 'success') {
      if (result.type === 'dismiss') {
        return;
      }
      throw new Error('Connexion Google annulee. Reessaie dans un instant.');
    }

    const idToken = result.params?.id_token;

    if (!idToken) {
      throw new Error('Impossible de recuperer le token Google.');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      throw error;
    }

    await onSuccess(data.user?.id ?? data.session?.user?.id);
  }, [androidClientId, iosClientId, onSuccess, promptAsync, request, webClientId]);

  return { signInWithGoogle, isReady: !!request };
}
