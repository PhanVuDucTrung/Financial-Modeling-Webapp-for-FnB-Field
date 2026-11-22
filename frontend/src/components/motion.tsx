import { uiScale } from '../scale'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Nền chuyển động nhẹ phía sau toàn bộ ứng dụng */
export function Aurora() {
  return <div aria-hidden className="aurora"><i /><i /><i /></div>
}

/** Hiện dần và trượt nhẹ lên khi phần tử cuộn vào khung nhìn */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setOn(true); return }
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect() } },
      { threshold: 0.02 },
    )
    io.observe(el)
    // dự phòng: nếu phần tử đã nằm trong khung nhìn mà bộ quan sát chưa báo thì vẫn hiện
    const t = setTimeout(() => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) setOn(true) }, 900)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [])
  return (
    <div ref={ref} className={`reveal ${on ? 'is-in' : ''} ${className}`} style={{ ['--d' as string]: `${delay}ms` }}>
      {children}
    </div>
  )
}

/** Gõ chữ từng ký tự. Trả về phần đã gõ và trạng thái đã xong. */
export function useTypewriter(text: string, cps = 32, startDelay = 250) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (reduce) return
    let i = 0
    let iv = 0
    const t = setTimeout(() => {
      iv = window.setInterval(() => { i += 1; setN(i); if (i >= text.length) clearInterval(iv) }, 1000 / cps)
    }, startDelay)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [text, cps, startDelay, reduce])
  return { shown: text.slice(0, n), done: n >= text.length }
}

/** Số chạy từ giá trị cũ sang giá trị mới (easeOutCubic). Tôn trọng prefers-reduced-motion. */
export function AnimatedNumber({ value, format, ms = 700 }: { value: number; format: (n: number) => ReactNode; ms?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !isFinite(value) || !isFinite(from.current)) { setShown(value); from.current = value; return }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      setShown(a + (value - a) * e)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = value }
  }, [value, ms])
  return <>{format(shown)}</>
}

/** Giá trị đích đến muộn một nhịp để các thanh và cung có CSS transition vẽ dần từ 0 ngay khi hiện (lần đầu và mỗi lần đổi giá trị) */
export function useGrow(target: number, delay = 280) {
  const [v, setV] = useState(0)
  useEffect(() => { const t = setTimeout(() => setV(target), delay); return () => clearTimeout(t) }, [target, delay])
  return v
}

/** Số lớn mờ trôi chậm ở nền trang, gắn với nội dung của trang để trang bớt trống */
export function Ghost({ n, fmt, label }: { n: number; fmt: (n: number) => string; label: string }) {
  return (
    <div aria-hidden className="ghost pointer-events-none fixed bottom-6 right-8 z-0 select-none text-right">
      <div className="num text-[clamp(120px,15vw,260px)] font-bold leading-none" style={{ color: 'transparent', WebkitTextStroke: '1.5px rgba(255,109,41,0.1)' }}>
        <AnimatedNumber value={n} format={fmt} ms={1600} />
      </div>
      <div className="-mt-2 mr-3 text-[15px] font-semibold tracking-[0.3em] text-accent/25">{label.toUpperCase()}</div>
    </div>
  )
}

/**
 * Cuộn mượt có quán tính: con lăn chuột không nhảy từng bước mà trượt dần tới vị trí đích.
 * Làm mượt theo thời gian thực (không phụ thuộc số khung hình), cuộn dài hơn một nhịp con lăn,
 * và tạm dừng các hiệu ứng nền nặng (nền chuyển động, quả cầu, thẻ trôi) trong lúc đang cuộn để không giật.
 * Bỏ qua khi người dùng bật giảm chuyển động, khi thu phóng (Ctrl) hoặc khi con trỏ đang ở trong ô nhập nhiều dòng.
 */
export function useSmoothScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    let target = el.scrollTop
    let pos = el.scrollTop
    let raf = 0
    let last = 0
    let idle = 0
    const max = () => el.scrollHeight - el.clientHeight
    const HALF_LIFE = 140 // ms: càng lớn càng lướt lâu
    const step = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now
      const k = 1 - Math.pow(0.5, dt / HALF_LIFE)
      pos += (target - pos) * k
      if (Math.abs(target - pos) < 0.4) { pos = target; el.scrollTop = pos; raf = 0; idle = window.setTimeout(() => root.classList.remove('is-scrolling'), 120); return }
      el.scrollTop = pos
      raf = requestAnimationFrame(step)
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t?.closest('textarea, [data-native-scroll]')) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? el.clientHeight : 1
      if (!raf) pos = el.scrollTop
      target = Math.max(0, Math.min(max(), (raf ? target : el.scrollTop) + e.deltaY * unit * 1.35 / uiScale()))
      clearTimeout(idle)
      root.classList.add('is-scrolling')
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step) }
    }
    // khi cuộn bằng thanh kéo, phím hoặc scrollTo thì đồng bộ lại vị trí đích
    const onScroll = () => { if (!raf) { target = el.scrollTop; pos = el.scrollTop } }
    // vị trí bị đặt từ bên ngoài (ví dụ khôi phục vị trí khi đổi tab): hủy đà đang chạy và lấy vị trí mới làm gốc
    const onSync = () => { cancelAnimationFrame(raf); raf = 0; target = el.scrollTop; pos = el.scrollTop }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('sw-sync', onSync)
    return () => { cancelAnimationFrame(raf); clearTimeout(idle); root.classList.remove('is-scrolling'); el.removeEventListener('wheel', onWheel); el.removeEventListener('scroll', onScroll); el.removeEventListener('sw-sync', onSync) }
  }, [ref])
}
