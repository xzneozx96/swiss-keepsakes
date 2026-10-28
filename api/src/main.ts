import type { Tx } from './platform/db/client.ts'
import type { CommandDeps } from './platform/http/app.ts'
import process from 'node:process'
import { guardUseCases } from './modules/content/adapters/database-errors.ts'
import { createMediaLogAlert } from './modules/content/adapters/media-alert.ts'
import { createMediaQueues, startMediaWorkers } from './modules/content/adapters/media-jobs.ts'
import { createMediaRepository } from './modules/content/adapters/media-repository.ts'
import { createPinRepository } from './modules/content/adapters/pin-repository.ts'
import { createPublicReadRepository } from './modules/content/adapters/public-repository.ts'
import { registerContentRoutes } from './modules/content/adapters/routes.ts'
import { createStoryRepository } from './modules/content/adapters/story-repository.ts'
import { createTourRepository } from './modules/content/adapters/tour-repository.ts'
import { makeConfirmUpload, makeCreatePin, makeCreateStoryGroup, makeCreateStoryVersion, makeCreateTour, makeDeletePin, makeDeleteStoryVersion, makeDeleteTour, makeFailMedia, makeGetMap, makeGetMedia, makeGetPin, makeGetStory, makeGetTour, makeHidePin, makeListCategories, makeListStories, makeListTours, makeMoveStoryVersion, makeProcessMedia, makePublishPin, makePublishStoryVersion, makePublishTour, makeRequestUpload, makeRetireMedia, makeSavePin, makeSaveStoryGroup, makeSaveStoryVersion, makeSaveTour, makeSweepUploads, makeUnpublishStoryVersion, makeUnpublishTour } from './modules/content/index.ts'
import { createAccessRepository } from './modules/identity/adapters/access-repository.ts'
import { createGuestProfileRepository } from './modules/identity/adapters/guest-profile-repository.ts'
import { createInvitationRepository } from './modules/identity/adapters/invitation-repository.ts'
import { createMembershipRepository } from './modules/identity/adapters/membership-repository.ts'
import { createPendingConditions } from './modules/identity/adapters/pending-conditions.ts'
import { createPlatformAdminRepository } from './modules/identity/adapters/platform-admin-repository.ts'
import { invitationPreviewPath, registerIdentityRoutes } from './modules/identity/adapters/routes.ts'
import { createStoreRepository } from './modules/identity/adapters/store-repository.ts'
import { createUserDirectory } from './modules/identity/adapters/user-directory.ts'
import { invitationScreens, makeAcceptInvitation, makeCreateStore, makeGetOnboarding, makeInvitationLink, makeInviteManager, makeListMembers, makeListMyStores, makeListStores, makeLoadIdentity, makeOpenStoreForSale, makePreviewInvitation, makeRemoveMember, makeResendManagerInvitation, makeResendOwnerInvitation, makeRevokeInvitation, makeUpdateStoreInformation, newInvitationToken } from './modules/identity/index.ts'
import { createMailJobScrubber } from './modules/notifications/adapters/job-scrubber.ts'
import { createMailQueues, mailQueues, startMailWorkers } from './modules/notifications/adapters/jobs.ts'
import { createLogAlert } from './modules/notifications/adapters/mail-alert.ts'
import { createSentMailRepository } from './modules/notifications/adapters/sent-mail-repository.ts'
import { createSmtpMailer, createUnconfiguredMailer } from './modules/notifications/adapters/smtp-mailer.ts'
import { makeFailMail } from './modules/notifications/application/fail-mail.ts'
import { makeQueueMail } from './modules/notifications/application/queue-mail.ts'
import { brandName } from './modules/notifications/application/render-mail.ts'
import { makeSendMail } from './modules/notifications/application/send-mail.ts'
import { createAuditLog } from './platform/audit.ts'
import { createAuth, createSessionReader, ownOrigin } from './platform/auth.ts'
import { systemClock } from './platform/clock.ts'
import { loadConfig } from './platform/config.ts'
import { createDatabase, createPool } from './platform/db/client.ts'
import { createUnitOfWork } from './platform/db/unit-of-work.ts'
import { createHealthCheck } from './platform/health.ts'
import { createApp } from './platform/http/app.ts'
import { idempotency, idempotencyActor } from './platform/http/idempotency.ts'
import { startHttpServer } from './platform/http/server.ts'
import { startJobs } from './platform/jobs/boss.ts'
import { createJobQueue } from './platform/jobs/queue.ts'
import { createLogger } from './platform/logger.ts'
import { createSmtpTransport } from './platform/mail.ts'
import { createS3Storage, createUnconfiguredStorage } from './platform/storage.ts'

// The shop name in the N01 subject, the sign-in code mail.
const appName = brandName

