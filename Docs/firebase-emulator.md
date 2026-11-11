# Local Firebase development

The checked-in `.env.development` selects the Firestore emulator at `127.0.0.1:8080` and the synthetic project ID `dashboard-local`. Development must use the emulator or an explicitly marked synthetic test project; `src/config/firebaseEnvironment.js` checks the configuration at startup.

Follow the [README setup](../README.md#local-development) to configure a local password hash and placeholder Firebase values. Vite gives `.env.local` precedence over `.env.development`, so a project ID or emulator setting in `.env.local` can override the defaults. Keep development pointed at `dashboard-local`; do not copy production values into the development environment.

Start the Firestore emulator and Vite in separate terminals:

```sh
npm run emulators:firestore
npm run dev
```

The emulator requires Java 21 or later; its first start may download a Firestore binary. The app is available at the URL printed by Vite, and the Emulator UI at <http://127.0.0.1:4000/firestore>. The emulator command does not import or export data, so its data is temporary and is lost when the process stops. Browser `localStorage` is separate and persists until cleared; a missing emulator document can be seeded from that cache when the app connects. Use a separate browser profile or clear the dashboard's local storage for a fresh test.
