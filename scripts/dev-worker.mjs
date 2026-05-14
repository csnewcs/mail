import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const workerFile = resolve(root, 'build-worker/worker.js')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

let stopping = false
let buildExited = false
let runner = null

const build = spawn(
  pnpm,
  ['exec', 'vite', 'build', '--config', 'vite.worker.config.ts', '--watch'],
  {
    cwd: root,
    stdio: 'inherit'
  }
)

build.on('exit', (code, signal) => {
  buildExited = true
  if (stopping) return
  runner?.kill('SIGTERM')
  process.exit(code ?? (signal ? 1 : 0))
})

async function waitForWorkerBuild() {
  while (!stopping) {
    if (existsSync(workerFile)) return
    if (buildExited) throw new Error('Worker build exited before creating build-worker/worker.js')
    await delay(250)
  }
}

function startRunner() {
  runner = spawn(process.execPath, ['--watch', workerFile], {
    cwd: root,
    stdio: 'inherit'
  })

  runner.on('exit', (code, signal) => {
    runner = null
    if (stopping || signal) return
    build.kill('SIGTERM')
    process.exit(code ?? 1)
  })
}

function stop(signal) {
  if (stopping) return
  stopping = true
  build.kill(signal)
  runner?.kill(signal)
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))

try {
  await waitForWorkerBuild()
  if (!stopping) startRunner()
} catch (error) {
  console.error(error)
  stop('SIGTERM')
  process.exit(1)
}
