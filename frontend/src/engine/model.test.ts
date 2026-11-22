import { describe, expect, it } from 'vitest'
import { calculate } from './model'
import type { Inputs } from './types'

/**
 * Test đối chiếu với "File Ref/Financial Model 1.xlsx" (sheet Financial model + Capex Index).
 * Số kỳ vọng lấy từ giá trị đã tính sẵn trong file Excel.
 */
const golden: Inputs = {
  meta: { name: 'Golden test', district: '-', format: 'restaurant' },
  site: { totalArea: 338, kitchenArea: 79, areaPerSeat: 2.9, leaseYears: 5, daysPerMonth: 30, seatsPerTable: 4, openHoursPerDay: 12, peakHours: 3, peakShare: 0.4, avgStayMinutes: 60 },
  demand: { seatTurnover: 2, aov: 250000 },
  ramp: { months: 0, startPct: 1 },
  pnl: {
    revenueDeductionPct: 0.001, cogsPct: 0.425, laborPct: 0.125, utilitiesPct: 0.05, toolsPct: 0.03,
    rdPct: 0.002, maintenancePct: 0.001, otherPct: 0.011, marketingPct: 0.029, franchisePct: 0,
    gaPct: 0.029, interestPct: 0,
  },
  laborMode: 'percent',
  staff: [],
  employerOnCostPct: 0,
  rent: { pctSales: 0, perM2: 20.7 * 22800, servicePctSales: 0, servicePerM2: 0, escalation: [0, 0, 0.1, 0.1, 0.1] },
  capex: {
    constructionPerM2: 9_000_000, fixedAssets: 680_000_000, tools: 350_000_000, preOpening: 150_000_000,
    franchiseFee: 0, depositMonths: 0, fixedAssetsLifeMonths: 60, toolsLifeMonths: 24,
  },
  finance: { ebitdaGrowth: 0, taxRate: 0, discountRate: 0.12 },
  verdict: { goodPaybackMonths: 24, badPaybackMonths: 48, goodIrr: 0.3, badIrr: 0.12, goodSafety: 0.25 },
}

describe('khớp với Financial Model 1.xlsx', () => {
  const r = calculate(golden)

  it('vận hành', () => {
    expect(r.operation.seats).toBeCloseTo(89.3103, 3)
    expect(r.operation.coversPerDay).toBeCloseTo(178.6207, 3)
  })

  it('P&L tháng', () => {
    expect(r.monthly.revenue).toBeCloseTo(1_339_655_172.41, 0)
    expect(r.monthly.cm).toBeCloseTo(238_355_106.21, 0)
    expect(r.monthly.uc).toBeCloseTo(161_738_439.54, 0)
    expect(r.rentMonthlyY1).toBeCloseTo(159_522_480, 0)
  })

  it('vốn đầu tư và khấu hao', () => {
    expect(r.capexTotal).toBe(4_222_000_000)
    expect(r.monthlyDepreciation).toBeCloseTo(76_616_666.67, 1)
  })

  it('payback đơn giản = vốn / CM', () => {
    expect(r.paybackSimple).toBeCloseTo(17.7131, 3)
  })

  it('IRR 5 năm', () => {
    expect(r.irr).toBeCloseTo(0.585626, 4)
    expect(r.annual[0].cashflow).toBeCloseTo(2_860_261_274.48, 0)
    expect(r.annual[4].cashflow).toBeCloseTo(2_226_637_983.92, 0)
  })

  it('hòa vốn', () => {
    expect(r.breakEvenRevenue).toBeCloseTo(981_826_766.35, 0)
    expect(r.breakEvenCovers).toBeCloseTo(130.9102, 3)
    expect(r.unitVariableCost).toBeCloseTo(137_000, 0)
  })
})
