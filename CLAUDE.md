# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FishCo (FishBook) is a React Native + Expo mobile app for fishing enthusiasts. It features location-based fish species tracking, AI-powered species detection from photos, a social community feed, and a gamification system with points and levels.

## Development Commands

```bash
npm install              # Install dependencies
npx expo start           # Start Metro bundler (dev server)
npx expo start --ios     # Start on iOS simulator
npx expo start --android # Start on Android emulator
npx expo start --web     # Start in browser
npx expo lint            # Run ESLint
```

Supabase Edge Functions are deployed via the Supabase CLI:
```bash
npx supabase functions deploy detect-species --project-ref <ref>
```

## Tech Stack

- **React 19 + React Native 0.81** with **Expo SDK 54** and **TypeScript** (strict mode)
- **Expo Router 6** for file-based routing
- **Supabase** for auth, database (PostgreSQL), storage, and Edge Functions (Deno)
- **React Context** for state management (`AuthProvider`)
- **AsyncStorage** for local persistence (onboarding flags, session)
- **Reanimated 4** for animations (plugin must remain last in babel.config.js)

## Architecture

### Routing & Navigation

File-based routing via Expo Router. The root `app/_layout.tsx` wraps everything in `AuthProvider` > `ThemeProvider` > `AuthGate`.

**Route groups:**
- `(auth)/` — Login, register screens
- `(onboarding)/` — Multi-step profile setup (name, username, country, photo, level)
- `(tabs)/` — Main 5-tab app: Home, Explore (Fishdex), Add Catch, Community, Profile
- `catches/[id]` — Catch detail
- `species/[slug]` — Species detail
- `profile-settings` — Settings (modal presentation)

### Auth Flow

`AuthGate` (in `app/_layout.tsx`) controls routing based on three states read from AsyncStorage:
1. `onboarding_seen` — Has the user seen the intro?
2. `profile_onboarding_pending` — Is profile setup in progress?
3. `profile_onboarding_done` — Is profile complete?

It also hydrates state from the `profiles` table on first session. Auth supports email/password, Google, Apple, and Facebook OAuth.

### Backend (Supabase)

- **Tables:** `profiles`, `catches`, `species`, `profile_points`, `region_tags`, `likes`
- **Storage buckets:** `catch-photos`, `avatars`, `species`
- **RPC:** `award_points` — server-side gamification point allocation
- **Edge Function:** `detect-species` — calls OpenAI Vision API server-side for AI species detection

The Supabase client (`lib/supabase.ts`) uses AsyncStorage for session persistence on device and disables persistence in SSR/non-browser contexts.

### Cross-Component Communication

`lib/events.ts` provides a typed event emitter. The main event is `catch:added`, emitted after logging a catch and consumed by screens that need to refresh (home, species detail).

### Gamification

`lib/gamification.ts` defines point rules and level titles (Novice, Apprenti, Moussaillon, Capitaine, Legende). Points are awarded via the `award_points` RPC call for actions like first species catch, personal bests, public sharing, and likes.

### Path Alias

`@/` maps to the project root, configured in both `tsconfig.json` (paths) and `babel.config.js` (module-resolver).

## Environment Variables

Required in `.env` (prefixed with `EXPO_PUBLIC_` for client access):
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SPECIES_AI_FUNCTION` (default: `detect-species`)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

Server-side (Supabase Edge Function secrets):
- `OPENAI_API_KEY`, `OPENAI_MODEL` (default: `gpt-4o-mini`)

## Key Conventions

- UI text is in **French** throughout the app
- `react-native-reanimated` must be imported at the very top of `app/_layout.tsx` before any other imports
- The Reanimated babel plugin must be the **last** plugin in `babel.config.js`
- Icons use `@expo/vector-icons` (Ionicons)
- Colors are defined in `constants/Colors.ts` with light/dark theme support
