import type { Inputs } from './types'

/** Các lỗi nhập liệu làm kết quả vô nghĩa (ví dụ diện tích sàn nhỏ hơn diện tích bếp thì không còn chỗ ngồi). Trả về danh sách câu cảnh báo tiếng Việt. */
export function validateInputs(i: Inputs): string[] {
  const w: string[] = []
  const seats = (i.site.totalArea - i.site.kitchenArea) / Math.max(i.site.areaPerSeat, 0.1)
  if (i.site.totalArea <= i.site.kitchenArea) w.push('Diện tích sàn phải lớn hơn diện tích bếp và quầy bar, nếu không không còn chỗ ngồi.')
  else if (seats < 1) w.push('Diện tích còn lại sau bếp chưa đủ cho một chỗ ngồi.')
  if (i.demand.seatTurnover <= 0) w.push('Vòng quay ghế phải lớn hơn 0.')
  if (i.demand.aov <= 0) w.push('AOV phải lớn hơn 0.')
  if (i.site.daysPerMonth <= 0) w.push('Số ngày bán mỗi tháng phải lớn hơn 0.')
  if (i.site.leaseYears < 1) w.push('Thời hạn thuê phải từ 1 năm.')
  return w
}
