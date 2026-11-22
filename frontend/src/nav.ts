/**
 * Cấu trúc điều hướng của phần kết quả, xếp theo mạch quyết định:
 * kết luận, vận hành, tài chính, phân tích rủi ro, lập kế hoạch ngược, hỏi đáp.
 * Giả định chỉ nhập ở trang Thông số, không lặp lại ở đây.
 */
export const NAV = [
  { id: 'overview', no: '01', label: 'Tổng quan', tabs: [{ id: 'summary', label: 'Kết luận' }] },
  { id: 'ops', no: '02', label: 'Vận hành', tabs: [{ id: 'capacity', label: 'Công suất' }, { id: 'staff', label: 'Nhân sự' }] },
  {
    id: 'finance', no: '03', label: 'Tài chính',
    tabs: [{ id: 'capex', label: 'Vốn đầu tư' }, { id: 'pnl', label: 'Lãi lỗ' }, { id: 'breakeven', label: 'Hòa vốn' }, { id: 'cash', label: 'Dòng tiền' }],
  },
  { id: 'analysis', no: '04', label: 'Phân tích', tabs: [{ id: 'sens', label: 'Độ nhạy' }, { id: 'scen', label: 'Kịch bản' }, { id: 'bench', label: 'So sánh ngành' }] },
  { id: 'plan', no: '05', label: 'Kế hoạch', tabs: [{ id: 'budget', label: 'Theo vốn' }, { id: 'goal', label: 'Theo mục tiêu' }] },
  { id: 'ai', no: '06', label: 'Trợ lý AI', tabs: [{ id: 'chat', label: 'Hỏi đáp' }] },
] as const

export type SectionId = (typeof NAV)[number]['id']
