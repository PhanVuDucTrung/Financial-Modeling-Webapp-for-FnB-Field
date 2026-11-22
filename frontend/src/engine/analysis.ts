import { calculate, coversPerDay, seatsOf } from './model'
import type { Inputs, Results } from './types'

export type Metric = 'uc' | 'cm' | 'payback' | 'irr'

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

/** Giá trị của 1 chỉ số từ kết quả. payback lớn = xấu nên trả Infinity khi chưa hoàn vốn */
export function metricOf(r: Results, m: Metric): number {
  switch (m) {
    case 'uc': return r.monthly.uc
    case 'cm': return r.monthly.cm
    case 'payback': return r.paybackCumulative ?? Infinity
    case 'irr': return r.irr ?? -1
  }
}

/** Tìm x trong [lo, hi] sao cho f(x) = target, f tăng dần. Trả null nếu không có nghiệm. */
function bisect(f: (x: number) => number, target: number, lo: number, hi: number): number | null {
  let a = lo
  let b = hi
  if (f(a) > target || f(b) < target) return null
  for (let k = 0; k < 80; k++) {
    const mid = (a + b) / 2
    if (f(mid) < target) a = mid
    else b = mid
  }
  return (a + b) / 2
}

// ---------- Chế độ 1: "Tôi có X vốn thì mở được gì?" ----------
export interface BudgetPlan {
  feasible: boolean
  totalArea: number
  seats: number
  inputs: Inputs
  results: Results
}

/**
 * Từ ngân sách tìm diện tích sàn lớn nhất mà tổng vốn (xây dựng theo m2 + khoản cố định + đặt cọc theo m2) không vượt ngân sách.
 * Giải số vì tiền cọc phụ thuộc diện tích thuê.
 */
export function planFromBudget(base: Inputs, budget: number): BudgetPlan {
  const minArea = base.site.kitchenArea + base.site.areaPerSeat
  const capexAt = (area: number) => {
    const i = clone(base)
    i.site.totalArea = area
    return calculate(i).capexTotal
  }
  const feasible = capexAt(minArea) <= budget
  const area = feasible ? (bisect(capexAt, budget, minArea, 20_000) ?? 20_000) : minArea
  const i = clone(base)
  i.site.totalArea = area
  return { feasible, totalArea: area, seats: seatsOf(i), inputs: i, results: calculate(i) }
}

// ---------- Chế độ 2: "Tôi muốn lãi Y / hoàn vốn trong Z tháng thì cần gì?" ----------
export interface GoalAnswer {
  achievable: boolean
  /** lượt khách/ngày cần (giữ AOV hiện tại) */
  requiredCovers: number | null
  requiredTurnover: number | null
  requiredSeats: number | null
  /** diện tích sàn cần để đủ chỗ ngồi cho lượng khách đó (giữ vòng quay hiện tại) */
  requiredAreaForCovers: number | null
  /** AOV cần (giữ lượt khách hiện tại) */
  requiredAov: number | null
  /** các cặp (AOV, lượt khách) đạt mục tiêu, dùng vẽ đường biên */
  frontier: { aov: number; covers: number | null }[]
}

type Goal = { kind: 'profit'; monthlyUC: number } | { kind: 'payback'; months: number }

function goalMet(r: Results, g: Goal): number {
  // Trả về 1 số tăng dần theo "độ tốt" để bisect: lợi nhuận hoặc -payback
  if (g.kind === 'profit') return r.monthly.uc
  return r.paybackCumulative == null ? -1e9 : -r.paybackCumulative
}
const goalTarget = (g: Goal) => (g.kind === 'profit' ? g.monthlyUC : -g.months)

export function solveGoal(base: Inputs, g: Goal): GoalAnswer {
  const target = goalTarget(g)
  const withTurnover = (t: number, aov = base.demand.aov) => {
    const i = clone(base)
    i.demand.seatTurnover = t
    i.demand.aov = aov
    return calculate(i)
  }
  const seats = seatsOf(base)
  const solveTurnover = (aov: number) =>
    bisect((t) => goalMet(withTurnover(t, aov), g), target, 0.01, 60)

  const t = solveTurnover(base.demand.aov)
  const requiredCovers = t != null ? t * seats : null

  // Giữ lượt khách, tìm AOV
  const aovSolve = bisect(
    (a) => {
      const i = clone(base)
      i.demand.aov = a
      return goalMet(calculate(i), g)
    },
    target, 1_000, 5_000_000,
  )

  const frontier: GoalAnswer['frontier'] = []
  const a0 = base.demand.aov
  for (let k = -6; k <= 6; k++) {
    const aov = Math.round((a0 * (1 + k * 0.1)) / 1000) * 1000
    if (aov <= 0) continue
    const tt = solveTurnover(aov)
    frontier.push({ aov, covers: tt != null ? tt * seats : null })
  }

  const reqSeats = requiredCovers != null ? requiredCovers / base.demand.seatTurnover : null
  return {
    achievable: t != null,
    requiredCovers,
    requiredTurnover: t,
    requiredSeats: reqSeats,
    requiredAreaForCovers: reqSeats != null ? reqSeats * base.site.areaPerSeat + base.site.kitchenArea : null,
    requiredAov: aovSolve,
    frontier,
  }
}

