import type {
  AnnualRow,
  Inputs,
  Operation,
  PnlLine,
  Results,
  StaffLine,
  Verdict,
} from './types'

/**
 * Lõi tính toán. Bám theo logic của "Financial Model 1.xlsx" (module 4 PBM):
 *  - Chỗ ngồi = (diện tích sàn - bếp/bar) / diện tích mỗi chỗ
 *  - Lượt khách/ngày = chỗ ngồi x vòng quay; Doanh thu tháng = lượt khách x AOV x số ngày
 *  - P&L theo % doanh thu; thuê mặt bằng theo m2 hoặc %sales, tăng giá theo năm
 *  - Hòa vốn: chi phí cố định / (1 - tổng chi phí biến đổi %)
 * Khác file gốc (có chủ đích): chi phí lãi vay chỉ tính 1 lần; có ramp-up, thuế, payback theo dòng tiền lũy kế.
 */

const EPS = 1e-9

export function seatsOf(i: Inputs): number {
  const seats = (i.site.totalArea - i.site.kitchenArea) / Math.max(i.site.areaPerSeat, 0.1)
  return Number.isFinite(seats) ? Math.max(0, seats) : 0
}

export function coversPerDay(i: Inputs): number {
  return seatsOf(i) * i.demand.seatTurnover
}

export function fullRevenue(i: Inputs): number {
  return coversPerDay(i) * i.demand.aov * i.site.daysPerMonth
}

export function staffLines(i: Inputs, covers: number): StaffLine[] {
  return i.staff.map((r) => {
    const extra = r.coversPerExtraHead > 0 ? Math.ceil(covers / r.coversPerExtraHead) : 0
    const headcount = r.baseCount + extra
    return {
      id: r.id,
      name: r.name,
      headcount,
      cost: headcount * r.salary * (1 + i.employerOnCostPct),
    }
  })
}

export function laborCostMonthly(i: Inputs): number {
  if (i.laborMode === 'percent') return i.pnl.laborPct * fullRevenue(i)
  return staffLines(i, coversPerDay(i)).reduce((s, l) => s + l.cost, 0)
}

function rentFactor(i: Inputs, year: number): number {
  let f = 1
  for (let y = 2; y <= year; y++) f *= 1 + (i.rent.escalation[y - 1] ?? 0)
  return f
}

export function depositAmount(i: Inputs): number {
  if (i.capex.depositMonths <= 0) return 0
  const m = month(i, 1)
  return i.capex.depositMonths * (m.rent + m.service)
}

export function capexLines(i: Inputs) {
  const life = Math.min(i.site.leaseYears * 12, 60)
  const rows = [
    { key: 'construction', label: 'Xây dựng & thi công', amount: i.capex.constructionPerM2 * i.site.totalArea, lifeMonths: life },
    { key: 'fixedAssets', label: 'TSCĐ (máy móc, nội thất)', amount: i.capex.fixedAssets, lifeMonths: i.capex.fixedAssetsLifeMonths },
    { key: 'tools', label: 'Công cụ dụng cụ', amount: i.capex.tools, lifeMonths: i.capex.toolsLifeMonths },
    { key: 'preOpening', label: 'Chi phí tiền hoạt động', amount: i.capex.preOpening, lifeMonths: 0 },
    { key: 'franchise', label: 'Phí franchise trả trước', amount: i.capex.franchiseFee, lifeMonths: 0 },
    { key: 'deposit', label: 'Đặt cọc thuê (hoàn lại cuối hợp đồng)', amount: depositAmount(i), lifeMonths: 0 },
  ]
  return rows.map((r) => ({
    ...r,
    monthlyDep: r.lifeMonths > 0 ? r.amount / r.lifeMonths : 0,
  }))
}

interface Steady {
  revenue: number
  deduction: number
  cogs: number
  labor: number
  utilities: number
  tools: number
  rd: number
  maintenance: number
  other: number
  marketing: number
  franchise: number
  rent: number
  service: number
  ga: number
  interest: number
  cm: number
  fixedRent: number
}

