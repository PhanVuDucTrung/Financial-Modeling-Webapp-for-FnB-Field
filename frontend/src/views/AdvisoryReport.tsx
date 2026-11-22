import { Rich } from '../lib/rich'
import { useEffect, useMemo, useRef } from 'react'
import { useSmoothScroll } from '../components/motion'
import { critRatio, fmtActual, fmtCrit, toneGlow, toneText, VerdictText } from '../components/Advice'
import { Badge, Gauge, Icon, Kpi } from '../components/ui'
import { buildAdvisory, type Lever } from '../engine/advisory'
import type { Inputs, Results } from '../engine/types'
import { money, months, num, pct } from '../lib/format'

const tone = (l: string) => (l === 'open' ? 'good' : l === 'dont' ? 'bad' : 'warn') as 'good' | 'bad' | 'warn'

const fmtLever = (l: Lever, v: number | null) => {
  if (v == null) return 'n/a'
  return l.unit === 'pct' ? pct(v, 1) : l.unit === 'x' ? `${num(v, 1)} lần` : l.unit === 'vndm2' ? `${money(v)}/m²` : money(v)
}

function H({ no, title, note }: { no: string; title: string; note?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-4">
        <span className="grad-accent num text-[16px] font-bold">{no}</span>
        <h3 className="text-[22px] font-bold tracking-tight">{title}</h3>
      </div>
      {note && <p className="mt-1.5 pl-9 text-[14px] text-dim">{note}</p>}
    </div>
  )
}

