import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

const environment = { ...process.env }
const bundledMacJava = '/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home'

if (process.platform === 'darwin' && existsSync(bundledMacJava)) {
  environment.JAVA_HOME = bundledMacJava
  environment.PATH = `${join(bundledMacJava, 'bin')}${delimiter}${environment.PATH ?? ''}`
}

const firebaseExecutable = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'firebase.cmd' : 'firebase',
)
const emulator = spawn(firebaseExecutable, [
  'emulators:start',
  '--only',
  'firestore',
  '--project',
  'dashboard-local',
], {
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
