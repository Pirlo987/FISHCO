import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type PurchasesPackage } from 'react-native-purchases';
import { ThemedText } from '@/components/ThemedText';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  PRODUCT_MONTHLY,
  PRODUCT_ANNUAL,
  PRODUCT_LIFETIME,
} from '@/lib/purchases';
import { trackEvent } from '@/lib/analytics';

type Plan = 'monthly' | 'annual' | 'lifetime';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = React.useState<Plan>('annual');
  const [packages, setPackages] = React.useState<{
    monthly: PurchasesPackage | null;
    annual: PurchasesPackage | null;
    lifetime: PurchasesPackage | null;
  }>({ monthly: null, annual: null, lifetime: null });
  const [loadingOfferings, setLoadingOfferings] = React.useState(true);
  const [purchasing, setPurchasing] = React.useState(false);
  const [restoring, setRestoring] = React.useState(false);

  React.useEffect(() => {
    trackEvent('premium_screen_viewed');
  }, []);

  React.useEffect(() => {
    getOfferings().then((offering) => {
      if (offering) {
        const monthly =
          offering.availablePackages.find(
            (p) => p.product.identifier === PRODUCT_MONTHLY,
          ) ?? null;
        const annual =
          offering.availablePackages.find(
            (p) => p.product.identifier === PRODUCT_ANNUAL,
          ) ?? null;
        const lifetime =
          offering.availablePackages.find(
            (p) => p.product.identifier === PRODUCT_LIFETIME,
          ) ?? null;
        setPackages({ monthly, annual, lifetime });
      }
      setLoadingOfferings(false);
    });
  }, []);

  const selectedPackage =
    selectedPlan === 'annual'
      ? packages.annual
      : selectedPlan === 'lifetime'
      ? packages.lifetime
      : packages.monthly;

  const monthlyPriceLabel = packages.monthly?.product.priceString ?? '4,99 €';
  const annualPriceLabel = packages.annual?.product.priceString ?? '35,88 €';
  const lifetimePriceLabel = packages.lifetime?.product.priceString ?? '29,99 €';

  const handleSubscribe = React.useCallback(async () => {
    if (!selectedPackage) {
      Alert.alert(
        'Bientôt disponible',
        'Les offres ne sont pas encore disponibles. Vérifie ta connexion ou reviens plus tard.',
        [{ text: 'OK' }],
      );
      return;
    }
    try {
      setPurchasing(true);
      await purchasePackage(selectedPackage);
      trackEvent('premium_purchased', {
        plan: selectedPlan,
        product_id: selectedPackage.product.identifier,
      });
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert(
          'Erreur de paiement',
          e?.message ?? 'Une erreur est survenue. Réessaie plus tard.',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setPurchasing(false);
    }
  }, [selectedPackage, router, selectedPlan]);

  const handleRestore = React.useCallback(async () => {
    try {
      setRestoring(true);
      const info = await restorePurchases();
      const isActive = Object.keys(info.entitlements.active).length > 0;
      if (isActive) {
        Alert.alert('Achat restauré', 'Ton abonnement Premium est actif.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          'Aucun achat trouvé',
          'Aucun abonnement actif trouvé pour ce compte.',
          [{ text: 'OK' }],
        );
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de restaurer les achats.');
    } finally {
      setRestoring(false);
    }
  }, [router]);

  const ctaLabel =
    selectedPlan === 'annual'
      ? `${annualPriceLabel} / an`
      : selectedPlan === 'lifetime'
      ? `${lifetimePriceLabel} — accès à vie`
      : `${monthlyPriceLabel} / mois`;

  return (
    <View style={styles.root}>
      {/* Hero image */}
      <ImageBackground
        source={require('@/assets/images/fond_bleu_premium.png')}
        style={styles.hero}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFillObject}
        />

        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.closeBtn, { top: insets.top + 10 }]}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={styles.heroText}>
          <ThemedText style={styles.heroTitle}>
            Accédez à toutes les{'\n'}fonctionnalités Premium
          </ThemedText>
          <ThemedText style={styles.heroSub}>
            Historique illimité · Badges & Titres · Fonctionnalités à venir
          </ThemedText>
        </View>
      </ImageBackground>

      {/* Bottom panel */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
        {loadingOfferings ? (
          <ActivityIndicator color="#0F172A" style={{ paddingVertical: 32 }} />
        ) : (
          <>
            <View style={styles.plans}>
              <PlanRow
                label="Annuel"
                sublabel="2,99 € / mois"
                price={annualPriceLabel}
                period="/ an"
                selected={selectedPlan === 'annual'}
                onSelect={() => setSelectedPlan('annual')}
                badge="MEILLEURE OFFRE"
                saveBadge="ÉCO 40%"
              />
              <PlanRow
                label="Mensuel"
                sublabel="Sans engagement"
                price={monthlyPriceLabel}
                period="/ mois"
                selected={selectedPlan === 'monthly'}
                onSelect={() => setSelectedPlan('monthly')}
              />
              <PlanRow
                label="À vie"
                sublabel="Accès permanent · Places limitées"
                price={lifetimePriceLabel}
                period="unique"
                selected={selectedPlan === 'lifetime'}
                onSelect={() => setSelectedPlan('lifetime')}
                badge="EARLY BIRD"
                badgeColor="#7C3AED"
              />
            </View>

            <Pressable
              onPress={handleSubscribe}
              disabled={purchasing}
              style={({ pressed }) => [
                styles.cta,
                { opacity: pressed || purchasing ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Continuer — ${ctaLabel}`}
              accessibilityState={{ disabled: purchasing }}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.ctaText}>Continuer</ThemedText>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Pressable onPress={handleRestore} disabled={restoring}>
                <ThemedText style={styles.footerLink}>
                  {restoring ? 'Restauration...' : 'Restaurer les achats'}
                </ThemedText>
              </Pressable>
              <ThemedText style={styles.footerDot}> · </ThemedText>
              <ThemedText style={styles.footerLegal}>
                Résiliable à tout moment
              </ThemedText>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

type PlanRowProps = {
  label: string;
  sublabel: string;
  price: string;
  period: string;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
  saveBadge?: string;
  badgeColor?: string;
};

function PlanRow({
  label,
  sublabel,
  price,
  period,
  selected,
  onSelect,
  badge,
  saveBadge,
  badgeColor = '#0F172A',
}: PlanRowProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.planRow, selected && styles.planRowSelected]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>

      <View style={styles.planInfo}>
        <View style={styles.planLabelRow}>
          <ThemedText style={[styles.planLabel, selected && styles.planLabelSelected]}>
            {label}
          </ThemedText>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <ThemedText style={styles.badgeText}>{badge}</ThemedText>
            </View>
          )}
          {saveBadge && (
            <View style={styles.saveBadge}>
              <ThemedText style={styles.saveBadgeText}>{saveBadge}</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.planSub}>{sublabel}</ThemedText>
      </View>

      <View style={styles.planPriceCol}>
        <ThemedText style={[styles.planPrice, selected && styles.planPriceSelected]}>
          {price}
        </ThemedText>
        <ThemedText style={styles.planPeriod}>{period}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  hero: {
    height: SCREEN_HEIGHT * 0.44,
    justifyContent: 'flex-end',
  },
  heroText: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },

  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 20,
  },

  plans: {
    gap: 10,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  planRowSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: '#0F172A',
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },

  planInfo: {
    flex: 1,
    gap: 3,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  planLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  planLabelSelected: {
    color: '#0F172A',
  },
  planSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  badge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  saveBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: '#DCFCE7',
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.3,
  },

  planPriceCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  planPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  planPriceSelected: {
    color: '#0F172A',
  },
  planPeriod: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },

  cta: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: 12,
    color: '#94A3B8',
  },
  footerLegal: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
