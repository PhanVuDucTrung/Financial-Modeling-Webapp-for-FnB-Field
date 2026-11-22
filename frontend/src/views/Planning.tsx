import { Rich } from '../lib/rich'
import { useMemo } from 'react'
import { EChart } from '../components/EChart'
import { frontierChart } from '../components/charts'
import { dArea, Delta, dLevel, dMoney, dMonths, dPoint, LEVELS } from '../components/Delta'
import { Button, Card, Field, Kpi, Ring, Segmented, Table } from '../components/ui'
import { planFromBudget, solveGoal } from '../engine/analysis'
import { calculate } from '../engine/model'
import type { Inputs } from '../engine/types'
import { money, months, num, pct } from '../lib/format'

export type GoalKind = 'profit' | 'payback'
type SetInputs = (f: (p: Inputs) => Inputs) => void
const Warn = ({ children }: { children: string }) => <p className="rounded-[6px] bg-bad/10 px-5 py-4 text-[14px] leading-relaxed text-bad"><Rich>{children}</Rich></p>
const tone = (l: string) => (l === 'open' ? 'good' : l === 'dont' ? 'bad' : 'warn') as 'good' | 'bad' | 'warn'

/** Theo vốn: có X vốn thì mở được quy mô nào */
export function BudgetMode({ inputs, setInputs, budget, setBudget }: { inputs: Inputs; setInputs: SetInputs; budget: number; setBudget: (n: number) => void }) {
  const plan = useMemo(() => planFromBudget(inputs, budget), [inputs, budget])
  const cur = useMemo(() => calculate(inputs), [inputs])
  const r = plan.results
  return (
    <div className="grid items-start gap-12 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card title="Capital on hand" subtitle="Tìm diện tích lớn nhất mà vốn vẫn đủ, đã gồm tiền cọc">
        <Field label="Ngân sách" value={budget / 1e6} onChange={(v) => setBudget(v * 1e6)} unit="triệu" slider min={500} max={6000} step={50} />
        <div className="num mt-4 text-[34px] font-medium leading-none tracking-tight">{money(budget)}</div>
        <div className="mt-6"><Button kind="primary" disabled={!plan.feasible} onClick={() => setInputs(() => ({ ...plan.inputs, site: { ...plan.inputs.site, totalArea: Math.round(plan.inputs.site.totalArea) } }))}>Áp dụng vào mô hình</Button></div>
      </Card>
      {!plan.feasible ? (
        <Warn>Vốn này chưa đủ cho các khoản cố định (máy móc, dụng cụ, tiền hoạt động). Hãy tăng vốn hoặc giảm các khoản ở Giả định, mục Vốn đầu tư.</Warn>
      ) : (
        <div className="space-y-12">
          <div className="stagger grid grid-cols-2 gap-5 xl:grid-cols-4">
            <Kpi label="Diện tích sàn" value={`${num(plan.totalArea)} m²`} sub={`${num(Math.floor(plan.seats))} chỗ ngồi`} />
            <Kpi label="Khách mỗi ngày" value={num(Math.round(r.operation.coversPerDay))} sub={`Doanh thu ${money(r.monthly.revenue)} mỗi tháng`} />
            <Kpi label="Hoàn vốn sau" value={months(r.paybackCumulative)} sub={`IRR ${pct(r.irr)}`} tone={tone(r.verdict.level)} viz={<Ring ratio={r.paybackCumulative == null ? 1 : r.paybackCumulative / (inputs.site.leaseYears * 12)} tone={tone(r.verdict.level)} />} />
            <Kpi label="Lời khuyên" value={r.verdict.label} tone={tone(r.verdict.level)} sub={`Dòng tiền ${money(r.monthly.cm)} mỗi tháng`} />
          </div>
          <Card title="The plan against today" subtitle="Phương án theo vốn đối chiếu với giả định đang dùng">
            <Table strongLast head={['Chỉ số', 'Hiện tại', 'Theo vốn', 'Chênh lệch']} rows={[
              { cells: ['Diện tích sàn', `${num(inputs.site.totalArea)} m²`, `${num(plan.totalArea)} m²`, dArea(inputs.site.totalArea, plan.totalArea)] },
              { cells: ['Vốn đầu tư', money(cur.capexTotal), money(r.capexTotal), dMoney(cur.capexTotal, r.capexTotal, 'down')] },
              { cells: ['Doanh thu mỗi tháng', money(cur.monthly.revenue), money(r.monthly.revenue), dMoney(cur.monthly.revenue, r.monthly.revenue)] },
              { cells: ['Dòng tiền hoạt động mỗi tháng', money(cur.monthly.cm), money(r.monthly.cm), dMoney(cur.monthly.cm, r.monthly.cm)] },
              { cells: ['Hoàn vốn', months(cur.paybackCumulative), months(r.paybackCumulative), dMonths(cur.paybackCumulative, r.paybackCumulative)] },
              { cells: ['IRR mỗi năm', pct(cur.irr), pct(r.irr), dPoint(cur.irr, r.irr)] },
              { cells: ['Lời khuyên', cur.verdict.label, r.verdict.label, dLevel(cur.verdict.level, r.verdict.level, LEVELS)] },
            ]} />
          </Card>
        </div>
      )}
    </div>
  )
}