/** P&L 1 tháng. factor = hệ số ramp-up lên doanh thu. Nhân công & công cụ giữ ở mức vận hành ổn định (chi phí gần như cố định). */
function month(i: Inputs, rentYear: number, factor = 1): Steady {
  const full = fullRevenue(i)
  const rev = full * factor
  const rf = rentFactor(i, rentYear)
  const p = i.pnl
  const fixedRent = (i.rent.perM2 + i.rent.servicePerM2) * i.site.totalArea * rf
  const s: Steady = {
    revenue: rev,
    deduction: p.revenueDeductionPct * rev,
    cogs: p.cogsPct * rev,
    labor: laborCostMonthly(i),
    utilities: p.utilitiesPct * rev,
    tools: p.toolsPct * full,
    rd: p.rdPct * rev,
    maintenance: p.maintenancePct * rev,
    other: p.otherPct * rev,
    marketing: p.marketingPct * rev,
    franchise: p.franchisePct * rev,
    rent: i.rent.pctSales * rev + i.rent.perM2 * i.site.totalArea * rf,
    service: i.rent.servicePctSales * rev + i.rent.servicePerM2 * i.site.totalArea * rf,
    ga: p.gaPct * rev,
    interest: p.interestPct * rev,
    cm: 0,
    fixedRent,
  }
  const gross = rev - s.deduction - s.cogs
  const opex =
    s.labor + s.utilities + s.tools + s.rd + s.maintenance + s.other + s.marketing +
    s.franchise + s.rent + s.service + s.ga + s.interest
  s.cm = gross - opex
  return s
}

export function rampFactor(i: Inputs, m: number): number {
  const { months, startPct } = i.ramp
  if (months <= 0) return 1
  if (m > months) return 1
  return Math.min(1, startPct + (1 - startPct) * ((m - 1) / months))
}

export function irrOf(cashflows: number[]): number | null {
  const npv = (r: number) => cashflows.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0)
  let lo = -0.99
  let hi = 10
  let flo = npv(lo)
  const fhi = npv(hi)
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    const fm = npv(mid)
    if (Math.abs(fm) < 1e-4) return mid
    if (flo * fm <= 0) hi = mid
    else {
      lo = mid
      flo = fm
    }
  }
  return (lo + hi) / 2
}

function buildPnl(s: Steady, dep: number, full: number): PnlLine[] {
  const pct = (x: number) => (s.revenue ? x / s.revenue : 0)
  const net = s.revenue - s.deduction
  const gp = net - s.cogs
  const selling =
    s.labor + s.utilities + s.tools + s.rd + s.maintenance + s.other + s.marketing +
    s.franchise + s.rent + s.service + s.ga
  const line = (key: string, label: string, amount: number, kind: PnlLine['kind'] = 'cost', fixed = false): PnlLine => ({
    key, label, amount, pct: pct(amount), kind, fixed,
  })
  void full
  return [
    line('revenue', '1. Doanh thu', s.revenue, 'revenue'),
    line('deduction', '2. Giảm trừ doanh thu', s.deduction),
    line('netRevenue', '3. Doanh thu thuần', net, 'subtotal'),
    line('cogs', '4. Giá vốn hàng bán (COGS)', s.cogs),
    line('grossProfit', '5. Lợi nhuận gộp', gp, 'subtotal'),
    line('sellingTotal', '6. Chi phí hoạt động', selling, 'subtotal'),
    line('labor', '   6.1 Nhân công', s.labor, 'cost', true),
    line('utilities', '   6.2 Điện nước, dịch vụ', s.utilities),
    line('tools', '   6.3 Công cụ dụng cụ', s.tools, 'cost', true),
    line('rd', '   6.4 R&D và tiếp khách', s.rd),
    line('maintenance', '   6.5 Bảo trì bảo dưỡng', s.maintenance),
    line('other', '   6.6 Chi phí khác', s.other),
    line('marketing', '   6.7 Marketing', s.marketing),
    line('franchise', '   6.8 Nhượng quyền', s.franchise),
    line('rent', '   6.9 Thuê mặt bằng & phí dịch vụ', s.rent + s.service, 'cost', true),
    line('ga', '   6.10 Chi phí chung phân bổ', s.ga),
    line('interest', '   Chi phí lãi vay', s.interest),
    line('cm', '7. Dòng tiền hoạt động (CM / EBITDA)', s.cm, 'total'),
    line('depreciation', '   Khấu hao', dep),
    line('uc', '8. Lợi nhuận trước thuế (UC)', s.cm - dep, 'total'),
  ]
}