/** Báo cáo lời khuyên: mở từ nút "Xem phân tích chi tiết", trượt vào từ bên phải. Chữ lớn, không đường kẻ, các khối hiện lần lượt. */
export function AdvisoryReport({ inputs, results: r, onClose }: { inputs: Inputs; results: Results; onClose: () => void }) {
  const a = useMemo(() => buildAdvisory(inputs, r), [inputs, r])
  const art = useRef<HTMLElement>(null)
  useSmoothScroll(art)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const maxSwing = Math.max(...a.drivers.map((d) => d.swing), 1)

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label="Phân tích chi tiết lời khuyên">
      <div className="fade-in absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <article ref={art} className="slide-left relative h-full w-[min(1180px,calc(var(--vw)*94))] overflow-y-auto bg-bg shadow-[-40px_0_100px_rgba(25,25,60,0.25)]">
        <div aria-hidden className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl" style={{ background: toneGlow[a.level] }} />
        <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/85 px-12 py-5 backdrop-blur-xl">
          <div className="label !text-[13px]">Phân tích chi tiết lời khuyên</div>
          <button onClick={onClose} className="flex items-center gap-2 text-[14px] font-semibold text-muted transition hover:text-accent"><Icon name="close" size={16} /> Đóng</button>
        </header>

        <div className="relative space-y-16 px-12 pb-24 pt-8">
          <section>
            <div className="label !text-accent">Kết luận</div>
            <div className={`serif mt-3 text-[clamp(72px,calc(var(--vw)*8),120px)] leading-[0.95] ${toneText[a.level]}`}><VerdictText label={a.label} /></div>
            <p className="mt-6 max-w-3xl text-[20px] leading-relaxed text-muted"><Rich>{a.headline}</Rich></p>
            <div className="stagger mt-9 grid grid-cols-2 gap-5 lg:grid-cols-4">
              <Kpi label="Hoàn vốn sau" value={months(r.paybackCumulative)} tone={tone(a.level)} />
              <Kpi label="IRR mỗi năm" value={pct(r.irr)} />
              <Kpi label="Biên an toàn" value={pct(r.marginOfSafety)} />
              <Kpi label="NPV" value={money(r.npv)} tone={r.npv >= 0 ? 'good' : 'bad'} />
            </div>
          </section>

          <section>
            <H no="01" title="Scorecard" note={`${a.decisivePassed} trên ${a.decisiveTotal} tiêu chí quyết định đạt. Đạt cả ba là Nên mở, chạm ngưỡng kém ở bất kỳ tiêu chí nào là Không nên mở, còn lại là Cân nhắc.`} />
            <div className="stagger space-y-4">
              {a.criteria.map((c) => (
                <div key={c.key} className="panel grid items-center gap-x-8 gap-y-3 px-7 py-6 md:grid-cols-[300px_minmax(0,1fr)_210px]">
                  <div>
                    <div className="flex items-center gap-3 text-[17px] font-bold">
                      {c.label}
                    </div>
                    <div className="mt-1.5 pl-[22px] text-[13px] text-dim"><Rich>{c.decisive ? c.note : `Tham khảo, không quyết định lời khuyên. ${c.note}`}</Rich></div>
                  </div>
                  <div>
                    <Gauge ratio={critRatio(c)} mark={0.5} tone={c.pass ? 'good' : 'bad'} h={10} />
                    <div className="mt-2 text-[12.5px] text-dim">Ngưỡng {c.goal === 'max' ? 'tối đa' : 'tối thiểu'} {c.unit === 'vnd' ? '0 đ' : fmtCrit(c, c.threshold)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`num whitespace-nowrap text-[24px] font-bold leading-none ${c.pass ? 'text-ink' : 'text-bad'}`}>{c.unit === 'vnd' ? money(c.actual) : fmtActual(c, c.actual)}</div>
                    <div className="mt-2"><Badge tone={c.pass ? 'good' : 'bad'}>{c.pass ? 'Đạt' : 'Chưa đạt'}</Badge></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <H no="02" title="Why this verdict" />
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <div className="mb-4 text-[15px] font-bold text-muted">Biến ảnh hưởng nhiều nhất đến lợi nhuận</div>
                <div className="space-y-5">
                  {a.drivers.map((d, i) => (
                    <div key={d.key}>
                      <div className="flex items-baseline justify-between text-[15px]"><span><span className="num mr-3 text-dim">{i + 1}</span>{d.label}</span><span className="num font-bold">±{num(d.swing / 2e6, 1)} triệu</span></div>
                      <div className="mt-2"><Gauge ratio={d.swing / maxSwing} h={8} tone="accent" /></div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[13px] text-dim">Mức thay đổi lợi nhuận mỗi tháng khi biến đổi 10%.</p>
              </div>
              <div>
                <div className="mb-4 text-[15px] font-bold text-muted">Khoản chi cao hơn khoảng tham chiếu</div>
                {a.costFlags.length === 0 ? <p className="text-[15px] leading-relaxed text-muted">Không có khoản chi nào vượt khoảng tham chiếu ngành.</p> : (
                  <ul className="space-y-4 text-[15px]">
                    {a.costFlags.map((b) => <li key={b.key} className="flex items-baseline justify-between gap-4"><span>{b.label}</span><span className="num font-bold text-bad">{pct(b.value, 1)} <span className="font-medium text-dim">tham chiếu tối đa {pct(b.high)}</span></span></li>)}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section>
            <H no="03" title="What it takes to say yes" note="Mức cần đạt nếu chỉ thay đổi riêng từng biến, các giả định khác giữ nguyên." />
            {a.level === 'open' ? <p className="text-[16px] text-muted">Dự án đã đạt Nên mở với giả định hiện tại.</p> : (
              <div className="stagger grid gap-5 md:grid-cols-2">
                {a.levers.map((l) => (
                  <div key={l.key} className="tile" style={{ ['--glow' as string]: l.required == null ? 'rgba(242,85,90,0.4)' : 'rgba(70,201,139,0.4)' }}>
                    <div className="relative flex items-center justify-between gap-3"><span className="text-[15px] font-bold">{l.label}</span>{l.required == null ? <Badge tone="bad">Không đủ một mình</Badge> : <Badge tone="good">Đủ một mình</Badge>}</div>
                    <div className="relative mt-4 flex items-center gap-3 text-[24px] font-bold">
                      <span className="num text-muted">{fmtLever(l, l.current)}</span><Icon name="arrow" size={20} /><span className={`num ${l.required == null ? 'text-dim' : 'text-ink'}`}>{fmtLever(l, l.required)}</span>
                    </div>
                    <div className="relative mt-2 text-[13px] text-dim">{l.change == null ? 'Cần kết hợp thêm biến khác' : `Thay đổi ${l.change >= 0 ? '+' : '-'}${Math.abs(Math.round(l.change * 100))}%`}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <H no="04" title="Verdict under each scenario" />
            <div className="stagger grid gap-5 md:grid-cols-3">
              {a.scenarios.map((s) => (
                <div key={s.id} className="tile" style={{ ['--glow' as string]: toneGlow[s.level] + '70' }}>
                  <div className="relative flex items-center justify-between"><span className="text-[15px] font-bold">{s.name}</span><Badge tone={tone(s.level)}>{s.label}</Badge></div>
                  <div className={`num relative mt-4 text-[30px] font-bold leading-none ${toneText[s.level]}`}>{months(s.payback)}</div>
                  <div className="relative mt-3 space-y-1 text-[13.5px] text-dim"><div>IRR {pct(s.irr)}</div><div>Dòng tiền {money(s.cm)} mỗi tháng</div></div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-14 md:grid-cols-2">
            <div>
              <H no="05" title="Risks to watch" />
              <ul className="space-y-4">
                {(a.risks.length === 0 ? ['Chưa phát hiện rủi ro nổi bật theo các ngưỡng hiện tại.'] : a.risks).map((x) => (
                  <li key={x} className="flex items-start gap-4 text-[16px] leading-relaxed text-muted"><i className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-bad" /><span className="min-w-0"><Rich>{x}</Rich></span></li>
                ))}
              </ul>
            </div>
            <div>
              <H no="06" title="Recommended actions" />
              <ol className="space-y-4">
                {a.actions.map((x, i) => (
                  <li key={x} className="flex items-start gap-4 text-[16px] leading-relaxed text-muted"><span className="num mt-[2px] grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-accent/12 text-[14px] font-bold text-accent">{i + 1}</span><span className="min-w-0"><Rich>{x}</Rich></span></li>
                ))}
              </ol>
            </div>
          </section>

          <p className="text-[13px] leading-relaxed text-dim">
            Kết quả là ước tính từ các giả định đã nhập. Số liệu về thuế, bảo hiểm xã hội và hợp đồng thuê cần người có chuyên môn kiểm lại với văn bản gốc trước khi ra quyết định.
          </p>
        </div>
      </article>
    </div>
  )
}