/** Theo mục tiêu: muốn lãi Y hoặc hoàn vốn trong Z tháng thì cần gì */
export function GoalMode({ inputs, setInputs, kind, setKind, value, setValue }: {
  inputs: Inputs; setInputs: SetInputs; kind: GoalKind; setKind: (k: GoalKind) => void; value: number; setValue: (n: number) => void
}) {
  const ans = useMemo(() => solveGoal(inputs, kind === 'profit' ? { kind, monthlyUC: value * 1e6 } : { kind, months: value }), [inputs, kind, value])
  const cur = calculate(inputs).operation.coversPerDay
  return (
    <div className="grid items-start gap-12 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card title="Your goal" subtitle="Các giả định khác giữ nguyên">
        <Segmented value={kind} onChange={(k) => { setKind(k); setValue(k === 'profit' ? 80 : 24) }}
          options={[{ id: 'profit', label: 'Lợi nhuận' }, { id: 'payback', label: 'Hoàn vốn' }]} />
        <div className="mt-5">
          <Field label={kind === 'profit' ? 'Lợi nhuận trước thuế mong muốn' : 'Hoàn vốn trong'} value={value} onChange={setValue}
            unit={kind === 'profit' ? 'triệu/tháng' : 'tháng'} slider min={kind === 'profit' ? 0 : 6} max={kind === 'profit' ? 300 : 60} step={kind === 'profit' ? 5 : 1} />
        </div>
        {ans.achievable && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => setInputs((p) => ({ ...p, demand: { ...p.demand, seatTurnover: +(ans.requiredTurnover ?? p.demand.seatTurnover).toFixed(2) } }))}>Áp dụng vòng quay</Button>
            <Button disabled={!ans.requiredAov} onClick={() => setInputs((p) => ({ ...p, demand: { ...p.demand, aov: Math.round((ans.requiredAov ?? p.demand.aov) / 1000) * 1000 } }))}>Áp dụng AOV</Button>
          </div>
        )}
      </Card>
      {!ans.achievable ? (
        <Warn>Với cơ cấu chi phí hiện tại, mục tiêu này chưa đạt được chỉ bằng cách tăng lượng khách. Hãy thử tăng AOV, giảm chi phí hoặc nới mục tiêu.</Warn>
      ) : (
        <div className="space-y-12">
          <div className="stagger grid grid-cols-2 gap-5 xl:grid-cols-4">
            <Kpi label="Khách mỗi ngày cần có" value={num(ans.requiredCovers ?? 0)} sub={`Hiện tại ${num(cur)}`} tone={(ans.requiredCovers ?? 0) <= cur ? 'good' : 'warn'} />
            <Kpi label="Vòng quay ghế cần có" value={num(ans.requiredTurnover ?? 0, 1)} sub={`Hiện tại ${num(inputs.demand.seatTurnover, 1)}`} />
            <Kpi label="Diện tích sàn cần có" value={`${num(ans.requiredAreaForCovers ?? 0)} m²`} sub={`Hiện tại ${num(inputs.site.totalArea)} m²`} />
            <Kpi label="Hoặc AOV cần có" value={ans.requiredAov ? money(ans.requiredAov) : 'n/a'} sub={`Hiện tại ${money(inputs.demand.aov)}`} />
          </div>
          <Card title="The higher the ticket, the fewer guests needed" subtitle="Khách mỗi ngày cần để đạt mục tiêu, điểm cam là phương án hiện tại">
            <EChart option={frontierChart(ans.frontier, { aov: inputs.demand.aov, covers: cur })} height={340} />
          </Card>
          <Card title="The plan against today" subtitle="Mỗi dòng là một cách đạt mục tiêu, các biến khác giữ nguyên">
            <Table strongLast head={['Cách đạt mục tiêu', 'Hiện tại', 'Cần có', 'Chênh lệch', 'Tăng giảm']} rows={[
              { cells: ['Tăng lượng khách mỗi ngày', num(cur), num(ans.requiredCovers ?? 0), <Delta d={(ans.requiredCovers ?? 0) - cur} fmt={(x) => num(x)} goodWhen="down" same="Đã đạt" />, pct(cur ? (ans.requiredCovers ?? 0) / cur - 1 : 0)] },
              { cells: ['Tăng vòng quay ghế', num(inputs.demand.seatTurnover, 1), num(ans.requiredTurnover ?? 0, 1), <Delta d={(ans.requiredTurnover ?? 0) - inputs.demand.seatTurnover} fmt={(x) => num(x, 1)} goodWhen="down" same="Đã đạt" />, pct(inputs.demand.seatTurnover ? (ans.requiredTurnover ?? 0) / inputs.demand.seatTurnover - 1 : 0)] },
              { cells: ['Mở rộng diện tích sàn', `${num(inputs.site.totalArea)} m²`, `${num(ans.requiredAreaForCovers ?? 0)} m²`, <Delta d={(ans.requiredAreaForCovers ?? 0) - inputs.site.totalArea} fmt={(x) => `${num(x)} m²`} goodWhen="down" same="Đã đạt" />, pct(inputs.site.totalArea ? (ans.requiredAreaForCovers ?? 0) / inputs.site.totalArea - 1 : 0)] },
              { cells: ['Tăng AOV', money(inputs.demand.aov), ans.requiredAov ? money(ans.requiredAov) : 'n/a', ans.requiredAov ? dMoney(inputs.demand.aov, ans.requiredAov, 'down') : 'n/a', ans.requiredAov ? pct(ans.requiredAov / inputs.demand.aov - 1) : 'n/a'] },
            ]} />
          </Card>
        </div>
      )}
    </div>
  )
}
