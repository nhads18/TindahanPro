export interface LoyaltyCfg { enabled: boolean; pesosPerPoint: number; pointValue: number }

export function pointsEarned(total: number, cfg: LoyaltyCfg): number {
  if (!cfg.enabled || cfg.pesosPerPoint <= 0) return 0
  return Math.floor(total / cfg.pesosPerPoint)
}

export function redeemValue(points: number, cfg: LoyaltyCfg): number {
  return Math.max(0, Math.floor(points)) * cfg.pointValue
}