function makeVerdict(i: Inputs, r: Pick<Results, 'monthly' | 'paybackCumulative' | 'paybackSimple' | 'irr' | 'marginOfSafety' | 'breakEvenCovers'>, covers: number): Verdict {
  const v = i.verdict
  const lease = i.site.leaseYears * 12
  const pb = r.paybackCumulative
  const fmt = (x: number) => x.toFixed(0)
  const reasons: string[] = []
  reasons.push(
    pb == null
      ? `Chưa hoàn vốn trong thời hạn thuê ${lease} tháng.`
      : `Hoàn vốn sau ${fmt(pb)} tháng, thời hạn thuê ${lease} tháng.`,
  )
  reasons.push(r.irr == null ? 'IRR không xác định: dòng tiền không bù được vốn đầu tư.' : `IRR ${(r.irr * 100).toFixed(0)}% mỗi năm.`)
  reasons.push(
    `Hòa vốn ở ${fmt(r.breakEvenCovers)} khách/ngày so với kế hoạch ${fmt(covers)}, biên an toàn ${(r.marginOfSafety * 100).toFixed(0)}%.`,
  )
  const losing = r.monthly.uc <= 0
  const bad = losing || pb == null || pb > v.badPaybackMonths || r.irr == null || r.irr < v.badIrr
  if (bad) return { level: 'dont', label: 'Không nên mở', reasons }
  const good = pb != null && pb <= v.goodPaybackMonths && r.irr != null && r.irr >= v.goodIrr && r.marginOfSafety >= v.goodSafety
  if (good) return { level: 'open', label: 'Nên mở', reasons }
  return { level: 'consider', label: 'Cân nhắc', reasons }
}

