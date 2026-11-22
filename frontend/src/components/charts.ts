import type { TornadoBar } from '../engine/analysis'
import type { Inputs, Results } from '../engine/types'
import { peakHoursOf, staffLines } from '../engine/model'
import { num } from '../lib/format'
import { rankColor, T } from '../theme'
import type { ChartOption } from './EChart'

/**
 * Quy ước (IBCS):
 *  - Mỗi biểu đồ có tiêu đề nói rõ đo cái gì; đơn vị và phạm vi ghi ở dòng phụ của khối. Cùng một đơn vị trong cùng một trang.
 *  - Màu chỉ mang nghĩa: xanh là chênh lệch có lợi, đỏ là bất lợi, cam là điểm cần chú ý (kế hoạch, hoàn vốn).
 *    Thanh xếp hạng dùng thang cam giảm dần theo độ lớn: lớn nhất sáng nhất.
 *  - Nhãn số đặt trực tiếp trên dữ liệu, không lưới, không viền, ẩn trục giá trị khi đã có nhãn.
 *  - Chuỗi thời gian chạy ngang (cột, đường); so sánh cấu trúc chạy dọc (thanh ngang, cầu thang).
 *  - Mọi số trong ứng dụng là số kế hoạch, nên không dùng ký hiệu "thực tế".
 */
const base = { get textStyle() { return { fontFamily: T.font, color: T.ink } }, animationDuration: 700, animationEasing: 'cubicOut' as const, backgroundColor: 'transparent' }
const tip = { get backgroundColor() { return T.raised }, get borderColor() { return T.line }, borderWidth: 1, padding: [8, 12], get textStyle() { return { color: T.ink, fontFamily: T.font, fontSize: 12.5 } }, extraCssText: 'border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.2)' }
const axisLabel = { get color() { return T.dim }, fontFamily: T.font, fontSize: 12 }
const hide = { show: false }
const noY = { type: 'value' as const, axisLabel: hide, splitLine: hide, axisLine: hide, axisTick: hide }
const baseline = { get lineStyle() { return { color: T.axis } } }
const lbl = (extra: Record<string, unknown> = {}) => ({ show: true, fontFamily: T.font, fontWeight: 700, fontSize: 12.5, color: T.ink, ...extra })
const tr = (v: number) => +(v / 1e6).toFixed(1)
const fmt = (v: number, d = 0) => num(+v.toFixed(d))
const zeroLine = { silent: true, symbol: 'none', get lineStyle() { return { color: T.axis, width: 1 } }, label: { show: false }, data: [{ yAxis: 0 }] }
/** Thanh có đầu bo nhẹ, độ rộng đủ dày để đọc */
const rBar = (horizontal = false) => (horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0])

// 1. Dòng tiền lũy kế theo tháng (triệu VND)
export function cumulativeCash(r: Results): ChartOption {
  const data = r.monthlyCumulative.map((v, m) => [m, tr(v)])
  const last = data[data.length - 1]
  const months = data.length - 1
  const pb = r.paybackCumulative
  const marks: Record<string, unknown>[] = [
    { coord: data[0], symbol: 'circle', symbolSize: 8, itemStyle: { color: T.bad } },
    { coord: last, symbol: 'circle', symbolSize: 8, itemStyle: { color: last[1] >= 0 ? T.good : T.bad }, label: lbl({ position: 'right', offset: [8, 0], color: last[1] >= 0 ? T.good : T.bad, formatter: `${last[1] >= 0 ? '+' : ''}${fmt(last[1])}` }) },
  ]
  if (pb != null) marks.push({ coord: [pb, 0], symbol: 'circle', symbolSize: 12, itemStyle: { color: T.accent, borderColor: T.bg, borderWidth: 2 } })
  const lines: Record<string, unknown>[] = [{ yAxis: 0, lineStyle: { color: T.grey, width: 1 }, label: hide }]
  if (pb != null) lines.push({ xAxis: pb, lineStyle: { color: T.accent, width: 1.5, type: 'dashed' }, label: lbl({ show: true, position: 'end', color: T.accent, formatter: `Hoàn vốn tháng ${Math.ceil(pb)}`, distance: 8 }) })
  return {
    ...base,
    grid: { left: 24, right: 70, top: 36, bottom: 28 },
    tooltip: { ...tip, trigger: 'axis', formatter: (p: { value: number[] }[]) => `Tháng ${p[0].value[0]}<br/><b>${fmt(p[0].value[1])} tr</b>` },
    xAxis: {
      type: 'value', min: 0, max: months, interval: 12, axisLabel: { ...axisLabel, formatter: (v: number) => (v === 0 ? '' : `Năm ${v / 12}`) },
      axisLine: baseline, axisTick: hide, splitLine: hide,
    },
    yAxis: noY,
    visualMap: { show: false, type: 'piecewise', dimension: 1, seriesIndex: 0, pieces: [{ min: -1e12, max: 0, color: T.bad }, { min: 0, max: 1e12, color: T.good }], outOfRange: { color: T.neutral } },
    series: [{
      type: 'line', data, showSymbol: false, lineStyle: { width: 3 }, areaStyle: { opacity: 0.12 },
      markLine: { silent: true, symbol: 'none', data: lines },
      markPoint: { data: marks },
    }],
  }
}

