import { useEffect, useRef, useState } from 'react'
import { ParticleSphere } from '../components/ParticleSphere'

const STEPS = ['Đọc thông số', 'Dựng dòng tiền', 'Tính IRR và NPV', 'Chạy độ nhạy', 'Soạn lời khuyên']
const TOTAL_MS = 3000
const BURST_MS = 1000

/**
 * Màn hình chuyển tiếp khi chạy phân tích. Phân tích thật chạy tức thời, đây là hiệu ứng báo tiến trình.
 * Khi chữ cuối chạy xong, quả cầu vỡ tung (onBurst) để các agent bay ra dựng trang kết quả, rồi màn hình mờ dần và tự gỡ (onGone).
 */
export function RunScreen({ onBurst, onGone }: { onBurst: () => void; onGone: () => void }) {
  const progress = useRef(0)
  const burst = useRef(0)
  const [prog, setProg] = useState(0)
  const [bursting, setBursting] = useState(false)
  const [clear, setClear] = useState(false)
  const cvWrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const timers: number[] = []
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / TOTAL_MS)
      progress.current = k
      setProg(k)
      if (k < 1) { raf = requestAnimationFrame(tick); return }
      // quả cầu vỡ tung
      setBursting(true); onBurst()
      const b0 = performance.now()
      const bt = (n: number) => {
        const q = Math.min(1, (n - b0) / BURST_MS)
        burst.current = 1 - Math.pow(1 - q, 2.4)
        if (cvWrap.current) cvWrap.current.style.opacity = String(1 - Math.max(0, (q - 0.35) / 0.65))
        if (q < 1) raf = requestAnimationFrame(bt)
      }
      raf = requestAnimationFrame(bt)
      timers.push(window.setTimeout(() => setClear(true), 380))
      timers.push(window.setTimeout(onGone, BURST_MS + 500))
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pos = prog * STEPS.length
  const step = Math.min(STEPS.length - 1, Math.floor(pos))
  const within = Math.min(1, pos - step)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden transition-[background-color] duration-700" style={{ backgroundColor: clear ? 'transparent' : 'var(--color-bg)', pointerEvents: clear ? 'none' : 'auto' }}>
      <div ref={cvWrap} className="absolute inset-0"><ParticleSphere cy={0.43} radius={0.29} progress={progress} burst={burst} /></div>
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-14 transition-opacity duration-500 ${bursting ? 'opacity-0' : 'opacity-100'}`}>
        {/* quy trình nằm ngang: bước đang chạy sáng và được gõ chữ, bước đã xong mờ xuống, bước chưa tới chìm hẳn */}
        <div className="mx-auto flex max-w-[1180px] items-start justify-between gap-6 font-mono text-[15px] font-medium">
          {STEPS.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'on' : 'next'
            const typed = state === 'next' ? '' : state === 'done' ? s : s.slice(0, Math.max(1, Math.ceil(s.length * Math.min(1, within * 1.8))))
            return (
              <div key={s} className="flex-1 transition-all duration-500" style={{ opacity: state === 'on' ? 1 : state === 'done' ? 0.42 : 0.16 }}>
                <div className={`mb-2 h-[3px] transition-all duration-500 ${state === 'on' ? 'bg-accent shadow-[0_0_12px_#ff6d29]' : state === 'done' ? 'bg-black/40' : 'bg-black/15'}`}
                  style={state === 'on' ? { width: `${Math.max(8, within * 100)}%` } : undefined} />
                <div className="text-[11px] tracking-widest text-accent">{String(i + 1).padStart(2, '0')}</div>
                <div className="mt-1 min-h-[24px] whitespace-nowrap text-ink">
                  {typed}{state === 'on' && prog < 1 && <span className="typing ml-0.5 inline-block h-[1em] align-[-0.12em]" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
