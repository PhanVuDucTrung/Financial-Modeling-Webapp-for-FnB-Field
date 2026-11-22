const FMT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
const nf = (_d = 2) => FMT
const nfMax = (_d = 2) => FMT

export const num = (x: number, d = 0) => (isFinite(x) ? nf(d).format(x) : 'n/a')

/** Tiền VND gọn: 1,05 tỷ / 63 tr / 80k */
export function money(x: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (x == null || !isFinite(x)) return 'n/a'
  const a = Math.abs(x)
  const s = x < 0 ? '-' : ''
  if (a >= 1e9) return `${s}${nf(2).format(a / 1e9)} tỷ VND`
  if (a >= 1e6) return `${s}${nf(a >= 1e8 ? 0 : 1).format(a / 1e6)} triệu VND`
  if (a >= 1e4 || opts.compact) return `${s}${nfMax(a >= 1e5 ? 0 : 1).format(a / 1e3)}k`
  return `${s}${nf(0).format(a)} đ`
}

/** Triệu đồng, dùng cho trục biểu đồ và bảng */
export const mn = (x: number, d = 0) => num(x / 1e6, d)

export const pct = (x: number | null | undefined, d = 0) =>
  x == null || !isFinite(x) ? 'n/a' : `${nf(d).format(x * 100)}%`

export const months = (x: number | null | undefined) =>
  x == null || !isFinite(x) ? 'Chưa hoàn vốn' : `${nf(x < 10 ? 1 : 0).format(x)} tháng`

/** Tiêu đề kể chuyện cho biểu đồ dòng tiền lũy kế */
export const cumTitle = (m: number | null) =>
  m == null ? 'Cash does not recover the capital within the lease (triệu VND)' : `Payback arrives in month ${Math.ceil(m)} (triệu VND)`
