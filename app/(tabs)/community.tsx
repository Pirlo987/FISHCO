import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedSafeArea } from '@/components/SafeArea';
import { ThemedText } from '@/components/ThemedText';

const upcomingGroups = [
  {
    title: 'Crew Atlantique',
    description: 'Partage des spots, planification de sorties, météo en direct.',
    members: 18,
  },
  {
    title: 'Ligériens',
    description: 'Focus carnassier, bonnes pratiques et comptes rendus rapides.',
    members: 42,
  },
  {
    title: 'Testeurs officiels',
    description: 'Aidez-nous à façonner les outils de coordination des groupes.',
    members: 9,
  },
];

export default function CommunityScreen() {
  return (
    <ThemedSafeArea edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1E3C72', '#2A5298']} style={styles.hero}>
          <ThemedText style={styles.heroEyebrow} lightColor="#9EC5FF" darkColor="#C3DAFF">
            À venir
          </ThemedText>
          <ThemedText style={styles.heroTitle} lightColor="#FFFFFF" darkColor="#FFFFFF">
            Groupes & communauté
          </ThemedText>
          <ThemedText style={styles.heroSubtitle} lightColor="#F4F6FA" darkColor="#EEF2FF">
            Organisez vos sorties, partagez vos prises et créez votre équipage.
          </ThemedText>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Brouillon de fonctionnalités</ThemedText>
          <ThemedText style={styles.sectionSubtitle} lightColor="#6B7280" darkColor="#ADB5BD">
            Dites-nous ce qui vous serait utile.
          </ThemedText>
        </View>

        <View style={styles.cardList}>
          {upcomingGroups.map((group) => (
            <View key={group.title} style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>{group.title}</ThemedText>
                <ThemedText style={styles.cardBadge} lightColor="#1E3C72" darkColor="#2F7AF8">
                  {group.members} membres cibles
                </ThemedText>
              </View>
              <ThemedText style={styles.cardDescription} lightColor="#4B5563" darkColor="#CED4DA">
                {group.description}
              </ThemedText>
            </View>
          ))}
        </View>

        <Pressable style={styles.ctaButton} accessibilityRole="button">
          <ThemedText style={styles.ctaText} lightColor="#FFFFFF" darkColor="#FFFFFF">
            Proposer un groupe pilote
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FB',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  cardList: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#0F1824',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#1E3C72',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
