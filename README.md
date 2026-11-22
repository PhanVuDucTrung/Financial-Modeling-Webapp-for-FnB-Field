# Financial Model for Enterprise

Webapp demo cho quảng cáo khóa AI Productivity: mô phỏng tài chính một quán cà phê specialty ở TP.HCM (mặc định Bình Thạnh), dựa trên `File Ref/Financial Model 1.xlsx` (model 1, module 4 PBM).
Toàn bộ dữ liệu là **giả lập**, không phải số của quán thật.

## Chạy

Lần đầu:

```powershell
# Backend
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install
```

Các lần sau, chạy `.\start.ps1` (mở 2 cửa sổ: backend cổng 8000, frontend cổng 3000), rồi vào http://127.0.0.1:3000

AI dùng lệnh `claude` đã đăng nhập sẵn trên máy (Claude Code), model `claude-sonnet-5-5`, effort `medium`; **không cần API key**. Nếu máy không có `claude` hoặc gọi lỗi, các chức năng AI rơi về chế độ dự phòng offline (có nhãn rõ trên giao diện). Muốn dùng API key thay thế thì xem `backend/.env.example`.

## Bảo mật

- Trình duyệt chỉ gọi `/api/...`; backend mới là nơi gọi Claude. Nếu dùng API key (tùy chọn) thì key chỉ nằm trong `backend/.env` (đã `.gitignore`), không endpoint nào trả key.
- Lệnh `claude` được chạy ở thư mục trống `backend/.ai-cwd`, không bật công cụ, không lưu phiên, nên không đọc file nào của máy bạn.
- Backend lắng nghe `127.0.0.1` và CORS chỉ cho phép localhost.

## Luồng sử dụng

1. **Trang nhập** (cuộn dài): mô tả dự án bằng một câu cho AI điền, rồi nhập giả định theo 6 nhóm. Cột phải cập nhật tóm tắt ngay khi nhập.
2. **Chạy phân tích**: màn hình chuyển tiếp có quả cầu hạt chuyển động.
3. **Kết quả**: thanh trái có 6 mục (Tổng quan, Giả định, Tài chính, Vận hành, Phân tích, Kế hoạch, Trợ lý AI), sub tab ở thanh trên. Nút "Xem phân tích chi tiết" mở báo cáo giải thích lời khuyên.

## Cấu trúc

```
backend/   FastAPI: lưu dự án thành .xlsx, gọi Claude (Sonnet 5.5, effort medium), xuất báo cáo Excel
frontend/  React + Vite + TypeScript + Tailwind + ECharts
  src/engine/   lõi tính toán thuần TypeScript (model, analysis, advisory) + test đối chiếu Excel gốc
  src/pages/    InputPage, RunScreen, Workspace
  src/views/    mỗi mục điều hướng một file; AdvisoryReport là báo cáo lời khuyên
  src/index.css design tokens (palette, font, chuyển động)
docs/      design-system.md
tools/     shot.mjs chụp màn hình để tự kiểm tra giao diện
File Ref/  file Excel tham chiếu
```

## Lõi tính toán

`frontend/src/engine/model.ts` tái hiện logic của file Excel gốc. Test `model.test.ts` nhập đúng số của file gốc và khớp: payback 17,71 tháng, IRR 58,56%, hòa vốn 130,9 khách/ngày.
Khác file gốc (có chủ đích): lãi vay tính 1 lần, thêm ramp-up, thuế, đặt cọc thuê, payback theo dòng tiền lũy kế, nhân công bottom-up, công suất lấp đầy.

Chạy test: `cd frontend; node node_modules/vitest/vitest.mjs run` và `cd backend; .venv\Scripts\python.exe -X utf8 -m pytest tests -q`

## Lưu ý máy này

Ổ C: đang đầy. Khi cài npm/pip, đặt `TEMP`/`TMP` và cache sang ổ D:.
