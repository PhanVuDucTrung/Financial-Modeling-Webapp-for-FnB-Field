# Design system

Nền gần đen với ánh sáng cam, thẻ kính viền mảnh, chữ không chân. Token ở `frontend/src/index.css`; biểu đồ dùng cùng giá trị ở `frontend/src/theme.ts`. Đổi màu thì sửa cả hai file.

## Bảng màu gốc
| Màu | Hex | Dùng cho |
|---|---|---|
| Cam | #FF6D29 | Điều hướng, nút chính, số thứ tự, điểm nhấn |
| Nâu | #453027 | Ánh sáng nền (góc dưới phải) |
| Đen | #161316 | Nền |
| Xám | #BABABA | Chữ phụ |
| Trắng | #FFFFFF | Chữ chính |

Ngoài palette, ba màu ngữ nghĩa cho dữ liệu tài chính: xanh #46C98B (tốt), đỏ #F2555A (xấu), vàng #F5B63A (lưu ý). Số người dùng nhập có màu cam nhạt #FFA570.

## Chữ
Quicksand (có đủ dấu tiếng Việt), thay cho Neue Montreal của reference vì Neue Montreal là font trả phí. Tiêu đề lớn dùng lớp `grad-text` (trắng chuyển cam nhạt) với khoảng cách chữ âm.

## Luồng và chuyển động
- Trang nhập → màn hình phân tích (quả cầu hạt canvas, 6 bước) → không gian kết quả.
- Phần tử hiện dần khi cuộn (`Reveal`), số chạy khi giá trị đổi (`AnimatedNumber`), trang trượt lên khi đổi tab (`rise`), báo cáo trượt từ phải (`slide-left`). Tất cả tắt khi người dùng bật prefers-reduced-motion.

## Biểu đồ (IBCS)
- Tiêu đề nói rõ đo cái gì; dòng phụ ghi đơn vị và phạm vi. Một đơn vị thống nhất trong cùng trang.
- Màu chỉ mang nghĩa: trắng ngà = giá trị cơ sở; xanh = có lợi; đỏ = bất lợi; cam = điểm cần chú ý.
- Nhãn đặt trực tiếp trên dữ liệu; không lưới, không viền; trục giá trị ẩn khi đã có nhãn. Trục thể loại đặt ở mép dưới (`onZero: false`) để nhãn cột âm không đè tên cột.
- Dạng biểu đồ: cầu thang (P&L), đường (dòng tiền lũy kế, hòa vốn), cột (theo năm, kịch bản), thanh ngang xếp hạng (cơ cấu chi phí), tornado (độ nhạy), bảng nhiệt dạng bảng số.
- Chưa áp dụng: ký hiệu kịch bản IBCS (thực tế đặc, kế hoạch rỗng hoặc gạch chéo). Mọi số trong app là kế hoạch nên dùng cột đặc.


## Cập nhật 13/11/2026
- Font Quicksand toàn app (biểu đồ cũng dùng). Nền có ba vùng sáng trôi chậm (`.aurora`).
- Bố cục phẳng: khối nội dung chỉ có đường kẻ mảnh phía trên với đoạn cam ở đầu; chỉ số có vạch cam bên trái; ô nhập kiểu gạch chân; nút và thẻ bo góc nhỏ (4 đến 8 px). Kính lỏng chỉ dùng cho ô mô tả dự án và có vệt sáng theo chuột.
- Chart xếp hạng dùng thang cam giảm dần theo độ lớn (`rankColor` trong `theme.ts`); chênh lệch dùng xanh và đỏ. Cột dày hơn, nhãn đặt trực tiếp.
- Hòa vốn vẽ bằng đường lãi lỗ theo số khách mỗi ngày, cắt mốc 0 tại điểm hòa vốn, kèm thanh so sánh khách hòa vốn và kế hoạch.
- Màn hình chạy phân tích khoảng 2 giây, quả cầu hạt phản ứng với con trỏ.

## Cập nhật vòng 2 (13/11/2026)
- Không dùng đường kẻ hay viền để tách nội dung: khối `.sheet` chỉ có khoảng trắng và chấm cam cạnh tiêu đề, điều hướng dùng nền chuyển sắc và chấm sáng, bảng dùng nền xen kẽ.
- Thẻ chỉ số là `.tile` (nền chuyển sắc, vát một góc, quầng sáng theo màu trạng thái) kèm hình nhỏ `Ring`, `Spark`, `MiniBars` trong `components/ui.tsx`. Thanh đo là `Gauge`.
- Bảng dài (trên 7 hàng) có hàng tiêu đề dính khi cuộn qua bảng và tự nhả khi hết bảng (`.sticky-head`, biến `--sticky-top`).
- Chuyển nhóm trên trang Thông số: số thứ tự trượt vào, dải sáng quét qua tiêu đề, các ô nhập hiện lần lượt (`.sec-no`, `.sec-bar`, `.sec-body`).
- Mỗi mục kết quả có số lớn mờ trôi ở nền (`Ghost`), thẻ và biểu đồ hiện lần lượt (`.stagger`).
- Màn hình chạy phân tích: font JetBrains Mono, quy trình nằm ngang, bước đang chạy sáng và được gõ chữ, bước đã xong mờ xuống.
- Trợ lý AI là một khung hội thoại duy nhất, dùng lại kiểu kính lỏng của ô mô tả dự án.

## Cập nhật vòng 3: nền sáng (13/11/2026)
- Chuyển sang nền kem #F6F4EF, chữ #111, cam #FF6D29 là điểm nhấn duy nhất. Màu tốt, xấu, lưu ý đậm hơn để đủ tương phản trên nền sáng (`index.css` và `theme.ts` giữ khớp).
- Font: Be Vietnam Pro cho toàn app, Newsreader (serif, có nghiêng) cho tiêu đề lớn của trang Thông số, JetBrains Mono cho quy trình ở màn hình chạy phân tích.
- Nút chính là viên thuốc đen, chuyển cam khi rê chuột. Thẻ và bảng điều khiển bo 22 đến 26 px, bóng mềm, kính trắng mờ.
- Quả cầu hạt vẽ bằng chấm đen trên nền kem, dải xích đạo màu cam.

## Cập nhật vòng 4 (13/11/2026)
- Font UI đổi sang Plus Jakarta Sans (đủ dấu tiếng Việt), serif Newsreader cho tiêu đề lớn, tên nhóm, số KPI và kết luận lời khuyên (từ cuối nghiêng).
- Trang Thông số mở đầu bằng tiêu đề tiếng Anh, thẻ kính nổi (Payback, Break-even point, IRR, Sensitivity, AI Support) lấy số thật, quả cầu hạt đặc phản ứng với con trỏ (`ParticleSphere`, dùng chung với màn hình chạy phân tích).
- `PillNav`: menu kính lỏng chỉ có viền trên và dưới, viền chảy sang mục mới (bộ lọc gooey), chữ mục chọn in đậm.
- Kết quả chỉ có một thanh điều hướng bên trái, mục chọn mở ra các tab con; đầu trang chỉ còn tiêu đề serif.
- Thẻ KPI `.tile` là kính lỏng bo 16 px, chỉ viền trên sáng và viền dưới mờ, số serif, đơn vị nghiêng, vệt sáng quét qua khi rê chuột. Không còn hình minh họa nhỏ trong thẻ.
- Biểu đồ có nền trắng nổi (`.chart-surface`). Cơ cấu chi phí và cơ cấu vốn đầu tư dùng treemap.
