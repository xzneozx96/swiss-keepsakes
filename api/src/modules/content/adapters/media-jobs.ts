import type { PgBoss } from 'pg-boss'
import type { MediaJob } from '../application/process-media.ts'
import { mediaQueues } from '../application/media-queues.ts'

export interface MediaQueues {
  process: string
  failed: string
  retire: string
  sweep: string
}

// Four attempts. Before retry n pg-boss waits 30 * 2^n seconds, less up to half of it as jitter.
export const mediaRetry = { retryLimit: 3, retryDelay: 30, retryBackoff: true }

// Every role creates the queues at startup, because confirm sends a job and a send to an unknown queue fails.
// The dead-letter queue goes first, so the process queue can point at it.
export async function createMediaQueues(boss: PgBoss, queues: MediaQueues = mediaQueues, retry = mediaRetry): Promise<void> {
  // createQueue leaves an existing queue as it is, so each update applies a changed policy on the next start.
  await boss.createQueue(queues.failed, retry)
  await boss.updateQueue(queues.failed, retry)
  await boss.createQueue(queues.process, { ...retry, deadLetter: queues.failed })
  await boss.updateQueue(queues.process, { ...retry, deadLetter: queues.failed })
  // A retire job that fails when storage is down must wait out the outage, not exhaust its retries in seconds.
  for (const name of [queues.retire, queues.sweep]) {
    await boss.createQueue(name, retry)
    await boss.updateQueue(name, retry)
  }
}

export interface MediaHandlers {
  processMedia: (job: MediaJob) => Promise<void>
  failMedia: (job: MediaJob) => Promise<void>
  retireMedia?: (job: MediaJob) => Promise<void>
  sweepMedia?: () => Promise<unknown>
}

// Only the worker roles call this. pg-boss hands each handler one job at a time (batchSize 1, the default); a
// handler that throws fails the job, which pg-boss retries and finally moves to the failed queue.
export async function startMediaWorkers(boss: PgBoss, { processMedia, failMedia, retireMedia, sweepMedia }: MediaHandlers, queues: MediaQueues = mediaQueues): Promise<void> {
  await boss.work<MediaJob>(queues.process, async ([job]) => {
    if (job)
      await processMedia(job.data)
  })
  await boss.work<MediaJob>(queues.failed, async ([job]) => {
    if (job)
      await failMedia(job.data)
  })
  if (retireMedia) {
    await boss.work<MediaJob>(queues.retire, async ([job]) => {
      if (job)
        await retireMedia(job.data)
    })
  }
  if (sweepMedia) {
    await boss.work(queues.sweep, async () => {
      await sweepMedia()
    })
    // Hourly. schedule() upserts by queue name, so every start leaves one schedule.
    await boss.schedule(queues.sweep, '17 * * * *')
  }
}
