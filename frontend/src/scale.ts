/**
 * Co giãn giao diện theo màn hình để máy nào nhìn cũng giống bản thiết kế.
 * Giao diện được dàn ở khung chuẩn REF_W x REF_H (CSS px). Màn nhỏ hơn thì thu nhỏ, lớn hơn thì phóng to
 * bằng thuộc tính CSS zoom trên thẻ html. Gần chuẩn (lệch dưới 5%) thì giữ nguyên, không zoom.
 *
 * Khi zoom, đơn vị vw/vh của trình duyệt cũng bị nhân theo, nên CSS dùng --vw/--vh (px đã quy đổi) thay cho vw/vh.
 * getBoundingClientRect và clientX trả về toạ độ nhìn thấy (đã nhân zoom) còn clientWidth, scrollTop là toạ độ cục bộ,
 * nên code tính toạ độ chuột hoặc vị trí phải chia cho uiScale().
 */
export const REF_W = 1600
export const REF_H = 880

let scale = 1
export const uiScale = () => scale

export function computeScale(w: number, h: number) {
  const s = Math.min(w / REF_W, h / REF_H)
  const c = Math.max(0.6, Math.min(1.8, s))
  return Math.abs(c - 1) < 0.05 ? 1 : c
}

export function initScale() {
  const root = document.documentElement
  const apply = () => {
    scale = computeScale(window.innerWidth, window.innerHeight)
    root.style.zoom = scale === 1 ? '' : String(scale)
    root.style.setProperty('--vw', `${window.innerWidth / scale / 100}px`)
    root.style.setProperty('--vh', `${window.innerHeight / scale / 100}px`)
    window.dispatchEvent(new Event('ui-scale'))
  }
  apply()
  window.addEventListener('resize', apply)
}
