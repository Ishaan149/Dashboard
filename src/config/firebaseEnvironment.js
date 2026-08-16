export function assertSafeFirebaseEnvironment(env) {
  const mode = env.MODE ?? 'development'
  const projectId = env.VITE_FIREBASE_PROJECT_ID
  const productionProjectId = env.VITE_FIREBASE_PRODUCTION_PROJECT_ID
  const isEmulator = env.VITE_FIREBASE_EMULATOR === 'true'
  const isTestEnvironment = mode === 'test' || env.VITE_FIREBASE_ENV === 'test'
  const isNonProductionBuild = mode !== 'production'

  if (
    isNonProductionBuild
    && productionProjectId
    && projectId
    && projectId === productionProjectId
  ) {
    throw new Error('Refusing to use the production Firebase project outside an approved production build.')
  }

  if (
    isNonProductionBuild
    && env.VITE_FIREBASE_CREDENTIALS === 'production'
  ) {
    throw new Error('Refusing to use production Firebase credentials outside an approved production build.')
  }

  if (!isTestEnvironment) return

  const isExplicitSyntheticProject = Boolean(
    projectId && env.VITE_FIREBASE_TEST_PROJECT_ID && projectId === env.VITE_FIREBASE_TEST_PROJECT_ID,
  )
  if (!isEmulator && !isExplicitSyntheticProject) {
    throw new Error('Test Firebase configuration must use the Local Emulator or an explicitly marked synthetic test project.')
  }
}
