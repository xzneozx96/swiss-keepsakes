import process from 'node:process'

// Preloaded by integration/main.test.ts: SIGUSR2 makes the process fail the way a bug outside a request would.
process.on('SIGUSR2', () => {
  if (process.env.CRASH === 'reject')
    void Promise.reject(new Error('rejected while saving anna@example.ch'))
  else
    throw new Error('thrown while saving anna@example.ch')
})
