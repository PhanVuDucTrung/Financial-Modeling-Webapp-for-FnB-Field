import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { uiScale } from '../scale'
import { Brief } from '../components/Brief'
import { AnimatedNumber, Reveal, useSmoothScroll, useTypewriter } from '../components/motion'
import { ParticleSphere } from '../components/ParticleSphere'
import { PillNav } from '../components/PillNav'
import { Button } from '../components/ui'
import { cafePreset } from '../engine/presets'
import type { Inputs, Results } from '../engine/types'
import type { Health, ParseResult } from '../lib/api'
import { money, num } from '../lib/format'
import { validateInputs } from '../engine/validate'
import { SECTIONS, SectionBody, type SetInputs } from '../views/Sections'

/** Màn hình mở đầu chỉ chạy một lần mỗi lần tải trang, quay lại từ kết quả thì hiện thẳng */
let introPlayed = false

const LINE1 = 'From assumptions'
const LINE2 = 'to investment decisions.'

/** Thẻ kính nổi quanh tiêu đề: tên chỉ số và một dòng nghiêng tiếng Anh nói chỉ số cho biết điều gì */
function Float({ label, note, pos, rot, delay, appear }: { label: string; note: string; pos: React.CSSProperties; rot: number; delay: number; appear: number }) {
  return (
    <div className="float absolute" style={{ ...pos, ['--r' as string]: `${rot}deg`, ['--fd' as string]: `${delay}s` }}>
      <div data-emerge={appear}>
        <div className="glass w-[270px] px-7 py-5 text-left">
          <div className="serif text-[32px] leading-none">{label}</div>
          <div className="serif mt-2 text-[15px] italic leading-snug text-dim">{note}</div>
        </div>
      </div>
    </div>
  )
}

