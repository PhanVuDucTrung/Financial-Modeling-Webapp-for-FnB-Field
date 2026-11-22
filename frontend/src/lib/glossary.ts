/** Giải thích ngắn các thuật ngữ dễ gây khó hiểu. Khóa là cụm gặp trong nhãn; dài trước, ngắn sau để khớp đúng cụm dài nhất. */
export const GLOSSARY: [string, string][] = [
  ['Dòng tiền hoạt động', 'Tiền còn lại sau khi trừ mọi chi phí vận hành, chưa tính khấu hao, lãi vay và thuế. Gần với EBITDA.'],
  ['Tỷ lệ chiết khấu', 'Mức lãi kỳ vọng mỗi năm, dùng để quy tiền của tương lai về giá trị hôm nay khi tính NPV.'],
  ['Chi phí biến đổi', 'Chi phí tăng giảm theo số khách, ví dụ nguyên liệu. Khách càng đông, khoản này càng lớn.'],
  ['Chi phí cố định', 'Chi phí gần như không đổi dù đông hay vắng khách, ví dụ tiền thuê và lương cố định.'],
  ['Khách tối thiểu', 'Số khách mỗi ngày vừa đủ để doanh thu bù hết chi phí, dưới mức này là lỗ.'],
  ['Số giờ cao điểm', 'Số giờ trong ngày mà khách dồn đông nhất, thường quanh giờ ăn trưa và tối.'],
  ['giờ cao điểm', 'Những giờ khách dồn đông nhất trong ngày. Quán dễ quá tải nhất ở các giờ này.'],
  ['Biên đóng góp', 'Phần doanh thu còn lại sau khi trừ chi phí biến đổi, dùng để bù chi phí cố định rồi mới ra lãi.'],
  ['Biên an toàn', 'Doanh thu có thể giảm bao nhiêu phần trăm so với kế hoạch trước khi bắt đầu lỗ. Càng cao càng an toàn.'],
  ['Vòng quay ghế', 'Mỗi chỗ ngồi được khách dùng bao nhiêu lượt trong một ngày.'],
  ['Hòa vốn', 'Mức khách hoặc doanh thu mà tại đó lợi nhuận đúng bằng 0, chưa lãi cũng chưa lỗ.'],
  ['Break-even', 'Mức khách hoặc doanh thu mà tại đó lợi nhuận đúng bằng 0, chưa lãi cũng chưa lỗ.'],
  ['Hoàn vốn', 'Sau bao lâu thì tổng tiền thu về bằng số vốn đã bỏ ra ban đầu.'],
  ['Payback', 'Thời gian hoàn vốn: sau bao lâu thì tổng tiền thu về bằng số vốn đã bỏ ra ban đầu.'],
  ['Ramp-up', 'Giai đoạn đầu khi quán mới mở, doanh thu tăng dần từ mức thấp lên mức ổn định.'],
  ['Khấu hao', 'Chia đều giá trị thiết bị và công trình ra các tháng sử dụng, để chi phí không dồn vào một lần.'],
  ['Công suất', 'Tỷ lệ chỗ ngồi có khách so với tổng số chỗ. Trên 90% là dễ quá tải.'],
  ['EBITDA', 'Lợi nhuận trước lãi vay, thuế và khấu hao. Cho biết bản thân hoạt động bán hàng có lãi hay không.'],
  ['Capex', 'Vốn đầu tư ban đầu: tiền xây dựng, mua thiết bị và đặt cọc trước khi mở cửa.'],
  ['COGS', 'Giá vốn hàng bán: chi phí nguyên vật liệu trực tiếp để làm ra món bán ra.'],
  ['AOV', 'Giá trị đơn trung bình: số tiền trung bình một lượt khách chi mỗi lần.'],
  ['NPV', 'Giá trị hiện tại ròng: tổng tiền thu về trong tương lai quy về hôm nay, trừ vốn đầu tư. Dương nghĩa là đáng đầu tư.'],
  ['IRR', 'Tỷ suất hoàn vốn nội bộ: mức lãi trung bình mỗi năm mà khoản đầu tư tạo ra. Càng cao càng tốt.'],
]

/** Tìm thuật ngữ đầu tiên trong chuỗi, trả về vị trí kết thúc và lời giải thích. Không phân biệt hoa thường. */
export function findTerm(text: string): { end: number; hint: string } | null {
  const low = text.toLowerCase()
  let best: { end: number; start: number; hint: string } | null = null
  for (const [k, hint] of GLOSSARY) {
    const at = low.indexOf(k.toLowerCase())
    if (at < 0) continue
    if (!best || at < best.start) best = { start: at, end: at + k.length, hint }
  }
  return best
}
