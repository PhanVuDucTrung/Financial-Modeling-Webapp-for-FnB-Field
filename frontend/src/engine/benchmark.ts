import type { Inputs, Results } from './types'

/**
 * Khoảng tham chiếu cho quán cà phê specialty (tỷ lệ trên doanh thu). Đây là khoảng THAM KHẢO tổng hợp từ nguồn công khai
 * (xem assumptions.ts), độ tin cậy thấp đến trung bình. Không lấy từ dữ liệu nội bộ của chuỗi nào.
 */
export interface BenchRow {
  key: string
  label: string
  value: number
  low: number
  high: number
  status: 'low' | 'ok' | 'high'
  hint: string
  confidence: 'trung bình' | 'thấp'
}

const refs = [
  { key: 'cogs', label: 'COGS (giá vốn)', low: 0.28, high: 0.35, conf: 'thấp' as const, hint: 'Tham chiếu nước ngoài ≤30 đến 38%, nên thay bằng công thức pha chế thực tế.' },
  { key: 'labor', label: 'Nhân công', low: 0.22, high: 0.3, conf: 'thấp' as const, hint: 'Khoảng 21 đến 35% theo benchmark nước ngoài.' },
  { key: 'rent', label: 'Thuê mặt bằng', low: 0.1, high: 0.18, conf: 'trung bình' as const, hint: 'Chuỗi cà phê trong nước nêu khoảng 18% doanh thu, khuyến nghị tối đa 15 đến 20%.' },
  { key: 'utilities', label: 'Điện nước, dịch vụ', low: 0.03, high: 0.06, conf: 'thấp' as const, hint: 'Quán có máy lạnh và máy pha thường ở khoảng này.' },
  { key: 'marketing', label: 'Marketing', low: 0.02, high: 0.05, conf: 'thấp' as const, hint: 'Quán mới thường cao hơn trong 6 tháng đầu.' },
]

export function costPct(i: Inputs, r: Results) {
  const rev = r.monthly.revenue || 1
  const line = (k: string) => r.pnl.find((l) => l.key === k)?.amount ?? 0
  return {
    cogs: i.pnl.cogsPct,
    labor: line('labor') / rev,
    rent: line('rent') / rev,
    utilities: i.pnl.utilitiesPct,
    marketing: i.pnl.marketingPct,
  } as Record<string, number>
}

export function benchmark(i: Inputs, r: Results): BenchRow[] {
  const v = costPct(i, r)
  return refs.map((x) => ({
    key: x.key,
    label: x.label,
    value: v[x.key],
    low: x.low,
    high: x.high,
    status: v[x.key] > x.high ? 'high' : v[x.key] < x.low ? 'low' : 'ok',
    hint: x.hint,
    confidence: x.conf,
  }))
}