export const solveForProfit = (b: Inputs, monthlyUC: number) => solveGoal(b, { kind: 'profit', monthlyUC })
export const solveForPayback = (b: Inputs, months: number) => solveGoal(b, { kind: 'payback', months })

// ---------- Kịch bản ----------
export interface Scenario {
  id: string
  name: string
  aov: number // nhân với AOV (1 = giữ nguyên)
  turnover: number
  cogs: number
  rent: number
  capex: number
}

export const defaultScenarios: Scenario[] = [
  { id: 'bear', name: 'Bi quan', aov: 0.92, turnover: 0.75, cogs: 1.06, rent: 1.05, capex: 1.1 },
  { id: 'base', name: 'Cơ sở', aov: 1, turnover: 1, cogs: 1, rent: 1, capex: 1 },
  { id: 'bull', name: 'Lạc quan', aov: 1.05, turnover: 1.2, cogs: 0.97, rent: 1, capex: 0.95 },
]

export function applyScenario(base: Inputs, s: Scenario): Inputs {
  const i = clone(base)
  i.demand.aov *= s.aov
  i.demand.seatTurnover *= s.turnover
  i.pnl.cogsPct *= s.cogs
  i.rent.perM2 *= s.rent
  i.rent.servicePerM2 *= s.rent
  i.capex.constructionPerM2 *= s.capex
  i.capex.fixedAssets *= s.capex
  i.capex.tools *= s.capex
  i.capex.preOpening *= s.capex
  return i
}

// ---------- Độ nhạy ----------
export interface Heatmap {
  xs: number[] // AOV
  ys: number[] // vòng quay ghế
  values: number[][] // values[yi][xi]
}

export function heatmap(base: Inputs, metric: Metric, steps = 7, span = 0.3): Heatmap {
  const mult = (k: number) => 1 + (k - (steps - 1) / 2) * ((2 * span) / (steps - 1))
  const xs = Array.from({ length: steps }, (_, k) => Math.round((base.demand.aov * mult(k)) / 1000) * 1000)
  const ys = Array.from({ length: steps }, (_, k) => +(base.demand.seatTurnover * mult(k)).toFixed(2))
  const values = ys.map((t) =>
    xs.map((a) => {
      const i = clone(base)
      i.demand.aov = a
      i.demand.seatTurnover = t
      return metricOf(calculate(i), metric)
    }),
  )
  return { xs, ys, values }
}

export interface TornadoBar {
  key: string
  label: string
  low: number // chỉ số khi biến xấu đi
  high: number // chỉ số khi biến tốt lên
}

const drivers: { key: string; label: string; apply: (i: Inputs, f: number) => void }[] = [
  { key: 'aov', label: 'AOV', apply: (i, f) => (i.demand.aov *= f) },
  { key: 'turnover', label: 'Vòng quay ghế', apply: (i, f) => (i.demand.seatTurnover *= f) },
  { key: 'cogs', label: 'COGS %', apply: (i, f) => (i.pnl.cogsPct *= f) },
  { key: 'labor', label: 'Nhân công', apply: (i, f) => { i.pnl.laborPct *= f; i.staff.forEach((s) => (s.salary *= f)) } },
  { key: 'rent', label: 'Giá thuê', apply: (i, f) => { i.rent.perM2 *= f; i.rent.servicePerM2 *= f } },
  { key: 'capex', label: 'Vốn đầu tư', apply: (i, f) => { i.capex.constructionPerM2 *= f; i.capex.fixedAssets *= f; i.capex.tools *= f } },
]

/** Mỗi biến thay đổi ±delta, đo tác động lên lợi nhuận tháng (UC) */
export function tornado(base: Inputs, metric: Metric = 'uc', delta = 0.1): TornadoBar[] {
  const b0 = metricOf(calculate(base), metric)
  return drivers
    .map((d) => {
      const up = clone(base); d.apply(up, 1 + delta)
      const dn = clone(base); d.apply(dn, 1 - delta)
      return { key: d.key, label: d.label, a: metricOf(calculate(dn), metric) - b0, b: metricOf(calculate(up), metric) - b0 }
    })
    .map((x) => ({ key: x.key, label: x.label, low: Math.min(x.a, x.b), high: Math.max(x.a, x.b) }))
    .sort((p, q) => q.high - q.low - (p.high - p.low))
}

export { coversPerDay }
