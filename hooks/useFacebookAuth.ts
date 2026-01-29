import React from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type FacebookAuthOptions = {
  onSuccess: (userId?: string | null) => Promise<void> | void;
};

export function useFacebookAuth({ onSuccess }: FacebookAuthOptions) {
  const redirectUri = React.useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: 'fishco',
        preferLocalhost: true,
      }),
    []
  );

  const signInWithFacebook = React.useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'public_profile email',
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('Impossible de demarrer la connexion Facebook.');
    }

    const result = await AuthSession.startAsync({
      authUrl: data.url,
      returnUrl: redirectUri,
    });

    if (result.type !== 'success') {
      if (result.type === 'dismiss') {
        return;
      }
      throw new Error('Connexion Facebook annulee. Reessaie dans un instant.');
    }

    const params = result.params as Record<string, string | undefined>;

    if (params.error) {
      throw new Error(params.error_description || params.error || 'Connexion Facebook echouee.');
    }

    const code = params.code || params.auth_code;

    if (!code) {
      throw new Error('Code Facebook manquant apres redirection.');
    }

    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      throw exchangeError;
    }

    await onSuccess(sessionData.session?.user?.id ?? sessionData.user?.id);
  }, [onSuccess, redirectUri]);

  return { signInWithFacebook };
}
