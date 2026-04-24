import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';

const SECTIONS = [
  {
    title: '1. Acceptation des conditions',
    body: 'En téléchargeant, installant ou utilisant FishBook, tu acceptes d\'être lié par les présentes conditions. Si tu n\'acceptes pas ces conditions, n\'utilise pas l\'application.',
  },
  {
    title: '2. Description du service',
    body: 'FishBook est une application mobile permettant d\'enregistrer et partager ses prises, d\'identifier des espèces via l\'IA, de consulter un catalogue d\'espèces (Fishdex) et de participer à une communauté de pêcheurs.',
  },
  {
    title: '3. Création de compte',
    body: 'L\'utilisation de FishBook nécessite la création d\'un compte. Tu t\'engages à fournir des informations exactes et à être responsable de toute activité effectuée depuis ton compte. Tu dois avoir au moins 13 ans pour utiliser l\'application.',
  },
  {
    title: '4. Abonnements et paiements',
    body: 'FishBook propose une version gratuite et un abonnement Premium (mensuel, annuel, à vie). Les abonnements sont gérés via l\'App Store (Apple) ou Google Play. Le renouvellement automatique peut être désactivé depuis les paramètres de ta plateforme. Aucun remboursement n\'est accordé pour la période en cours lors de la résiliation, sauf disposition légale contraire.',
  },
  {
    title: '5. Contenu utilisateur',
    body: 'En publiant du contenu (photos, commentaires, prises), tu déclares en être propriétaire et accordes à FishBook une licence non exclusive pour l\'afficher dans l\'application. Il est interdit de publier du contenu illégal, diffamatoire, harcelant ou portant atteinte aux droits de tiers.',
  },
  {
    title: '6. Intelligence artificielle',
    body: 'La détection d\'espèces par IA fournit des suggestions indicatives uniquement. FishBook ne garantit pas l\'exactitude des identifications. Ne consomme jamais un poisson sur la seule base d\'une identification IA.',
  },
  {
    title: '7. Propriété intellectuelle',
    body: 'L\'application FishBook, son code, son design, ses logos et sa base de données d\'espèces sont la propriété exclusive de FishBook. Toute reproduction sans autorisation est interdite.',
  },
  {
    title: '8. Limitation de responsabilité',
    body: 'FishBook est fourni "tel quel". Nous ne garantissons pas la disponibilité continue du service, ni l\'exactitude des identifications d\'espèces ou des données météorologiques. FishBook ne saurait être tenu responsable de dommages indirects résultant de l\'utilisation de l\'application.',
  },
  {
    title: '9. Résiliation',
    body: 'Tu peux supprimer ton compte à tout moment depuis les paramètres de l\'application. La suppression entraîne l\'effacement de tes données personnelles sous 30 jours. FishBook se réserve le droit de suspendre un compte en cas de violation des présentes conditions.',
  },
  {
    title: '10. Droit applicable',
    body: 'Les présentes conditions sont régies par le droit français. Pour toute question : support@fishbook.app',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ThemedSafeArea style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Dernière mise à jour : avril 2026
          {'\n\n'}
          En utilisant FishBook, tu acceptes les présentes conditions d'utilisation. Lis-les attentivement.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Pour toute question : support@fishbook.app
        </Text>
      </ScrollView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  intro: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginTop: 8 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionBody: { fontSize: 14, color: '#374151', lineHeight: 22 },
  footer: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
});
