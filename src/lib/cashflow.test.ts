import { describe, it, expect } from 'vitest'
import { netCashFlow } from './cashflow'

const base = { products: [], customers: [], sales: [], movements: [],
  services: [], expenses: [], purchases: [] } as any

describe('netCashFlow', () => {
  it('nets revenue and commission against expenses and purchase cost', () => {
    const db = { ...base,
      sales: [{ id: 's1', ts: 1, payment: 'cash', total: 1000, items: [] }],
      services: [{ id: 'e1', ts: 1, kind: 'eload', amount: 300, commission: 20, payment: 'cash' }],
      expenses: [{ id: 'x1', ts: 1, category: 'rent', amount: 500 }],
      purchases: [{ id: 'p1', ts: 1, supplier: 'A', total: 200, items: [] }],
    }
    const r = netCashFlow(db)
    expect(r.revenue).toBe(1000)
    expect(r.serviceCommission).toBe(20)
    expect(r.expenses).toBe(500)
    expect(r.purchaseCost).toBe(200)
    expect(r.net).toBe(320) // 1000 + 20 - 500 - 200
  })
  it('excludes voided sales from revenue', () => {
    const db = { ...base, sales: [{ id: 's1', ts: 1, payment: 'cash', total: 1000, items: [], voided_at: 5 }] }
    expect(netCashFlow(db).revenue).toBe(0)
  })
})
