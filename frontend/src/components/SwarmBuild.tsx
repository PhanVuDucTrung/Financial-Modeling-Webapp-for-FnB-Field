import { uiScale } from '../scale'
import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Hoạt cảnh "các agent dựng trang kết quả": 8 con trỏ neon tên Agent 1 đến Agent 8 bay ra từ tâm quả cầu,
 * lần lượt kéo khung và gõ chữ để dựng lại thanh bên và trang Tổng quan (nội dung thật đã có sẵn, hoạt cảnh chỉ chạy đè lên),
 * trang cuộn dần xuống cuối, rồi cuộn ngược về đầu và các con trỏ chui vào chữ "Financial Model FOR ENTERPRISE".
 * Trong lúc chạy, người dùng không thao tác được. Ý tưởng chuyển động theo dự án swarm-cursors (Joel Califa).
 *
 * Phần tử được dựng là mọi phần tử có thuộc tính data-sw ("rect" hoặc "text"). Thuộc tính data-swh ẩn phần tử cho đến khi được dựng.
 */
const COLORS = ['#ff2bd6', '#00f0ff', '#8dff1a', '#ffb800', '#b44dff', '#ff4d4d', '#2bff9a', '#3d8bff']
const ARROW = (c: string) => `<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2 L2 20 L7 15.5 L10.5 23 L14 21.5 L10.5 14 L17 14 Z" fill="${c}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`

interface Task { top: number; el: HTMLElement; kind: 'rect' | 'text'; state: 'todo' | 'doing' | 'done'; parent: Task | null }
interface Agent { el: HTMLDivElement; dim: HTMLDivElement; c: string; x: number; y: number; tf: () => { x: number; y: number }; tau: number; alive: boolean; idle: boolean; last: number }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function SwarmBuild({ onDone }: { onDone: () => void }) {
  const fx = useRef<HTMLDivElement>(null)
  const tasks = useRef<Task[]>([])

