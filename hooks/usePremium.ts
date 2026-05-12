import React from 'react';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { isPremiumCustomer } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export const FREE_FISHDEX_LIMIT = 30;
export const FREE_HISTORY_LIMIT = 50;

export function usePremium() {
  const { session } = useAuth();
  const [customerInfo, setCustomerInfo] = React.useState<CustomerInfo | null>(null);
  const [dbIsPremium, setDbIsPremium] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);

  // Lecture du statut depuis Supabase (fallback si RevenueCat échoue)
  React.useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(
        ({ data }) => setDbIsPremium(data?.is_premium ?? false),
        () => setDbIsPremium(null),
      );
  }, [session?.user?.id]);

  // Source principale : RevenueCat (temps réel + cache local)
  React.useEffect(() => {
    Purchases.getCustomerInfo()
      .then((info) => { setIsError(false); setCustomerInfo(info); })
      .catch(() => { setIsError(true); setCustomerInfo(null); })
      .finally(() => setIsLoading(false));

    try {
      // Écoute les changements en temps réel (achat, résiliation, restore)
      Purchases.addCustomerInfoUpdateListener((info) => {
        setIsError(false);
        setCustomerInfo(info);
      });
    } catch {
      // Native module non disponible (Expo Go)
      setIsLoading(false);
    }
  }, []);

  // RevenueCat est la source de vérité.
  // Si RevenueCat échoue (réseau coupé, erreur), on se rabat sur la valeur en DB.
  const isPremium = (() => {
    if (customerInfo) return isPremiumCustomer(customerInfo);
    if (isError && dbIsPremium !== null) return dbIsPremium;
    return false;
  })();

  return { isPremium, isLoading, isError };
}
