"""Xuất báo cáo Excel từ kết quả mà frontend đã tính. Quy ước: font Quicksand, không kẻ đường ngoài bảng, không freeze panes, cột đủ rộng."""
from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

FONT = "Quicksand"
INK = "1F2937"
MUTED = "6B7280"
HEAD_FILL = PatternFill("solid", fgColor=INK)

VND = '#,##0;[Red]-#,##0'
PCT = "0.0%"


def _f(bold=False, color=INK, size=11):
    return Font(name=FONT, bold=bold, color=color, size=size)


def _fit(ws, minimum=12, maximum=60):
    widths: dict[int, int] = {}
    for row in ws.iter_rows():
        for c in row:
            if c.value is None:
                continue
            text = str(c.value) if not isinstance(c.value, float) else f"{c.value:,.0f}"
            widths[c.column] = max(widths.get(c.column, 0), len(text))
    for col, w in widths.items():
        ws.column_dimensions[get_column_letter(col)].width = min(max(w + 4, minimum), maximum)


def _title(ws, title: str, subtitle: str) -> None:
    ws["B2"] = title
    ws["B2"].font = _f(True, INK, 16)
    ws["B3"] = subtitle
    ws["B3"].font = _f(False, INK, 11)  # subtitle cùng màu với title
    ws.sheet_view.showGridLines = False


def _head(ws, row: int, labels: list[str], start_col: int = 2) -> None:
    for i, t in enumerate(labels):
        c = ws.cell(row=row, column=start_col + i, value=t)
        c.font = _f(True, "FFFFFF")
        c.fill = HEAD_FILL
        c.alignment = Alignment(horizontal="left" if i == 0 else "right")