// 2. Cầu thang: doanh thu, các khoản trừ, dòng tiền hoạt động (triệu VND mỗi tháng)
export function pnlWaterfall(r: Results): ChartOption {
  const get = (k: string) => r.pnl.find((l) => l.key === k)?.amount ?? 0
  const rev = get('revenue')
  const steps = [
    { name: 'Giảm trừ', v: get('deduction') },
    { name: 'Giá vốn', v: get('cogs') },
    { name: 'Nhân công', v: get('labor') },
    { name: 'Thuê', v: get('rent') },
    { name: 'Khác', v: get('sellingTotal') - get('labor') - get('rent') + get('interest') },
  ]
  const maxStep = Math.max(...steps.map((s) => s.v), 1)
  const pctTxt = (v: number) => `${rev ? fmt((v / rev) * 100, 1) : 0}%`
  const names = ['Doanh thu', ...steps.map((s) => `${s.name}\n${pctTxt(s.v)}`), 'Dòng tiền\nhoạt động']
  const offsets: number[] = [0]
  const totals: (number | { value: number; itemStyle: { color: string } })[] = [tr(rev)]
  const cuts: (number | string | { value: number; itemStyle: { color: string } })[] = ['-']
  let cur = rev
  const tot: (number | string | { value: number; itemStyle: { color: string } })[] = totals
  steps.forEach((s) => {
    cur -= s.v
    offsets.push(tr(Math.min(cur, cur + s.v)))
    tot.push('-')
    cuts.push({ value: tr(s.v), itemStyle: { color: rankColor(s.v / maxStep) } })
  })
  offsets.push(Math.min(0, tr(r.monthly.cm)))
  tot.push(r.monthly.cm >= 0 ? { value: tr(r.monthly.cm), itemStyle: { color: T.good } } : '-')
  cuts.push(r.monthly.cm < 0 ? { value: tr(-r.monthly.cm), itemStyle: { color: T.bad } } : '-')
  return {
    ...base,
    grid: { left: 8, right: 8, top: 28, bottom: 46 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, formatter: (p: { name: string; seriesName: string; value: number | string }[]) => { const x = p.find((s) => s.seriesName !== 'nền' && s.value !== '-'); return x ? `${x.name.replace('\n', ', ')}<br/><b>${fmt(Number(x.value))} tr</b>` : '' } },
    xAxis: { type: 'category', data: names, axisLabel: { ...axisLabel, color: T.muted, interval: 0, lineHeight: 16 }, axisLine: baseline, axisTick: hide },
    yAxis: noY,
    series: [
      { name: 'nền', type: 'bar', stack: 'w', data: offsets, itemStyle: { color: 'transparent' }, silent: true },
      { name: 'Tổng', type: 'bar', stack: 'w', barWidth: '58%', data: totals, itemStyle: { color: T.neutral, borderRadius: rBar() }, label: lbl({ position: 'top', formatter: (p: { value: number }) => fmt(p.value) }) },
      { name: 'Khoản trừ', type: 'bar', stack: 'w', data: cuts, itemStyle: { color: T.bad, borderRadius: rBar() }, label: lbl({ position: 'top', formatter: (p: { value: number }) => `-${fmt(p.value)}` }) },
    ],
  }
}

/** Bước chia trục đẹp: 1, 2, 5 nhân lũy thừa 10 */
function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}
const profit0 = (i: Inputs, r: Results, c = 0) => tr(c * i.demand.aov * i.site.daysPerMonth * (1 - r.variableCostPct) - r.fixedCost)

