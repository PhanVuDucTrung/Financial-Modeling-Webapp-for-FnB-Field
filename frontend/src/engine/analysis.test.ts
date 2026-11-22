import { describe, expect, it } from 'vitest'
import { calculate } from './model'
import { applyScenario, defaultScenarios, heatmap, planFromBudget, solveForPayback, solveForProfit, tornado } from './analysis'
import type { Inputs } from './types'
import { cafePreset } from './presets'

const base: Inputs = cafePreset

describe('chế độ ngược (goal-seek)', () => {
  it('cần đạt lãi mục tiêu thì kết quả mô phỏng lại phải chạm mục tiêu', () => {
    const target = 80_000_000
    const a = solveForProfit(base, target)
    expect(a.achievable).toBe(true)
    const i = structuredClone(base)
    i.demand.seatTurnover = a.requiredTurnover!
    expect(calculate(i).monthly.uc).toBeCloseTo(target, -3)
  })

  it('AOV cần thiết phải chạm mục tiêu hoàn vốn', () => {
    const a = solveForPayback(base, 24)
    if (a.requiredAov != null) {
      const i = structuredClone(base)
      i.demand.aov = a.requiredAov
      expect(calculate(i).paybackCumulative!).toBeCloseTo(24, 1)
    }
  })
})

describe('chế độ từ vốn', () => {
  it('vốn nhiều hơn thì diện tích lớn hơn', () => {
    const small = planFromBudget(base, 1_500_000_000)
    const big = planFromBudget(base, 3_000_000_000)
    expect(big.totalArea).toBeGreaterThan(small.totalArea)
    expect(big.results.capexTotal).toBeCloseTo(3_000_000_000, -3)
  })
})

describe('kịch bản & độ nhạy', () => {
  it('bi quan < cơ sở < lạc quan về lợi nhuận', () => {
    const [bear, mid, bull] = defaultScenarios.map((s) => calculate(applyScenario(base, s)).monthly.uc)
    expect(bear).toBeLessThan(mid)
    expect(mid).toBeLessThan(bull)
  })
  it('heatmap tăng theo AOV và vòng quay', () => {
    const h = heatmap(base, 'uc', 5)
    expect(h.values[4][4]).toBeGreaterThan(h.values[0][0])
  })
  it('tornado có đủ biến, sắp xếp giảm dần', () => {
    const t = tornado(base)
    expect(t.length).toBe(6)
    expect(t[0].high - t[0].low).toBeGreaterThanOrEqual(t[5].high - t[5].low)
  })
})
