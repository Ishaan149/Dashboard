# Local Firebase development

Development builds are configured to use the local Firestore emulator with the synthetic project ID `dashboard-local`. They do not connect to remote Firestore.

Start the emulator in one terminal:

```sh
npm run emulators:firestore
```

Start Vite in another terminal:

```sh
npm run dev
```

The dashboard is available at the URL printed by Vite. The local Emulator UI is available at <http://127.0.0.1:4000/firestore>.

Emulator data is temporary and is cleared when the emulator process stops. The first emulator start may download its local Firestore binary.
