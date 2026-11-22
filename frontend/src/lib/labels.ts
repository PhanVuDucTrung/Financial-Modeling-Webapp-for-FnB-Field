import { money, num, pct } from './format'

/** Nhãn tiếng Việt và cách hiển thị cho các trường AI được phép điền */
const L: Record<string, { label: string; kind?: 'pct' | 'money' }> = {
  'meta.name': { label: 'Tên dự án' }, 'meta.district': { label: 'Khu vực' }, 'meta.format': { label: 'Mô hình' },
  'site.totalArea': { label: 'Tổng diện tích sàn (m²)' }, 'site.kitchenArea': { label: 'Bếp và quầy bar (m²)' }, 'site.areaPerSeat': { label: 'Diện tích mỗi chỗ ngồi (m²)' },
  'site.leaseYears': { label: 'Thời hạn thuê (năm)' }, 'site.avgStayMinutes': { label: 'Thời gian khách ngồi (phút)' },
  'demand.seatTurnover': { label: 'Vòng quay ghế' }, 'demand.aov': { label: 'AOV', kind: 'money' },
  'ramp.months': { label: 'Ramp-up (tháng)' }, 'ramp.startPct': { label: 'Doanh thu tháng đầu', kind: 'pct' },
  'pnl.cogsPct': { label: 'COGS', kind: 'pct' }, 'pnl.laborPct': { label: 'Nhân công', kind: 'pct' }, 'pnl.marketingPct': { label: 'Marketing', kind: 'pct' },
  'pnl.utilitiesPct': { label: 'Điện nước, dịch vụ', kind: 'pct' }, 'pnl.otherPct': { label: 'Chi phí khác', kind: 'pct' },
  'rent.perM2': { label: 'Giá thuê mỗi m²', kind: 'money' }, 'rent.pctSales': { label: 'Thuê theo % doanh thu', kind: 'pct' },
  'capex.constructionPerM2': { label: 'Xây dựng mỗi m²', kind: 'money' }, 'capex.fixedAssets': { label: 'Tài sản cố định', kind: 'money' },
  'capex.tools': { label: 'Công cụ dụng cụ', kind: 'money' }, 'capex.preOpening': { label: 'Chi phí tiền hoạt động', kind: 'money' },
  'capex.depositMonths': { label: 'Đặt cọc thuê (tháng)' }, 'finance.taxRate': { label: 'Thuế thu nhập', kind: 'pct' },
}

export function describePatch(patch: Record<string, number | string>): string {
  return Object.entries(patch)
    .map(([k, v]) => {
      const m = L[k]
      if (!m) return `${k}: ${v}`
      const val = typeof v === 'string' ? v : m.kind === 'pct' ? pct(v, 1) : m.kind === 'money' ? money(v) : num(v, 1)
      return `${m.label}: ${val}`
    })
    .join(', ')
}
