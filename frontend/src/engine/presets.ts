import type { Inputs } from './types'

/**
 * Preset demo: quán cà phê specialty quy mô nhỏ, mặt bằng ~85 m2 ở Bình Thạnh, TP.HCM, do chủ vận hành (giá trị tháng 11/2026).
 * Đây là DỮ LIỆU GIẢ LẬP để minh họa, không phải số của quán thật nào. Nguồn & độ tin cậy từng giả định: xem assumptions.ts.
 */
export const cafePreset: Inputs = {
  meta: { name: 'Demo Project', district: 'Bình Thạnh', format: 'F&B' },
  site: {
    totalArea: 85,
    kitchenArea: 20,
    areaPerSeat: 1.5,
    leaseYears: 5,
    daysPerMonth: 30,
    seatsPerTable: 2.5,
    openHoursPerDay: 12,
    peakHours: 3,
    peakShare: 0.55,
    avgStayMinutes: 70,
  },
  demand: { seatTurnover: 3.5, aov: 60_000 },
  ramp: { months: 5, startPct: 0.5 },
  pnl: {
    revenueDeductionPct: 0.02,
    cogsPct: 0.3,
    laborPct: 0.23,
    utilitiesPct: 0.04,
    toolsPct: 0.015,
    rdPct: 0.005,
    maintenancePct: 0.01,
    otherPct: 0.015,
    marketingPct: 0.035,
    franchisePct: 0,
    gaPct: 0,
    interestPct: 0,
  },
  laborMode: 'bottomup',
  staff: [
    { id: 'manager', name: 'Quản lý (chủ vận hành)', baseCount: 1, coversPerExtraHead: 0, salary: 12_000_000 },
    { id: 'headbarista', name: 'Barista chính', baseCount: 1, coversPerExtraHead: 0, salary: 9_000_000 },
    { id: 'barista', name: 'Barista', baseCount: 1, coversPerExtraHead: 260, salary: 7_500_000 },
    { id: 'server', name: 'Phục vụ / thu ngân', baseCount: 1, coversPerExtraHead: 200, salary: 6_500_000 },
    { id: 'kitchen', name: 'Bếp phụ / bánh', baseCount: 1, coversPerExtraHead: 0, salary: 7_000_000 },
    { id: 'cleaner', name: 'Tạp vụ', baseCount: 1, coversPerExtraHead: 0, salary: 5_000_000 },
  ],
  employerOnCostPct: 0.2,
  rent: {
    pctSales: 0,
    perM2: 450_000,
    servicePctSales: 0,
    servicePerM2: 0,
    escalation: [0, 0, 0.08, 0.05, 0.05],
  },
  capex: {
    constructionPerM2: 2_800_000,
    fixedAssets: 320_000_000,
    tools: 55_000_000,
    preOpening: 80_000_000,
    franchiseFee: 0,
    depositMonths: 3,
    fixedAssetsLifeMonths: 60,
    toolsLifeMonths: 24,
  },
  finance: { ebitdaGrowth: 0.03, taxRate: 0.2, discountRate: 0.12 },
  verdict: { goodPaybackMonths: 24, badPaybackMonths: 48, goodIrr: 0.3, badIrr: 0.12, goodSafety: 0.25 },
}

export const presets: { id: string; label: string; inputs: Inputs }[] = [
  { id: 'cafe-binh-thanh', label: 'F&B - Bình Thạnh', inputs: cafePreset },
]