/** Trang đầu tiên: tiêu đề lớn, thẻ nổi, quả cầu hạt, rồi nhập toàn bộ giả định theo từng nhóm và chạy phân tích. */
export function InputPage({ inputs, setInputs, results, health, onBrief, onRun }: {
  inputs: Inputs; setInputs: SetInputs; results: Results; health: Health | null
  onBrief: (r: ParseResult) => void; onRun: () => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  useSmoothScroll(scroller)
  const [active, setActive] = useState('site')
  const [play] = useState(() => !introPlayed)
  // tiêu đề gõ chữ song song với lúc các thành phần chui ra khỏi quả cầu
  const { shown, done } = useTypewriter(`${LINE1}\n${LINE2}`, 34, play ? 3000 : 350)
  const page = useRef<HTMLDivElement | null>(null)
  const sphereBox = useRef<HTMLDivElement>(null)
  const sphereIn = useRef<HTMLDivElement>(null)
  const [t1, t2 = ''] = shown.split('\n')

  // Theo dõi nhóm đang xem để làm nổi mục điều hướng
  useEffect(() => {
    const root = scroller.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (es) => { const e = es.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (e) setActive(e.target.id.replace('sec-', '')) },
      { root, rootMargin: '-15% 0px -70% 0px' },
    )
    SECTIONS.forEach((s) => { const el = document.getElementById(`sec-${s.key}`); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  // mở đầu: quả cầu hiện giữa màn hình, nổi sóng, thu xuống vị trí; sau đó các phần tử chui ra từ tâm quả cầu
  useLayoutEffect(() => {
    if (!play) return
    introPlayed = true
    const box = sphereBox.current, inner = sphereIn.current, root = page.current
    if (!box || !inner || !root) return
    const S = uiScale()
    const b = box.getBoundingClientRect()
    const sx = (b.left + b.width / 2) / S, sy = (b.top + b.height / 2) / S
    inner.style.setProperty('--dy', `${window.innerHeight / S / 2 - sy}px`)
    root.querySelectorAll<HTMLElement>('[data-emerge]').forEach((el) => {
      if (el.classList.contains('emerge')) return // chế độ StrictMode chạy hiệu ứng hai lần
      const r = el.getBoundingClientRect()
      el.style.setProperty('--ex', `${sx - (r.left + r.width / 2) / S}px`)
      el.style.setProperty('--ey', `${sy - (r.top + r.height / 2) / S}px`)
      el.style.setProperty('--ed', `${2950 + Number(el.dataset.emerge) * 120}ms`)
      el.classList.add('emerge')
    })
    // khóa cuộn trong lúc mở đầu
    const block = (e: Event) => { e.preventDefault(); e.stopPropagation() }
    const evs = ['wheel', 'touchmove', 'keydown'] as const
    evs.forEach((ev) => window.addEventListener(ev, block, { passive: false, capture: true }))
    const t = window.setTimeout(() => evs.forEach((ev) => window.removeEventListener(ev, block, { capture: true })), 4700)
    return () => { clearTimeout(t); evs.forEach((ev) => window.removeEventListener(ev, block, { capture: true })) }
  }, [play])
  const jump = (k: string) => document.getElementById(`sec-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const op = results.operation
  const problems = validateInputs(inputs)

  return (
    <div ref={(el) => { scroller.current = el; page.current = el }} className="app-bg h-[calc(var(--vh)*100)] w-full overflow-y-auto overflow-x-hidden" style={{ ['--sticky-top' as string]: '78px' }}>
      <header className={`sticky top-0 z-30 bg-bg/92 ${play ? 'fade-in' : ''}`} style={play ? { animationDelay: '3300ms', animationDuration: '900ms' } : undefined}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-10 py-4">
          <div data-emerge={4} className="leading-none"><div className="serif text-[26px]">Financial Model</div><div className="mt-1 text-[10px] font-semibold tracking-[0.34em] text-accent">FOR ENTERPRISE</div></div>
          <div data-emerge={5}><PillNav items={SECTIONS.map((s) => ({ key: s.key, label: s.title }))} active={active} onSelect={jump} /></div>
          <div className="w-[160px]" />
        </div>
      </header>

      <section className="relative mx-auto max-w-[1700px] pb-4 text-center">
        <h1 className="serif grad-text relative mx-auto pt-[calc(var(--vh)*5)] text-[clamp(52px,calc(var(--vw)*7.4),118px)]" aria-label={`${LINE1} ${LINE2}`}>
          <span className="block">{t1}{shown.length > 0 && t2 === '' && !done && <i className="caret" />}<span className="invisible">{LINE1.slice(t1.length)}</span></span>
          <span className="block italic">{t2}{t2 !== '' && <i className="caret" />}<span className="invisible">{LINE2.slice(t2.length)}</span></span>
        </h1>

        <div data-emerge={6} className="relative mx-auto mt-[calc(var(--vh)*4)] max-w-3xl px-6 text-left">
          <Brief health={health} onResult={onBrief} />
        </div>

        <div ref={sphereBox} className="pointer-events-none relative z-0 mx-auto -mb-[120px] -mt-[96px] h-[900px] max-w-[1100px]">
          <div ref={sphereIn} className={`absolute inset-0 ${play ? 'intro-sphere' : ''}`}><ParticleSphere cy={0.5} radius={0.337} introRipple={play} /></div>
        </div>

        <Float label="Payback" note="How fast the capital comes back" pos={{ left: '4%', top: '30%' }} rot={-5} delay={0} appear={0} />
        <Float label="Break-even point" note="Guests needed each day to cover every cost" pos={{ left: '8%', top: '50%' }} rot={4} delay={1.4} appear={1} />
        <Float label="IRR" note="Annual return on the money invested" pos={{ right: '4%', top: '30%' }} rot={5} delay={0.7} appear={2} />
        <Float label="Sensitivity" note="Which assumption moves profit the most" pos={{ right: '8%', top: '50%' }} rot={-4} delay={2.1} appear={3} />
      </section>

      <div className="relative mx-auto max-w-[1500px] px-10">
        <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-24 pb-28">
            {SECTIONS.map((s) => {
              return (
                <Reveal key={s.key}>
                  <section id={`sec-${s.key}`} className="sheet scroll-mt-28">
                    <div className="sec-no serif text-[22px] text-dim">{s.no}</div>
                    <h2 className="serif mt-1 text-[clamp(44px,calc(var(--vw)*5),78px)] italic leading-[1]">{s.title}</h2>
                    <p className="mb-12 mt-4 text-[15.5px] text-dim">{s.desc}</p>
                    <SectionBody k={s.key} inputs={inputs} setInputs={setInputs} results={results} />
                  </section>
                </Reveal>
              )
            })}
          </div>

          <div className="sticky top-[78px] flex h-[calc(var(--vh)*100-78px)] items-center justify-center" style={{ transform: 'translateX(calc(var(--vw) * 4.5))' }}>
          <aside className="glass summary-card w-full p-8">
            <div className="text-[58px] font-extrabold leading-none tracking-[-0.04em]" style={{ fontFamily: "var(--font-display)" }}>Summary</div>
            <div className="serif num mt-3 flex items-baseline gap-2 whitespace-nowrap text-[56px] leading-none">
              <AnimatedNumber value={results.monthly.revenue / 1e6} format={(n) => num(n)} /> <span className="text-[20px] italic">triệu VND / tháng</span>
            </div>
            <div className="mb-3 mt-1 text-[13.5px] text-dim">Doanh thu dự kiến khi vận hành ổn định</div>
            <dl className="text-[14px]">
              {([
                ['Sức chứa', `${num(Math.floor(op.seats))} chỗ, ${num(op.tables)} bàn`],
                ['Khách mỗi ngày', num(Math.round(op.coversPerDay))],
                ['Tiền thuê mỗi tháng', money(results.rentMonthlyY1)],
                ['Nhân sự', `${num(op.totalHeadcount)} người`],
                ['Vốn đầu tư', money(results.capexTotal)],
                ['Dòng tiền hoạt động mỗi tháng', money(results.monthly.cm)],
              ] as [string, string][]).map(([a, b]) => (
                <div key={a} className="flex items-baseline justify-between gap-3 py-2.5"><dt className="text-dim">{a}</dt><dd className="num font-bold">{b}</dd></div>
              ))}
            </dl>
            <div className="mt-6 space-y-3">
              {problems.length > 0 && <ul className="space-y-1.5 rounded-[14px] bg-bad/10 px-4 py-3 text-[12.5px] leading-snug text-bad">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
              <div className="[&>button]:w-full"><Button kind="primary" size="lg" disabled={problems.length > 0} onClick={onRun}>Run Agent Analysis ↗</Button></div>
              <button onClick={() => setInputs(() => structuredClone(cafePreset))} className="block w-full text-center text-[12.5px] text-dim transition hover:text-accent">Đặt lại dữ liệu mẫu</button>
            </div>
          </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
