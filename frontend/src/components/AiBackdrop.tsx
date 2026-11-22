import { uiScale } from '../scale'
import { useEffect, useRef } from 'react'

/**
 * Nền động cho trang Trợ lý AI: mạng lưới các nút dữ liệu trôi chậm, nối với nhau khi ở gần, thỉnh thoảng có xung sáng chạy dọc đường nối
 * như AI đang "suy nghĩ". Nhẹ (khoảng 70 nút, vẽ mỗi khung hình dưới 1 ms), nút gần con trỏ ngả cam nhẹ,
 * tự dừng khi ra khỏi khung nhìn hoặc tab bị ẩn, và đứng yên khi người dùng bật giảm chuyển động.
 */
export function AiBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let W = 0, H = 0
    const resize = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(cv)
    const N = 72
    const nodes = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.00006, vy: (Math.random() - 0.5) * 0.00006, r: 1.4 + Math.random() * 2, ph: Math.random() * 6.28 }))
    const pulses: { a: number; b: number; t: number; c: string }[] = []
    const mouse = { x: -999, y: -999 }
    const move = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); mouse.x = (e.clientX - b.left) / uiScale(); mouse.y = (e.clientY - b.top) / uiScale() }
    window.addEventListener('pointermove', move)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, visible = true, last = performance.now(), nextPulse = 0
    const LINK = 170
    const draw = (now: number) => {
      const dt = Math.min(50, now - last); last = now
      ctx.clearRect(0, 0, W, H)
      const px = nodes.map((n) => [n.x * W, n.y * H])
      if (!reduce) for (const n of nodes) {
        n.x += n.vx * dt; n.y += n.vy * dt
        if (n.x < -0.05 || n.x > 1.05) n.vx *= -1
        if (n.y < -0.05 || n.y > 1.05) n.vy *= -1
      }
      // đường nối giữa các nút gần nhau
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = px[i][0] - px[j][0], dy = px[i][1] - px[j][1]
        const d2 = dx * dx + dy * dy
        if (d2 < LINK * LINK) {
          const k = 1 - Math.sqrt(d2) / LINK
          ctx.strokeStyle = `rgba(120,110,150,${(0.22 * k).toFixed(3)})`; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(px[i][0], px[i][1]); ctx.lineTo(px[j][0], px[j][1]); ctx.stroke()
        }
      }
      // xung sáng chạy dọc một đường nối ngẫu nhiên
      if (!reduce && now > nextPulse) {
        nextPulse = now + 380 + Math.random() * 520
        const a = Math.floor(Math.random() * N)
        let best = -1, bd = LINK * LINK
        for (let j = 0; j < N; j++) { if (j === a) continue; const dx = px[a][0] - px[j][0], dy = px[a][1] - px[j][1]; const d2 = dx * dx + dy * dy; if (d2 < bd && Math.random() < 0.6) { bd = d2; best = j } }
        if (best >= 0 && pulses.length < 14) pulses.push({ a, b: best, t: 0, c: Math.random() < 0.7 ? '255,109,41' : '90,120,255' })
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.t += dt / 900
        if (p.t >= 1) { pulses.splice(i, 1); continue }
        const x = px[p.a][0] + (px[p.b][0] - px[p.a][0]) * p.t, y = px[p.a][1] + (px[p.b][1] - px[p.a][1]) * p.t
        const g = ctx.createRadialGradient(x, y, 0, x, y, 16)
        g.addColorStop(0, `rgba(${p.c},0.55)`); g.addColorStop(1, `rgba(${p.c},0)`)
        ctx.fillStyle = g; ctx.fillRect(x - 16, y - 16, 32, 32)
      }
      // các nút: nhấp nháy rất nhẹ, gần con trỏ thì ngả cam
      for (let i = 0; i < N; i++) {
        const n = nodes[i], [x, y] = px[i]
        const tw = reduce ? 0.6 : 0.55 + 0.45 * Math.sin(now / 1400 + n.ph)
        const dm = Math.hypot(x - mouse.x, y - mouse.y)
        const hot = dm < 150 ? 1 - dm / 150 : 0
        ctx.fillStyle = hot > 0 ? `rgba(255,${Math.round(150 - 50 * hot)},${Math.round(110 - 70 * hot)},${(0.4 + 0.5 * hot).toFixed(2)})` : `rgba(110,100,140,${(0.32 + 0.25 * tw).toFixed(2)})`
        ctx.beginPath(); ctx.arc(x, y, n.r + hot * 1.6, 0, 6.283); ctx.fill()
      }
      raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0
    }
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw) } }
    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) start() })
    io.observe(cv)
    document.addEventListener('visibilitychange', start)
    start()
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', start); window.removeEventListener('pointermove', move) }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
}
