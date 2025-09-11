import React from 'react';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';

type Props = {
  children: React.ReactNode;
  style?: any;
  edges?: Edge[];
};

// SafeArea thématisée, par défaut protège le haut uniquement.
export function ThemedSafeArea({ children, style, edges = ['top'] }: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

