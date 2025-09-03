import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  const onSignOut = async () => {
    await signOut();
    Alert.alert('Déconnecté');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil</Text>
      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{session?.user.email}</Text>

      <Pressable onPress={onSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  label: { fontWeight: '600', color: '#555' },
  value: { fontSize: 16 },
  button: { marginTop: 16, backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});

