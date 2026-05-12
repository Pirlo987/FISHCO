import PostHog from 'posthog-react-native';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let client: PostHog | null = null;

export function initAnalytics(): void {
  if (!API_KEY || client) return;
  try {
    client = new PostHog(API_KEY, { host: HOST, flushAt: 20, flushInterval: 30000 });
  } catch {
    // Native module unavailable (Expo Go), fail silently
  }
}

export function identifyAnalytics(userId: string, traits?: Record<string, any>): void {
  client?.identify(userId, traits as any);
}

export function trackEvent(event: string, properties?: Record<string, any>): void {
  client?.capture(event, properties as any);
}

export function resetAnalytics(): void {
  client?.reset();
}
