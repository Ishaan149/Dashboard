import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { assertSafeFirebaseEnvironment } from './config/firebaseEnvironment'

assertSafeFirebaseEnvironment(import.meta.env)

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)

if (import.meta.env.VITE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(
    db,
    import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1',
    Number(import.meta.env.VITE_FIREBASE_EMULATOR_PORT || 8080),
  )
}
