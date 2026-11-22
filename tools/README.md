# Công cụ kiểm tra giao diện

`shot.mjs` chụp màn hình app bằng Chrome không giao diện và có thể bấm qua các mục để chụp từng tab. Dùng để tự kiểm tra bố cục, chồng lấn nhãn biểu đồ, lỗi chạy.

Cài một lần (đặt ngoài thư mục dự án để không lẫn vào frontend):

```powershell
mkdir D:\Temp\shot; cd D:\Temp\shot
npm init -y; npm install puppeteer-core --cache D:\Temp
pm-cache
copy <đường dẫn dự án>	ools\shot.mjs .
```

Chạy (app đang chạy ở cổng 3000):

```powershell
node shot.mjs "http://localhost:3000/?phase=results" D:/Temp/shot/x_ 1920 1080 2200 '[{"wait":1500,"shot":"tong-quan"},{"click":"05Phân tích","exact":true,"wait":1200,"shot":"phan-tich"}]'
```

- `?phase=results` mở thẳng màn hình kết quả, bỏ qua trang nhập và hiệu ứng phân tích.
- Nút ở thanh trái có cả số thứ tự trong chữ, ví dụ `05Phân tích`.
- Ảnh được chụp sau khi chờ `wait` ms, nên đặt đủ dài để hiệu ứng chuyển trang kết thúc.
