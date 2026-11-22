import { useState, type ReactNode } from 'react'
import { hinted } from './Hint'
import { AnimatedNumber, useGrow } from './motion'

/**
 * Khối nội dung phẳng. Tiêu đề viết bằng tiếng Anh theo lối kể chuyện; đơn vị đặt cuối tiêu đề trong ngoặc
 * (phần trong "(...)" cuối chuỗi được tách ra và làm nhạt); dòng phụ tiếng Việt mô tả dữ liệu.
 */
export function Card({ title, subtitle, right, children, className = '' }: {
  title?: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string
}) {
  const m = title ? /^(.*?)\s*\(([^()]+)\)$/.exec(title) : null
  const sub = subtitle ? subtitle.charAt(0).toUpperCase() + subtitle.slice(1) : ''
  return (
    <section className={`sheet ${className}`}>
      {(title || right) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h3 data-sw="text" className="serif text-[26px] leading-[1.15] text-ink">{hinted(m ? m[1] : title)}{m && <span className="ml-2 font-sans text-[14px] font-medium tracking-normal text-dim">({m[2]})</span>}</h3>}
            {sub && <p data-sw="text" className="mt-1.5 text-[13.5px] text-dim">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      <div data-sw="rect">{children}</div>
    </section>
  )
}

const toneText = { good: 'text-good', bad: 'text-bad', warn: 'text-warn' } as const

const glowOf = { good: 'rgba(31,157,99,0.55)', bad: 'rgba(217,58,63,0.55)', warn: 'rgba(201,138,10,0.55)' } as const

/** Tách đơn vị ở cuối chuỗi số ("23 tháng" thành 23 và "tháng" nghiêng nhỏ hơn) */
export function splitUnit(text: string): ReactNode {
  const m = /^(.*?\d[\d.,]*)\s+(\S.*)$/.exec(text)
  if (!m) return text
  return <>{m[1]}<span className="ml-1.5 whitespace-nowrap font-sans text-[0.32em] font-medium tracking-normal">{m[2]}</span></>
}

/** Thẻ chỉ số kính lỏng: nhãn nhỏ, số serif lớn với đơn vị nghiêng, dòng phụ. Số chạy khi giá trị đổi. */
export function Kpi({ label, value, sub, tone, anim }: {
  label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn'; anim?: { n: number; fmt: (n: number) => string }; viz?: ReactNode
}) {
  return (
    <div data-sw="rect" className="tile" style={tone ? ({ ['--glow' as string]: glowOf[tone] }) : undefined}>
      <div className="label relative">{hinted(label)}</div>
      <div className={`serif num relative mt-2 whitespace-nowrap leading-none ${/\d/.test(value) ? 'text-[44px]' : 'text-[30px]'} ${tone ? toneText[tone] : 'text-ink'}`}>
        {anim ? <AnimatedNumber value={anim.n} format={(n) => splitUnit(anim.fmt(n))} /> : splitUnit(value)}
      </div>
      {sub && <div className="relative mt-3 text-[12.5px] leading-snug text-dim">{sub}</div>}
    </div>
  )
}

const strokeOf = { good: '#1f9d63', bad: '#d93a3f', warn: '#c98a0a', accent: '#ff6d29' } as const
type Tone = keyof typeof strokeOf

/** Vòng tiến độ nhỏ: tỷ lệ 0 đến 1, vẽ dần khi hiện */
export function Ring({ ratio, tone = 'accent', size = 54 }: { ratio: number; tone?: Tone; size?: number }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, k = Math.max(0, Math.min(useGrow(ratio), 1))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: 'var(--ring-track)' }} strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeOf[tone]} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - k)} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2,0.7,0.2,1)', filter: `drop-shadow(0 0 6px ${strokeOf[tone]})` }} />
    </svg>
  )
}

/** Đường nhỏ minh họa xu hướng */
export function Spark({ data, tone = 'accent', w = 84, h = 40 }: { data: number[]; tone?: Tone; w?: number; h?: number }) {
  if (data.length < 2) return null
  const lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - ((v - lo) / span) * (h - 8)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={strokeOf[tone]} opacity="0.14" />
      <path d={d} fill="none" stroke={strokeOf[tone]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={strokeOf[tone]} />
    </svg>
  )
}

/** Cột nhỏ minh họa so sánh giữa các mốc */
export function MiniBars({ data, tone = 'accent', w = 84, h = 40 }: { data: number[]; tone?: Tone; w?: number; h?: number }) {
  const hi = Math.max(...data.map(Math.abs), 1), bw = w / data.length - 4
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((v, i) => {
        const bh = Math.max(3, (Math.abs(v) / hi) * (h - 4))
        return <rect key={i} x={i * (bw + 4)} y={h - bh} width={bw} height={bh} fill={v < 0 ? strokeOf.bad : strokeOf[tone]} opacity={0.4 + 0.6 * (i / Math.max(data.length - 1, 1))} />
      })}
    </svg>
  )
}

