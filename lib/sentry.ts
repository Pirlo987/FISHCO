import * as Sentry from '@sentry/react-native';

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr') return null;
      return breadcrumb;
    },
  });
}

export { Sentry };