  // ẩn toàn bộ phần tử sẽ được dựng ngay trước khi trình duyệt vẽ khung hình đầu tiên
  useLayoutEffect(() => {
    document.body.classList.add('swarm')
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-sw]')).filter((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0)
    const scEl = document.querySelector<HTMLElement>('[data-sw-scroll]')
    const list: Task[] = els.map((el) => ({ top: scEl && scEl.contains(el) ? el.getBoundingClientRect().top / uiScale() + scEl.scrollTop : -1, el, kind: el.dataset.sw === 'text' ? 'text' : 'rect', state: 'todo', parent: null }))
    list.forEach((t) => { const p = t.el.parentElement?.closest('[data-sw]'); t.parent = list.find((x) => x.el === p) ?? null })
    tasks.current = list
    list.sort((a, b) => a.top - b.top)
    list.forEach((t) => t.el.setAttribute('data-swh', ''))
    return () => { document.body.classList.remove('swarm'); list.forEach((t) => t.el.removeAttribute('data-swh')) }
  }, [])

  useEffect(() => {
    const root = fx.current
    const sc = document.querySelector<HTMLElement>('[data-sw-scroll]')
    if (!root || !sc) { onDone(); return }
    let dead = false
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    const frames = new Set<(dt: number, now: number) => void>()
    let raf = 0, last = performance.now()
    const loop = (now: number) => { const dt = Math.min(50, now - last); last = now; frames.forEach((f) => f(dt, now)); if (!dead) raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    const tween = (ms: number, fn: (k: number) => void) => new Promise<void>((res) => {
      let t = 0
      const f = (dt: number) => { t += dt; const k = Math.min(1, t / ms); fn(k); if (k >= 1) { frames.delete(f); res() } }
      frames.add(f)
    })

    // ---- agent ----
    const S = uiScale()
    const W = innerWidth / S, H = innerHeight / S
    const rect = (e: HTMLElement) => { const q = e.getBoundingClientRect(); return { left: q.left / S, top: q.top / S, width: q.width / S, height: q.height / S } }
    const sx = W / 2, sy = H * 0.43
    const agents: Agent[] = COLORS.map((c, i) => {
      const el = document.createElement('div'); el.className = 'sw-agent'; el.style.setProperty('--c', c); el.style.opacity = '0'
      el.innerHTML = `${ARROW(c)}<span>Agent ${i + 1}</span><div class="sw-dim"></div>`
      root.appendChild(el)
      const a: Agent = { el, dim: el.querySelector('.sw-dim') as HTMLDivElement, c, x: sx, y: sy, tf: () => ({ x: sx, y: sy }), tau: 85, alive: true, idle: false, last: 0 }
      return a
    })
    // mỗi khung hình agent bám theo đích với độ trễ nhỏ nên chuyển động liền mạch, không giật
    const mover = (dt: number) => {
      for (const a of agents) {
        const t = a.tf(); const k = 1 - Math.exp(-dt / a.tau)
        a.x += (t.x - a.x) * k; a.y += (t.y - a.y) * k
        a.el.style.transform = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0) scale(${a.el.dataset.s ?? 1})`
      }
    }
    frames.add(mover)
    const setScale = (a: Agent, s: number, o: number) => { a.el.dataset.s = String(s); a.el.style.opacity = String(o) }
    const arrive = async (a: Agent, r = 16, max = 900) => { const t0 = performance.now(); while (!dead && performance.now() - t0 < max) { const t = a.tf(); if (Math.hypot(t.x - a.x, t.y - a.y) < r) return; await sleep(16) } }

    // ---- cuộn theo tiến độ ----
    let scrollTarget = sc.scrollTop
    let followOn = true
    const maxScroll = () => sc.scrollHeight - sc.clientHeight
    // đích cuộn: đặt phần tử chưa dựng xong cao nhất ở khoảng 18% từ mép trên khung nhìn, không bao giờ cuộn lùi
    const retarget = () => {
      const open = tasks.current.find((x) => x.state !== 'done' && x.top >= 0)
      if (!open) return
      scrollTarget = Math.max(scrollTarget, Math.min(maxScroll(), open.top - H * 0.18))
    }
    const scroller = (dt: number) => { if (followOn) { retarget(); sc.scrollTop += (scrollTarget - sc.scrollTop) * (1 - Math.exp(-dt / 520)) } }
    frames.add(scroller)

    // ---- dựng một phần tử ----
    const reveal = async (el: HTMLElement) => {
      el.style.opacity = '0'; el.removeAttribute('data-swh')
      void el.offsetWidth
      el.style.transition = 'opacity .75s ease'; el.style.opacity = '1'
      await sleep(760); el.style.removeProperty('transition'); el.style.removeProperty('opacity')
    }
    const textNodes = (el: HTMLElement) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out: [Text, string][] = []; let n: Node | null; while ((n = w.nextNode())) { const v = (n as Text).nodeValue ?? ''; if (v.trim()) out.push([n as Text, v]) } return out }
    const build = async (a: Agent, t: Task) => {
      const el = t.el
      const inScroll = sc.contains(el)
      const r = rect(el)
      const st0 = sc.scrollTop
      const P = (ox: number, oy: number) => ({ x: r.left + ox, y: Math.max(14, Math.min(H - 14, r.top + oy - (inScroll ? sc.scrollTop - st0 : 0))) })
      a.tau = 120
      a.tf = () => P(0, 0)
      await arrive(a, 18, 1600)
      if (dead) return
      const nodes = t.kind === 'text' ? textNodes(el) : []
      const total = nodes.reduce((s, [, v]) => s + v.length, 0)
      const asText = t.kind === 'text' && total > 0 && total <= 150
      const box = document.createElement('div'); box.className = 'sw-box'; box.style.setProperty('--c', a.c); root.appendChild(box)
      const w = r.width, h = r.height
      a.dim.style.display = 'block'
      a.tau = 1
      const dragMs = Math.min(1000, 420 + (w + h) * 0.34)
      await tween(dragMs, (k) => {
        const e = easeOut(k), ww = w * e, hh = h * e
        const p = P(0, 0)
        box.style.transform = `translate3d(${p.x}px,${p.y}px,0)`; box.style.width = ww + 'px'; box.style.height = hh + 'px'
        a.tf = () => { const q = P(ww, hh); return q }
        a.dim.textContent = `${Math.round(ww)} × ${Math.round(hh)}`
      })
      a.dim.style.display = 'none'; box.remove()
      if (asText) {
        // giữ nguyên kích thước để bố cục không xê dịch khi chữ chưa hiện
        el.style.minWidth = w + 'px'; el.style.minHeight = h + 'px'
        nodes.forEach(([n]) => { n.nodeValue = '' })
        el.removeAttribute('data-swh'); el.classList.add('sw-caret')
        const per = Math.max(16, Math.min(42, 1300 / total))
        let done = 0, frac = 0
        a.tau = 45
        a.tf = () => P(Math.min(w - 4, w * frac), h * 0.7)
        for (const [n, v] of nodes) {
          for (let i = 1; i <= v.length; i++) {
            if (dead) return
            n.nodeValue = v.slice(0, i); done++
            frac = done / total
            await sleep(per)
          }
        }
        el.classList.remove('sw-caret'); el.style.removeProperty('min-width'); el.style.removeProperty('min-height')
      } else {
        await reveal(el)
      }
      t.state = 'done'
      a.tau = 120
    }
    const visibleNow = (t: Task) => t.top < 0 || t.top < sc.scrollTop + H * 0.82
    const next = () => tasks.current.find((t) => t.state === 'todo' && (!t.parent || t.parent.state === 'done') && visibleNow(t))
    // agent hết việc thì lơ lửng rải rác trong tầm nhìn, không nằm lại ở chỗ vừa dựng (có thể đã khuất màn hình)
    const goIdle = (a: Agent, i: number) => {
      const cols = 4, col = i % cols, row = Math.floor(i / cols)
      const bx = W * 0.34 + ((col + 0.5) / cols) * (W * 0.58) + (Math.random() - 0.5) * 50
      const by = H * 0.26 + ((row + 0.5) / 2) * (H * 0.5) + (Math.random() - 0.5) * 40
      a.tau = 240
      a.tf = () => ({ x: bx + Math.sin(performance.now() / 700 + i) * 14, y: by + Math.cos(performance.now() / 900 + i * 1.7) * 10 })
    }
    const agentLoop = async (a: Agent, i: number) => {
      while (!dead) {
        const t = next()
        if (!t) {
          if (tasks.current.every((x) => x.state === 'done')) return
          if (!a.idle) { a.idle = true; goIdle(a, i) }
          await sleep(60); continue
        }
        a.idle = false
        t.state = 'doing'
        await build(a, t)
        a.last = performance.now()
      }
    }

    ;(async () => {
      // các agent bay ra từ tâm quả cầu
      await sleep(260)
      agents.forEach((a, i) => { setTimeout(() => setScale(a, 1, 1), i * 55) })
      await Promise.all(agents.map(async (a, i) => {
        await sleep(i * 55)
        const ang = (i / agents.length) * Math.PI * 2 - 0.5
        const tx = sx + Math.cos(ang) * 360, ty = sy + Math.sin(ang) * 240
        a.tau = 160; a.tf = () => ({ x: tx, y: ty })
        await sleep(700)
      }))
      if (dead) return
      await Promise.all(agents.map((a, i) => agentLoop(a, i)))
      if (dead) return
      // mọi agent đã rải rác trong tầm nhìn: dừng một nhịp rồi cuộn ngược về đầu trang
      agents.forEach((a, i) => { if (!a.idle) { a.idle = true; goIdle(a, i) } })
      await sleep(900)
      followOn = false
      const s0 = sc.scrollTop
      await tween(2200, (k) => { sc.scrollTop = s0 * (1 - ease(k)) })
      await sleep(250)
      // các agent cùng lúc chạy về chữ Financial Model FOR ENTERPRISE, mỗi con làm chữ gợn sóng neon một lần khi tới nơi
      const lg = document.querySelector<HTMLElement>('[data-sw-logo]')
      const lr = lg ? rect(lg) : undefined
      const lcx = (lr?.left ?? 40) + Math.min(lr?.width ?? 180, 180) * 0.45, lcy = (lr?.top ?? 40) + (lr?.height ?? 40) * 0.42
      const ripple = (c: string) => {
        if (!lg) return
        lg.style.transformOrigin = '30% 50%'
        lg.animate([
          { filter: 'drop-shadow(0 0 0 transparent)', transform: 'scale(1)' },
          { filter: `drop-shadow(0 0 10px ${c}) drop-shadow(0 0 26px ${c})`, transform: 'scale(1.06)', offset: 0.35 },
          { filter: 'drop-shadow(0 0 0 transparent)', transform: 'scale(1)' },
        ], { duration: 780, easing: 'cubic-bezier(.3,.7,.3,1)' })
        const ring = document.createElement('div'); ring.className = 'sw-ring'; ring.style.setProperty('--c', c)
        ring.style.left = lcx + 'px'; ring.style.top = lcy + 'px'; root.appendChild(ring)
        ring.animate([{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0.95 }, { transform: 'translate(-50%,-50%) scale(3.4)', opacity: 0 }], { duration: 950, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => ring.remove()
      }
      const order = [...agents].sort((x, y) => x.last - y.last)
      await Promise.all(order.map(async (a, rank) => {
        await sleep(0)
        a.tau = 110; a.tf = () => ({ x: lcx - 8 + (rank % 3) * 10, y: lcy - 10 })
        await arrive(a, 12, 1500)
        ripple(a.c)
        await tween(300, (k) => setScale(a, 1 - k, 1 - k))
      }))
      await sleep(250)
      if (!dead) onDone()
    })()

    // chặn mọi thao tác trong lúc dựng
    const block = (e: Event) => { e.preventDefault(); e.stopPropagation() }
    const evs = ['wheel', 'touchmove', 'keydown'] as const
    evs.forEach((ev) => addEventListener(ev, block, { passive: false, capture: true }))
    return () => {
      dead = true; cancelAnimationFrame(raf)
      evs.forEach((ev) => removeEventListener(ev, block, { capture: true }))
      agents.forEach((a) => a.el.remove())
      tasks.current.forEach((t) => { t.el.removeAttribute('data-swh'); t.el.style.removeProperty('min-width'); t.el.style.removeProperty('min-height'); t.el.classList.remove('sw-caret') })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-[65] cursor-default" />
      <div ref={fx} className="pointer-events-none fixed inset-0 z-[70]" />
    </>
  )
}
