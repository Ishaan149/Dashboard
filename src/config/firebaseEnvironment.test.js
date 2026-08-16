import { describe, expect, it } from 'vitest'
import { assertSafeFirebaseEnvironment } from './firebaseEnvironment'

describe('Firebase environment isolation', () => {
  it('accepts the local emulator for test configuration', () => {
    expect(() => assertSafeFirebaseEnvironment({
      MODE: 'test',
      VITE_FIREBASE_ENV: 'test',
      VITE_FIREBASE_EMULATOR: 'true',
      VITE_FIREBASE_PROJECT_ID: 'synthetic-emulator',
    })).not.toThrow()
  })

  it('accepts only an explicitly identified synthetic test project', () => {
    expect(() => assertSafeFirebaseEnvironment({
      MODE: 'development',
      VITE_FIREBASE_ENV: 'test',
      VITE_FIREBASE_PROJECT_ID: 'dashboard-synthetic-test',
      VITE_FIREBASE_TEST_PROJECT_ID: 'dashboard-synthetic-test',
    })).not.toThrow()
    expect(() => assertSafeFirebaseEnvironment({
      MODE: 'test',
      VITE_FIREBASE_ENV: 'test',
      VITE_FIREBASE_PROJECT_ID: 'unknown-project',
      VITE_FIREBASE_TEST_PROJECT_ID: 'dashboard-synthetic-test',
    })).toThrow(/synthetic test project/u)
  })

  it('rejects an explicitly identified production project or credentials', () => {
    expect(() => assertSafeFirebaseEnvironment({
      MODE: 'development',
      VITE_FIREBASE_PROJECT_ID: 'dashboard-production',
      VITE_FIREBASE_PRODUCTION_PROJECT_ID: 'dashboard-production',
    })).toThrow(/production Firebase project/u)
    expect(() => assertSafeFirebaseEnvironment({
      MODE: 'test',
      VITE_FIREBASE_ENV: 'test',
      VITE_FIREBASE_EMULATOR: 'true',
      VITE_FIREBASE_CREDENTIALS: 'production',
    })).toThrow(/production Firebase credentials/u)
  })
})
