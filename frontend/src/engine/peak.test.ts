import { describe, expect, it } from 'vitest'
import { calculate, peakHoursOf } from './model'
import { cafePreset } from './presets'

describe('số giờ cao điểm', () => {
  it('mặc định 3 giờ và luôn chừa ít nhất 1 giờ thấp điểm', () => {
    expect(peakHoursOf(cafePreset)).toBe(3)
    const i = structuredClone(cafePreset)
    i.site.peakHours = 99
    expect(peakHoursOf(i)).toBe(i.site.openHoursPerDay - 1)
    i.site.peakHours = 0
    expect(peakHoursOf(i)).toBe(1)
  })
  it('nhiều giờ cao điểm hơn thì công suất mỗi giờ cao điểm thấp đi', () => {
    const a = calculate(cafePreset).operation.occupancyPeak
    const i = structuredClone(cafePreset)
    i.site.peakHours = 5
    expect(calculate(i).operation.occupancyPeak).toBeLessThan(a)
  })
})