// 3. Điểm hòa vốn: lãi lỗ mỗi tháng theo số khách mỗi ngày (triệu VND)
export function breakEvenChart(i: Inputs, r: Results): ChartOption {
  const plan = r.operation.coversPerDay
  const be = isFinite(r.breakEvenCovers) ? r.breakEvenCovers : 0
  const maxC = Math.ceil(Math.max(plan * 1.25, be * 1.6, 10) / 50) * 50
  const lo = Math.min(profit0(i, r), -10)
  const hi = Math.max(profit0(i, r, Math.max(plan * 1.25, be * 1.6, 10)), 10)
  const stepY = niceStep((hi - lo) / 4)
  const profit = (c: number) => tr(c * i.demand.aov * i.site.daysPerMonth * (1 - r.variableCostPct) - r.fixedCost)
  const p0 = profit(0)
  const pEnd = profit(maxC)
  const pPlan = profit(plan)
  const x = (v: number) => +v.toFixed(1)
  const loss = be > 0 ? [[0, p0], [x(be), 0]] : []
  const gain = be > 0 ? [[x(be), 0], [x(maxC), pEnd]] : [[0, p0], [x(maxC), pEnd]]
  const pts: Record<string, unknown>[] = [{ coord: [x(plan), pPlan], symbol: 'circle', symbolSize: 13, itemStyle: { color: T.accent, borderColor: T.bg, borderWidth: 2 }, label: lbl({ position: 'left', offset: [-6, -20], color: T.accent, align: 'right', formatter: `Kế hoạch ${fmt(plan)} khách\n${pPlan >= 0 ? 'Lãi' : 'Lỗ'} ${fmt(Math.abs(pPlan))} triệu VND mỗi tháng`, lineHeight: 18 }) }]
  if (be > 0) {
    pts.push({ coord: [x(be), 0], symbol: 'circle', symbolSize: 12, itemStyle: { color: T.ink, borderColor: T.bg, borderWidth: 2 }, label: lbl({ position: 'right', offset: [10, 18], formatter: `Hòa vốn ${fmt(be)} khách`, align: 'left' }) })
    pts.push({ coord: [0, p0], symbol: 'circle', symbolSize: 8, itemStyle: { color: T.bad }, label: lbl({ position: 'right', offset: [12, 18], color: T.muted, formatter: `Chưa có khách: lỗ ${fmt(-p0)} triệu VND` }) })
  }
  const lineBase = { type: 'line' as const, showSymbol: false, smooth: false }
  return {
    ...base,
    grid: { left: 54, right: 24, top: 24, bottom: 52 },
    tooltip: { ...tip, trigger: 'axis', formatter: (p: { value: number[] }[]) => `${fmt(p[0].value[0])} khách mỗi ngày<br/><b>${p[0].value[1] >= 0 ? 'Lãi' : 'Lỗ'} ${fmt(Math.abs(p[0].value[1]))} triệu VND mỗi tháng</b>` },
    xAxis: { type: 'value', min: 0, max: x(maxC), interval: 50, name: 'Số khách mỗi ngày', nameLocation: 'middle', nameGap: 32, nameTextStyle: { ...axisLabel, color: T.muted }, axisLabel, splitLine: hide, axisLine: baseline, axisTick: hide },
    yAxis: { type: 'value', min: Math.floor(lo / stepY) * stepY - stepY, max: Math.ceil(hi / stepY) * stepY, interval: stepY, axisLabel: { ...axisLabel, formatter: (v: number) => (v === 0 ? '0' : fmt(v)) }, splitLine: hide, axisLine: hide, axisTick: hide },
    series: [
      ...(loss.length ? [{ ...lineBase, name: 'Lỗ', data: loss, lineStyle: { width: 3, color: T.bad }, areaStyle: { color: T.bad, opacity: 0.16 } }] : []),
      {
        ...lineBase, name: 'Lãi', data: gain, lineStyle: { width: 3, color: T.good }, areaStyle: { color: T.good, opacity: 0.16 },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0, lineStyle: { color: T.grey, width: 1, type: 'dashed' }, label: hide }, { xAxis: x(plan), lineStyle: { color: T.accent, width: 1, type: 'dotted' }, label: hide }] },
        markPoint: { data: pts },
      },
    ],
  }
}

// 4. Dòng tiền ròng theo năm (triệu VND)
export function annualCash(r: Results): ChartOption {
  const max = Math.max(...r.annual.map((y) => y.cashflow), 1)
  return {
    ...base,
    grid: { left: 8, right: 8, top: 32, bottom: 28 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, valueFormatter: (v: number) => `${fmt(v)} triệu VND` },
    xAxis: { type: 'category', data: r.annual.map((y) => `Năm ${y.year}`), axisLabel: { ...axisLabel, color: T.muted }, axisTick: hide, axisLine: { ...baseline, onZero: false } },
    yAxis: { ...noY, min: Math.min(0, ...r.annual.map((y) => y.cashflow / 1e6)) * 1.8 },
    series: [{
      type: 'bar', barWidth: '56%', markLine: zeroLine,
      data: r.annual.map((y) => ({ value: +(y.cashflow / 1e6).toFixed(0), itemStyle: { color: y.cashflow >= 0 ? rankColor(y.cashflow / max) : T.bad, borderRadius: y.cashflow >= 0 ? rBar() : [0, 0, 3, 3] }, label: { position: y.cashflow >= 0 ? 'top' : 'bottom' } })),
      label: lbl({ formatter: (p: { value: number }) => fmt(p.value) }),
    }],
  }
}

