import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { supabase } from '@/lib/supabase';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['profile', 'email'],
});

type GoogleAuthOptions = {
  onSuccess: (userId?: string | null) => Promise<void> | void;
};

export function useGoogleAuth({ onSuccess }: GoogleAuthOptions) {
  const signInWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      throw new Error('Impossible de recuperer le token Google.');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw error;

    await onSuccess(data.user?.id ?? data.session?.user?.id);
  };

  const signInWithGoogleWrapped = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (
        err?.code === statusCodes.SIGN_IN_CANCELLED ||
        err?.code === statusCodes.IN_PROGRESS
      ) {
        return;
      }
      throw err;
    }
  };

  return { signInWithGoogle: signInWithGoogleWrapped, isReady: true };
}
