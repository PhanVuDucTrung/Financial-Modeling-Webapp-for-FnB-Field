import { Rich } from '../lib/rich'
import { useMemo } from 'react'
import { buildAdvisory, type Criterion } from '../engine/advisory'
import type { Inputs, Results } from '../engine/types'
import { months, pct } from '../lib/format'
import { Gauge, Icon } from './ui'

/** Kết luận in nghiêng toàn bộ, chữ serif */
export function VerdictText({ label }: { label: string }) {
  return <span className="italic">{label}</span>
}

export const toneText = { open: 'text-good', consider: 'text-warn', dont: 'text-bad' } as const
export const toneGlow = { open: '#1f9d63', consider: '#c98a0a', dont: '#d93a3f' } as const

/** Tỷ lệ hiển thị trên thanh đo: vạch ngưỡng luôn ở giữa (0,5) để nhìn là biết đạt hay chưa */
export function critRatio(c: Criterion): number {
  if (c.actual == null || !isFinite(c.actual)) return c.goal === 'max' ? 1 : 0
  if (c.threshold === 0) return c.pass ? 0.8 : 0.2
  return Math.max(0.02, Math.min(c.actual / (c.threshold * 2), 1))
}
export const fmtCrit = (c: Criterion, x: number | null) => (c.unit === 'months' ? months(x) : pct(x))
/** Giá trị thực tế, riêng hoàn vốn viết "sau x tháng" */
export const fmtActual = (c: Criterion, x: number | null) => (c.unit === 'months' && x != null ? `sau ${months(x)}` : fmtCrit(c, x))

/** Lời khuyên gọn ở thanh bên */
export function AdviceSide({ results, onOpen }: { results: Results; onOpen: () => void }) {
  const v = results.verdict
  return (
    <div data-sw="rect" className="glass p-5">
      <div className="label !text-accent">Lời khuyên</div>
      <div className={`serif mt-2 whitespace-nowrap text-[32px] leading-none ${toneText[v.level]}`}><VerdictText label={v.label} /></div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-[12px]">
        <div><dt className="text-dim">Hoàn vốn sau</dt><dd className="num mt-0.5 whitespace-nowrap text-[15px] font-bold">{results.paybackCumulative == null ? 'Chưa hoàn' : months(results.paybackCumulative)}</dd></div>
        <div><dt className="text-dim">IRR mỗi năm</dt><dd className="num mt-0.5 whitespace-nowrap text-[15px] font-bold">{pct(results.irr)}</dd></div>
      </dl>
      <button onClick={onOpen} className="link-arrow mt-5 text-[13px]">Xem phân tích chi tiết <Icon name="arrow" size={16} /></button>
    </div>
  )
}

/**
 * Lời khuyên đầy đủ ở Tổng quan: bên trái là kết luận in nghiêng cỡ lớn và một câu giải thích,
 * bên phải là bảng điểm ba tiêu chí quyết định, mỗi tiêu chí một dòng (tên, giá trị, trạng thái, thanh đo có vạch ngưỡng).
 */
export function AdvicePanel({ inputs, results, onOpen }: { inputs: Inputs; results: Results; onOpen: () => void }) {
  const v = results.verdict
  const a = useMemo(() => buildAdvisory(inputs, results), [inputs, results])
  const crit = a.criteria.filter((c) => c.decisive)
  return (
    <section data-sw="rect" className="relative grid gap-12 overflow-hidden rounded-[34px] p-10 shadow-[0_40px_80px_-44px_rgba(255,109,41,0.45)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" style={{ background: 'linear-gradient(120deg,var(--card-a) 0%,var(--card-b) 100%)' }}>
      <div className="flex flex-col justify-between gap-8">
        <div>
          <div data-sw="text" className="label !text-accent">Lời khuyên</div>
          <div data-sw="text" className={`serif mt-4 whitespace-nowrap text-[clamp(56px,calc(var(--vw)*6.2),104px)] leading-[0.95] ${toneText[v.level]}`}><VerdictText label={v.label} /></div>
        </div>
        <div>
          <p data-sw="text" className="max-w-md text-[16px] leading-relaxed text-muted"><Rich>{a.headline}</Rich></p>
          <button onClick={onOpen} className="link-arrow mt-4 text-[15px]">Xem phân tích chi tiết <Icon name="arrow" size={18} /></button>
        </div>
      </div>
      <div className="stagger flex flex-col justify-center gap-8">
        <div data-sw="text" className="label">Ba tiêu chí quyết định</div>
        {crit.map((c) => (
          <div data-sw="rect" key={c.key}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[15px] font-bold">{c.label}</span>
              <span className={`text-[13px] font-bold ${c.pass ? 'text-good' : 'text-bad'}`}>{c.pass ? 'Đạt' : 'Chưa đạt'}</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-6">
              <span className={`serif num whitespace-nowrap text-[40px] leading-none ${c.pass ? 'text-ink' : 'text-bad'}`}>{fmtActual(c, c.actual)}</span>
              <span className="serif whitespace-nowrap pb-1 text-[14px] italic text-dim">Ngưỡng {c.goal === 'max' ? 'tối đa' : 'tối thiểu'} {fmtCrit(c, c.threshold)}</span>
            </div>
            <div className="mt-3"><Gauge ratio={critRatio(c)} mark={0.5} tone={c.pass ? 'good' : 'bad'} h={7} /></div>
          </div>
        ))}
      </div>
    </section>
  )
}