/** Thanh đo: giá trị so với ngưỡng, vẽ dần khi hiện */
export function Gauge({ ratio, mark, tone = 'accent', h = 8 }: { ratio: number; mark?: number; tone?: Tone; h?: number }) {
  const w = Math.max(0, Math.min(useGrow(ratio), 1)) * 100
  return (
    <div className="relative bg-black/[0.07]" style={{ height: h }}>
      <div className="h-full origin-left" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${strokeOf[tone]}55, ${strokeOf[tone]})`, boxShadow: `0 0 12px ${strokeOf[tone]}55`, transition: 'width 1.2s cubic-bezier(0.2,0.7,0.2,1)' }} />
      {mark != null && <div className="absolute -top-1 w-[2px] bg-ink" style={{ left: `${Math.min(mark, 1) * 100}%`, height: h + 8 }} />}
    </div>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'good' | 'bad' | 'warn' | 'accent' }) {
  const m = {
    muted: 'bg-black/[0.06] text-muted', good: 'bg-good/15 text-good', bad: 'bg-bad/15 text-bad',
    warn: 'bg-warn/15 text-warn', accent: 'bg-accent/15 text-accent',
  }[tone]
  return <span className={`inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11.5px] font-semibold ${m}`}>{children}</span>
}

export function Button({ children, onClick, kind = 'ghost', disabled, title, size = 'md' }: {
  children: ReactNode; onClick?: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean; title?: string; size?: 'md' | 'lg'
}) {
  const pad = size === 'lg' ? 'px-8 py-3.5 text-[14.5px]' : 'px-5 py-2.5 text-[13px]'
  const cls = kind === 'primary' ? 'btn-accent' : 'bg-black/[0.06] text-ink hover:bg-accent/15 hover:text-accent'
  return (
    <button title={title} disabled={disabled} onClick={onClick}
      className={`rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${pad} ${cls}`}>
      {children}
    </button>
  )
}

/** Biểu tượng nét mảnh dùng chung */
export function Icon({ name, size = 18 }: { name: 'spark' | 'arrow' | 'close' | 'plus' | 'back' | 'send'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  if (name === 'spark') return <svg {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z" /></svg>
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  if (name === 'back') return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
  if (name === 'send') return <svg {...p}><path d="M4 12l16-8-6 16-3-7-7-1z" /></svg>
  if (name === 'plus') return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>
  return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
}

const thousands = new Intl.NumberFormat('en-US')

interface FieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  hint?: string
  step?: number
  min?: number
  max?: number
  slider?: boolean
  /** hiển thị theo % (giá trị lưu là 0-1) */
  asPct?: boolean
  vnd?: boolean
}

/** Ô nhập số kiểu gạch chân. Số người dùng nhập có màu cam nhạt. Thanh trượt chìm xuống cho đến khi rê chuột. */
export function Field({ label, value, onChange, unit, hint, step = 1, min, max, slider, asPct, vnd }: FieldProps) {
  const shown = asPct ? +(value * 100).toFixed(2) : +Number(value).toFixed(2)
  const [draft, setDraft] = useState<string | null>(null)
  const lo = min ?? 0
  const hi = max ?? Math.max(shown * 3, 10)
  const set = (v: number) => {
    if (!isFinite(v)) return
    onChange(asPct ? v / 100 : v)
  }
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-dim">{hinted(label)}</span>
        {hint && <span className="text-[11.5px] text-dim">{hint}</span>}
      </div>
      <div className="mt-1">
        <div className="field-line">
          <input
            type="text"
            inputMode={vnd ? 'numeric' : 'decimal'}
            value={draft ?? (vnd ? (Number.isFinite(shown) ? thousands.format(Math.round(shown)) : '0') : String(Number.isFinite(shown) ? shown : 0))}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => { setDraft(null); if (min != null && shown < min && !asPct) set(min) }}
            onChange={(e) => {
              const raw = e.target.value
              if (vnd) { const d = raw.replace(/\D/g, ''); setDraft(d ? thousands.format(parseInt(d, 10)) : ''); set(d ? parseInt(d, 10) : 0); return }
              const t = raw.replace(',', '.')
              if (!/^-?\d*\.?\d*$/.test(t)) return
              setDraft(t)
              const v = parseFloat(t)
              set(Number.isFinite(v) ? v : 0)
            }}
            className="serif num min-w-0 flex-1 bg-transparent px-0.5 py-1 text-left text-[32px] leading-tight text-ink outline-none"
          />
          {unit && <span className="shrink-0 pl-3 text-[14px] font-medium text-ink">{unit}</span>}
        </div>
        {slider && <input className="mt-2" type="range" min={lo} max={hi} step={step} value={shown} onChange={(e) => set(parseFloat(e.target.value))} />}
      </div>
    </label>
  )
}

/** Nhóm lựa chọn dạng thẻ gạch chân */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex gap-7">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`relative pb-2.5 text-[13.5px] font-semibold transition ${value === o.id ? 'text-accent' : 'text-dim hover:text-ink'}`}>
          {o.label}
          <span className={`absolute inset-x-0 -bottom-0.5 h-[2px] origin-left bg-accent shadow-[0_0_10px_#ff6d29] transition-transform duration-300 ${value === o.id ? 'scale-x-100' : 'scale-x-0'}`} />
        </button>
      ))}
    </div>
  )
}

