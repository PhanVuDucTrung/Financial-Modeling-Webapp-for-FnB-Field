import { describe, expect, it } from 'vitest'
import { calculate } from './engine/model'
import { cafePreset } from './engine/presets'
import { validateInputs } from './engine/validate'

describe('tính nhất quán của lõi', () => {
  const r = calculate(structuredClone(cafePreset))
  const i = cafePreset
  it('doanh thu = khách x AOV x ngày bán', () => {
    expect(r.operation.coversPerDay * i.demand.aov * i.site.daysPerMonth).toBeCloseTo(r.monthly.revenue, 0)
  })
  it('lợi nhuận trước thuế = dòng tiền hoạt động - khấu hao', () => {
    expect(r.monthly.uc).toBeCloseTo(r.monthly.cm - r.monthly.depreciation, 0)
  })
  it('tại doanh thu hòa vốn thì chi phí cố định bằng biên đóng góp', () => {
    expect(r.breakEvenRevenue * (1 - r.variableCostPct)).toBeCloseTo(r.fixedCost, 0)
  })
  it('biên an toàn = (kế hoạch - hòa vốn) / kế hoạch', () => {
    expect(r.marginOfSafety).toBeCloseTo((r.operation.coversPerDay - r.breakEvenCovers) / r.operation.coversPerDay, 6)
  })
  it('đầu vào sai (diện tích nhỏ hơn bếp) không làm vỡ lõi và được báo lỗi', () => {
    const bad = structuredClone(cafePreset)
    bad.site.totalArea = 20
    const x = calculate(bad)
    expect(x.operation.seats).toBe(0)
    expect(Number.isNaN(x.capexTotal)).toBe(false)
    expect(validateInputs(bad).length).toBeGreaterThan(0)
    expect(validateInputs(cafePreset)).toEqual([])
  })
  it('xóa trắng diện tích mỗi chỗ không sinh NaN hay vô cực', () => {
    const bad = structuredClone(cafePreset)
    bad.site.areaPerSeat = 0
    const x = calculate(bad)
    expect(Number.isFinite(x.operation.seats)).toBe(true)
    expect(Number.isFinite(x.monthly.revenue)).toBe(true)
  })
})
