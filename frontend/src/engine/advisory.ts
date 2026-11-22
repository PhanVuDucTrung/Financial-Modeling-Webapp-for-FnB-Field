import { applyScenario, clone, defaultScenarios, tornado } from './analysis'
import { benchmark, type BenchRow } from './benchmark'
import { calculate } from './model'
import type { Inputs, Results, VerdictLevel } from './types'

/**
 * Báo cáo lời khuyên: giải thích vì sao ra kết luận đó, thiếu gì để đổi kết luận, và nên làm gì.
 * Toàn bộ do model tính theo luật xác định; không dùng AI.
 */

export interface Criterion {
  key: string
  label: string
  /** Tiêu chí này có quyết định lời khuyên không (hay chỉ để tham khảo) */
  decisive: boolean
  actual: number | null
  threshold: number
  /** 'max' = càng nhỏ càng tốt (≤ ngưỡng), 'min' = càng lớn càng tốt (≥ ngưỡng) */
  goal: 'max' | 'min'
  unit: 'months' | 'pct' | 'vnd'
  pass: boolean
  note: string
}

export interface Lever {
  key: string
  label: string
  unit: 'vnd' | 'pct' | 'x' | 'vndm2'
  current: number
  required: number | null
  /** Thay đổi tương đối cần thiết, ví dụ +0.18 = tăng 18% */
  change: number | null
}

export interface ScenarioOutcome {
  id: string
  name: string
  level: VerdictLevel
  label: string
  payback: number | null
  irr: number | null
  cm: number
}

export interface Driver { key: string; label: string; swing: number }

export interface Advisory {
  level: VerdictLevel
  label: string
  headline: string
  decisivePassed: number
  decisiveTotal: number
  criteria: Criterion[]
  drivers: Driver[]
  costFlags: BenchRow[]
  levers: Lever[]
  scenarios: ScenarioOutcome[]
  risks: string[]
  actions: string[]
}

const opens = (i: Inputs) => calculate(i).verdict.level === 'open'

/** Tìm mức thay đổi nhỏ nhất của một biến (theo hướng có lợi) để lời khuyên thành "Nên mở". */
function solveLever(base: Inputs, apply: (i: Inputs, v: number) => void, current: number, bound: number): number | null {
  const at = (t: number) => {
    const i = clone(base)
    apply(i, current + (bound - current) * t)
    return opens(i)
  }
  if (!at(1)) return null
  let lo = 0
  let hi = 1
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2
    if (at(mid)) hi = mid
    else lo = mid
  }
  return current + (bound - current) * hi
}

const pctOf = (x: number, base: number) => (base ? x / base - 1 : 0)

