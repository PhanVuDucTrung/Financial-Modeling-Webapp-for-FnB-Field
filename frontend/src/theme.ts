/** Màu dùng trong biểu đồ (canvas không đọc được CSS token). Giữ khớp với src/index.css. */
const LIGHT = {
  bg: '#f6f4ef',
  surface: '#fbfaf7',
  raised: '#ffffff',
  line: '#e3dfd5',
  ink: '#111111',
  muted: '#5f5a52',
  dim: '#8a857d',
  accent: '#ff6d29',
  good: '#1f9d63',
  bad: '#d93a3f',
  warn: '#c98a0a',
  /** IBCS: giá trị cơ sở, không mang nghĩa tốt hay xấu */
  neutral: '#1b1917',
  /** IBCS: so sánh, đối chiếu (xám) */
  grey: '#9a958c',
  axis: '#cfc9bd',
  grid: 'rgba(0,0,0,0.07)',
  font: 'Plus Jakarta Sans Variable, Plus Jakarta Sans, sans-serif',
}
const DARK: typeof LIGHT = {
  ...LIGHT,
  bg: '#14131a',
  surface: '#1a1922',
  raised: '#211f2b',
  line: '#34313f',
  ink: '#f3f1ec',
  muted: '#b4afa6',
  dim: '#8b8678',
  good: '#34c98a',
  bad: '#f0686c',
  warn: '#e6a72e',
  neutral: '#e9e5dc',
  grey: '#7d7889',
  axis: '#4a4658',
  grid: 'rgba(255,255,255,0.08)',
}
/** Bảng màu biểu đồ đang dùng. Đổi chế độ sáng tối bằng applyChartTheme rồi vẽ lại biểu đồ. */
export const T: typeof LIGHT = { ...LIGHT }
export function applyChartTheme(dark: boolean) { Object.assign(T, dark ? DARK : LIGHT) }

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** Nội suy màu giữa hai mã hex, t từ 0 đến 1 */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b)
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, t)))).join(',')})`
}

/** Thang cam giảm dần: lớn nhất cam đậm, nhỏ nhất nhạt dần về màu kem */
export const rankColor = (ratio: number) => mix('#f2cbb6', '#ff6d29', Math.pow(ratio, 0.8))
