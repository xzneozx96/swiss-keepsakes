import { place } from '../application/clean-use-case'
import { pool } from '../../../platform/db'
import { rate } from '../../../../../packages/domain/src/orders/support'

export const wired = [place, pool, rate]
