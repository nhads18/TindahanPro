import { describe, it, expect } from 'vitest'
import { serviceTotals, serviceCommissionTotal } from './services'

const db = { services: [
  { id:'1', ts:1, kind:'eload', amount:100, commission:5, payment:'cash' },
  { id:'2', ts:2, kind:'eload', amount:50,  commission:3, payment:'cash' },
  { id:'3', ts:3, kind:'gcash_in', amount:500, commission:10, payment:'gcash' },
]} as any

describe('serviceTotals', () => {
  it('aggregates per kind', () => {
    const t = serviceTotals(db)
    expect(t.eload).toEqual({ count: 2, amount: 150, commission: 8 })
    expect(t.gcash_in.commission).toBe(10)
  })
  it('sums all commission', () => {
    expect(serviceCommissionTotal(db)).toBe(18)
  })
})
