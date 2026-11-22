import { useEffect, useRef } from 'react'

/**
 * Nền động cho tab Kế hoạch: bản vẽ mặt bằng cửa hàng được vẽ dần theo từng nét (tường, khu bếp, cửa, kích thước),
 * rồi bàn ghế lần lượt nảy lên lấp đầy chỗ ngồi, giữ một nhịp, mờ đi và vẽ lại. Gợi đúng việc tab này làm:
 * từ số vốn hoặc mục tiêu suy ra diện tích và số chỗ. Nét mảnh, rất mờ, nằm ở vùng trống phía dưới.
 * Dừng khi ra khỏi khung nhìn hoặc tab bị ẩn (vẫn chạy khi đang cuộn), và đứng yên ở khung hoàn chỉnh nếu bật giảm chuyển động.
 */
const CYCLE = 12500
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3)
const back = (k: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2) }

type P = [number, number]
/** Vẽ phần đầu của đường gấp khúc theo tỷ lệ 0..1 độ dài */
function partial(ctx: CanvasRenderingContext2D, pts: P[], k: number) {
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d }
  let left = total * clamp(k)
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length && left > 0; i++) {
    const d = seg[i - 1]
    const f = Math.min(1, left / d)
    ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f)
    left -= d
  }
  ctx.stroke()
}

// bàn: vị trí (tỷ lệ trong khung bản vẽ) và số ghế
const TABLES: { x: number; y: number; seats: number }[] = []
for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) TABLES.push({ x: 0.46 + c * 0.125, y: 0.2 + r * 0.3, seats: c % 2 ? 4 : 2 })
for (let c = 0; c < 3; c++) TABLES.push({ x: 0.1 + c * 0.125, y: 0.78, seats: 4 })