def build_report(inputs: dict, results: dict, advice: dict | None = None) -> bytes:
    wb = Workbook()
    meta = inputs.get("meta", {})
    sub = f"{meta.get('format', '')} - {meta.get('district', '')}. Dữ liệu giả lập phục vụ demo."

    # ---- Tổng quan ----
    ws = wb.active
    ws.title = "Tổng quan"
    _title(ws, meta.get("name", "Báo cáo mô phỏng"), sub)
    v = results.get("verdict", {})
    ws["B5"], ws["C5"] = "Lời khuyên", v.get("label", "")
    ws["B5"].font, ws["C5"].font = _f(True), _f(True)
    r = 6
    for reason in v.get("reasons", []):
        ws.cell(row=r, column=3, value=reason).font = _f(False, MUTED)
        r += 1
    r += 1
    _head(ws, r, ["Chỉ số", "Giá trị"])
    kpis: list[tuple[str, Any, str]] = [
        ("Vốn đầu tư (VND)", results.get("capexTotal"), VND),
        ("Doanh thu/tháng (VND)", results.get("monthly", {}).get("revenue"), VND),
        ("Dòng tiền hoạt động (CM)/tháng (VND)", results.get("monthly", {}).get("cm"), VND),
        ("Lợi nhuận trước thuế (UC)/tháng (VND)", results.get("monthly", {}).get("uc"), VND),
        ("Payback đơn giản (tháng)", results.get("paybackSimple"), "0.0"),
        ("Payback theo dòng tiền lũy kế (tháng)", results.get("paybackCumulative"), "0.0"),
        ("IRR (năm)", results.get("irr"), PCT),
        ("NPV (VND)", results.get("npv"), VND),
        ("Doanh thu hòa vốn/tháng (VND)", results.get("breakEvenRevenue"), VND),
        ("Khách hòa vốn/ngày", results.get("breakEvenCovers"), "0"),
        ("Biên an toàn", results.get("marginOfSafety"), PCT),
        ("Lượt khách kế hoạch/ngày", results.get("operation", {}).get("coversPerDay"), "0"),
    ]
    for label, val, fmt in kpis:
        r += 1
        ws.cell(row=r, column=2, value=label).font = _f()
        c = ws.cell(row=r, column=3, value=val if val is not None else "n/a")
        c.font, c.number_format = _f(True), fmt
        c.alignment = Alignment(horizontal="right")
    if advice:
        r += 2
        ws.cell(row=r, column=2, value="Nhận xét của AI").font = _f(True)
        for key, title in (("headline", "Kết luận"), ("strengths", "Điểm mạnh"), ("risks", "Rủi ro"), ("actions", "Nên làm")):
            val = advice.get(key)
            if not val:
                continue
            items = val if isinstance(val, list) else [val]
            for it in items:
                r += 1
                ws.cell(row=r, column=2, value=title).font = _f(True, MUTED)
                ws.cell(row=r, column=3, value=it).font = _f()
                title = ""
    _fit(ws)

    # ---- P&L tháng (có công thức % trên doanh thu) ----
    ws = wb.create_sheet("P&L tháng")
    _title(ws, "Báo cáo lãi lỗ tháng vận hành ổn định", sub)
    _head(ws, 5, ["Khoản mục", "Số tiền (VND)", "% doanh thu"])
    rows = results.get("pnl", [])
    for i, line in enumerate(rows):
        rr = 6 + i
        bold = line.get("kind") in ("subtotal", "total", "revenue")
        ws.cell(row=rr, column=2, value=line.get("label")).font = _f(bold)
        a = ws.cell(row=rr, column=3, value=line.get("amount"))
        a.number_format, a.font = VND, _f(bold)
        p = ws.cell(row=rr, column=4, value=f"=IF($C$6=0,0,C{rr}/$C$6)")
        p.number_format, p.font = PCT, _f(bold, MUTED)
    _fit(ws)

    # ---- Dòng tiền ----
    ws = wb.create_sheet("Dòng tiền")
    _title(ws, "Dòng tiền theo năm", sub)
    _head(ws, 5, ["Năm", "Doanh thu", "Dòng tiền HĐ (CM)", "Khấu hao", "Lợi nhuận trước thuế", "Thuế", "Dòng tiền ròng", "Lũy kế (gồm vốn)"])
    ws.cell(row=6, column=2, value="Đầu tư").font = _f(True)
    ws.cell(row=6, column=8, value=-(results.get("capexTotal") or 0)).number_format = VND
    for i, y in enumerate(results.get("annual", [])):
        rr = 7 + i
        ws.cell(row=rr, column=2, value=f"Năm {y.get('year')}").font = _f()
        for col, key in ((3, "revenue"), (4, "cm"), (5, "depreciation"), (6, "profitBeforeTax"), (7, "tax"), (8, "cashflow")):
            c = ws.cell(row=rr, column=col, value=y.get(key))
            c.number_format, c.font = VND, _f()
        cum = ws.cell(row=rr, column=9, value=f"=I{rr - 1}+H{rr}")
        cum.number_format, cum.font = VND, _f(True)
    ws.cell(row=6, column=9, value="=H6").number_format = VND
    # tiêu đề cột lũy kế nằm cột I
    hdr = ws.cell(row=5, column=9, value="Lũy kế (gồm vốn)")
    hdr.font, hdr.fill = _f(True, "FFFFFF"), HEAD_FILL
    ws.cell(row=5, column=8).value = "Dòng tiền ròng"
    ws.cell(row=6, column=8).value = -(results.get("capexTotal") or 0)
    _fit(ws)

    # ---- Vận hành ----
    ws = wb.create_sheet("Vận hành")
    _title(ws, "Thông số vận hành suy ra", sub)
    op = results.get("operation", {})
    _head(ws, 5, ["Chỉ số", "Giá trị"])
    items = [
        ("Số chỗ ngồi", op.get("seats"), "0"), ("Số bàn", op.get("tables"), "0"),
        ("Lượt khách/ngày", op.get("coversPerDay"), "0"), ("Đơn/giờ cao điểm", op.get("ordersPerPeakHour"), "0"),
        ("Tổng nhân sự", op.get("totalHeadcount"), "0"), ("Chi phí nhân sự/tháng (VND)", op.get("laborCost"), VND),
        ("Doanh thu/m² sàn/tháng (VND)", op.get("revenuePerM2"), VND),
    ]
    rr = 5
    for label, val, fmt in items:
        rr += 1
        ws.cell(row=rr, column=2, value=label).font = _f()
        c = ws.cell(row=rr, column=3, value=val)
        c.number_format, c.font = fmt, _f(True)
    rr += 2
    _head(ws, rr, ["Vị trí", "Số người", "Chi phí/tháng (VND)"])
    for s in op.get("staff", []):
        rr += 1
        ws.cell(row=rr, column=2, value=s.get("name")).font = _f()
        ws.cell(row=rr, column=3, value=s.get("headcount")).font = _f()
        c = ws.cell(row=rr, column=4, value=s.get("cost"))
        c.number_format, c.font = VND, _f()
    _fit(ws)

    # ---- Giả định ----
    ws = wb.create_sheet("Giả định")
    _title(ws, "Giả định đầu vào", sub)
    from .storage import _flatten_top, _label

    _head(ws, 5, ["Giả định", "Giá trị"])
    rr = 5
    for k, val in _flatten_top(inputs):
        rr += 1
        ws.cell(row=rr, column=2, value=_label(k)).font = _f()
        c = ws.cell(row=rr, column=3, value=val)
        c.font = Font(name=FONT, color="1D4ED8")
        c.alignment = Alignment(horizontal="right")
    _fit(ws)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
