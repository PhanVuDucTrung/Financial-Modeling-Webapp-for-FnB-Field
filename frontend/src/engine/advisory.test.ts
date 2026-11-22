import { describe, expect, it } from 'vitest'
import { buildAdvisory } from './advisory'
import { clone } from './analysis'
import { calculate } from './model'
import { cafePreset } from './presets'

describe('báo cáo lời khuyên', () => {
  it('kết luận khớp với model và nêu đúng tiêu chí chưa đạt', () => {
    const i = clone(cafePreset)
    const r = calculate(i)
    const a = buildAdvisory(i, r)
    expect(a.level).toBe(r.verdict.level)
    expect(a.decisiveTotal).toBe(3)
    expect(a.criteria.filter((c) => c.decisive && !c.pass).length).toBe(a.decisiveTotal - a.decisivePassed)
  })

  it('áp mức biến đề xuất vào model thì lời khuyên thành "Nên mở"', () => {
    const i = clone(cafePreset)
    i.demand.aov = 62000 // làm xấu đi để có đòn bẩy cần tìm
    const r = calculate(i)
    expect(r.verdict.level).not.toBe('open')
    const a = buildAdvisory(i, r)
    const lever = a.levers.find((l) => l.key === 'aov')!
    expect(lever.required).not.toBeNull()
    const test = clone(i)
    test.demand.aov = lever.required! * 1.001
    expect(calculate(test).verdict.level).toBe('open')
  })

  it('có 3 kịch bản, rủi ro và hành động', () => {
    const i = clone(cafePreset)
    const a = buildAdvisory(i, calculate(i))
    expect(a.scenarios.length).toBe(3)
    expect(a.actions.length).toBeGreaterThan(0)
  })

  it('công suất lấp đầy được tính và P&L năm cộng khớp dòng tiền', () => {
    const i = clone(cafePreset)
    const r = calculate(i)
    expect(r.operation.occupancyAvg).toBeGreaterThan(0)
    for (const y of r.annual) {
      expect(y.revenue - y.deduction - y.cogs - y.labor - y.rent - y.otherOpex).toBeCloseTo(y.cm, -1)
    }
  })
})
