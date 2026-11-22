/** Nguồn và độ tin cậy của các giả định trong preset cà phê Bình Thạnh. Research ngày 13/11/2026. */
export type Confidence = 'cao' | 'trung bình' | 'thấp'

export interface Assumption {
  key: string
  label: string
  value: string
  confidence: Confidence
  note: string
  sources: { title: string; url: string }[]
}

export const assumptions: Assumption[] = [
  {
    key: 'rent',
    label: 'Giá thuê 450.000 đ/m²/tháng (~38 triệu cho 85 m²)',
    value: '450.000 đ/m²',
    confidence: 'trung bình',
    note: 'Tin rao mặt bằng cafe Bình Thạnh khoảng 20 đến 80 triệu/tháng tùy vị trí và diện tích, đây là giá rao, chưa phải giá ký thực tế. Tiền thuê khoảng 14% doanh thu, thấp hơn mức 18% Milano Coffee nêu và trong khoảng khuyến nghị ≤15 đến 20%.',
    sources: [
      { title: 'Mogi - mặt bằng cafe Bình Thạnh', url: 'https://mogi.vn/ho-chi-minh/quan-binh-thanh/thue-mat-bang-cua-hang-shop-cafe-do-uong' },
      { title: 'Doanh Nhân Plus - chi phí mặt bằng ~18% doanh thu', url: 'https://doanhnhan.baophapluat.vn/ly-ca-phe-cong-bao-nhieu-chi-phi-mat-bang-52231.html' },
    ],
  },
  {
    key: 'aov',
    label: 'AOV 60.000 đ',
    value: '60.000 đ',
    confidence: 'trung bình',
    note: 'Giá một ly specialty ở trung tâm phổ biến 70.000 đến 100.000 đ (Znews 10/2026). AOV là mức chi trung bình của một khách, chưa có số liệu khảo sát nên đặt ở mức ly đồ uống kèm một phần nhỏ.',
    sources: [{ title: 'Znews - ly cà phê giá 100.000 đồng', url: 'https://znews.vn/ly-ca-phe-gia-100000-dong-tro-nen-binh-thuong-tu-khi-nao-post1687716.html' }],
  },
  {
    key: 'capex',
    label: 'Vốn đầu tư ~0,81 tỷ (gồm đặt cọc 3 tháng)',
    value: '~0,81 tỷ',
    confidence: 'trung bình',
    note: 'Các bài tham khảo cho quán 85 đến 100 m²: 350 triệu (phổ thông) đến 500 đến 800 triệu trở lên (specialty), máy pha espresso 50 đến 200 triệu. Preset cao hơn vì tính cả đặt cọc, tiền hoạt động và máy pha cấp specialty.',
    sources: [
      { title: 'H3 Group - chi phí mở quán cafe 100m²', url: 'https://h3group.com.vn/tu-van-quan-cafe/chi-phi-mo-quan-cafe-100m2/' },
      { title: 'Barista Skills - quán cafe 100m²', url: 'https://baristaskills.com.vn/chi-phi-mo-quan-cafe-100m2/' },
    ],
  },
  {
    key: 'salary',
    label: 'Lương: barista 7,5 triệu, quản lý 12 triệu...',
    value: '5 đến 12 triệu',
    confidence: 'trung bình',
    note: 'Lấy từ các tin tuyển dụng: barista 7 đến 9 triệu (10 đến 15 triệu nếu có kinh nghiệm), quản lý cafe 13 đến 15 triệu. Đây là lương ghi trên tin đăng, không phải thống kê chính thức. Lương phục vụ và tạp vụ là ước lượng.',
    sources: [
      { title: '123job - barista Quận 1', url: 'https://123job.vn/viec-lam/nhan-vien-pha-che-barista-fulltime-quan-1-di-lam-ngay-4qQ4Q3gLrX' },
      { title: 'Jobsgo - quản lý cửa hàng cafe', url: 'https://jobsgo.vn/viec-lam/quan-ly-cua-hang-cafe-28183472501.html' },
    ],
  },
  {
    key: 'oncost',
    label: 'Chi phí doanh nghiệp đóng thêm 20% lương',
    value: '20%',
    confidence: 'trung bình',
    note: 'Tỷ lệ doanh nghiệp đóng BHXH, BHYT, BHTN là 21,5% quỹ lương đóng bảo hiểm. Preset dùng 20% vì giả định một phần nhân viên làm part-time hoặc đóng theo mức lương thấp hơn. AI giúp tra nhanh, người có chuyên môn phải kiểm lại với văn bản gốc.',
    sources: [
      { title: 'Luật Việt Nam - mức đóng BHXH 2026', url: 'https://luatvietnam.vn/bao-hiem/tu-2026-muc-dong-bhxh-bhyt-bhtn-cua-nld-va-nsdld-duoc-tinh-nhu-the-nao-563-106906-article.html' },
      { title: 'Lương tối thiểu vùng I TP.HCM 2026: 5.310.000 đ (NĐ 293/2025/NĐ-CP)', url: 'https://thuvienphapluat.vn/lao-dong-tien-luong/muc-luong-toi-thieu-vung-tphcm-2026-la-bao-nhieu-54051.html' },
    ],
  },
  {
    key: 'cogs',
    label: 'COGS 30% doanh thu',
    value: '30%',
    confidence: 'thấp',
    note: 'Không tìm được benchmark COGS cho quán cà phê Việt Nam. Tham chiếu nước ngoài: ≤30% (Mỹ), khoảng 38% thực phẩm và đồ uống (Úc). Hạt specialty sỉ 450.000 đến 750.000 đ/kg. Người dùng nên thay bằng công thức pha chế thực tế của mình.',
    sources: [
      { title: 'Texas Coffee School - COGS', url: 'https://texascoffeeschool.com/managing-coffee-shop-costs-of-goods-sold-and-labor/' },
      { title: 'True Cafe - giá hạt sỉ 2026', url: 'https://truecafe.vn/phat-trien-diem-ban/gia-ca-phe-hat-si-cho-quan-2026/' },
    ],
  },
  {
    key: 'payback',
    label: 'Ngưỡng payback "tốt" ≤ 24 tháng',
    value: '24 tháng',
    confidence: 'thấp',
    note: 'Các nguồn ước tính hoàn vốn cafe tầm trung 18 đến 30 tháng, nhưng có nguồn nêu ngắn hơn nhiều; hai nguồn chênh lệch rõ. Ngưỡng này chỉ là quy ước của công cụ, cho phép chỉnh.',
    sources: [{ title: 'Sapo - chi phí mở quán cafe', url: 'https://www.sapo.vn/blog/mo-quan-cafe-can-bao-nhieu-von' }],
  },
  {
    key: 'turnover',
    label: 'Vòng quay ghế 3,5 lần/ngày, ramp-up 5 tháng',
    value: '3,5 lần/ngày',
    confidence: 'thấp',
    note: 'Không có số liệu công khai về vòng quay ghế hay lượt khách quán 85 đến 100 m². Đây là giả định cho demo, thay bằng quan sát thực tế (đếm khách quán tương tự quanh khu vực).',
    sources: [],
  },
]