export function buildAdvisory(inputs: Inputs, r: Results): Advisory {
  const v = inputs.verdict
  const lease = inputs.site.leaseYears * 12
  const pb = r.paybackCumulative
  const op = r.operation

  const criteria: Criterion[] = [
    {
      key: 'payback', label: 'Thời gian hoàn vốn', decisive: true, actual: pb, threshold: v.goodPaybackMonths, goal: 'max', unit: 'months',
      pass: pb != null && pb <= v.goodPaybackMonths,
      note: pb == null ? `Không hoàn vốn trong ${lease} tháng thuê.` : `Chiếm ${Math.round((pb / lease) * 100)}% thời hạn thuê (${lease} tháng).`,
    },
    {
      key: 'irr', label: 'IRR', decisive: true, actual: r.irr, threshold: v.goodIrr, goal: 'min', unit: 'pct',
      pass: r.irr != null && r.irr >= v.goodIrr, note: `Ngưỡng từ chối: dưới ${Math.round(v.badIrr * 100)}%/năm.`,
    },
    {
      key: 'safety', label: 'Biên an toàn', decisive: true, actual: r.marginOfSafety, threshold: v.goodSafety, goal: 'min', unit: 'pct',
      pass: r.marginOfSafety >= v.goodSafety,
      note: `Hòa vốn ở ${Math.round(r.breakEvenCovers)} khách/ngày, kế hoạch ${Math.round(op.coversPerDay)}.`,
    },
    {
      key: 'npv', label: 'NPV', decisive: false, actual: r.npv, threshold: 0, goal: 'min', unit: 'vnd',
      pass: r.npv > 0, note: `Chiết khấu ${Math.round(inputs.finance.discountRate * 100)}%/năm.`,
    },
    {
      key: 'peak', label: 'Công suất giờ cao điểm', decisive: false, actual: op.occupancyPeak, threshold: 0.9, goal: 'max', unit: 'pct',
      pass: op.occupancyPeak <= 0.9, note: op.occupancyPeak > 1 ? 'Vượt 100%: không đủ chỗ cho lượng khách kế hoạch.' : 'Trên 90% dễ quá tải, khách bỏ đi.',
    },
  ]
  const decisive = criteria.filter((c) => c.decisive)
  const passed = decisive.filter((c) => c.pass)
  const failed = decisive.filter((c) => !c.pass)

  const headline =
    r.verdict.level === 'open'
      ? 'Đáp ứng cả ba ngưỡng: hoàn vốn, IRR và biên an toàn.'
      : r.verdict.level === 'consider'
        ? `Đạt ${passed.length}/${decisive.length} tiêu chí. Chưa đạt: ${failed.map((c) => c.label.toLowerCase()).join(', ')}.`
        : `Chỉ đạt ${passed.length}/${decisive.length} tiêu chí. Chưa đủ điều kiện triển khai với giả định hiện tại.`

  // Các biến cần thay đổi để đạt "Nên mở" (từng biến riêng lẻ)
  const levers: Lever[] = [
    { key: 'aov', label: 'AOV (giá trị đơn trung bình)', unit: 'vnd', current: inputs.demand.aov, bound: inputs.demand.aov * 2.5, apply: (i: Inputs, x: number) => (i.demand.aov = x) },
    { key: 'turnover', label: 'Vòng quay ghế mỗi ngày', unit: 'x', current: inputs.demand.seatTurnover, bound: inputs.demand.seatTurnover * 3, apply: (i: Inputs, x: number) => (i.demand.seatTurnover = x) },
    { key: 'cogs', label: 'COGS (giá vốn)', unit: 'pct', current: inputs.pnl.cogsPct, bound: 0.15, apply: (i: Inputs, x: number) => (i.pnl.cogsPct = x) },
    { key: 'rent', label: 'Giá thuê mỗi m²', unit: 'vndm2', current: inputs.rent.perM2, bound: 0, apply: (i: Inputs, x: number) => (i.rent.perM2 = x) },
    { key: 'capex', label: 'Chi phí xây dựng mỗi m²', unit: 'vndm2', current: inputs.capex.constructionPerM2, bound: 0, apply: (i: Inputs, x: number) => (i.capex.constructionPerM2 = x) },
  ].map((l) => {
    const required = r.verdict.level === 'open' ? l.current : solveLever(inputs, l.apply, l.current, l.bound)
    return { key: l.key, label: l.label, unit: l.unit, current: l.current, required, change: required == null ? null : pctOf(required, l.current) } as Lever
  })

  const scenarios: ScenarioOutcome[] = defaultScenarios.map((s) => {
    const x = calculate(applyScenario(inputs, s))
    return { id: s.id, name: s.name, level: x.verdict.level, label: x.verdict.label, payback: x.paybackCumulative, irr: x.irr, cm: x.monthly.cm }
  })

  const drivers = tornado(inputs, 'uc', 0.1).slice(0, 3).map((t) => ({ key: t.key, label: t.label, swing: t.high - t.low }))
  const costFlags = benchmark(inputs, r).filter((b) => b.status === 'high')

  // Rủi ro cần theo dõi
  const risks: string[] = []
  if (r.marginOfSafety < v.goodSafety) {
    risks.push(`Biên an toàn ${Math.round(r.marginOfSafety * 100)}%: doanh số giảm ${Math.round(r.marginOfSafety * 100)}% là chạm điểm hòa vốn.`)
  }
  if (pb != null && pb > lease * 0.7) risks.push(`Hoàn vốn chiếm ${Math.round((pb / lease) * 100)}% thời hạn thuê. Rủi ro nếu không gia hạn được hợp đồng hoặc bị tăng giá thuê.`)
  if (pb == null) risks.push('Dòng tiền tích lũy chưa bù được vốn đầu tư trong thời hạn thuê.')
  for (const b of costFlags) risks.push(`${b.label} ${Math.round(b.value * 1000) / 10}% doanh thu, cao hơn khoảng tham chiếu ${Math.round(b.low * 100)}–${Math.round(b.high * 100)}%.`)
  if (op.occupancyPeak > 0.9) risks.push(`Công suất giờ cao điểm ${Math.round(op.occupancyPeak * 100)}%: nguy cơ quá tải, doanh thu thực tế thấp hơn kế hoạch.`)
  if (inputs.ramp.months > 0) risks.push(`Doanh thu cần ${inputs.ramp.months} tháng để đạt công suất, dòng tiền giai đoạn đầu thấp hơn mức ổn định.`)
  const bear = scenarios.find((s) => s.id === 'bear')
  if (bear && bear.level === 'dont' && r.verdict.level !== 'dont') risks.push('Kịch bản bi quan chuyển lời khuyên sang "Không nên mở".')
  if (bear && bear.cm < 0) risks.push('Kịch bản bi quan có dòng tiền hoạt động âm.')

  // Hành động đề xuất: ưu tiên biến cần thay đổi ít nhất
  const fmtLever = (l: Lever): string => {
    const dir = (l.change ?? 0) >= 0 ? 'tăng' : 'giảm'
    const target = l.unit === 'pct' ? `${Math.round((l.required ?? 0) * 1000) / 10}%` : l.unit === 'x' ? `${(l.required ?? 0).toFixed(1)} lần/ngày` : `${Math.round((l.required ?? 0) / 1000).toLocaleString('vi-VN')}k`
    return `${l.label}: ${dir} ${Math.abs(Math.round((l.change ?? 0) * 100))}%, ${dir === 'tăng' ? 'lên' : 'còn'} ${target}, để đạt "Nên mở".`
  }
  const actions =
    r.verdict.level === 'open'
      ? ['Duy trì các giả định đã kiểm chứng, chạy kịch bản bi quan trước khi ký hợp đồng thuê.', 'Chốt tiền cọc và điều khoản tăng giá thuê theo năm trong hợp đồng.', 'Theo dõi sát doanh thu 3 tháng đầu so với kế hoạch ramp-up.']
      : levers
          .filter((l) => l.required != null && l.change != null)
          .sort((a, b) => Math.abs(a.change ?? 0) - Math.abs(b.change ?? 0))
          .slice(0, 3)
          .map(fmtLever)

  return {
    level: r.verdict.level,
    label: r.verdict.label,
    headline,
    decisivePassed: passed.length,
    decisiveTotal: decisive.length,
    criteria,
    drivers,
    costFlags,
    levers,
    scenarios,
    risks,
    actions: actions.length ? actions : ['Không biến đơn lẻ nào đủ để đạt "Nên mở". Cần điều chỉnh đồng thời nhiều giả định hoặc xem lại mô hình kinh doanh.'],
  }
}
