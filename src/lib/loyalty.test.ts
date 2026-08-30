import { describe, it, expect } from 'vitest'
import { pointsEarned, redeemValue } from './loyalty'

const cfg = { enabled: true, pesosPerPoint: 50, pointValue: 1 } // 1 pt / ₱50; 1 pt = ₱1

describe('loyalty', () => {
  it('earns floor(total / pesosPerPoint)', () => {
    expect(pointsEarned(275, cfg)).toBe(5)
  })
  it('earns nothing when disabled', () => {
    expect(pointsEarned(275, { ...cfg, enabled: false })).toBe(0)
  })
  it('redeems points at pointValue', () => {
    expect(redeemValue(5, cfg)).toBe(5)
  })
})
