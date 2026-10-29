// Names of the media jobs. The queues are created at startup (see the media worker); a job can only be sent to a
// queue that exists.
export const mediaQueues = {
  process: 'media-process',
  failed: 'media-process-failed',
  retire: 'media-retire',
  sweep: 'media-sweep',
} as const
