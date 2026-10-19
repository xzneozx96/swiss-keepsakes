import pg from 'pg'
import { PgBoss } from 'pg-boss'

const name = process.argv[2] ?? 'worker'
const url = process.env.SP2_CHILD_DB_URL ?? ''
const schema = process.env.SP2_SCHEMA ?? 'sp2_spike'
if (!url) throw new Error('SP2_CHILD_DB_URL missing')

const pool = new pg.Pool({ connectionString: url, max: 2 })
const boss = new PgBoss({ connectionString: url, schema })
boss.on('error', (error) => console.error(`[${name}] pg-boss error: ${error.message}`))

async function record(queue: string, jobId: string, deadline: string | null) {
  await pool.query(
    `insert into ${schema}.runs (queue, job_id, proc, fired_at, deadline) values ($1, $2, $3, now(), $4)`,
    [queue, jobId, name, deadline],
  )
}

await boss.start()
for (const queue of ['hold-expiry', 'cron-rrule', 'cron-minute']) await boss.createQueue(queue)

await boss.work<{ holdId: string; deadline: string }>('hold-expiry', { batchSize: 10 }, async (jobs) => {
  for (const job of jobs) await record('hold-expiry', job.id, job.data.deadline)
})
await boss.work('cron-rrule', async (jobs) => {
  for (const job of jobs) await record('cron-rrule', job.id, null)
})
await boss.work('cron-minute', async (jobs) => {
  for (const job of jobs) await record('cron-minute', job.id, null)
})

await boss.schedule('cron-rrule', 'FREQ=SECONDLY;INTERVAL=5')
await boss.schedule('cron-minute', '* * * * *')
console.log(`READY ${name}`)

const stop = async () => {
  await boss.stop({ graceful: true, timeout: 5000 })
  await pool.end()
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
