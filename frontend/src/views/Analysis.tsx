import { Rich } from '../lib/rich'
import { useMemo, useState } from 'react'
import { EChart } from '../components/EChart'
import * as ch from '../components/charts'
import { Reveal } from '../components/motion'
import { Badge, Card, Segmented, Table } from '../components/ui'
import { applyScenario, defaultScenarios, heatmap, tornado, type Heatmap, type Scenario } from '../engine/analysis'
import { assumptions } from '../engine/assumptions'
import { benchmark } from '../engine/benchmark'
import { calculate } from '../engine/model'
import type { Inputs } from '../engine/types'
import { money, months, num, pct } from '../lib/format'
import type { ViewProps } from './Overview'

export function Analysis({ inputs, results, tab }: ViewProps & { tab: string }) {
  if (tab === 'scen') return <Scenarios inputs={inputs} results={results} />
  if (tab === 'bench') return <Benchmark inputs={inputs} results={results} />
  return <Sensitivity inputs={inputs} results={results} />
}

/** Bảng nhiệt dạng bảng số: dễ đọc và chính xác hơn biểu đồ màu */
function HeatTable({ h, metric, inputs }: { h: Heatmap; metric: 'uc' | 'payback'; inputs: Inputs }) {
  const midX = Math.floor(h.xs.length / 2)
  const midY = Math.floor(h.ys.length / 2)
  const flat = h.values.flat().filter((v) => isFinite(v))
  const maxPos = Math.max(...flat.map((v) => v / 1e6), 1)
  const maxNeg = Math.max(...flat.map((v) => -v / 1e6), 1)
  const cell = (v: number) => {
    if (metric === 'uc') {
      const m = v / 1e6
      return m >= 0 ? `rgba(70,201,139,${0.1 + 0.5 * Math.min(1, m / maxPos)})` : `rgba(242,85,90,${0.1 + 0.5 * Math.min(1, -m / maxNeg)})`
    }
    if (!isFinite(v) || v > inputs.verdict.badPaybackMonths) return 'rgba(242,85,90,0.45)'
    if (v <= inputs.verdict.goodPaybackMonths) return 'rgba(70,201,139,0.4)'
    return 'rgba(245,182,58,0.28)'
  }
  const text = (v: number) => (metric === 'uc' ? num(v / 1e6) : isFinite(v) ? num(v) : 'Không')
  const rows = h.ys.map((y, yi) => ({ y, yi })).reverse()
  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-1 text-center text-[13px]">
        <thead>
          <tr>
            <th className="label w-[150px] pb-1 text-left font-medium">Vòng quay \ AOV</th>
            {h.xs.map((x, i) => <th key={x} className={`num pb-1 font-medium ${i === midX ? 'text-ink' : 'text-dim'}`}>{num(x / 1000)}k</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ y, yi }) => (
            <tr key={y}>
              <th className={`num pr-2 text-left font-medium ${yi === midY ? 'text-ink' : 'text-dim'}`}>{num(y, 2)} lần</th>
              {h.values[yi].map((v, xi) => (
                <td key={xi} className={`num py-3 font-bold ${xi === midX && yi === midY ? 'outline outline-2 -outline-offset-2 outline-accent' : ''}`} style={{ background: cell(v) }}>{text(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] text-dim">
        {metric === 'uc' ? 'Xanh là có lãi, đỏ là lỗ, màu đậm hơn nghĩa là chênh lệch lớn hơn.' : `Xanh: hoàn vốn trong ${inputs.verdict.goodPaybackMonths} tháng. Vàng: trung gian. Đỏ: quá ${inputs.verdict.badPaybackMonths} tháng hoặc không hoàn vốn.`} Ô viền cam là giả định hiện tại.
      </p>
    </div>
  )
}

function Sensitivity({ inputs, results: r }: ViewProps) {
  const [metric, setMetric] = useState<'uc' | 'payback'>('uc')
  const h = useMemo(() => heatmap(inputs, metric), [inputs, metric])
  const t = useMemo(() => tornado(inputs, 'uc', 0.1), [inputs])
  const top = t[0]
  return (
    <div className="space-y-12">
      <Card title="A few assumptions decide the outcome (triệu VND/tháng)" subtitle="Lợi nhuận trước thuế mỗi tháng (triệu VND) khi từng biến tăng hoặc giảm 10%, các biến khác giữ nguyên">
        <div className="grid items-center gap-6 xl:grid-cols-[1.5fr_1fr]">
          <EChart option={ch.tornadoChart(t)} height={340} />
          <div className="text-[13px] leading-relaxed text-muted">
            <p><span className="font-medium text-ink">{top.label}</span> là biến nhạy nhất: lệch 10% làm lợi nhuận mỗi tháng thay đổi khoảng <span className="num font-medium text-ink">{num((top.high - top.low) / 2e6, 1)} triệu</span>, so với lợi nhuận hiện tại {money(r.monthly.uc)}.</p>
            <p className="mt-3 text-dim">Thanh đỏ là chiều bất lợi, thanh xanh là chiều có lợi. Thanh càng dài, dự án càng phụ thuộc vào giả định đó và càng cần kiểm chứng kỹ.</p>
          </div>
        </div>
      </Card>
      <Reveal>
        <Card title={metric === 'uc' ? 'Profit swings widely with price and traffic (triệu VND/tháng)' : 'Payback stretches fast when price and traffic fall (tháng)'}
          subtitle={`${metric === 'uc' ? 'Triệu VND mỗi tháng' : 'Tháng'}, mỗi biến thay đổi trong khoảng ±30%`}
          right={<Segmented value={metric} onChange={setMetric} options={[{ id: 'uc', label: 'Lợi nhuận' }, { id: 'payback', label: 'Hoàn vốn' }]} />}>
          <HeatTable h={h} metric={metric} inputs={inputs} />
        </Card>
      </Reveal>
    </div>
  )
}

function Scenarios({ inputs }: ViewProps) {
  const [list, setList] = useState<Scenario[]>(defaultScenarios)
  const rows = list.map((s) => ({ s, r: calculate(applyScenario(inputs, s)) }))
  const baseRow = rows.find((x) => x.s.id === 'base') ?? rows[1]
  const upd = (id: string, k: keyof Scenario, v: number) => setList((l) => l.map((s) => (s.id === id ? { ...s, [k]: v } : s)))
  const cols: { k: keyof Scenario; label: string }[] = [
    { k: 'aov', label: 'AOV' }, { k: 'turnover', label: 'Vòng quay' }, { k: 'cogs', label: 'COGS' }, { k: 'rent', label: 'Giá thuê' }, { k: 'capex', label: 'Vốn đầu tư' },
  ]
  const tone = (l: string) => (l === 'open' ? 'good' : l === 'dont' ? 'bad' : 'warn') as 'good' | 'bad' | 'warn'
  return (
    <div className="space-y-12">
      <div className="grid gap-12 xl:grid-cols-[1.25fr_1fr]">
        <Card title="Scenario assumptions" subtitle="Nhân với giả định hiện tại, 1,00 là giữ nguyên">
          <table className="w-full text-[13px]">
            <thead><tr><th className="label pb-2.5 text-left font-medium">Kịch bản</th>{cols.map((c) => <th key={c.k} className="label pb-2.5 text-right font-medium">{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map(({ s }) => (
                <tr key={s.id} className="odd:bg-black/[0.028]">
                  <td className="py-2.5 font-medium">{s.name}</td>
                  {cols.map((c) => (
                    <td key={c.k} className="py-2.5 text-right">
                      <input type="number" step={0.01} value={s[c.k] as number} onChange={(e) => upd(s.id, c.k, parseFloat(e.target.value) || 0)}
                        className="field-input num w-[74px] px-1 py-1.5 text-right font-bold text-input" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Scenarios spread monthly profit widely (triệu VND/tháng)" subtitle="chênh lệch tính so với kịch bản cơ sở">
          <EChart option={ch.scenarioBars(rows.map(({ s, r }) => ({ name: s.name, uc: r.monthly.uc })), rows.indexOf(baseRow))} height={230} />
        </Card>
      </div>
      <Card title="Scenarios side by side" subtitle="Chênh lệch tính so với kịch bản cơ sở">
        <Table strongLast head={['Chỉ số', ...rows.map(({ s }) => s.name)]} rows={[
          { cells: ['Lời khuyên', ...rows.map(({ r }) => <Badge tone={tone(r.verdict.level)}>{r.verdict.label}</Badge>)] },
          { cells: ['Khách mỗi ngày', ...rows.map(({ r }) => num(Math.round(r.operation.coversPerDay)))] },
          { cells: ['Doanh thu mỗi tháng', ...rows.map(({ r }) => money(r.monthly.revenue))] },
          { cells: ['Dòng tiền hoạt động mỗi tháng', ...rows.map(({ r }) => money(r.monthly.cm))] },
          { cells: ['Chênh lệch so với cơ sở', ...rows.map(({ r }) => { const d = r.monthly.cm - baseRow.r.monthly.cm; return d === 0 ? 'n/a' : `${d > 0 ? '+' : '-'}${money(Math.abs(d))}` })] },
          { cells: ['Vốn đầu tư', ...rows.map(({ r }) => money(r.capexTotal))] },
          { cells: ['Hoàn vốn', ...rows.map(({ r }) => months(r.paybackCumulative))] },
          { cells: ['IRR mỗi năm', ...rows.map(({ r }) => pct(r.irr))] },
          { cells: ['NPV', ...rows.map(({ r }) => money(r.npv))] },
          { cells: ['Biên an toàn', ...rows.map(({ r }) => pct(r.marginOfSafety))] },
        ]} />
      </Card>
    </div>
  )
}

function Benchmark({ inputs, results }: ViewProps) {
  const rows = benchmark(inputs, results)
  const worst = rows.filter((r) => r.status === 'high')
  const tone = { ok: 'good', high: 'bad', low: 'warn' } as const
  const word = { ok: 'Trong khoảng', high: 'Cao hơn', low: 'Thấp hơn' } as const
  const bar = { ok: 'bg-good', high: 'bg-bad', low: 'bg-warn' } as const
  return (
    <div className="space-y-12">
    <Card title="Cost lines against the industry range (% doanh thu)" subtitle="dải xám là khoảng tham chiếu, vạch màu là giá trị của dự án">
      <div className="space-y-7">
        {rows.map((b) => {
          const max = Math.max(b.high * 1.6, b.value * 1.1)
          return (
            <div key={b.key} className="grid grid-cols-[190px_1fr_190px] items-center gap-5">
              <div>
                <div className="text-[13.5px] font-medium">{b.label}</div>
                <div className="text-[11.5px] text-dim">Tham chiếu {pct(b.low)} đến {pct(b.high)}</div>
              </div>
              <div className="relative h-3 bg-black/[0.07]">
                <div className="absolute inset-y-0 bg-black/[0.18]" style={{ left: `${(b.low / max) * 100}%`, width: `${((b.high - b.low) / max) * 100}%` }} />
                <div className={`absolute -inset-y-1.5 w-[4px] ${bar[b.status]}`} style={{ left: `calc(${Math.min(b.value / max, 1) * 100}% - 1.5px)` }} />
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="num text-[17px] font-bold">{pct(b.value, 1)}</span>
                <Badge tone={tone[b.status]}>{word[b.status]}</Badge>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-7 text-[12px] leading-relaxed text-dim">Khoảng tham chiếu tổng hợp từ nguồn công khai, độ tin cậy thấp đến trung bình. Nguồn chi tiết ở cuối trang.</p>
    </Card>
    <div className="grid gap-12 xl:grid-cols-[1.2fr_1fr]">
      <Card title="Where every đồng of revenue goes (% doanh thu)" subtitle="xếp từ cao đến thấp"><EChart option={ch.costStructure(results)} height={400} /></Card>
      <Card title="What the benchmark says" subtitle="Dựa trên khoảng tham chiếu">
        <p className="text-[13.5px] leading-relaxed text-muted">
          <Rich>{worst.length === 0
            ? 'Các khoản chi chính đều nằm trong khoảng tham chiếu. Rủi ro nằm ở doanh thu (AOV, vòng quay ghế) nhiều hơn ở cơ cấu chi phí.'
            : `${worst.map((w) => w.label).join(', ')} cao hơn khoảng tham chiếu. Đây là nhóm nên rà soát trước khi chốt giả định.`}</Rich>
        </p>
        <p className="mt-4 text-[12px] leading-relaxed text-dim">Nằm trong khoảng tham chiếu chưa chắc chi phí đó đúng, cần đối chiếu với báo giá và quan sát thực tế tại khu vực dự định mở.</p>
      </Card>
    </div>
      <Sources />
    </div>
  )
}

/** Nguồn và độ tin cậy của các giả định mặc định */
export function Sources() {
  return (
    <Card title="Sources behind the defaults" subtitle="Tra cứu ngày 13/11/2026, dữ liệu minh họa, không phải số của dự án thật">
      <div className="space-y-2">
        {assumptions.map((a) => (
          <div key={a.key} className="py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium">{a.label}</span>
              <Badge tone={a.confidence === 'thấp' ? 'bad' : 'warn'}>Độ tin cậy {a.confidence}</Badge>
            </div>
            <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-muted"><Rich>{a.note}</Rich></p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
              {a.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">{s.title}</a>)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