/** Bảng số liệu: cột đầu là nhãn, các cột sau căn phải */
export function Table({ head, rows, strongLast, dense, sticky }: {
  head?: string[]; rows: { cells: ReactNode[]; strong?: boolean; muted?: boolean }[]; strongLast?: boolean; dense?: boolean; sticky?: boolean
}) {
  // bảng dài: hàng tiêu đề dính khi cuộn, tự nhả khi hết bảng
  const stick = sticky ?? rows.length > 7
  return (
    <table className={`ui-table w-full text-[13.5px] ${stick ? 'sticky-head' : ''}`}>
      {head && (
        <thead>
          <tr>{head.map((h, i) => <th key={h + i} className={`py-3.5 text-[14.5px] font-extrabold tracking-[-0.01em] text-ink ${i ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'var(--font-display)' }}>{h}</th>)}</tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className={`${r.strong ? 'font-bold text-ink' : r.muted ? 'text-dim' : 'text-muted'}`}>
            {r.cells.map((c, i) => (
              <td key={i} className={`num ${dense ? 'py-1.5' : 'py-2.5'} ${i ? 'text-right' : ''} ${i === 0 && !r.muted ? 'text-ink/90' : ''} ${strongLast && i === r.cells.length - 1 ? 'font-bold text-ink' : ''}`}>{i === 0 && typeof c === 'string' ? hinted(c) : c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Thanh tiến độ ngang có ngưỡng (dùng cho bảng chấm điểm) */
export function Meter({ ratio, mark, tone }: { ratio: number; mark?: number; tone: 'good' | 'bad' | 'warn' }) {
  const bg = { good: 'bg-good', bad: 'bg-bad', warn: 'bg-warn' }[tone]
  const w = Math.max(0, Math.min(useGrow(ratio), 1)) * 100
  return (
    <div className="relative h-[5px] bg-black/10">
      <div className={`h-full ${bg} transition-[width] duration-700`} style={{ width: `${w}%` }} />
      {mark != null && <div className="absolute -top-1 h-[13px] w-px bg-ink/70" style={{ left: `${Math.min(mark, 1) * 100}%` }} />}
    </div>
  )
}

/** Đồng hồ nửa vòng: số lớn ở giữa, vạch trắng là ngưỡng, cung vẽ dần khi hiện */
export function Dial({ ratio, mark, tone = 'accent', value, label, note }: { ratio: number; mark?: number; tone?: Tone; value: string; label: string; note?: string }) {
  const r = 86, c = Math.PI * r, k = Math.max(0, Math.min(useGrow(ratio), 1))
  const ang = (f: number) => Math.PI - f * Math.PI
  const pt = (f: number, rad: number) => [100 + Math.cos(ang(f)) * rad, 100 - Math.sin(ang(f)) * rad]
  return (
    <div className="text-center">
      <svg viewBox="0 0 200 118" className="mx-auto w-full max-w-[300px]">
        <path d="M14 100 A86 86 0 0 1 186 100" fill="none" style={{ stroke: 'var(--ring-track)' }} strokeWidth="12" strokeLinecap="round" />
        <path d="M14 100 A86 86 0 0 1 186 100" fill="none" stroke={strokeOf[tone]} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - k)} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.2,0.7,0.2,1)' }} />
        {mark != null && (() => { const [x1, y1] = pt(mark, r - 12), [x2, y2] = pt(mark, r + 12); return <line x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: 'var(--color-ink)' }} strokeWidth="2.5" strokeLinecap="round" /> })()}
        <text x="100" y="96" textAnchor="middle" className="serif" fontSize="38" style={{ fontFamily: 'var(--font-serif)', fill: 'var(--color-ink)' }}>{value}</text>
      </svg>
      <div className="mt-1 text-[15px] font-bold">{label}</div>
      {note && <div className="serif mt-0.5 text-[14px] italic text-dim">{note}</div>}
    </div>
  )
}