export const COST_NAMES: Record<string, string> = {
  cogs: 'Giá vốn (COGS)', labor: 'Nhân công', rent: 'Thuê mặt bằng', utilities: 'Điện nước, dịch vụ', marketing: 'Marketing', ga: 'Chi phí chung',
  tools: 'Công cụ dụng cụ', other: 'Chi phí khác', deduction: 'Giảm trừ doanh thu', maintenance: 'Bảo trì', rd: 'R&D, tiếp khách', franchise: 'Nhượng quyền', interest: 'Lãi vay',
}

// 5. Cơ cấu chi phí: thanh ngang xếp hạng, màu cam đậm dần theo độ lớn (% doanh thu)
export function costStructure(r: Results): ChartOption {
  const rows = r.pnl
    .filter((l) => ['deduction', 'cogs', 'labor', 'rent', 'utilities', 'marketing', 'ga', 'tools', 'maintenance', 'other', 'rd', 'franchise', 'interest'].includes(l.key) && l.amount > 0)
    .map((l) => ({ name: COST_NAMES[l.key] ?? l.label.trim(), v: l.pct }))
    .sort((a, b) => a.v - b.v)
  const max = Math.max(...rows.map((x) => x.v), 0.001)
  return {
    ...base,
    grid: { left: 140, right: 60, top: 4, bottom: 4 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, valueFormatter: (v: number) => `${fmt(v, 1)}%` },
    xAxis: { type: 'value', axisLabel: hide, splitLine: hide },
    yAxis: { type: 'category', data: rows.map((x) => x.name), axisTick: hide, axisLine: baseline, axisLabel: { ...axisLabel, color: T.muted, fontSize: 13, margin: 12 } },
    series: [{
      type: 'bar', barWidth: 20,
      data: rows.map((x) => ({ value: +(x.v * 100).toFixed(1), itemStyle: { color: rankColor(x.v / max), borderRadius: rBar(true) } })),
      label: lbl({ position: 'right', formatter: (p: { value: number }) => `${fmt(p.value, 1)}%` }),
    }],
  }
}

// 6. Tornado: tác động của từng biến lên lợi nhuận tháng (triệu VND)
export function tornadoChart(t: TornadoBar[]): ChartOption {
  const rows = [...t].reverse()
  return {
    ...base,
    grid: { left: 130, right: 56, top: 4, bottom: 8 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, valueFormatter: (v: number) => `${v > 0 ? '+' : ''}${fmt(v, 1)} triệu VND` },
    xAxis: { type: 'value', axisLabel: hide, splitLine: hide },
    // onZero:false đặt trục nhãn ở mép trái, không đè lên thanh
    yAxis: { type: 'category', data: rows.map((x) => x.label), axisTick: hide, axisLine: { ...baseline, onZero: false }, axisLabel: { ...axisLabel, color: T.ink, fontSize: 13, margin: 14 } },
    series: [
      { name: 'Bất lợi', type: 'bar', stack: 't', barWidth: 22, data: rows.map((x) => tr(x.low)), itemStyle: { color: T.bad, borderRadius: [3, 0, 0, 3] }, label: lbl({ position: 'left', color: T.bad, formatter: (p: { value: number }) => (p.value < -0.05 ? `-${fmt(-p.value, 1)}` : '') }) },
      { name: 'Có lợi', type: 'bar', stack: 't', data: rows.map((x) => tr(x.high)), itemStyle: { color: T.good, borderRadius: [0, 3, 3, 0] }, label: lbl({ position: 'right', color: T.good, formatter: (p: { value: number }) => (p.value > 0.05 ? `+${fmt(p.value, 1)}` : '') }) },
    ],
  }
}

// 7. So sánh kịch bản: lợi nhuận trước thuế mỗi tháng, kèm chênh lệch so với cơ sở (triệu VND)
export function scenarioBars(rows: { name: string; uc: number }[], baseIndex = 1): ChartOption {
  const b = rows[baseIndex]?.uc ?? 0
  const names = rows.map((x, i) => (i === baseIndex ? `${x.name}\n` : `${x.name}\n${x.uc - b >= 0 ? '+' : '-'}${fmt(Math.abs(x.uc - b) / 1e6)} so với cơ sở`))
  const lim = Math.max(...rows.map((x) => Math.abs(x.uc / 1e6)), 1)
  return {
    ...base,
    grid: { left: 8, right: 8, top: 30, bottom: 46 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, valueFormatter: (v: number) => `${fmt(v)} triệu VND` },
    xAxis: { type: 'category', data: names, axisLabel: { ...axisLabel, color: T.muted, interval: 0, lineHeight: 17 }, axisTick: hide, axisLine: { ...baseline, onZero: false } },
    yAxis: { type: 'value', min: Math.min(0, ...rows.map((x) => x.uc / 1e6)) * 2.2, max: lim * 1.2, axisLabel: hide, splitLine: hide, axisLine: hide },
    series: [{
      type: 'bar', barWidth: '52%', markLine: zeroLine,
      data: rows.map((x, i) => ({ value: +(x.uc / 1e6).toFixed(0), itemStyle: { color: i === baseIndex ? T.neutral : x.uc >= b ? T.good : T.bad, borderRadius: x.uc >= 0 ? rBar() : [0, 0, 3, 3] }, label: { position: x.uc >= 0 ? 'top' : 'bottom' } })),
      label: lbl({ formatter: (p: { value: number }) => fmt(p.value) }),
    }],
  }
}

