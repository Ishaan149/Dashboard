import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, dirname, join, resolve } from 'node:path'

const environment = { ...process.env }
const bundledMacJava = '/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home'

if (process.platform === 'darwin' && existsSync(bundledMacJava)) {
  environment.JAVA_HOME = bundledMacJava
  environment.PATH = `${join(bundledMacJava, 'bin')}${delimiter}${environment.PATH ?? ''}`
}

const require = createRequire(import.meta.url)
const firebasePackagePath = require.resolve('firebase-tools/package.json')
const firebasePackage = require(firebasePackagePath)
const firebaseEntryPoint = resolve(dirname(firebasePackagePath), firebasePackage.bin.firebase)

const emulator = spawn(process.execPath, [
  firebaseEntryPoint,
  'emulators:start',
  '--only',
  'firestore',
  '--project',
  'dashboard-local',
], {
  cwd: new URL('..', import.meta.url),
  env: environment,
  stdio: 'inherit',
})

emulator.on('error', error => {
  console.error(`Unable to start the Firestore emulator: ${error.message}`)
  process.exitCode = 1
})

emulator.on('exit', code => {
  process.exitCode = code ?? 1
})
