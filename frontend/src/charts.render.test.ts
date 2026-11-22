import { describe, expect, it } from 'vitest'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import './components/EChart' // đăng ký các thành phần ECharts giống lúc chạy thật

echarts.use([SVGRenderer])
import * as ch from './components/charts'
import { calculate } from './engine/model'
import { cafePreset } from './engine/presets'
import { solveForProfit, tornado } from './engine/analysis'

function draw(name: string, option: unknown) {
  const c = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width: 600, height: 300 })
  try {
    c.setOption(option as never, true)
    expect(c.renderToSVGString().length, name).toBeGreaterThan(100)
  } finally { c.dispose() }
}

describe('vẽ thật từng biểu đồ', () => {
  const variants = {
    base: cafePreset,
    loss: { ...structuredClone(cafePreset), demand: { ...cafePreset.demand, aov: 30000 } },
    pct: { ...structuredClone(cafePreset), laborMode: 'percent' as const },
  }
  for (const [vn, inp] of Object.entries(variants)) {
    it(`variant ${vn}`, () => {
      const r = calculate(inp)
      draw('cumulative', ch.cumulativeCash(r))
      draw('waterfall', ch.pnlWaterfall(r))
      draw('breakeven', ch.breakEvenChart(inp, r))
      draw('annual', ch.annualCash(r))
      draw('cost', ch.costStructure(r))
      draw('cum-loss', ch.cumulativeCash(r))
      draw('tornado', ch.tornadoChart(tornado(inp)))
      draw('scen', ch.scenarioBars([{ name: 'a', uc: 1e7 }, { name: 'b', uc: -2e7 }]))
      const a = solveForProfit(inp, 80e6)
      draw('hourly', ch.hourlyOccupancy(inp, r))
      draw('area', ch.areaCurve(inp, r))
      draw('annualPnl', ch.annualPnl(r))
      draw('staffCost', ch.staffCostBars(r.operation.staff))
      draw('headcount', ch.headcountCurve(inp, r))
      draw('treemap', ch.costTreemap(r))
      draw('capexTreemap', ch.capexTreemap(r))
      draw('depr', ch.depreciationBars(r))
      draw('frontier', ch.frontierChart(a.frontier, { aov: inp.demand.aov, covers: r.operation.coversPerDay }))
    })
  }
})
