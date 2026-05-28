import { spawn } from 'node:child_process'

const root = new URL('..', import.meta.url)
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const detached = process.platform !== 'win32'

let stopping = false
let exitCode = 0
const exited = new Set()

const children = [
  spawn(pnpm, ['dev:web'], {
    cwd: root,
    detached,
    stdio: 'inherit'
  }),
  spawn(pnpm, ['dev:worker'], {
    cwd: root,
    detached,
    stdio: 'inherit'
  })
]

function maybeExit() {
  if (stopping && exited.size === children.length) process.exit(exitCode)
}

function killChild(child, signal) {
  if (child.killed) return
  try {
    if (detached && child.pid) {
      process.kill(-child.pid, signal)
    } else {
      child.kill(signal)
    }
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

function stop(signal = 'SIGTERM', code = 0) {
  if (stopping) return
  stopping = true
  exitCode = code

  for (const child of children) {
    killChild(child, signal)
  }

  setTimeout(() => {
    for (const child of children) {
      killChild(child, 'SIGKILL')
    }
    process.exit(exitCode)
  }, 5000).unref()
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    exited.add(child)

    if (!stopping) {
      stop(signal ?? 'SIGTERM', code ?? 1)
    } else {
      maybeExit()
    }
  })
}

process.on('SIGINT', () => stop('SIGINT', 130))
process.on('SIGTERM', () => stop('SIGTERM', 143))