// 8. Đường biên mục tiêu: mỗi mức AOV cần bao nhiêu khách mỗi ngày. Phía trên đường là vùng đạt mục tiêu, phía dưới là chưa đạt.
export function frontierChart(f: { aov: number; covers: number | null }[], cur: { aov: number; covers: number }): ChartOption {
  const pts = f.filter((p) => p.covers != null).map((p) => [p.aov / 1000, +(p.covers as number).toFixed(0)])
  const xs = pts.map((p) => p[0])
  const x0 = Math.min(...xs, cur.aov / 1000), x1 = Math.max(...xs, cur.aov / 1000)
  const ymax = Math.ceil((Math.max(...pts.map((p) => p[1]), cur.covers) * 1.12) / 100) * 100
  const curX = +(cur.aov / 1000).toFixed(1)
  // số khách cần có tại đúng mức AOV hiện tại (nội suy tuyến tính trên đường biên)
  let need: number | null = null
  for (let i = 1; i < pts.length; i++) if (curX >= pts[i - 1][0] && curX <= pts[i][0]) { const k = (curX - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0] || 1); need = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k }
  const gap = need == null ? null : need - cur.covers
  const gapColor = gap == null ? T.grey : gap > 0 ? T.bad : T.good
  const curve = { type: 'line' as const, data: pts, showSymbol: false, lineStyle: { width: 3, color: T.neutral }, silent: false }
  return {
    ...base,
    grid: { left: 52, right: 28, top: 30, bottom: 54 },
    tooltip: { ...tip, trigger: 'axis', formatter: (p: { value: number[]; seriesName: string }[]) => { const q = p.find((s) => s.seriesName === 'Cần có') ?? p[0]; return `AOV ${fmt(q.value[0])} nghìn đồng<br/><b>cần ${fmt(q.value[1])} khách mỗi ngày</b>` } },
    xAxis: { type: 'value', min: Math.floor(x0 / 10) * 10, max: Math.ceil(x1 / 10) * 10, interval: 10, name: 'AOV (nghìn đồng)', nameLocation: 'middle', nameGap: 32, nameTextStyle: { ...axisLabel, color: T.muted }, axisLabel, splitLine: hide, axisLine: baseline, axisTick: hide },
    yAxis: { type: 'value', min: 0, max: ymax, interval: ymax / 4, name: 'Khách mỗi ngày', nameGap: 12, nameTextStyle: { ...axisLabel, color: T.muted, align: 'left' }, axisLabel: { ...axisLabel, formatter: (v: number) => fmt(v) }, splitLine: hide, axisLine: hide, axisTick: hide },
    series: [
      // vùng đạt mục tiêu: từ đường biên lên đến đỉnh trục
      { ...curve, name: 'Cần có', areaStyle: { color: T.good, opacity: 0.1, origin: 'end' },
        markPoint: { silent: true, symbol: 'circle', symbolSize: 0, data: [
          { coord: [x1 - (x1 - x0) * 0.22, ymax * 0.9], label: lbl({ show: true, formatter: 'Vùng đạt mục tiêu', color: T.good, fontSize: 13 }) },
          { coord: [x0 + (x1 - x0) * 0.2, ymax * 0.07], label: lbl({ show: true, formatter: 'Vùng chưa đạt', color: T.bad, fontSize: 13 }) },
        ] } },
      { ...curve, name: 'Cần có (dưới)', areaStyle: { color: T.bad, opacity: 0.07, origin: 'start' }, lineStyle: { width: 0 }, tooltip: { show: false } },
      { name: 'Hiện tại', type: 'scatter', data: [[curX, +cur.covers.toFixed(0)]], symbolSize: 16, z: 6, itemStyle: { color: T.accent, borderColor: T.raised, borderWidth: 3, shadowBlur: 10, shadowColor: 'rgba(255,109,41,0.5)' },
        label: lbl({ show: true, formatter: `Hiện tại: ${fmt(cur.covers)} khách`, position: 'bottom', offset: [0, 8], color: T.accent }),
        markLine: need == null ? undefined : { silent: true, symbol: ['none', 'none'], lineStyle: { color: gapColor, width: 2, type: 'dashed' },
          label: { show: true, position: 'end', formatter: gap! > 0 ? `Thiếu ${fmt(gap!)} khách` : `Dư ${fmt(-gap!)} khách`, color: gapColor, fontFamily: T.font, fontWeight: 700, fontSize: 12.5, distance: 8 },
          data: [[{ coord: [curX, +cur.covers.toFixed(0)] }, { coord: [curX, +need.toFixed(0)] }]] } },
    ],
  }
}

