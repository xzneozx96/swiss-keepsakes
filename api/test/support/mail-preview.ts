import type { MailRequest } from '../../src/modules/notifications/application/render-mail.ts'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { brandName, renderMail } from '../../src/modules/notifications/application/render-mail.ts'

const invitationId = '0192f3a0-0000-7000-8000-000000000002'

// A link as InvitationLink builds it: the SPA origin, the screen path, and a 256-bit token in the fragment.
const token = 'q3J9mZ0vKf2xT7hYbN4sLw8dEaUc1RiPoG5tVnXyHkM'
const link = `https://swiss-keepsakes.example/invitation#invitation=${token}`
const ownerLink = `https://swiss-keepsakes.example/store/onboarding#invitation=${token}`

const longInviter = 'Ngọc Anh Trần-Müller von Hohenzollern-Sigmaringen-Wiedenbrück'

const longStore = 'Zürcher Spezialitäten- und Andenkenhandel Bahnhofstrasse Luzern GmbH'

export const previews: Record<string, { request: MailRequest, link: string | undefined }> = {}

for (const language of ['en', 'de'] as const) {
  previews[`N01-${language}`] = { request: { template: 'N01', to: 'anna.keller@example.ch', language, storeId: null, params: { shop: brandName, code: '482913' } }, link: undefined }
  previews[`N18-${language}`] = { request: { template: 'N18', to: 'lena.meier@example.ch', language, storeId: null, params: { inviter: 'Ngoc Tran', store: 'Zürich Andenken', invitationId } }, link }
  previews[`N18-long-${language}`] = { request: { template: 'N18', to: 'lena.meier@example.ch', language, storeId: null, params: { inviter: longInviter, store: longStore, invitationId } }, link }
  previews[`N20-${language}`] = { request: { template: 'N20', to: 'ngoc.tran@example.ch', language, storeId: null, params: { store: 'Zürich Andenken', invitationId } }, link: ownerLink }
  previews[`N20-long-${language}`] = { request: { template: 'N20', to: 'ngoc.tran@example.ch', language, storeId: null, params: { store: longStore, invitationId } }, link: ownerLink }
}

// Writes each preview's HTML to `<dir>/<name>.html`, for opening in a browser or a screenshot.
export function writeMailPreviews(dir: string): string[] {
  mkdirSync(dir, { recursive: true })
  return Object.entries(previews).map(([name, { request, link }]) => {
    const file = join(dir, `${name}.html`)
    writeFileSync(file, renderMail(request, link).html)
    return file
  })
}
