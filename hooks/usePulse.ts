import React from 'react';
import { Animated } from 'react-native';

export function usePulse() {
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
}
