import { EChart } from '../components/EChart'
import * as ch from '../components/charts'
import { Reveal } from '../components/motion'
import { Card, Gauge, Kpi, MiniBars, Ring, Spark, Table } from '../components/ui'
import { mn, money, months, num, pct, cumTitle } from '../lib/format'
import type { ViewProps } from './Overview'

const neg = (v: number, text: string) => <span className={v < 0 ? 'text-bad' : ''}>{text}</span>
const tr = (v: number) => num(v / 1e6, 0)
const kpiGrid = 'stagger grid grid-cols-2 gap-5 xl:grid-cols-4'

export function Finance({ inputs, results: r, tab }: ViewProps & { tab: string }) {
  if (tab === 'pnl') {
    const a = r.annual
    const gross = (y: (typeof a)[number]) => y.revenue - y.deduction - y.cogs
    const row = (label: string, f: (y: (typeof a)[number]) => number, o: { strong?: boolean; minus?: boolean; colour?: boolean } = {}) => ({
      strong: o.strong, cells: [label, ...a.map((y) => { const v = f(y) * (o.minus ? -1 : 1); return o.colour ? neg(v, tr(v)) : tr(v) })],
    })
    const margin = (label: string, f: (y: (typeof a)[number]) => number) => ({ muted: true, cells: [label, ...a.map((y) => pct(y.revenue ? f(y) / y.revenue : 0, 1))] })
    return (
      <div className="space-y-12">
        <div className={kpiGrid}>
          <Kpi label="Doanh thu năm 1" value={money(a[0]?.revenue)} sub={`Năm ${a.length}: ${money(a[a.length - 1]?.revenue)}`} viz={<Spark data={a.map((y) => y.revenue)} />} />
          <Kpi label="Lợi nhuận gộp năm 1" value={money(a[0] ? gross(a[0]) : 0)} sub={`Biên ${pct(a[0] ? gross(a[0]) / a[0].revenue : 0, 1)}`} viz={<Ring ratio={a[0] ? gross(a[0]) / a[0].revenue : 0} />} />
          <Kpi label="Dòng tiền hoạt động năm 1" value={money(a[0]?.cm)} sub={`Biên ${pct(a[0] ? a[0].cm / a[0].revenue : 0, 1)}`} tone={(a[0]?.cm ?? 0) > 0 ? undefined : 'bad'} viz={<MiniBars data={a.map((y) => y.cm)} />} />
          <Kpi label="Lợi nhuận sau thuế năm 1" value={money(a[0]?.netProfit)} sub={`Thuế ${pct(inputs.finance.taxRate)}`} tone={(a[0]?.netProfit ?? 0) > 0 ? undefined : 'bad'} viz={<MiniBars data={a.map((y) => y.netProfit)} tone="good" />} />
        </div>
        <Reveal>
          <Card title="How earnings build year by year (triệu VND)" subtitle="cột cam là dòng tiền hoạt động (EBITDA), cột xanh là lợi nhuận sau thuế">
            <EChart option={ch.annualPnl(r)} height={320} />
          </Card>
        </Reveal>
        <Card title="Five-year profit and loss (triệu VND)" subtitle="đã gồm ramp-up, tăng giá thuê và tăng trưởng">
          <Table head={['Khoản mục', ...a.map((y) => `Năm ${y.year}`)]} rows={[
            row('Doanh thu', (y) => y.revenue, { strong: true }),
            row('Giảm trừ doanh thu', (y) => y.deduction, { minus: true }),
            row('Giá vốn (COGS)', (y) => y.cogs, { minus: true }),
            row('Lợi nhuận gộp', gross, { strong: true }),
            row('Nhân công', (y) => y.labor, { minus: true }),
            row('Thuê mặt bằng và phí dịch vụ', (y) => y.rent, { minus: true }),
            row('Chi phí khác', (y) => y.otherOpex, { minus: true }),
            row('Dòng tiền hoạt động (EBITDA)', (y) => y.cm, { strong: true, colour: true }),
            row('Khấu hao', (y) => y.depreciation, { minus: true }),
            row('Lợi nhuận trước thuế', (y) => y.profitBeforeTax, { strong: true, colour: true }),
            row('Thuế thu nhập', (y) => y.tax, { minus: true }),
            row('Lợi nhuận sau thuế', (y) => y.netProfit, { strong: true, colour: true }),
            margin('Biên lợi nhuận gộp', gross),
            margin('Biên dòng tiền hoạt động', (y) => y.cm),
            margin('Biên lợi nhuận sau thuế', (y) => y.netProfit),
          ]} />
        </Card>
        <div className="grid gap-12 xl:grid-cols-2">
          <Reveal>
            <Card title="A steady month, line by line (triệu VND, % doanh thu)" subtitle="năm 1, đã qua giai đoạn ramp-up">
              <Table dense
                rows={r.pnl.map((l) => ({ strong: l.kind !== 'cost', cells: [l.label.trim(), neg(l.amount, num(l.amount / 1e6, 1)), <span className="text-dim">{pct(l.pct, 1)}</span>] }))} />
            </Card>
          </Reveal>
          <div className="space-y-12">
            <Reveal><Card title="From revenue to operating cash (triệu VND/tháng)" subtitle="Một tháng vận hành ổn định, mỗi khoản trừ dần từ doanh thu xuống dòng tiền"><EChart option={ch.pnlWaterfall(r)} height={270} /></Card></Reveal>
            <Reveal delay={80}><Card title="Where every đồng of revenue goes (% doanh thu)" subtitle="Mỗi khoản chi chiếm bao nhiêu phần trăm doanh thu, xếp từ cao đến thấp"><EChart option={ch.costStructure(r)} height={380} /></Card></Reveal>
          </div>
        </div>
      </div>
    )
  }

  if (tab === 'breakeven') {
    const fixed = r.pnl.filter((l) => l.fixed)
    const varRows: [string, number][] = [
      ['Giảm trừ doanh thu', inputs.pnl.revenueDeductionPct], ['Giá vốn (COGS)', inputs.pnl.cogsPct], ['Điện nước, dịch vụ', inputs.pnl.utilitiesPct],
      ['R&D và tiếp khách', inputs.pnl.rdPct], ['Bảo trì, bảo dưỡng', inputs.pnl.maintenancePct], ['Chi phí khác', inputs.pnl.otherPct],
      ['Marketing', inputs.pnl.marketingPct], ['Nhượng quyền', inputs.pnl.franchisePct], ['Chi phí chung phân bổ', inputs.pnl.gaPct],
    ].filter(([, v]) => (v as number) > 0) as [string, number][]
    if (inputs.rent.pctSales > 0) varRows.push(['Thuê theo % doanh thu', inputs.rent.pctSales])
    const plan = r.operation.coversPerDay
    const be = isFinite(r.breakEvenCovers) ? r.breakEvenCovers : 0
    const span = Math.max(plan, be) * 1.15 || 1
    return (
      <div className="space-y-12">
        <div className={kpiGrid}>
          <Kpi label="Khách tối thiểu để không lỗ" value={num(Math.round(be))} sub={`Mỗi ngày, kế hoạch ${num(Math.round(plan))} khách`} tone={r.marginOfSafety >= inputs.verdict.goodSafety ? 'good' : 'warn'} />
          <Kpi label="Doanh thu hòa vốn mỗi tháng" value={money(r.breakEvenRevenue)} sub={`Kế hoạch ${money(r.monthly.revenue)}`} />
          <Kpi label="Chi phí cố định mỗi tháng" value={money(r.fixedCost)} sub="Nhân công, dụng cụ, thuê, khấu hao" />
          <Kpi label="Chi phí biến đổi mỗi khách" value={`${num(r.unitVariableCost / 1e3, 1)} ngàn VND`} sub={`${pct(r.variableCostPct, 1)} doanh thu, AOV ${num(inputs.demand.aov / 1e3, 1)} ngàn VND`} />
        </div>

        <Card title="How many guests it takes to stop losing money" subtitle="Số khách hòa vốn so với kế hoạch, vùng giữa hai mốc là biên an toàn">
          <div className="relative mt-16 h-[10px] bg-black/10">
            <div className="absolute inset-y-0 left-0 bg-bad/70" style={{ width: `${(be / span) * 100}%` }} />
            <div className="absolute inset-y-0 bg-gradient-to-r from-good/30 to-good" style={{ left: `${(be / span) * 100}%`, width: `${(Math.max(plan - be, 0) / span) * 100}%` }} />
            <div className="absolute -top-[58px] -translate-x-1/2 text-center" style={{ left: `${(be / span) * 100}%` }}>
              <div className="num text-[16px] font-bold">{num(Math.round(be))}</div><div className="text-[11.5px] text-dim">Hòa vốn</div>
              <div className="mx-auto mt-1 h-[34px] w-px bg-ink/60" />
            </div>
            <div className="absolute -top-[58px] -translate-x-1/2 text-center" style={{ left: `${(plan / span) * 100}%` }}>
              <div className="num text-[16px] font-bold text-accent">{num(Math.round(plan))}</div><div className="text-[11.5px] text-accent">Kế hoạch</div>
              <div className="mx-auto mt-1 h-[34px] w-px bg-accent" />
            </div>
          </div>
          <div className="mt-4 flex justify-between text-[12px] text-dim"><span>0 khách</span><span>Biên an toàn {pct(r.marginOfSafety)}, tức kế hoạch có thể giảm {pct(r.marginOfSafety)} khách trước khi bắt đầu lỗ</span><span>{num(Math.round(span))} khách</span></div>
        </Card>

        <Card title="Profit switches on at the break-even crowd (triệu VND/tháng)" subtitle="trước thuế. Đường cắt mốc 0 là điểm hòa vốn.">
          <EChart option={ch.breakEvenChart(inputs, r)} height={400} />
        </Card>

        <div className="grid gap-12 xl:grid-cols-2">
          <Card title="Fixed costs (triệu VND/tháng)" subtitle="không đổi theo số khách">
            <Table rows={[
              ...fixed.map((l) => ({ cells: [l.label.trim().replace(/^[\d.]+\s*/, ''), num(l.amount / 1e6, 1)] })),
              { cells: ['Khấu hao', num(r.monthlyDepreciation / 1e6, 1)] },
              { strong: true, cells: ['Tổng chi phí cố định', num(r.fixedCost / 1e6, 1)] },
            ]} />
          </Card>
          <Card title="Variable costs (% doanh thu)" subtitle="tăng theo số khách">
            <Table rows={[
              ...varRows.map(([a, b]) => ({ cells: [a, pct(b, 1)] })),
              { strong: true, cells: ['Tổng chi phí biến đổi', pct(r.variableCostPct, 1)] },
              { strong: true, cells: ['Biên đóng góp', pct(1 - r.variableCostPct, 1)] },
            ]} />
          </Card>
        </div>
        <p className="text-[12.5px] leading-relaxed text-dim">Doanh thu hòa vốn bằng chi phí cố định chia cho biên đóng góp. Nhân công và công cụ dụng cụ được xếp vào chi phí cố định theo cách phân loại của mô hình gốc.</p>
      </div>
    )
  }

  if (tab === 'cash') {
    const d = inputs.finance.discountRate
    let cumPv = -r.capexTotal
    const rows = [
      { cells: ['Năm 0 (đầu tư)', neg(-r.capexTotal, mn(-r.capexTotal)), '1,00', neg(-r.capexTotal, mn(-r.capexTotal)), neg(-r.capexTotal, mn(-r.capexTotal)), neg(-r.capexTotal, mn(-r.capexTotal))] },
      ...r.annual.map((y) => {
        const f = 1 / Math.pow(1 + d, y.year)
        cumPv += y.cashflow * f
        return { cells: [`Năm ${y.year}`, mn(y.cashflow), num(f, 2), mn(y.cashflow * f), neg(y.cumulative, mn(y.cumulative)), neg(cumPv, mn(cumPv))] }
      }),
    ]
    return (
      <div className="space-y-12">
        <div className={kpiGrid}>
          <Kpi label="Vốn đầu tư" value={money(r.capexTotal)} sub="Đã gồm đặt cọc, được hoàn cuối hợp đồng" />
          <Kpi label="Hoàn vốn sau" value={months(r.paybackCumulative)} sub={`Công thức đơn giản: ${months(r.paybackSimple)}`} />
          <Kpi label="IRR mỗi năm" value={pct(r.irr)} tone={r.irr != null && r.irr >= inputs.verdict.goodIrr ? 'good' : r.irr == null ? 'bad' : undefined} />
          <Kpi label="NPV" value={money(r.npv)} sub={`Chiết khấu ${pct(d)} mỗi năm`} tone={r.npv >= 0 ? 'good' : 'bad'} />
        </div>
        <div className="grid gap-12 xl:grid-cols-2">
          <Reveal><Card title="Net cash flow by year (triệu VND)" subtitle="sau thuế, năm cuối gồm hoàn cọc"><EChart option={ch.annualCash(r)} height={290} /></Card></Reveal>
          <Reveal delay={80}><Card title={cumTitle(r.paybackCumulative)} subtitle={`tháng 0 đến ${r.monthlyCumulative.length - 1}`}><EChart option={ch.cumulativeCash(r)} height={290} /></Card></Reveal>
        </div>
        <Card title="Discounted cash flow table (triệu VND)" subtitle="lũy kế gồm cả vốn đầu tư ban đầu">
          <Table strongLast head={['Năm', 'Dòng tiền ròng', 'Hệ số chiết khấu', 'Giá trị hiện tại', 'Lũy kế', 'Lũy kế hiện tại']} rows={rows} />
        </Card>
      </div>
    )
  }

  const lines = r.capexLines.filter((c) => c.amount > 0)
  const seats = Math.max(Math.floor(r.operation.seats), 1)
  return (
    <div className="space-y-12">
      <div className={kpiGrid}>
        <Kpi label="Tổng vốn đầu tư" value={money(r.capexTotal)} />
        <Kpi label="Vốn mỗi m² sàn" value={money(r.capexTotal / inputs.site.totalArea)} />
        <Kpi label="Vốn mỗi chỗ ngồi" value={money(r.capexTotal / seats)} />
        <Kpi label="Khấu hao mỗi tháng" value={money(r.monthlyDepreciation)} />
      </div>
      <div className="grid gap-12 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Capital required, item by item (VND)" subtitle="khấu hao đường thẳng theo tháng">
          <Table head={['Hạng mục', 'Số tiền', 'Thời gian khấu hao', 'Khấu hao mỗi tháng']} rows={[
            ...lines.map((c) => ({ cells: [c.label, money(c.amount), c.lifeMonths ? `${c.lifeMonths} tháng` : 'Không khấu hao', c.monthlyDep ? money(c.monthlyDep) : 'n/a'] })),
            { strong: true, cells: ['Tổng', money(r.capexTotal), '', money(r.monthlyDepreciation)] },
          ]} />
        </Card>
        <Card title="Share of each item (% vốn đầu tư)" subtitle="xếp theo độ lớn">
          <div className="space-y-5">
            {[...lines].sort((x, y) => y.amount - x.amount).map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-[13px]"><span className="text-muted">{c.label}</span><span className="num font-bold">{pct(c.amount / r.capexTotal, 1)}</span></div>
                <div className="mt-2"><Gauge ratio={c.amount / r.capexTotal} h={12} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <Reveal><Card title="Capital by item (triệu VND)" subtitle="diện tích và màu cam đậm theo độ lớn"><EChart option={ch.capexTreemap(r)} height={340} /></Card></Reveal>
        <Reveal delay={80}><Card title="Depreciation by year (triệu VND)" subtitle="khấu hao đường thẳng của tài sản cố định và công cụ"><EChart option={ch.depreciationBars(r)} height={340} /></Card></Reveal>
      </div>
      <p className="text-[12.5px] leading-relaxed text-dim">Tiền đặt cọc không bị khấu hao và được hoàn lại vào cuối thời hạn thuê. Chi phí tiền hoạt động được tính vào vốn đầu tư nhưng không khấu hao, theo cách của mô hình gốc.</p>
    </div>
  )
}