// 9. Công suất lấp đầy theo giờ mở cửa: các giờ cao điểm liên tiếp (suy ra từ tỷ lệ khách dồn vào cao điểm)
export function hourlyOccupancy(i: Inputs, r: Results): ChartOption {
  const hours = Math.max(4, Math.round(i.site.openHoursPerDay))
  const seats = Math.max(r.operation.seats, 1)
  const covers = r.operation.coversPerDay
  const stayH = i.site.avgStayMinutes / 60
  const peakStart = Math.max(1, Math.round(hours * 0.4))
  const ph = peakHoursOf(i)
  const perPeak = (covers * i.site.peakShare) / ph
  const perOff = (covers * (1 - i.site.peakShare)) / Math.max(hours - ph, 1)
  const rows = Array.from({ length: hours }, (_, h) => {
    const peak = h >= peakStart && h < peakStart + ph
    return { h, peak, v: ((peak ? perPeak : perOff) * stayH) / seats }
  })
  const max = Math.max(...rows.map((x) => x.v), 0.01)
  return {
    ...base,
    grid: { left: 8, right: 8, top: 34, bottom: 30 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, formatter: (p: { dataIndex: number }[]) => { const x = rows[p[0].dataIndex]; return `Giờ thứ ${x.h + 1}${x.peak ? ' (cao điểm)' : ''}<br/><b>${fmt(x.v * 100)}% chỗ ngồi có khách</b>` } },
    xAxis: { type: 'category', data: rows.map((x) => `Giờ ${x.h + 1}`), axisLabel: { ...axisLabel, color: T.muted, interval: 0 }, axisTick: hide, axisLine: baseline },
    yAxis: { type: 'value', min: 0, max: Math.max(max * 100 * 1.2, 110), axisLabel: hide, splitLine: hide, axisLine: hide },
    series: [{
      type: 'bar', barWidth: '62%',
      data: rows.map((x) => ({ value: +(x.v * 100).toFixed(0), itemStyle: { color: x.v > 1 ? T.bad : x.peak ? rankColor(1) : rankColor(0.25), borderRadius: rBar() } })),
      label: lbl({ position: 'top', formatter: (p: { value: number }) => `${fmt(p.value)}%` }),
      markLine: { silent: true, symbol: 'none', data: [{ yAxis: 90, lineStyle: { color: T.warn, type: 'dashed', width: 1.2 }, label: lbl({ show: true, position: 'insideEndTop', color: T.warn, formatter: 'Ngưỡng quá tải 90%', fontSize: 12 }) }] },
    }],
  }
}

// 10. Diện tích cần có theo số khách mỗi ngày (giữ nguyên vòng quay ghế và diện tích mỗi chỗ ngồi)
export function areaCurve(i: Inputs, r: Results): ChartOption {
  const plan = r.operation.coversPerDay
  const top = Math.ceil((plan * 2) / 50) * 50
  const need = (c: number) => (c / i.demand.seatTurnover) * i.site.areaPerSeat + i.site.kitchenArea
  const pts: number[][] = []
  for (let c = 0; c <= top; c += 10) pts.push([c, +need(c).toFixed(0)])
  const own = i.site.totalArea
  return {
    ...base,
    grid: { left: 54, right: 40, top: 34, bottom: 52 },
    tooltip: { ...tip, trigger: 'axis', formatter: (p: { value: number[] }[]) => `${fmt(p[0].value[0])} khách mỗi ngày<br/><b>cần ${fmt(p[0].value[1])} m²</b>` },
    xAxis: { type: 'value', min: 0, max: top, interval: 50, name: 'Số khách mỗi ngày', nameLocation: 'middle', nameGap: 32, nameTextStyle: { ...axisLabel, color: T.muted }, axisLabel, splitLine: hide, axisLine: baseline, axisTick: hide },
    yAxis: { type: 'value', min: 0, axisLabel: { ...axisLabel, formatter: (v: number) => `${fmt(v)}` }, splitLine: hide, axisLine: hide, axisTick: hide },
    series: [{
      type: 'line', data: pts, showSymbol: false, lineStyle: { width: 3, color: T.neutral }, areaStyle: { color: T.neutral, opacity: 0.06 },
      markLine: { silent: true, symbol: 'none', data: [{ yAxis: own, lineStyle: { color: T.accent, type: 'dashed', width: 1.5 }, label: lbl({ show: true, position: 'insideEndTop', color: T.accent, formatter: `Diện tích hiện có ${fmt(own)} m²` }) }] },
      markPoint: { data: [{ coord: [plan, +need(plan).toFixed(0)], symbol: 'circle', symbolSize: 13, itemStyle: { color: T.accent, borderColor: T.bg, borderWidth: 2 }, label: lbl({ position: 'right', offset: [14, 34], color: T.accent, formatter: `Kế hoạch ${fmt(plan)} khách\ncần ${fmt(need(plan))} m²`, align: 'left', lineHeight: 18 }) }] },
    }],
  }
}

