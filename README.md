# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Reconnaissance d'espèce (OpenAI via Supabase)

La détection automatique de l'espèce exploite une fonction Edge Supabase (`detect-species`) qui appelle OpenAI côté serveur pour éviter toute fuite de clé dans l'app mobile.

1. Déployez la fonction depuis `supabase/functions/detect-species`. Avec le CLI Supabase : `supabase functions deploy detect-species --project-ref <votre-ref>`.
2. Définissez les variables d'environnement sur le projet Supabase (Dashboard → Project Settings → Functions):
   - `OPENAI_API_KEY` (obligatoire)
   - `OPENAI_MODEL` (optionnel, défaut `gpt-4o-mini`)
3. Dans l'app Expo, assurez-vous que `.env` contient `EXPO_PUBLIC_SPECIES_AI_FUNCTION=detect-species` (ou un autre nom si vous l'avez modifié) puis relancez Expo pour recharger l'env.

## Connexion Google (Supabase + Expo)

1. Activez Google dans Supabase : Dashboard → Authentication → Providers → Google. Renseignez le `Client ID`/`Client secret` récupérés dans la console Google Cloud.
2. Créez vos identifiants OAuth sur Google Cloud :
   - Client iOS : type "iOS", bundle `com.fishco.app`.
   - Client Android : type "Android", package `com.fishco.app`, ajoutez les empreintes SHA-1/256 de votre build (dev client ou keystore).
   - Client Web : type "Web". Si vous testez en web/Expo Go, ajoutez l'URI de redirection proxy Expo `https://auth.expo.io/@<votre-compte-expo>/fishco`.
3. Ajoutez les IDs dans `.env` (puis redémarrez Metro) :
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...`
4. Lancez l'app (`npx expo start`). Les boutons "Continuer avec Google" utilisent `expo-auth-session` pour récupérer l'id token et l'envoyer à Supabase (`signInWithIdToken`).
