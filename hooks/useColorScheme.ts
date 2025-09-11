// Force light mode across the app regardless of system settings
export function useColorScheme() {
  return 'light' as const;
}
