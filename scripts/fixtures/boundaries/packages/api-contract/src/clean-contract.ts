import type { paths } from '../generated/schema'
import createClient from 'openapi-fetch'
import { z } from 'zod'
import { statusOk } from './support'

export const healthSchema = z.object({ status: z.literal(statusOk) })
export const client = createClient<paths>({ baseUrl: '/' })
