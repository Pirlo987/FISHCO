import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Locale, TranslationKey, createT } from '@/lib/i18n';

const STORAGE_KEY = 'app_language';

/** Detect system language and return 'fr' or 'en'. */
function detectSystemLocale(): Locale {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: TFunction;
};

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(detectSystemLocale);

  // Hydrate from AsyncStorage on mount — saved preference overrides system locale.
  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'fr' || saved === 'en') {
        setLocaleState(saved);
      }
    });
  }, []);

  const setLocale = React.useCallback(async (l: Locale) => {
    setLocaleState(l);
    await AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = React.useMemo(() => createT(locale), [locale]);

  const value = React.useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