export function PlanBackdrop() {
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
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.documentElement
    let raf = 0, visible = true, clock = reduce ? 9000 : 0, last = performance.now()

    const draw = () => {
      const dark = root.dataset.theme === 'dark'
      const ink = dark ? '255,255,255' : '40,36,60'
      // khung bản vẽ: góc dưới bên trái (cột nhập vốn đang trống), tỷ lệ 1,7:1, không đè lên bảng bên phải
      const bw = Math.min(W * 0.27, 340), bh = bw / 1.7
      const bx = 52, by = H - bh - 76
      const t = clock % CYCLE
      const fade = t > 9800 ? 1 - clamp((t - 9800) / 1200) : 1
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.globalAlpha = fade
      ctx.translate(bx, by)
      const X = (u: number) => u * bw, Y = (v: number) => v * bh
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'

      // lưới bản vẽ mờ phía sau, hiện cùng nét đầu tiên
      const gk = clamp(t / 1200)
      ctx.strokeStyle = `rgba(${ink},${(0.05 * gk).toFixed(3)})`; ctx.lineWidth = 1
      for (let u = 0; u <= 1.0001; u += 0.1) { ctx.beginPath(); ctx.moveTo(X(u), -14); ctx.lineTo(X(u), bh + 14); ctx.stroke() }
      for (let v = 0; v <= 1.0001; v += 0.1) { ctx.beginPath(); ctx.moveTo(-14, Y(v)); ctx.lineTo(bw + 14, Y(v)); ctx.stroke() }

      // tường ngoài: vẽ liền một nét quanh chu vi, chừa khe cửa ở đáy
      ctx.strokeStyle = `rgba(${ink},0.34)`; ctx.lineWidth = 2.2
      partial(ctx, [[X(0.58), Y(1)], [X(1), Y(1)], [X(1), Y(0)], [X(0), Y(0)], [X(0), Y(1)], [X(0.46), Y(1)]], easeOut(clamp(t / 2400)))

      // khu bếp và quầy bar
      const kk = easeOut(clamp((t - 1800) / 1300))
      if (kk > 0) {
        ctx.strokeStyle = `rgba(${ink},0.28)`; ctx.lineWidth = 1.8
        partial(ctx, [[X(0), Y(0.42)], [X(0.34), Y(0.42)], [X(0.34), Y(0)]], kk)
        ctx.strokeStyle = `rgba(${ink},0.18)`; ctx.lineWidth = 1.4
        partial(ctx, [[X(0.06), Y(0.08)], [X(0.28), Y(0.08)], [X(0.28), Y(0.14)], [X(0.06), Y(0.14)], [X(0.06), Y(0.08)]], clamp(kk * 1.4 - 0.2))
        partial(ctx, [[X(0.06), Y(0.27)], [X(0.28), Y(0.27)], [X(0.28), Y(0.34)], [X(0.06), Y(0.34)], [X(0.06), Y(0.27)]], clamp(kk * 1.4 - 0.4))
      }

      // cửa ra vào: cung quay
      const dk = easeOut(clamp((t - 2500) / 900))
      if (dk > 0) {
        ctx.strokeStyle = `rgba(255,109,41,${(0.5 * dk).toFixed(3)})`; ctx.lineWidth = 1.6
        ctx.beginPath(); ctx.arc(X(0.46), Y(1), bw * 0.12, -Math.PI / 2, -Math.PI / 2 + (Math.PI / 2) * dk); ctx.stroke()
      }

      // đường kích thước: mũi tên hai đầu phía trên và bên trái
      const mk = easeOut(clamp((t - 2800) / 900))
      if (mk > 0) {
        ctx.strokeStyle = `rgba(255,109,41,${(0.55 * mk).toFixed(3)})`; ctx.lineWidth = 1.2
        const y0 = -22
        const xe = X(mk)
        ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(xe, y0); ctx.moveTo(0, y0 - 5); ctx.lineTo(0, y0 + 5); ctx.moveTo(xe, y0 - 5); ctx.lineTo(xe, y0 + 5); ctx.stroke()
        const x0 = -22, ye = Y(mk)
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, ye); ctx.moveTo(x0 - 5, 0); ctx.lineTo(x0 + 5, 0); ctx.moveTo(x0 - 5, ye); ctx.lineTo(x0 + 5, ye); ctx.stroke()
      }

      // bàn ghế nảy lên lần lượt
      const unit = bw * 0.028
      TABLES.forEach((tb, i) => {
        const k = clamp((t - 3400 - i * 150) / 520)
        if (k <= 0) return
        const s = back(k)
        const cx = X(tb.x), cy = Y(tb.y)
        ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s)
        ctx.fillStyle = `rgba(255,109,41,${(0.2 * k).toFixed(3)})`; ctx.strokeStyle = `rgba(255,109,41,${(0.6 * k).toFixed(3)})`; ctx.lineWidth = 1.4
        ctx.beginPath(); ctx.arc(0, 0, unit, 0, 6.283); ctx.fill(); ctx.stroke()
        ctx.fillStyle = `rgba(${ink},${(0.28 * k).toFixed(3)})`
        for (let c = 0; c < tb.seats; c++) {
          const a = (c / tb.seats) * 6.283 + (tb.seats === 2 ? 0 : Math.PI / 4) + (tb.seats === 2 ? Math.PI / 2 : 0)
          ctx.beginPath(); ctx.arc(Math.cos(a) * unit * 1.7, Math.sin(a) * unit * 1.7, unit * 0.38, 0, 6.283); ctx.fill()
        }
        ctx.restore()
      })

      // vòng quét sáng đi ngang qua các bàn khi bản vẽ đã đầy
      const sk = clamp((t - 6900) / 2200)
      if (sk > 0 && sk < 1) {
        const x = X(sk)
        const g = ctx.createLinearGradient(x - 60, 0, x + 60, 0)
        g.addColorStop(0, 'rgba(255,109,41,0)'); g.addColorStop(0.5, 'rgba(255,109,41,0.16)'); g.addColorStop(1, 'rgba(255,109,41,0)')
        ctx.fillStyle = g; ctx.fillRect(x - 60, -6, 120, bh + 12)
      }
      ctx.restore()
    }

    const frame = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      const dt = Math.min(50, now - last); last = now
      if (!reduce) clock += dt
      draw()
      raf = requestAnimationFrame(frame)
    }
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame) } }
    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) start() })
    io.observe(cv)
    document.addEventListener('visibilitychange', start)
    start()
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', start) }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
}
