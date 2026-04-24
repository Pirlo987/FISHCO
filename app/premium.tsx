import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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

type CompareRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  feature: string;
  free: string | false;
  premium: string | true;
};

const COMPARE_ROWS: CompareRow[] = [
  {
    icon: 'fish',
    feature: 'Fishdex',
    free: '30 especes',
    premium: 'Illimite',
  },
  {
    icon: 'time',
    feature: 'Historique',
    free: '50 dernieres prises',
    premium: 'Illimite',
  },
  {
    icon: 'images',
    feature: 'Medias',
    free: 'Photos uniquement',
    premium: 'Photos + Videos',
  },
  {
    icon: 'trophy',
    feature: 'Titres',
    free: 'Novice → Legende',
    premium: 'Novice → Legende',
  },
  {
    icon: 'ribbon',
    feature: 'Badges',
    free: false,
    premium: true,
  },
  {
    icon: 'map',
    feature: 'Carte mondiale',
    free: false,
    premium: true,
  },
  {
    icon: 'bar-chart',
    feature: 'Statistiques avancees',
    free: false,
    premium: true,
  },
];

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

  const monthlyPriceLabel =
    packages.monthly?.product.priceString ?? '2,99 €';
  const annualPriceLabel =
    packages.annual?.product.priceString ?? '19,99 €';
  const lifetimePriceLabel =
    packages.lifetime?.product.priceString ?? '49,99 €';

  const handleSubscribe = React.useCallback(async () => {
    if (!selectedPackage) {
      Alert.alert(
        'Bientot disponible',
        'Les offres ne sont pas encore disponibles. Verifie ta connexion ou reviens plus tard.',
        [{ text: 'OK' }],
      );
      return;
    }
    try {
      setPurchasing(true);
      await purchasePackage(selectedPackage);
      trackEvent('premium_purchased', { plan: selectedPlan, product_id: selectedPackage.product.identifier });
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert(
          'Erreur de paiement',
          e?.message ?? 'Une erreur est survenue. Reessaie plus tard.',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setPurchasing(false);
    }
  }, [selectedPackage, router]);

  const handleRestore = React.useCallback(async () => {
    try {
      setRestoring(true);
      const info = await restorePurchases();
      const isActive =
        Object.keys(info.entitlements.active).length > 0;
      if (isActive) {
        Alert.alert('Achat restaure', 'Ton abonnement Premium est actif.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          'Aucun achat trouve',
          'Aucun abonnement actif trouve pour ce compte.',
          [{ text: 'OK' }],
        );
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de restaurer les achats.');
    } finally {
      setRestoring(false);
    }
  }, [router]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[styles.closeBtn, { top: insets.top + 12 }]}
      >
        <Ionicons name="close" size={20} color="#64748B" />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Plan selector */}
        <View style={styles.plansBlock}>
          {loadingOfferings ? (
            <ActivityIndicator color="#D97706" style={{ paddingVertical: 32 }} />
          ) : (
            <>
              <Pressable
                onPress={() => setSelectedPlan('annual')}
                style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
              >
                <View style={styles.popularBadge}>
                  <ThemedText style={styles.popularText}>-44%</ThemedText>
                </View>
                <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]}>
                  {selectedPlan === 'annual' && <View style={styles.radioDot} />}
                </View>
                <View style={styles.planInfo}>
                  <ThemedText style={[styles.planName, selectedPlan === 'annual' && styles.planNameSelected]}>
                    Annuel
                  </ThemedText>
                  <ThemedText style={styles.planSub}>soit 1,67 € / mois</ThemedText>
                </View>
                <View style={styles.planPriceBlock}>
                  <ThemedText style={[styles.planPrice, selectedPlan === 'annual' && styles.planPriceSelected]}>
                    {annualPriceLabel}
                  </ThemedText>
                  <ThemedText style={styles.planPer}>/ an</ThemedText>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedPlan('monthly')}
                style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              >
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]}>
                  {selectedPlan === 'monthly' && <View style={styles.radioDot} />}
                </View>
                <View style={styles.planInfo}>
                  <ThemedText style={[styles.planName, selectedPlan === 'monthly' && styles.planNameSelected]}>
                    Mensuel
                  </ThemedText>
                  <ThemedText style={styles.planSub}>Sans engagement</ThemedText>
                </View>
                <View style={styles.planPriceBlock}>
                  <ThemedText style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceSelected]}>
                    {monthlyPriceLabel}
                  </ThemedText>
                  <ThemedText style={styles.planPer}>/ mois</ThemedText>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedPlan('lifetime')}
                style={[styles.planCard, styles.planCardLifetime, selectedPlan === 'lifetime' && styles.planCardLifetimeSelected]}
              >
                <View style={styles.earlyBirdBadge}>
                  <Ionicons name="flash" size={11} color="#FFFFFF" />
                  <ThemedText style={styles.earlyBirdText}>EARLY BIRD</ThemedText>
                </View>
                <View style={[styles.radio, styles.radioLifetime, selectedPlan === 'lifetime' && styles.radioLifetimeSelected]}>
                  {selectedPlan === 'lifetime' && <View style={styles.radioDotLifetime} />}
                </View>
                <View style={styles.planInfo}>
                  <ThemedText style={[styles.planName, selectedPlan === 'lifetime' && styles.planNameLifetime]}>
                    A vie
                  </ThemedText>
                  <ThemedText style={[styles.planSub, styles.planSubLifetime]}>
                    Acces permanent · Places limitees
                  </ThemedText>
                </View>
                <View style={styles.planPriceBlock}>
                  <ThemedText style={[styles.planPrice, selectedPlan === 'lifetime' && styles.planPriceLifetime]}>
                    {lifetimePriceLabel}
                  </ThemedText>
                  <ThemedText style={styles.planPer}>une fois</ThemedText>
                </View>
              </Pressable>
            </>
          )}
        </View>

        {/* Comparison table */}
        <View style={styles.tableBlock}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableColFeature} />
            <View style={[styles.tableColPlan, styles.tableColFree]}>
              <ThemedText style={styles.tableHeaderFree}>Gratuit</ThemedText>
            </View>
            <LinearGradient
              colors={['#B45309', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.tableColPlan, styles.tableColPremium]}
            >
              <Ionicons name="star" size={12} color="#FDE68A" />
              <ThemedText style={styles.tableHeaderPremium}>Premium</ThemedText>
            </LinearGradient>
          </View>

          {/* Table rows */}
          {COMPARE_ROWS.map((row, index) => (
            <View
              key={row.feature}
              style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
            >
              <View style={styles.tableColFeature}>
                <Ionicons name={row.icon} size={15} color="#64748B" style={styles.rowIcon} />
                <ThemedText style={styles.rowFeature}>{row.feature}</ThemedText>
              </View>

              <View style={[styles.tableColPlan, styles.tableColFree]}>
                {row.free === false ? (
                  <Ionicons name="close" size={18} color="#CBD5E1" />
                ) : (
                  <ThemedText style={styles.freeValue}>{row.free}</ThemedText>
                )}
              </View>

              <View style={[styles.tableColPlan, styles.tableColPremium, styles.tableColPremiumBody]}>
                {row.premium === true ? (
                  <Ionicons name="checkmark" size={18} color="#D97706" />
                ) : (
                  <ThemedText style={styles.premiumValue}>{row.premium}</ThemedText>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={handleSubscribe}
          disabled={purchasing || loadingOfferings}
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: pressed || purchasing ? 0.85 : 1 },
          ]}
        >
          <LinearGradient
            colors={['#B45309', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="star" size={17} color="#FDE68A" />
                <ThemedText style={styles.ctaText}>
                  {selectedPlan === 'annual'
                    ? `Passer Premium — ${annualPriceLabel} / an`
                    : selectedPlan === 'lifetime'
                    ? `Acces a vie — ${lifetimePriceLabel}`
                    : `Passer Premium — ${monthlyPriceLabel} / mois`}
                </ThemedText>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {/* Restaurer les achats */}
        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreBtn}
        >
          {restoring ? (
            <ActivityIndicator color="#94A3B8" size="small" />
          ) : (
            <ThemedText style={styles.restoreText}>Restaurer mes achats</ThemedText>
          )}
        </Pressable>

        <ThemedText style={styles.legal}>
          Resiliable a tout moment. Paiement via l'App Store ou Google Play.
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Close button
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingTop: 64,
    gap: 0,
  },

  // Plans
  plansBlock: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  planCardSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  popularBadge: {
    backgroundColor: '#D97706',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#D97706',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
  },
  planInfo: {
    flex: 1,
    gap: 2,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  planNameSelected: {
    color: '#0F172A',
  },
  planSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  planPriceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94A3B8',
  },
  planPriceSelected: {
    color: '#B45309',
  },
  planPer: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },

  // Table
  tableBlock: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableColFeature: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  tableColPlan: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tableColFree: {
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  tableColPremium: {
    flexDirection: 'row',
    gap: 4,
  },
  tableColPremiumBody: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 1,
    borderLeftColor: '#FDE68A',
  },
  tableHeaderFree: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tableHeaderPremium: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  rowIcon: {
    flexShrink: 0,
  },
  rowFeature: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 1,
  },
  freeValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
  premiumValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
  },

  // CTA
  ctaBtn: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#B45309',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  // Plan lifetime
  planCardLifetime: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
  },
  planCardLifetimeSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  earlyBirdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  earlyBirdText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  radioLifetime: {
    borderColor: '#DDD6FE',
  },
  radioLifetimeSelected: {
    borderColor: '#7C3AED',
  },
  radioDotLifetime: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },
  planNameLifetime: {
    color: '#4C1D95',
  },
  planSubLifetime: {
    color: '#7C3AED',
  },
  planPriceLifetime: {
    color: '#6D28D9',
  },

  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
  legal: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 4,
    lineHeight: 16,
  },
});
