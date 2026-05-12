import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sentry } from '@/lib/sentry';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
        </View>
        <Text style={styles.title}>Une erreur est survenue</Text>
        <Text style={styles.message}>
          Quelque chose s'est mal passé. Réessaie ou redémarre l'application.
        </Text>
        <Pressable onPress={this.reset} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.btnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  btnText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 16,
  },
});
