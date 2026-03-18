import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';

const SECTIONS = [
  {
    title: '1. Données collectées',
    body: 'FishBook collecte les informations que tu fournis lors de l\'inscription (prénom, nom, pseudo, email) ainsi que les données de tes prises (espèce, poids, taille, lieu, photos). Nous collectons également des données techniques (logs, appareil) pour améliorer l\'application.',
  },
  {
    title: '2. Utilisation des données',
    body: 'Tes données servent à faire fonctionner l\'application : afficher ton profil, gérer tes prises, te permettre d\'interagir avec la communauté et d\'utiliser la détection d\'espèces par IA. Nous n\'utilisons jamais tes données à des fins publicitaires.',
  },
  {
    title: '3. Localisation',
    body: 'FishBook accède à ta position uniquement lorsque l\'application est ouverte (localisation en premier plan) pour afficher la météo locale et enregistrer le lieu de ta prise. Nous ne collectons jamais ta position en arrière-plan.',
  },
  {
    title: '4. Appareil photo et photos',
    body: 'L\'accès à l\'appareil photo et à la bibliothèque de photos est utilisé exclusivement pour ajouter des photos à tes prises. Les photos sont stockées de manière sécurisée sur nos serveurs (Supabase). Tes photos privées ne sont jamais partagées sans ton consentement.',
  },
  {
    title: '5. Partage des données',
    body: 'Tes prises marquées comme "publiques" sont visibles par tous les utilisateurs. Tes prises privées ne sont visibles que par toi. Nous ne vendons jamais tes données à des tiers. Nous pouvons partager des données agrégées et anonymisées à des fins de statistiques.',
  },
  {
    title: '6. Sécurité',
    body: 'Tes données sont stockées de manière sécurisée via Supabase (chiffrement en transit et au repos). L\'accès à tes données personnelles est protégé par des règles de sécurité strictes (Row Level Security).',
  },
  {
    title: '7. Tes droits',
    body: 'Conformément au RGPD, tu peux à tout moment accéder à tes données, les modifier, les exporter ou demander leur suppression en contactant support@fishbook.app. Tu peux également supprimer ton compte depuis les paramètres de l\'application.',
  },
  {
    title: '8. Conservation des données',
    body: 'Tes données sont conservées aussi longtemps que ton compte est actif. En cas de suppression de compte, toutes tes données personnelles sont effacées sous 30 jours.',
  },
  {
    title: '9. Contact',
    body: 'Pour toute question relative à la confidentialité, contacte-nous à : support@fishbook.app',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ThemedSafeArea style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Politique de confidentialité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Dernière mise à jour : mars 2025
          {'\n\n'}
          FishBook (ci-après "nous") s'engage à protéger ta vie privée. Cette politique explique comment nous collectons, utilisons et protégeons tes données personnelles.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          En utilisant FishBook, tu acceptes les termes de cette politique de confidentialité.
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
