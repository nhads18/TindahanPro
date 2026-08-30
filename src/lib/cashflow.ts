import type { DB } from './data'

export interface CashFlow {
  revenue: number; serviceCommission: number
  expenses: number; purchaseCost: number; net: number
}

export function netCashFlow(db: DB): CashFlow {
  const revenue = db.sales.filter(s => !s.voided_at)
    .reduce((n, s) => n + s.total, 0)
  const serviceCommission = db.services.reduce((n, s) => n + (s.commission || 0), 0)
  const expenses = db.expenses.reduce((n, e) => n + e.amount, 0)
  const purchaseCost = db.purchases.reduce((n, p) => n + p.total, 0)
  return { revenue, serviceCommission, expenses, purchaseCost,
    net: revenue + serviceCommission - expenses - purchaseCost }
}

export function expensesByCategory(db: DB): Record<string, number> {
  return db.expenses.reduce((m, e) => {
    m[e.category] = (m[e.category] || 0) + e.amount; return m
  }, {} as Record<string, number>)
}