// 11. Dòng tiền hoạt động và lợi nhuận sau thuế theo năm (triệu VND), hai cột cạnh nhau
export function annualPnl(r: Results): ChartOption {
  const years = r.annual.map((y) => `Năm ${y.year}`)
  const bar = (name: string, key: 'cm' | 'netProfit', color: string) => ({
    name, type: 'bar' as const, barWidth: '26%', barGap: '12%',
    data: r.annual.map((y) => ({ value: +(y[key] / 1e6).toFixed(0), itemStyle: { color: y[key] >= 0 ? color : T.bad, borderRadius: rBar() } })),
    label: lbl({ position: 'top', formatter: (p: { value: number }) => fmt(p.value) }),
  })
  return {
    ...base,
    grid: { left: 8, right: 8, top: 30, bottom: 28 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(128,128,128,0.06)' } }, valueFormatter: (v: number) => `${fmt(v)} triệu VND` },
    xAxis: { type: 'category', data: years, axisLabel: { ...axisLabel, color: T.muted }, axisTick: hide, axisLine: baseline },
    yAxis: { ...noY, min: 0 },
    series: [bar('Dòng tiền hoạt động', 'cm', T.accent), bar('Lợi nhuận sau thuế', 'netProfit', T.good)],
  }
}

// 12. Chi phí nhân sự theo vị trí (triệu VND mỗi tháng), thang cam giảm dần
export function staffCostBars(staff: { name: string; headcount: number; cost: number }[]): ChartOption {
  const rows = [...staff].sort((a, b) => a.cost - b.cost)
  const max = Math.max(...rows.map((x) => x.cost), 1)
  return {
    ...base,
    grid: { left: 150, right: 190, top: 4, bottom: 4 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, valueFormatter: (v: number) => `${fmt(v, 1)} triệu VND` },
    xAxis: { type: 'value', axisLabel: hide, splitLine: hide },
    yAxis: { type: 'category', data: rows.map((x) => x.name), axisTick: hide, axisLine: baseline, axisLabel: { ...axisLabel, color: T.muted, fontSize: 13, margin: 12 } },
    series: [{
      type: 'bar', barWidth: 22,
      data: rows.map((x) => ({ value: +(x.cost / 1e6).toFixed(1), itemStyle: { color: rankColor(x.cost / max), borderRadius: rBar(true) }, headcount: x.headcount })),
      label: lbl({ position: 'right', formatter: (p: { value: number; data: { headcount: number } }) => `${fmt(p.value, 1)} triệu VND / ${p.data.headcount} người` }),
    }],
  }
}

// 13. Số nhân sự cần có theo lượng khách mỗi ngày
export function headcountCurve(i: Inputs, r: Results): ChartOption {
  const plan = r.operation.coversPerDay
  const top = Math.ceil((plan * 1.8) / 20) * 20
  const xs: number[] = []
  for (let c = Math.max(20, Math.floor((plan * 0.4) / 20) * 20); c <= top; c += 20) xs.push(c)
  const heads = xs.map((c) => staffLines(i, c).reduce((s, l) => s + l.headcount, 0))
  const planIdx = xs.reduce((best, c, k) => (Math.abs(c - plan) < Math.abs(xs[best] - plan) ? k : best), 0)
  return {
    ...base,
    grid: { left: 8, right: 8, top: 30, bottom: 50 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, formatter: (p: { dataIndex: number }[]) => `${fmt(xs[p[0].dataIndex])} khách mỗi ngày<br/><b>${fmt(heads[p[0].dataIndex])} nhân sự</b>` },
    xAxis: { type: 'category', data: xs.map(String), name: 'Số khách mỗi ngày', nameLocation: 'middle', nameGap: 30, nameTextStyle: { ...axisLabel, color: T.muted }, axisLabel: { ...axisLabel, color: T.muted }, axisTick: hide, axisLine: baseline },
    yAxis: { ...noY, min: 0 },
    series: [{
      type: 'bar', barWidth: '60%',
      data: heads.map((h, k) => ({ value: h, itemStyle: { color: k === planIdx ? T.accent : rankColor(0.3), borderRadius: rBar() } })),
      label: lbl({ position: 'top', formatter: (p: { value: number }) => fmt(p.value) }),
    }],
  }
}

// 14. Cơ cấu chi phí dạng treemap: diện tích và màu cam đậm theo tỷ lệ trên doanh thu
export function costTreemap(r: Results): ChartOption {
  const rows = r.pnl
    .filter((l) => ['deduction', 'cogs', 'labor', 'rent', 'utilities', 'marketing', 'ga', 'tools', 'maintenance', 'other', 'rd', 'franchise', 'interest'].includes(l.key) && l.amount > 0)
    .map((l) => ({ name: COST_NAMES[l.key] ?? l.label.trim(), v: l.pct }))
  const max = Math.max(...rows.map((x) => x.v), 0.001)
  return {
    ...base,
    tooltip: { ...tip, formatter: (p: { name: string; value: number }) => `${p.name}<br/><b>${fmt(p.value, 1)}% doanh thu</b>` },
    series: [{
      type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, squareRatio: 1.1,
      label: {
        show: true, position: 'insideTopLeft', padding: [10, 12], overflow: 'truncate',
        formatter: (p: { name: string; value: number }) => (p.value >= 3 ? `{n|${p.name}}\n{v|${fmt(p.value, 1)}%}` : ''),
        rich: { n: { fontFamily: T.font, fontSize: 13, fontWeight: 600, color: '#111' }, v: { fontFamily: T.font, fontSize: 22, fontWeight: 700, color: '#111', padding: [4, 0, 0, 0] } },
      },
      itemStyle: { borderColor: T.raised, borderWidth: 3, gapWidth: 3, borderRadius: 8 },
      data: rows.map((x) => ({ name: x.name, value: +(x.v * 100).toFixed(1), itemStyle: { color: rankColor(x.v / max) } })),
    }],
  }
}

/** Các khoản chi nhỏ (dưới 3% doanh thu) không đủ chỗ ghi nhãn trong treemap, liệt kê ở dòng chú thích */
export function smallCosts(r: Results): string {
  return r.pnl
    .filter((l) => ['deduction', 'cogs', 'labor', 'rent', 'utilities', 'marketing', 'ga', 'tools', 'maintenance', 'other', 'rd', 'franchise', 'interest'].includes(l.key) && l.amount > 0 && l.pct < 0.03)
    .sort((a, b) => b.pct - a.pct)
    .map((l) => `${COST_NAMES[l.key] ?? l.label.trim()} ${fmt(l.pct * 100, 1)}%`)
    .join(', ')
}

// 15. Cơ cấu vốn đầu tư dạng treemap (triệu VND)
export function capexTreemap(r: Results): ChartOption {
  const rows = r.capexLines.filter((x) => x.amount > 0)
  const max = Math.max(...rows.map((x) => x.amount), 1)
  return {
    ...base,
    tooltip: { ...tip, formatter: (p: { name: string; value: number }) => `${p.name}<br/><b>${fmt(p.value)} tr</b>` },
    series: [{
      type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, squareRatio: 1.2,
      label: {
        show: true, position: 'insideTopLeft', padding: [10, 12], overflow: 'truncate',
        formatter: (p: { name: string; value: number }) => (p.value >= 60 ? `{n|${p.name}}\n{v|${fmt(p.value)} tr}` : ''),
        rich: { n: { fontFamily: T.font, fontSize: 13, fontWeight: 600, color: '#111' }, v: { fontFamily: T.font, fontSize: 22, fontWeight: 700, color: '#111', padding: [4, 0, 0, 0] } },
      },
      itemStyle: { borderColor: T.raised, borderWidth: 3, gapWidth: 3, borderRadius: 8 },
      data: rows.map((x) => ({ name: x.label, value: tr(x.amount), itemStyle: { color: rankColor(x.amount / max) } })),
    }],
  }
}

// 16. Khấu hao theo năm (triệu VND)
export function depreciationBars(r: Results): ChartOption {
  const max = Math.max(...r.annual.map((y) => y.depreciation), 1)
  return {
    ...base,
    grid: { left: 8, right: 8, top: 30, bottom: 28 },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'none' }, valueFormatter: (v: number) => `${fmt(v)} triệu VND` },
    xAxis: { type: 'category', data: r.annual.map((y) => `Năm ${y.year}`), axisLabel: { ...axisLabel, color: T.muted }, axisTick: hide, axisLine: baseline },
    yAxis: { ...noY, min: 0 },
    series: [{
      type: 'bar', barWidth: '50%',
      data: r.annual.map((y) => ({ value: +(y.depreciation / 1e6).toFixed(0), itemStyle: { color: rankColor(y.depreciation / max), borderRadius: rBar() } })),
      label: lbl({ position: 'top', formatter: (p: { value: number }) => fmt(p.value) }),
    }],
  }
}