const loaded = loadConfig(process.env)
if (!loaded.ok) {
  process.stderr.write(`${loaded.message}\n`)
  process.exit(1)
}
const { config } = loaded
const logger = createLogger(config.LOG_LEVEL)
// Each start puts its stop first, so shutdown runs in reverse start order: the API stops taking requests,
// then pg-boss stops, then the database pool closes.
const stops: (() => Promise<void>)[] = []

let stopping = false
async function shutdown(reason: string) {
  if (stopping)
    return
  stopping = true
  logger.info({ reason }, 'shutting down')
  // Exit anyway if a connection or a job never finishes.
  setTimeout(() => {
    logger.error('shutdown timed out')
    process.exit(1)
  }, 10_000).unref()
  for (const stop of stops) {
    try {
      await stop()
    }
    catch (error) {
      logger.error({ err: error }, 'stop failed')
      process.exitCode = 1
    }
  }
  logger.info('stopped')
}

function crash(message: string, error: unknown) {
  logger.fatal({ err: error }, message)
  process.exitCode = 1
  void shutdown(message)
}

async function main() {
  const pool = createPool(config.DATABASE_URL, logger)
  stops.unshift(() => pool.end())
  const jobs = await startJobs(config.DATABASE_URL_UNPOOLED, config.ROLE !== 'api', logger)
  stops.unshift(jobs.stop)
  const uow = createUnitOfWork(createDatabase(pool))
  await createMailQueues(jobs.boss)
  // Confirm sends a media job, so the queues exist before the first send, for every role.
  await createMediaQueues(jobs.boss)
  // R5: with no AWS_* the service starts, and the media routes answer 503 storage-unavailable.
  const storage = config.storage ? createS3Storage(config.storage) : createUnconfiguredStorage()
  if (config.ROLE !== 'api') {
    await startMediaWorkers(jobs.boss, {
      processMedia: makeProcessMedia({ uow, media: createMediaRepository(), storage, clock: systemClock }),
      failMedia: makeFailMedia({ uow, media: createMediaRepository(), storage, clock: systemClock, alert: createMediaLogAlert(logger) }),
      retireMedia: makeRetireMedia({ uow, media: createMediaRepository(), storage, clock: systemClock }),
      sweepMedia: makeSweepUploads({ storage, clock: systemClock }),
    })
    const sentMail = createSentMailRepository()
    if (!config.smtp)
      logger.warn({ event: 'mail.smtp-unset' }, 'SMTP_* is not set: every mail fails and retries until it is')
    const mailer = config.smtp ? createSmtpMailer(createSmtpTransport(config.smtp), config.smtp.from, config.smtp.fromName) : createUnconfiguredMailer(logger)
    await startMailWorkers(jobs.boss, {
      sendMail: makeSendMail({
        uow,
        sentMail,
        mailer,
        invitationLink: makeInvitationLink({ invitations: createInvitationRepository(), clock: systemClock, newToken: newInvitationToken, appUrl: config.APP_URL, screens: invitationScreens }),
        clock: systemClock,
      }),
      failMail: makeFailMail({ uow, sentMail, clock: systemClock, alert: createLogAlert(logger), scrub: createMailJobScrubber() }),
    })
  }
  if (config.ROLE !== 'worker') {
    const checkHealth = createHealthCheck({ pool, boss: jobs.boss, logger })
    const queueMail = makeQueueMail({ sentMail: createSentMailRepository(), jobs: createJobQueue(jobs.boss), clock: systemClock, queue: mailQueues.send })
    const auth = createAuth({
      db: createDatabase(pool),
      baseUrl: config.BETTER_AUTH_URL,
      secret: config.BETTER_AUTH_SECRET,
      google: config.google,
      // Queues the N01 job inside a transaction and returns. The worker sends it, so no request waits for SMTP.
      sendSignInCode: async ({ email, code, language }) => {
        await uow.run(tx => queueMail(tx, { template: 'N01', to: email, language, storeId: null, params: { shop: appName, code } }))
      },
      logger,
    })
    const identity = {
      authHandler: auth.handler,
      origin: ownOrigin(config.BETTER_AUTH_URL),
      readSession: createSessionReader(auth),
      loadIdentity: makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() }),
      listMyStores: makeListMyStores({ uow, memberships: createMembershipRepository() }),
    }
    const database = createDatabase(pool)
    const stores = createStoreRepository()
    const invitations = createInvitationRepository()
    const conditions = createPendingConditions<Tx>()
    const audit = createAuditLog(systemClock)
    const users = createUserDirectory()
    const admins = createPlatformAdminRepository()
    const memberships = createMembershipRepository()
    const useCases = {
      createStore: makeCreateStore({ uow, stores, invitations, conditions, users, admins, queueMail, audit, clock: systemClock }),
      listStores: makeListStores({ uow, stores, invitations, conditions, clock: systemClock }),
      resendOwnerInvitation: makeResendOwnerInvitation({ uow, stores, invitations, conditions, queueMail, audit, clock: systemClock }),
      previewInvitation: makePreviewInvitation({ uow, invitations, clock: systemClock }),
      acceptInvitation: makeAcceptInvitation({ uow, invitations, stores, memberships, users, admins, audit, clock: systemClock }),
      getOnboarding: makeGetOnboarding({ uow, stores, conditions }),
      updateStoreInformation: makeUpdateStoreInformation({ uow, stores, audit, clock: systemClock }),
      openStoreForSale: makeOpenStoreForSale({ uow, stores, conditions, audit, clock: systemClock }),
      listMembers: makeListMembers({ uow, memberships, invitations, clock: systemClock }),
      inviteManager: makeInviteManager({ uow, stores, invitations, memberships, users, admins, queueMail, audit, clock: systemClock }),
      resendManagerInvitation: makeResendManagerInvitation({ uow, stores, invitations, memberships, users, queueMail, audit, clock: systemClock }),
      revokeInvitation: makeRevokeInvitation({ uow, invitations, audit, clock: systemClock }),
      removeMember: makeRemoveMember({ uow, memberships, invitations, audit, clock: systemClock }),
    }
    const pinDeps = { uow, pins: createPinRepository(), media: createMediaRepository(), audit, clock: systemClock }
    const storyDeps = { uow, stories: createStoryRepository(), media: createMediaRepository(), audit, clock: systemClock }
    const tourDeps = { uow, tours: createTourRepository(), media: createMediaRepository(), audit, clock: systemClock, jobs: createJobQueue(jobs.boss), graceHours: config.MEDIA_GRACE_HOURS }
    const readDeps = { uow, reads: createPublicReadRepository(), clock: systemClock }
    const writeUseCases = guardUseCases({
      createPin: makeCreatePin(pinDeps),
      savePin: makeSavePin(pinDeps),
      publishPin: makePublishPin(pinDeps),
      hidePin: makeHidePin(pinDeps),
      deletePin: makeDeletePin(pinDeps),
      createStoryGroup: makeCreateStoryGroup(storyDeps),
      saveStoryGroup: makeSaveStoryGroup(storyDeps),
      createStoryVersion: makeCreateStoryVersion(storyDeps),
      saveStoryVersion: makeSaveStoryVersion(storyDeps),
      publishStoryVersion: makePublishStoryVersion(storyDeps),
      unpublishStoryVersion: makeUnpublishStoryVersion(storyDeps),
      moveStoryVersion: makeMoveStoryVersion(storyDeps),
      deleteStoryVersion: makeDeleteStoryVersion(storyDeps),
      createTour: makeCreateTour(tourDeps),
      saveTour: makeSaveTour(tourDeps),
      publishTour: makePublishTour(tourDeps),
      unpublishTour: makeUnpublishTour(tourDeps),
      deleteTour: makeDeleteTour(tourDeps),
    })
    // The reads fail with an exception, not a Result, so guardUseCases does not fit them: a database error is a 500.
    const contentUseCases = {
      ...writeUseCases,
      requestUpload: makeRequestUpload({ storage, clock: systemClock, newId: () => crypto.randomUUID() }),
      // They touch storage, so guardUseCases does not wrap them: the media routes map a StorageUnavailableError.
      confirmUpload: makeConfirmUpload({ uow, media: createMediaRepository(), storage, jobs: createJobQueue(jobs.boss), audit, clock: systemClock, newId: () => crypto.randomUUID() }),
      getMedia: makeGetMedia({ uow, media: createMediaRepository() }),
      publicUrl: storage.publicUrl,
      listStories: makeListStories(readDeps),
      getStory: makeGetStory(readDeps),
      getPin: makeGetPin(readDeps),
      listTours: makeListTours(readDeps),
      getTour: makeGetTour(readDeps),
      listCategories: makeListCategories(readDeps),
      getMap: makeGetMap(readDeps),
    }
    const commands: CommandDeps = {
      idempotency: idempotency({ db: database, clock: systemClock, actorId: idempotencyActor }),
      withoutIdempotencyKey: [invitationPreviewPath],
      routes: [app => registerIdentityRoutes(app, useCases), app => registerContentRoutes(app, contentUseCases)],
    }
    const server = await startHttpServer(createApp(logger, checkHealth, identity, commands).fetch, config.HOST, config.PORT, logger)
    stops.unshift(server.close)
  }
  logger.info({ role: config.ROLE }, 'started')
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

process.on('uncaughtException', error => crash('uncaught exception', error))
process.on('unhandledRejection', reason => crash('unhandled rejection', reason))
main().catch(error => crash('startup failed', error))