export function calculate(i: Inputs): Results {
  const covers = coversPerDay(i)
  const full = fullRevenue(i)
  const seats = seatsOf(i)
  const caps = capexLines(i)
  const capexTotal = caps.reduce((s, c) => s + c.amount, 0)
  const depMonthly = caps.reduce((s, c) => s + c.monthlyDep, 0)

  // Vận hành
  const staff = staffLines(i, covers)
  const laborCost = laborCostMonthly(i)
  const operation: Operation = {
    seats,
    tables: Math.ceil(seats / Math.max(i.site.seatsPerTable, 0.1)),
    coversPerDay: covers,
    ordersPerPeakHour: (covers * i.site.peakShare) / peakHoursOf(i),
    staff,
    totalHeadcount: staff.reduce((s, l) => s + l.headcount, 0),
    laborCost,
    revenuePerM2: i.site.totalArea ? full / i.site.totalArea : 0,
    revenuePerSeat: seats ? full / seats : 0,
    occupancyAvg: seats && i.site.openHoursPerDay ? (covers * i.site.avgStayMinutes) / 60 / (seats * i.site.openHoursPerDay) : 0,
    occupancyPeak: seats ? (((covers * i.site.peakShare) / peakHoursOf(i)) * i.site.avgStayMinutes) / 60 / seats : 0,
  }

  // P&L tháng ổn định (năm 1)
  const s1 = month(i, 1)
  const pnl = buildPnl(s1, depMonthly, full)

  // Chuỗi tháng: ramp-up, tăng giá thuê, tăng trưởng, thuế
  const totalMonths = Math.max(1, Math.round(i.site.leaseYears * 12))
  const g = i.finance.ebitdaGrowth
  const monthlyCum: number[] = [-capexTotal]
  const years: AnnualRow[] = []
  let cum = -capexTotal
  let paybackCum: number | null = null
  let acc = { rev: 0, deduction: 0, cogs: 0, labor: 0, rent: 0, other: 0, cm: 0, dep: 0, tax: 0 }
  for (let m = 1; m <= totalMonths; m++) {
    const yr = Math.ceil(m / 12)
    const growth = Math.pow(1 + g, yr - 1)
    const sm = month(i, yr, rampFactor(i, m))
    const cm = sm.cm * growth
    const dep = caps.reduce((s, c) => s + (m <= c.lifeMonths ? c.monthlyDep : 0), 0)
    const tax = Math.max(0, cm - dep) * i.finance.taxRate
    const refund = m === totalMonths ? depositAmount(i) : 0
    const net = cm - tax + refund
    const prev = cum
    cum += net
    if (paybackCum == null && cum >= 0) paybackCum = m - 1 + (net > EPS ? -prev / net : 0)
    monthlyCum.push(cum)
    const other = sm.utilities + sm.tools + sm.rd + sm.maintenance + sm.other + sm.marketing + sm.franchise + sm.ga + sm.interest
    acc = {
      rev: acc.rev + sm.revenue * growth,
      deduction: acc.deduction + sm.deduction * growth,
      cogs: acc.cogs + sm.cogs * growth,
      labor: acc.labor + sm.labor * growth,
      rent: acc.rent + (sm.rent + sm.service) * growth,
      other: acc.other + other * growth,
      cm: acc.cm + cm, dep: acc.dep + dep, tax: acc.tax + tax,
    }
    if (m % 12 === 0 || m === totalMonths) {
      const cf = acc.cm - acc.tax + refund
      years.push({
        year: yr,
        rentMonthly: sm.rent + sm.service,
        revenue: acc.rev,
        deduction: acc.deduction,
        cogs: acc.cogs,
        labor: acc.labor,
        rent: acc.rent,
        otherOpex: acc.other,
        cm: acc.cm,
        depreciation: acc.dep,
        profitBeforeTax: acc.cm - acc.dep,
        tax: acc.tax,
        netProfit: acc.cm - acc.dep - acc.tax,
        cashflow: cf,
        cumulative: cum,
      })
      acc = { rev: 0, deduction: 0, cogs: 0, labor: 0, rent: 0, other: 0, cm: 0, dep: 0, tax: 0 }
    }
  }
  const flows = [-capexTotal, ...years.map((y) => y.cashflow)]
  const irr = irrOf(flows)
  const npv = flows.reduce((s, c, t) => s + c / Math.pow(1 + i.finance.discountRate, t), 0)

  // Hòa vốn (cùng cách tính với file gốc: nhân công & công cụ coi như chi phí cố định)
  const p = i.pnl
  const fixedCost = s1.labor + s1.tools + s1.fixedRent + depMonthly
  const variableCostPct =
    p.revenueDeductionPct + p.cogsPct + p.utilitiesPct + p.rdPct + p.maintenancePct + p.otherPct +
    p.marketingPct + p.franchisePct + p.gaPct + p.interestPct + i.rent.pctSales + i.rent.servicePctSales
  const contribution = 1 - variableCostPct
  const beRevenue = contribution > EPS ? fixedCost / contribution : Infinity
  const aov = i.demand.aov
  const days = i.site.daysPerMonth
  const beCovers = isFinite(beRevenue) ? beRevenue / aov / days : Infinity
  const safety = covers > EPS && isFinite(beCovers) ? (covers - beCovers) / covers : -1

  const paybackSimple = s1.cm > EPS ? capexTotal / s1.cm : Infinity
  const monthly = {
    revenue: s1.revenue,
    netRevenue: s1.revenue - s1.deduction,
    cm: s1.cm,
    depreciation: depMonthly,
    uc: s1.cm - depMonthly,
    cmPct: s1.revenue ? s1.cm / s1.revenue : 0,
    ucPct: s1.revenue ? (s1.cm - depMonthly) / s1.revenue : 0,
  }

  const partial = {
    monthly,
    paybackCumulative: paybackCum,
    paybackSimple,
    irr,
    marginOfSafety: safety,
    breakEvenCovers: beCovers,
  }

  return {
    operation,
    pnl,
    monthly,
    capexTotal,
    capexLines: caps,
    monthlyDepreciation: depMonthly,
    rentMonthlyY1: s1.rent + s1.service,
    annual: years,
    paybackSimple,
    paybackCumulative: paybackCum,
    irr,
    npv,
    breakEvenRevenue: beRevenue,
    breakEvenCovers: beCovers,
    marginOfSafety: safety,
    fixedCost,
    variableCostPct,
    unitVariableCost: variableCostPct * aov,
    monthlyCumulative: monthlyCum,
    verdict: makeVerdict(i, partial, covers),
  }
}

/** Số giờ cao điểm hợp lệ: ít nhất 1 giờ và luôn chừa lại ít nhất 1 giờ thấp điểm. Dữ liệu cũ chưa có thì mặc định 3 giờ. */
export function peakHoursOf(i: Inputs): number {
  const open = Math.max(2, Math.round(i.site.openHoursPerDay || 12))
  const h = Math.round(i.site.peakHours ?? 3)
  return Math.max(1, Math.min(h, open - 1))
}
