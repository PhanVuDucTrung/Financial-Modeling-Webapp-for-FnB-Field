import { uiScale } from '../scale'
import { useEffect, useRef } from 'react'

/**
 * Quả cầu hạt với logo 3D bằng điểm ở tâm (7 thanh xanh navy, chấm tròn là phần lõm).
 * - Mặc định: hạt cam nhạt, đậm nhạt theo độ sâu, quay chậm. Kéo chuột để xoay 3D.
 * - Rê chuột: mặt cầu biến dạng mềm quanh con trỏ, hạt gần con trỏ sáng neon theo khoảng cách. Gần viền thì sparkle bắn ra.
 * - Bấm: sóng lan từ điểm bấm, hạt gợn cao; sóng tới viền thì bắn sparkle cam neon.
 * Tối ưu: mỗi khung hình ghi thẳng điểm ảnh vào một bộ đệm rồi đưa lên canvas một lần (nhanh hơn nhiều so với vẽ hàng chục nghìn hình chữ nhật),
 * bỏ qua tính lò xo khi không còn tương tác, và tự dừng khi ra khỏi khung nhìn hoặc tab bị ẩn.
 */
export function ParticleSphere({ cy = 0.5, radius = 0.4, progress, burst: burstRef, spin = 0.12, className = '', introRipple = false }: {
  /** nổi hai đợt sóng ở tâm ngay sau khi hiện (màn hình mở đầu) */
  introRipple?: boolean
  cy?: number
  radius?: number
  progress?: React.RefObject<number>
  /** 0 đến 1: quả cầu vỡ tung ra ngoài (dùng ở màn hình chạy phân tích) */
  burst?: React.RefObject<number>
  spin?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    let img: ImageData
    let buf: Uint32Array
    const resize = () => {
      cv.width = Math.max(1, Math.round(cv.clientWidth * dpr)); cv.height = Math.max(1, Math.round(cv.clientHeight * dpr))
      img = ctx.createImageData(cv.width, cv.height)
      buf = new Uint32Array(img.data.buffer)
    }
    resize()
    window.addEventListener('resize', resize)

    // hạt của quả cầu
    const MULT = (window as unknown as { __SPHERE_MULT?: number }).__SPHERE_MULT ?? 2.5
    const shell = Math.round(5200 * MULT), inner = Math.round(500 * MULT), band = Math.round(1000 * MULT), core = Math.round(300 * MULT)
    // lớp khí quyển: các hạt mỏng, thưa, bao quanh quả cầu, càng ra xa càng thưa và mờ
    const atmo = Math.round(2800 * MULT)
    const N = shell + inner + band + core + atmo
    const ox = new Float32Array(N), oy = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N), stiff = new Float32Array(N)
    const hx = new Float32Array(N), hy = new Float32Array(N), hz = new Float32Array(N)
    const atm = new Uint8Array(N)
    const sz = new Uint8Array(N), tone = new Float32Array(N), seed = new Float32Array(N), hot = new Float32Array(N)
    const unit = () => {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, q = Math.sqrt(1 - u * u)
      return [Math.cos(a) * q, u, Math.sin(a) * q]
    }
    for (let i = 0; i < N; i++) {
      let p: number[]
      if (i < shell) { p = unit(); tone[i] = 0.85 }
      else if (i < shell + inner) { const r = 1 - Math.pow(Math.random(), 2.2) * 0.5; const u = unit(); p = [u[0] * r, u[1] * r, u[2] * r]; tone[i] = 0.6 }
      else if (i < shell + inner + band) {
        const t = Math.random() * Math.PI * 2, yy = (Math.random() + Math.random() + Math.random() - 1.5) * 0.12
        const r = Math.sqrt(Math.max(0, 1 - yy * yy))
        p = [Math.cos(t) * r, yy, Math.sin(t) * r]; tone[i] = 1; hot[i] = 1
      } else if (i < shell + inner + band + core) { const r = Math.pow(Math.random(), 0.45) * 0.64; const u = unit(); p = [u[0] * r, u[1] * r, u[2] * r]; tone[i] = 0.75; hot[i] = 1 }
      else { const r = 1.05 + Math.pow(Math.random(), 2) * 0.26; const u = unit(); p = [u[0] * r, u[1] * r, u[2] * r]; tone[i] = 0.5; atm[i] = 1 }
      hx[i] = p[0]; hy[i] = p[1]; hz[i] = p[2]
      sz[i] = Math.random() < 0.18 ? 2 : 1
      seed[i] = Math.random()
      stiff[i] = 0.025 + Math.random() * 0.06
    }

    // logo 3D bằng điểm: 7 thanh hình viên thuốc, 6 chấm tròn là phần lõm khoét vào hai thanh kề nhau (đúng logo gốc).
    // Hình học theo ảnh gốc 447 px, tâm (223, 224), chia 156; chiều dọc co lại còn 90% và thanh dày hơn bản gốc một chút.
    // Điểm rải đều theo lưới lệch (cách nhau cùng một khoảng trên mọi bề mặt) nên mật độ đồng đều.
    const VS = 0.9
    const LU = (x: number) => (x - 223) / 156, LV = (y: number) => (-(y - 224) / 156) * VS
    const LBARS: [number, number, number][] = [[130, 112, 335], [162, 140, 306], [193, 107, 340], [224, 68, 380], [254, 107, 340], [285, 140, 306], [316, 112, 335]]
    const LDOTS: [number, number][] = [[145, 221], [177, 239], [208, 197], [238, 239], [268, 207], [299, 175]]
    const RB = 0.072, RD = 0.098
    const lposArr: number[] = [], lwallArr: number[] = []
    const inHole = (x: number, y: number) => { for (const [dx, dy] of LDOTS) { const ux = LU(dx), uy = LV(dy); if ((x - ux) ** 2 + (y - uy) ** 2 < RD * RD) return true } return false }
    // Logo là một khối dày dựng từ nhiều lớp điểm xếp theo chiều sâu: nhìn trực diện thì ra hình logo,
    // nhìn nghiêng thì các lớp tách ra và trải dài thành một dải điểm có độ dày (như hình mẫu).
    // Logo kéo xuyên suốt quả cầu: từ mặt cầu phía này sang mặt cầu phía kia (bán kính quả cầu = 1/0,72 đơn vị logo).
    const DEPTH = 1.39, CELL = 0.015
    const inBar = (x: number, y: number) => {
      for (const [px, top, bot] of LBARS) {
        const cxu = LU(px), y0 = LV(bot) + RB, y1 = LV(top) - RB
        const dx = x - cxu
        if (Math.abs(dx) > RB) continue
        if (y >= y0 && y <= y1) return true
        const cy = y < y0 ? y0 : y1
        if (dx * dx + (y - cy) ** 2 <= RB * RB) return true
      }
      return false
    }
    const xMin = LU(130) - RB, xMax = LU(316) + RB, yMax = LV(68), yMin = LV(380)
    // Mỗi điểm của mặt cắt logo nằm ở MỘT độ sâu riêng, rải đều giữa hai mặt cầu (không vượt ra ngoài quả cầu).
    // Nhìn chính diện (chiếu song song) mọi điểm thẳng hàng nên ra đúng hình logo; nhìn ngang thì chỉ thấy một dải điểm xuyên qua quả cầu.
    const ZMAX2 = (1 / 0.72) * (1 / 0.72)
    let pi = 0
    for (let y = yMin; y <= yMax; y += CELL) {
      const row = Math.round((y - yMin) / CELL)
      for (let x = xMin + (row % 2) * CELL * 0.5; x <= xMax; x += CELL) {
        const jx = x + (Math.random() - 0.5) * CELL * 0.5, jy = y + (Math.random() - 0.5) * CELL * 0.5
        if (!inBar(jx, jy) || inHole(jx, jy)) continue
        const zm = Math.sqrt(Math.max(0, ZMAX2 - jx * jx - jy * jy)) * 0.92
        const r = (pi++ * 0.6180339887) % 1
        lposArr.push(jx, jy, (2 * r - 1) * zm); lwallArr.push(0)
      }
    }
    const LN = lwallArr.length
    const lpos = Float32Array.from(lposArr), lwall = Uint8Array.from(lwallArr)

    // màu dựng sẵn dạng số 32 bit (R, G, B, A theo thứ tự byte của ImageData)
    const pack = (r: number, g: number, b: number, a: number) => (((Math.round(a * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0)
    const LUM = 8, WARM = 16
    const light = [255, 138, 84], neon = [255, 78, 8]
    const palette = new Uint32Array((LUM + 1) * (WARM + 1))
    const paletteAtm = new Uint32Array((LUM + 1) * (WARM + 1))
    for (let l = 0; l <= LUM; l++) for (let w = 0; w <= WARM; w++) {
      const lum = l / LUM, warm = w / WARM
      const c = light.map((a, k) => Math.round(a + (neon[k] - a) * warm))
      palette[l * (WARM + 1) + w] = pack(c[0], c[1], c[2], 0.55 + lum * 0.35 + warm * 0.1)
      paletteAtm[l * (WARM + 1) + w] = pack(c[0], c[1], c[2], 0.4 + lum * 0.3 + warm * 0.2)
    }
    // logo: 4 mức theo độ sâu, từ xanh sáng ở phía sau đến navy ở phía trước (nhẹ, thoáng, không đặc); thành lõm sẫm hơn một chút
    const logoColor = new Uint32Array(8)
    const LC_LIGHT = [[150, 182, 246, 0.55], [108, 148, 238, 0.75], [68, 108, 224, 0.9], [40, 80, 208, 1]]
    const LC_DARK = [[120, 140, 210, 0.5], [140, 168, 245, 0.72], [165, 190, 255, 0.9], [200, 215, 255, 1]]
    const paintLogo = () => {
      const LC = document.documentElement.dataset.theme === 'dark' ? LC_DARK : LC_LIGHT
      for (let w = 0; w < 2; w++) for (let lvl = 0; lvl < 4; lvl++) { const c = LC[lvl], k = w ? 0.9 : 1; logoColor[w * 4 + lvl] = pack(Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k), c[3]) }
    }
    paintLogo()
    window.addEventListener('fme-theme', paintLogo)

    const mouse = { x: -9999, y: -9999, on: false, tx: 0, ty: 0 }
    const ripples: { x: number; y: number; t: number }[] = []
    const introTimers: number[] = []
    if (introRipple) for (const ms of [700, 1250]) introTimers.push(window.setTimeout(() => ripples.push({ x: cv.width / 2, y: cv.height * cy, t: performance.now() }), ms))
    const sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = []
    let sparkT = 0
    const move = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect()
      mouse.on = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom
      mouse.x = (e.clientX - b.left) / uiScale() * dpr; mouse.y = (e.clientY - b.top) / uiScale() * dpr
      mouse.tx = (e.clientX - b.left) / b.width - 0.5; mouse.ty = (e.clientY - b.top) / b.height - 0.5
    }
    // sóng chỉ nổi lên khi click một lần rồi thả (không kéo): giữ chuột để xoay thì không gợn sóng
    let press: { x: number; y: number; t: number } | null = null
    const down = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect()
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) { press = null; return }
      press = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const up = (e: PointerEvent) => {
      if (!press) return
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y)
      const held = performance.now() - press.t
      press = null
      if (moved > 6 || held > 450) return
      const b = cv.getBoundingClientRect()
      ripples.push({ x: (e.clientX - b.left) / uiScale() * dpr, y: (e.clientY - b.top) / uiScale() * dpr, t: performance.now() })
      if (ripples.length > 3) ripples.shift()
    }
    let drag: { x: number; y: number } | null = null
    let userYaw = 0, userPitch = 0, vYaw = 0, vPitch = 0
    const dragStart = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); if (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom) drag = { x: e.clientX, y: e.clientY } }
    const dragMove = (e: PointerEvent) => { if (!drag) return; vYaw = (e.clientX - drag.x) * 0.006; vPitch = (e.clientY - drag.y) * 0.006; userYaw += vYaw; userPitch = Math.max(-1.2, Math.min(1.2, userPitch + vPitch)); drag = { x: e.clientX, y: e.clientY } }
    let releaseT = 0
    let ret: { t0: number; y0: number; p0: number; y1: number; ms: number } | null = null
    const dragStart2 = () => { releaseT = 0; ret = null }
    const dragEnd = () => { if (drag) releaseT = performance.now(); drag = null }
    window.addEventListener('pointerdown', dragStart); window.addEventListener('pointerdown', dragStart2); window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', dragEnd)
    const leave = () => { mouse.on = false }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.addEventListener('pointerleave', leave)

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = true
    const t0 = performance.now()
    let tiltX = 0, tiltY = 0
    let springUntil = 0
    let springsZero = true
    const burst = (x: number, y: number, ox2: number, oy2: number, n: number, v: number) => {
      const len = Math.hypot(ox2, oy2) || 1
      for (let k = 0; k < n && sparks.length < 260; k++) {
        const a = Math.atan2(oy2, ox2) + (Math.random() - 0.5) * 1.4
        const s = v * (0.4 + Math.random() * 0.9)
        sparks.push({ x: x + (ox2 / len) * 2, y: y + (oy2 / len) * 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 })
      }
    }
    let lastFrame = 0
    let wx = 0, wy = 0, weight = 0
    const draw = (now: number) => {
      // giới hạn khoảng 40 khung hình mỗi giây (30 khi đang cuộn trang)
      if (now - lastFrame < (document.documentElement.classList.contains('is-scrolling') ? 33 : 24)) { raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0; return }
      lastFrame = now
      const tStart = performance.now()
      const t = (now - t0) / 1000
      const W = cv.width, H = cv.height
      buf.fill(0)
      const plot = (x: number, y: number, s: number, c: number) => {
        if (x < 0 || y < 0 || x + s > W || y + s > H) return
        const a = c >>> 24
        for (let j = 0; j < s; j++) {
          let idx = (y + j) * W + x
          for (let i2 = 0; i2 < s; i2++, idx++) if ((buf[idx] >>> 24) <= a) buf[idx] = c
        }
      }
      const prog = progress?.current ?? 0
      const bk = burstRef?.current ?? 0
      if (bk >= 0.995) { ctx.clearRect(0, 0, W, H); raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0; return }
      const intro = reduce ? 1 : 1 - Math.pow(1 - Math.min(1, t / 1.1), 3)
      const R = Math.min(W, H) * radius * (0.94 + 0.06 * intro) * (1 + 0.02 * prog)
      const cx = W / 2, cyy = H * cy
      tiltX += ((mouse.on ? mouse.ty * 0.3 : 0) - tiltX) * 0.05
      tiltY += ((mouse.on ? mouse.tx * 0.5 : 0) - tiltY) * 0.05
      if (!drag) {
        userYaw += vYaw; vYaw *= 0.95; userPitch = Math.max(-1.2, Math.min(1.2, userPitch + vPitch)); vPitch *= 0.95
        // thả chuột một lúc, hết đà quay thì xoay về chính diện: bắt đầu và kết thúc đều êm (ease-in-out), theo đường ngắn nhất
        if (!ret && releaseT && now - releaseT > 650 && Math.abs(vYaw) < 0.006 && Math.abs(vPitch) < 0.006) {
          const target = Math.round(userYaw / (Math.PI * 2)) * Math.PI * 2
          const dist = Math.abs(target - userYaw) + Math.abs(userPitch)
          ret = { t0: now, y0: userYaw, p0: userPitch, y1: target, ms: Math.min(3600, 1500 + dist * 850) }
          vYaw = 0; vPitch = 0
        }
        if (ret) {
          const q = Math.min(1, (now - ret.t0) / ret.ms)
          const e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2
          userYaw = ret.y0 + (ret.y1 - ret.y0) * e; userPitch = ret.p0 * (1 - e)
          if (q >= 1) { userYaw = 0; userPitch = 0; ret = null; releaseT = 0 }
        }
      }
      const ang = (reduce ? 0.6 : t * spin) + tiltY + userYaw
      const tilt = -0.3 + tiltX + userPitch
      const ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt)
      const sigma = 125 * dpr
      const sig2 = 2 * sigma * sigma, reach2 = 9 * sigma * sigma, glow2 = 6.76 * sigma * sigma
      const speed = 520 * dpr, wave = 100 * dpr
      const live = ripples.filter((rp) => now - rp.t < 5600)
      const mdx = mouse.x - cx, mdy = mouse.y - cyy
      const hovering = mouse.on && mdx * mdx + mdy * mdy < R * R * 1.04
      const clip2 = R * R * 1.1
      if (hovering) { if (weight < 0.01) { wx = mouse.x; wy = mouse.y } wx += (mouse.x - wx) * 0.16; wy += (mouse.y - wy) * 0.16 }
      weight += ((hovering ? 1 : 0) - weight) * (hovering ? 0.07 : 0.05)
      const wOn = weight > 0.01
      if (hovering || weight > 0.01) springUntil = now + 2200
      // lò xo chỉ cần tính khi đang tương tác hoặc đang hồi về; hết thời gian thì đưa về 0 một lần rồi bỏ qua
      const springs = now < springUntil
      if (!springs && !springsZero) { ox.fill(0); oy.fill(0); vx.fill(0); vy.fill(0); springsZero = true }
      if (springs) springsZero = false
      const needGlow = wOn
      // sparkle ở viền khi con trỏ gần đường tròn
      if (hovering && now - sparkT > 45) {
        const dx = mouse.x - cx, dy = mouse.y - cyy, dist = Math.hypot(dx, dy)
        if (Math.abs(dist - R) < 70 * dpr) { sparkT = now; burst(cx + (dx / dist) * R, cyy + (dy / dist) * R, dx, dy, 3, 2.6 * dpr) }
      }
      const rlen = live.length
      const rx = live.map((r) => r.x), ry = live.map((r) => r.y)
      const rwave = live.map((r) => (speed * (now - r.t)) / 1000)
      const rfade = live.map((r) => Math.max(0, 1 - (now - r.t) / 1000 / 5.5))
      for (let i = 0; i < N; i++) {
        // khí quyển nhấp nhô nhẹ như đang thở
        const breathe = atm[i] ? 1 + 0.02 * Math.sin(t * 0.7 + seed[i] * 12) : 1
        const fly = (1 - intro) * (1 + seed[i] * 1.4) + bk * (1.4 + seed[i] * 3.2)
        const px = hx[i] * breathe * (1 + fly), py = hy[i] * breathe * (1 + fly), pz = hz[i] * breathe * (1 + fly)
        const x = px * ca + pz * sa
        let z = -px * sa + pz * ca
        const y = py * ct - z * st
        z = py * st + z * ct
        const persp = 1 / (1 - z * 0.2)
        let bx = cx + x * R * persp
        let by = cyy + y * R * persp
        let glow = 0
        if (springs) {
          let tx = 0, ty = 0
          if (wOn) {
            const dx = wx - bx, dy = wy - by
            const d2 = dx * dx + dy * dy
            if (d2 < reach2) { const g = Math.exp(-d2 / sig2) * weight * (0.7 + seed[i] * 0.3); tx = dx * 0.06 * g; ty = dy * 0.06 * g + 3 * dpr * g }
          }
          vx[i] = (vx[i] + (tx - ox[i]) * stiff[i]) * 0.9
          vy[i] = (vy[i] + (ty - oy[i]) * stiff[i]) * 0.9
          ox[i] += vx[i]; oy[i] += vy[i]
          bx += ox[i]; by += oy[i]
        }
        for (let r = 0; r < rlen; r++) {
          const dx = bx - rx[r], dy = by - ry[r]
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          const k = (d - rwave[r]) / wave
          if (k > 3 || k < -3) continue
          const amp = Math.exp(-k * k) * rfade[r]
          if (amp > 0.02) {
            const push = amp * 46 * dpr
            bx += (dx / d) * push; by += (dy / d) * push; if (amp * 1.4 > glow) glow = Math.min(1, amp * 1.4)
            // sóng chạm viền: hạt ở rìa bắn sparkle ra ngoài
            if (amp > 0.5 && Math.random() < 0.06) { const ex = bx - cx, ey = by - cyy; if (ex * ex + ey * ey > R * R * 0.865) burst(bx, by, ex, ey, 1, 3.6 * dpr) }
          }
        }
        if (needGlow) {
          const dx = bx - wx, dy = by - wy
          const d2 = dx * dx + dy * dy
          const ex = bx - cx, ey = by - cyy
          if (d2 < glow2 && ex * ex + ey * ey < clip2) { const g = Math.pow(Math.exp(-d2 / sig2), 1.5) * weight; if (g > glow) glow = g }
        }
        const depth = (z + 1) * 0.5
        const lum = Math.min(1, (0.25 + depth * 0.75) * (0.75 + tone[i] * 0.35)) * intro * (1 - bk * 0.6)
        const warm = Math.min(1, hot[i] * 0.2 + glow)
        const ci = Math.round(lum * LUM) * (WARM + 1) + Math.round(warm * WARM)
        const sq = Math.max(1, Math.round(sz[i] * dpr * (0.85 + depth * 0.45)))
        plot(Math.round(bx), Math.round(by), atm[i] ? (seed[i] < 0.3 ? 2 : 1) : sq, atm[i] ? paletteAtm[ci] : palette[ci])
      }

      // logo 3D ở tâm: xoay cùng thao tác kéo, màu thật của logo, sáng tối theo độ sâu
      const LR = R * 0.72
      // logo đứng yên, chỉ xoay theo thao tác kéo chuột của người dùng
      const lyaw = userYaw
      const lca = Math.cos(lyaw), lsa = Math.sin(lyaw), lct = Math.cos(userPitch), lst = Math.sin(userPitch)
      for (let i = 0; i < LN; i++) {
        const lx = lpos[i * 3], ly = lpos[i * 3 + 1], lz = lpos[i * 3 + 2]
        const x3 = lx * lca + lz * lsa
        const z2 = -lx * lsa + lz * lca
        const y3 = ly * lct - z2 * lst
        const pz = ly * lst + z2 * lct
        const lper = 1
        const spread = 1 + bk * (3 + (i % 7) * 0.5)
        let bx = cx + x3 * LR * lper * spread, by = cyy + y3 * LR * lper * spread
        for (let r = 0; r < rlen; r++) {
          const dx = bx - rx[r], dy = by - ry[r]
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          const k = (d - rwave[r]) / wave
          if (k > 3 || k < -3) continue
          const amp = Math.exp(-k * k) * rfade[r]
          if (amp > 0.02) { bx += (dx / d) * amp * 14 * dpr; by += (dy / d) * amp * 14 * dpr }
        }
        const dep = Math.max(0, Math.min(1, (pz + DEPTH) / (DEPTH * 2)))
        const tw = 0
        const lv = Math.max(0, Math.min(3, Math.round(dep * 2.6 + tw * 0.5)))
        let col = logoColor[lwall[i] * 4 + lv]
        const sq = Math.max(2, Math.round(1.7 * dpr))
        if (wOn) {
          // con trỏ có trọng lượng: logo bị kéo nhẹ về phía con trỏ như bị đè xuống, và ngả cam mềm quanh con trỏ
          const dx = wx - bx, dy = wy - by
          const d2 = dx * dx + dy * dy
          if (d2 < reach2) {
            const g = Math.exp(-d2 / sig2) * weight
            bx += dx * 0.08 * g; by += dy * 0.08 * g + 2 * dpr * g
            const q = Math.min(1, Math.pow(g, 1.5) * 1.1) * 0.8
            const ca = col & 255, cg = (col >>> 8) & 255, cb = (col >>> 16) & 255, al = col >>> 24
            col = (((Math.round(al + (255 - al) * q * 0.3)) << 24) | (Math.round(cb + (8 - cb) * q) << 16) | (Math.round(cg + (78 - cg) * q) << 8) | Math.round(ca + (255 - ca) * q)) >>> 0
          }
        }
        plot(Math.round(bx), Math.round(by), sq, col)
      }
      ctx.putImageData(img, 0, 0)
      if (wOn) {
        const gr = ctx.createRadialGradient(wx, wy, 0, wx, wy, sigma * 1.9)
        const a0 = 0.26 * weight
        gr.addColorStop(0, `rgba(255,96,24,${a0})`)
        gr.addColorStop(0.18, `rgba(255,110,40,${a0 * 0.62})`)
        gr.addColorStop(0.42, `rgba(255,130,70,${a0 * 0.26})`)
        gr.addColorStop(0.7, `rgba(255,150,100,${a0 * 0.07})`)
        gr.addColorStop(1, 'rgba(255,160,110,0)')
        ctx.save()
        ctx.beginPath(); ctx.arc(cx, cyy, R * 1.04, 0, Math.PI * 2); ctx.clip()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = gr
        ctx.fillRect(wx - sigma * 1.9, wy - sigma * 1.9, sigma * 3.8, sigma * 3.8)
        ctx.restore()
      }

      // sparkle
      if (sparks.length) {
        const sp = new Path2D()
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i]
          s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96; s.life -= 0.022
          if (s.life <= 0) { sparks.splice(i, 1); continue }
          const q = Math.max(1, Math.round((1 + s.life * 2) * dpr))
          sp.rect(Math.round(s.x), Math.round(s.y), q, q)
        }
        ctx.shadowColor = 'rgba(255,78,8,0.9)'; ctx.shadowBlur = 8 * dpr
        ctx.fillStyle = 'rgba(255,92,20,0.95)'; ctx.fill(sp)
        ctx.shadowBlur = 0
      }
      const w = window as unknown as { __sphereMs?: number }
      w.__sphereMs = (w.__sphereMs ?? 0) * 0.9 + (performance.now() - tStart) * 0.1
      raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0
    }
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw) }
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting)
      if (visible) start()
    }, { threshold: 0 })
    io?.observe(cv)
    document.addEventListener('visibilitychange', start)
    start()
    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
      document.removeEventListener('visibilitychange', start)
      introTimers.forEach(clearTimeout)
      window.removeEventListener('resize', resize); window.removeEventListener('fme-theme', paintLogo)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.removeEventListener('pointerleave', leave)
      window.removeEventListener('pointerdown', dragStart); window.removeEventListener('pointerdown', dragStart2); window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragEnd)
    }
  }, [cy, radius, progress, burstRef, spin])

  return <canvas ref={ref} className={`h-full w-full ${className}`} />
}
