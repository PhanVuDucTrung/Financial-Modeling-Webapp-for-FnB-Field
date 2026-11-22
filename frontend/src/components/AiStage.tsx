import { useEffect, useRef } from 'react'
import { uiScale } from '../scale'

export type StagePhase = 'idle' | 'think' | 'leave'

/**
 * Sân khấu hạt của trang Trợ lý AI, chỉ hiện trước lần chat đầu tiên.
 * idle: hàng trăm hạt xoay thành một vành sáng, rê chuột thì hạt tản ra rồi trở về, bấm thì bắn một đợt sóng.
 * think: các hạt tụ lại thành dòng chữ "Đang phân tích mô hình" và nhấp nhô như đang tải.
 * leave: dòng chữ vỡ ra thành hạt bay đi và mờ dần, rồi gọi onGone để trang bỏ hẳn sân khấu.
 */
const N = 1100

interface Pt { x: number; y: number; vx: number; vy: number; a: number; r: number; w: number; s: number; blue: boolean; tx: number; ty: number; hasText: boolean; ph: number }

export function AiStage({ phase, label, onGone }: { phase: StagePhase; label: string; onGone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<StagePhase>(phase)
  const labelRef = useRef(label)
  const goneRef = useRef(onGone)
  phaseRef.current = phase; labelRef.current = label; goneRef.current = onGone
  const bump = useRef<(x: number, y: number) => void>(() => {})
  const rebuildText = useRef<() => void>(() => {})

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let W = 0, H = 0
    const resize = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize()
    const ro = new ResizeObserver(() => { resize(); if (phaseRef.current !== 'idle') buildText() }); ro.observe(cv)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    const pts: Pt[] = Array.from({ length: N }, (_, i) => {
      const ang = Math.random() * 6.283
      const ring = Math.random() < 0.82
      return { x: 0, y: 0, vx: 0, vy: 0, a: 0, r: 0.8 + Math.random() * 1.5, w: (ring ? 1 : -1) * (0.00006 + Math.random() * 0.00012), s: ring ? 0.7 + Math.random() * 0.38 : 0.2 + Math.random() * 0.45, blue: Math.random() < 0.3, tx: 0, ty: 0, hasText: false, ph: i + ang }
    })
    let init = false
    const orbit = (p: Pt, t: number, k: number) => {
      const R = Math.min(W, H) * 0.34
      const ang = p.ph + t * p.w
      const rr = R * p.s
      return [W / 2 + Math.cos(ang) * rr * 1.18, H * 0.5 + Math.sin(ang) * rr * 0.86 + Math.sin(t / 1300 + p.ph) * 6 * k]
    }

    // lấy điểm ảnh của dòng chữ làm đích cho các hạt
    function buildText() {
      const off = document.createElement('canvas'); off.width = Math.max(2, Math.round(W)); off.height = Math.max(2, Math.round(H))
      const o = off.getContext('2d')!
      const fs = Math.max(30, Math.min(64, W * 0.07))
      o.fillStyle = '#000'; o.textAlign = 'center'; o.textBaseline = 'middle'
      o.font = `600 ${fs}px 'Newsreader Variable','Newsreader',Georgia,serif`
      o.fillText(labelRef.current, off.width / 2, off.height * 0.5)
      const d = o.getImageData(0, 0, off.width, off.height).data
      const cand: [number, number][] = []
      const step = Math.max(2, Math.round(fs / 15))
      for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (d[(y * off.width + x) * 4 + 3] > 120) cand.push([x, y])
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]] }
      pts.forEach((p, i) => { const c = cand[i]; p.hasText = !!c; if (c) { p.tx = c[0]; p.ty = c[1] } })
    }
    rebuildText.current = buildText

    const mouse = { x: -999, y: -999, on: false }
    const move = (e: PointerEvent) => { const b = cv.getBoundingClientRect(), s = uiScale(); mouse.x = (e.clientX - b.left) / s; mouse.y = (e.clientY - b.top) / s; mouse.on = true }
    const leave = () => { mouse.on = false; mouse.x = mouse.y = -999 }
    // bấm: bắn sóng đẩy các hạt xung quanh ra xa
    const wave: { x: number; y: number; t: number }[] = []
    bump.current = (x, y) => { wave.push({ x, y, t: 0 }); if (wave.length > 3) wave.shift() }
    const down = (e: PointerEvent) => { const b = cv.getBoundingClientRect(), s = uiScale(); bump.current((e.clientX - b.left) / s, (e.clientY - b.top) / s) }
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerleave', leave); cv.addEventListener('pointerdown', down)

    let raf = 0, visible = true, last = performance.now(), lastPhase: StagePhase = 'idle', phaseT = 0, doneCalled = false
    const frame = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      const dt = Math.min(40, now - last); last = now
      const ph = phaseRef.current
      if (ph !== lastPhase) {
        if (ph === 'think') buildText()
        if (ph === 'leave') pts.forEach((p) => { p.vx += (Math.random() - 0.5) * 7; p.vy += -2 - Math.random() * 6 })
        lastPhase = ph; phaseT = 0
      }
      phaseT += dt
      const dark = document.documentElement.dataset.theme === 'dark'
      const warm = dark ? '255,138,84' : '255,109,41'
      const cool = dark ? '170,185,255' : '90,110,230'
      if (!init && W > 0) { pts.forEach((p) => { const [x, y] = orbit(p, 0, 1); p.x = W / 2 + (Math.random() - 0.5) * 30; p.y = H / 2 + (Math.random() - 0.5) * 30; void x; void y }); init = true }
      ctx.clearRect(0, 0, W, H)
      const k = dt / 16.7
      for (const w of wave) w.t += dt
      let alive = 0
      for (const p of pts) {
        let ex: number, ey: number, spring: number
        if (ph === 'idle' || (ph === 'think' && !p.hasText)) {
          [ex, ey] = orbit(p, now, 1); spring = 0.022
          if (ph === 'think') { ex = W / 2 + (ex - W / 2) * 1.35; ey = H / 2 + (ey - H / 2) * 1.35 }
        } else if (ph === 'think') {
          // chữ nhấp nhô nhẹ như đang tải
          ex = p.tx + Math.sin(now / 420 + p.tx * 0.02) * 1.6; ey = p.ty + Math.cos(now / 520 + p.ty * 0.03) * 2.2; spring = 0.14
        } else { ex = p.x; ey = p.y; spring = 0 }
        if (ph !== 'leave') { p.vx += (ex - p.x) * spring * k; p.vy += (ey - p.y) * spring * k }
        // chuột đẩy hạt ra rồi hạt tự về
        if (mouse.on && ph === 'idle') {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy
          if (d2 < 130 * 130 && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / 130) * 2.4 * k; p.vx += (dx / d) * f; p.vy += (dy / d) * f }
        }
        for (const w of wave) {
          const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy) || 1, front = w.t * 0.55
          if (Math.abs(d - front) < 40 && front < 420) { const f = (1 - Math.abs(d - front) / 40) * 1.5 * k; p.vx += (dx / d) * f; p.vy += (dy / d) * f }
        }
        const damp = ph === 'leave' ? 0.985 : ph === 'think' && p.hasText ? 0.82 : 0.9
        p.vx *= Math.pow(damp, k); p.vy *= Math.pow(damp, k)
        p.x += p.vx * k; p.y += p.vy * k
        // độ sáng: hiện dần khi vào, mờ dần khi rời đi
        const target = ph === 'leave' ? 0 : ph === 'think' && !p.hasText ? 0.4 : 1
        p.a += (target - p.a) * (ph === 'leave' ? 0.045 : 0.03) * k
        if (p.a > 0.02) alive++
        const text = ph === 'think' && p.hasText
        ctx.fillStyle = `rgba(${p.blue && !text ? cool : warm},${(p.a * (text ? 1 : 0.4 + p.s * 0.45)).toFixed(3)})`
        const r = text ? 2.3 : p.r
        ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r)
      }
      for (let i = wave.length - 1; i >= 0; i--) if (wave[i].t > 900) wave.splice(i, 1)
      if (ph === 'leave' && (alive === 0 || phaseT > 2400) && !doneCalled) { doneCalled = true; goneRef.current() }
      raf = requestAnimationFrame(frame)
    }
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame) } }
    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) start() })
    io.observe(cv)
    document.addEventListener('visibilitychange', start)
    if (reduce) { /* vẫn chạy vì hạt chỉ đóng vai trang trí; giảm chuyển động thì không đẩy theo chuột */ mouse.on = false }
    start()
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', start)
      cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerleave', leave); cv.removeEventListener('pointerdown', down)
    }
  }, [])

  return <canvas ref={ref} aria-label="Hoạt cảnh hạt tương tác" className={`absolute inset-0 h-full w-full ${phase === 'idle' ? 'cursor-crosshair' : 'pointer-events-none'}`} />
}
