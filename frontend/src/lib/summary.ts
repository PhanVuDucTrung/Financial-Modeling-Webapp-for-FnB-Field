import { benchmark, costPct } from '../engine/benchmark'
import type { Inputs, Results } from '../engine/types'

/** Bản tóm tắt gọn gửi cho AI (không chứa gì ngoài số mô phỏng giả lập) */
export function buildSummary(i: Inputs, r: Results) {
  return {
    meta: i.meta,
    site: { totalArea: i.site.totalArea, seats: Math.floor(r.operation.seats), tables: r.operation.tables, leaseYears: i.site.leaseYears },
    demand: { seatTurnover: i.demand.seatTurnover, aov: i.demand.aov },
    verdict: r.verdict,
    kpis: {
      coversPerDay: r.operation.coversPerDay,
      aov: i.demand.aov,
      monthlyRevenue: r.monthly.revenue,
      monthlyCM: r.monthly.cm,
      cmPct: r.monthly.cmPct,
      ucPct: r.monthly.ucPct,
      capex: r.capexTotal,
      paybackSimple: r.paybackSimple,
      paybackCumulative: r.paybackCumulative,
      irr: r.irr,
      npv: r.npv,
      breakEvenCovers: r.breakEvenCovers,
      marginOfSafety: r.marginOfSafety,
      leaseMonths: i.site.leaseYears * 12,
      headcount: r.operation.totalHeadcount,
    },
    costPct: costPct(i, r),
    vsBenchmark: benchmark(i, r).map((b) => ({ item: b.label, value: b.value, range: [b.low, b.high], status: b.status })),
    editableFields: {
      'demand.aov': i.demand.aov,
      'demand.seatTurnover': i.demand.seatTurnover,
      'rent.perM2': i.rent.perM2,
      'pnl.cogsPct': i.pnl.cogsPct,
      'site.totalArea': i.site.totalArea,
      'capex.constructionPerM2': i.capex.constructionPerM2,
      'pnl.marketingPct': i.pnl.marketingPct,
    },
  }
}
