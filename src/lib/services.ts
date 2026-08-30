import type { DB, Service } from './data'
type Agg = { count: number; amount: number; commission: number }

export function serviceTotals(db: DB): Record<Service['kind'], Agg> {
  const out = {} as Record<Service['kind'], Agg>
  for (const s of db.services) {
    const a = out[s.kind] || (out[s.kind] = { count: 0, amount: 0, commission: 0 })
    a.count++; a.amount += s.amount; a.commission += s.commission || 0
  }
  return out
}

export function serviceCommissionTotal(db: DB): number {
  return db.services.reduce((n, s) => n + (s.commission || 0), 0)
}
