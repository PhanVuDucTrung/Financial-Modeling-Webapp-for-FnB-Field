import { useMemo } from 'react'
import { AdvicePanel, toneText } from '../components/Advice'
import { EChart } from '../components/EChart'
import * as ch from '../components/charts'
import { Rich } from '../lib/rich'
import { Reveal } from '../components/motion'
import { Card, Gauge, Kpi, Table } from '../components/ui'
import { buildAdvisory, type Lever } from '../engine/advisory'
import type { Inputs, Results } from '../engine/types'
import { money, months, num, pct, cumTitle } from '../lib/format'

export type ViewProps = { inputs: Inputs; results: Results }

export function payTone(i: Inputs, r: Results) {
  if (r.paybackCumulative == null || r.paybackCumulative > i.verdict.badPaybackMonths) return 'bad' as const
  return r.paybackCumulative <= i.verdict.goodPaybackMonths ? ('good' as const) : ('warn' as const)
}

const fmtLever = (l: Lever, v: number | null) => (v == null ? 'n/a' : l.unit === 'pct' ? pct(v, 1) : l.unit === 'x' ? `${num(v, 1)} lần` : l.unit === 'vndm2' ? `${money(v)}/m²` : money(v))

/** Trang kết luận: lời khuyên, sáu chỉ số chính, hai biểu đồ quyết định, ba kịch bản, điều kiện để đổi kết luận, cơ cấu chi phí và các việc tiếp theo */
export function Summary({ inputs, results: r, onOpen }: ViewProps & { onOpen: () => void }) {
  const op = r.operation
  const a = useMemo(() => buildAdvisory(inputs, r), [inputs, r])
  const maxSwing = Math.max(...a.drivers.map((d) => d.swing), 1)
  return (
    <div className="space-y-10">
      <AdvicePanel inputs={inputs} results={r} onOpen={onOpen} />

      {/* Bốn chỉ số quy mô, không lặp lại ba tiêu chí quyết định ở khối lời khuyên phía trên */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Doanh thu mỗi tháng" value={money(r.monthly.revenue)} sub={`${num(Math.round(op.coversPerDay))} khách mỗi ngày, ổn định sau ramp-up`} anim={{ n: r.monthly.revenue, fmt: (n) => money(n) }} />
        <Kpi label="Dòng tiền hoạt động mỗi tháng" value={money(r.monthly.cm)} sub={`${pct(r.monthly.cmPct, 1)} doanh thu`} tone={r.monthly.cm > 0 ? undefined : 'bad'} anim={{ n: r.monthly.cm, fmt: (n) => money(n) }} />
        <Kpi label="Vốn đầu tư" value={money(r.capexTotal)} sub={`${money(r.capexTotal / inputs.site.totalArea)} mỗi m² sàn`} anim={{ n: r.capexTotal, fmt: (n) => money(n) }} />
        <Kpi label="NPV" value={money(r.npv)} sub={`Chiết khấu ${pct(inputs.finance.discountRate)} mỗi năm`} tone={r.npv >= 0 ? 'good' : 'bad'} anim={{ n: r.npv, fmt: (n) => money(n) }} />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Reveal><Card title={cumTitle(r.paybackCumulative)} subtitle={`tháng 0 đến ${r.monthlyCumulative.length - 1}, đã gồm vốn đầu tư`}><EChart option={ch.cumulativeCash(r)} height={300} /></Card></Reveal>
        <Reveal delay={80}><Card title="From revenue to operating cash (triệu VND/tháng)" subtitle="một tháng vận hành ổn định, % là tỷ lệ trên doanh thu"><EChart option={ch.pnlWaterfall(r)} height={300} /></Card></Reveal>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr]">
        <Reveal><Card title="Where every đồng of revenue goes (% doanh thu)" subtitle="diện tích và màu cam đậm theo độ lớn"><EChart option={ch.costTreemap(r)} height={470} /><p className="mt-4 text-[12.5px] leading-relaxed text-dim">Các khoản dưới 3% doanh thu: {ch.smallCosts(r)}.</p></Card></Reveal>
        <Reveal delay={80}>
          <div className="space-y-8">
            <Card title="What moves profit the most (triệu VND/tháng)" subtitle="Lợi nhuận mỗi tháng thay đổi bao nhiêu khi từng biến tăng hoặc giảm 10%">
              <div className="space-y-4">
                {a.drivers.map((d, i) => (
                  <div key={d.key}>
                    <div className="flex items-baseline justify-between text-[14px]"><span><span className="num mr-3 text-dim">{i + 1}</span>{d.label}</span><span className="num font-bold">±{num(d.swing / 2e6, 1)}</span></div>
                    <div className="mt-1.5"><Gauge ratio={d.swing / maxSwing} h={7} /></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Risks to watch" subtitle="Rút ra từ các ngưỡng và độ nhạy của mô hình">
              <ol className="space-y-3.5">
                {(a.risks.length ? a.risks : ['Chưa phát hiện rủi ro nổi bật theo các ngưỡng hiện tại.']).slice(0, 4).map((x, i) => (
                  <li key={x} className="flex items-start gap-3.5 text-[14px] leading-relaxed text-muted"><span className="num mt-[3px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-accent/12 text-[12px] font-bold text-accent">{i + 1}</span><span className="min-w-0"><Rich>{x}</Rich></span></li>
                ))}
              </ol>
            </Card>
            <Card title="Recommended next steps" subtitle="Các việc nên làm tiếp theo trước khi chốt quyết định">
              <ol className="space-y-3.5">
                {a.actions.slice(0, 4).map((x, i) => (
                  <li key={x} className="flex items-start gap-3.5 text-[14px] leading-relaxed text-muted"><span className="num mt-[3px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-accent/12 text-[12px] font-bold text-accent">{i + 1}</span><span className="min-w-0"><Rich>{x}</Rich></span></li>
                ))}
              </ol>
            </Card>
          </div>
        </Reveal>
      </div>

      <Reveal>
        <Card title="Does the verdict survive stress?" subtitle="Cùng một dự án chạy ba kịch bản: bi quan (doanh thu thấp, chi phí cao), cơ sở và lạc quan. Mỗi cột cho biết lời khuyên và ba chỉ số chính khi kịch bản đó xảy ra">
          <div className="stagger grid gap-10 md:grid-cols-3">
            {a.scenarios.map((s) => (
              <div key={s.id}>
                <div className="text-[13px] font-bold text-dim">{s.name}</div>
                <div className={`serif mt-1 text-[48px] italic leading-none ${toneText[s.level]}`}>{s.label}</div>
                <dl className="mt-5 grid grid-cols-[max-content_max-content] gap-x-5 gap-y-2.5 text-[14px]">
                  <dt className="text-dim">Hoàn vốn sau</dt><dd className="num font-bold">{months(s.payback)}</dd>
                  <dt className="text-dim">IRR mỗi năm</dt><dd className="num font-bold">{pct(s.irr)}</dd>
                  <dt className="text-dim">Dòng tiền hoạt động mỗi tháng</dt><dd className="num font-bold">{money(s.cm)}</dd>
                </dl>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {r.verdict.level !== 'open' && (
        <Reveal>
          <Card title="What it takes to reach a yes" subtitle="Mức cần đạt nếu chỉ thay riêng từng biến, các giả định khác giữ nguyên">
            <Table strongLast head={['Biến cần thay đổi', 'Hiện tại', 'Cần đạt', 'Thay đổi', 'Đủ một mình']} rows={a.levers.map((l) => ({
              cells: [l.label, fmtLever(l, l.current), fmtLever(l, l.required), l.change == null ? 'n/a' : `${l.change >= 0 ? '+' : '-'}${Math.abs(Math.round(l.change * 100))}%`,
                l.required == null ? <span className="text-bad">Không</span> : <span className="text-good">Có</span>],
            }))} />
          </Card>
        </Reveal>
      )}
    </div>
  )
}
