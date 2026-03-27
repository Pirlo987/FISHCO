import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import { Linking, Platform } from 'react-native';

// Identifiant de l'entitlement créé dans le dashboard RevenueCat
export const ENTITLEMENT_PREMIUM = 'premium';

// Identifiants des produits à créer dans App Store Connect et Google Play
// (doivent correspondre exactement à ce qui est configuré dans RevenueCat)
export const PRODUCT_MONTHLY = 'fishbook_premium_monthly';
export const PRODUCT_ANNUAL = 'fishbook_premium_annual';
export const PRODUCT_LIFETIME = 'fishbook_premium_lifetime';

export function initializePurchases(userId?: string) {
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '',
    android: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '',
    default: '',
  });

  if (!apiKey) {
    console.warn('[Purchases] Clé API RevenueCat manquante pour', Platform.OS);
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => {});
    }

    Purchases.configure({ apiKey });

    if (userId) {
      Purchases.logIn(userId).catch((e) =>
        console.warn('[Purchases] logIn failed', e),
      );
    }
  } catch (e) {
    console.warn('[Purchases] Module natif non disponible (Expo Go détecté). Utilise un EAS Dev Build pour tester les achats.', e);
  }
}

export async function identifyUser(userId: string) {
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('[Purchases] identifyUser failed', e);
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    // Native module not available (Expo Go) — fail silently
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

export async function manageSubscription() {
  const url = Platform.select({
    ios: 'itms-apps://apps.apple.com/account/subscriptions',
    android: 'https://play.google.com/store/account/subscriptions',
    default: '',
  });
  if (url) await Linking.openURL(url);
}

export function isPremiumCustomer(
  customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>,
) {
  return (
    customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined
  );
}
