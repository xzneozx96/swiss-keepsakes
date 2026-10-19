import { rate } from '../../../../../packages/domain/src/orders/support'
import { listProducts } from '../../catalog/index'
import type { OrderRepository } from '../ports'

export const place = (repo: OrderRepository) => [repo, rate, listProducts]
