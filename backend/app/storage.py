"""Lưu mỗi dự án thành 1 file .xlsx dễ đọc: sheet "Giả định" (khóa, nhãn, giá trị) và sheet "Nhân sự" (bảng vai trò)."""
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill

from .config import PROJECTS_DIR

FONT = "Quicksand"

LABELS = {
    "meta.name": "Tên dự án",
    "meta.district": "Khu vực",
    "meta.format": "Mô hình",
    "site.totalArea": "Tổng diện tích sàn (m²)",
    "site.kitchenArea": "Diện tích bếp & quầy bar (m²)",
    "site.areaPerSeat": "Diện tích mỗi chỗ ngồi (m²)",
    "site.leaseYears": "Thời hạn thuê (năm)",
    "site.daysPerMonth": "Số ngày bán/tháng",
    "site.seatsPerTable": "Số chỗ trung bình/bàn",
    "site.openHoursPerDay": "Giờ mở cửa/ngày",
    "site.peakHours": "Số giờ cao điểm mỗi ngày",
    "site.peakShare": "% khách dồn vào các giờ cao điểm",
    "site.avgStayMinutes": "Thời gian khách ngồi trung bình (phút)",
    "demand.seatTurnover": "Vòng quay ghế (lần/ngày)",
    "demand.aov": "AOV - giá trị đơn trung bình (VND)",
    "ramp.months": "Số tháng ramp-up đến 100% doanh thu",
    "ramp.startPct": "% doanh thu tháng đầu",
    "pnl.revenueDeductionPct": "Giảm trừ doanh thu (%)",
    "pnl.cogsPct": "COGS - giá vốn (%)",
    "pnl.laborPct": "Nhân công (% doanh thu, chế độ top-down)",
    "pnl.utilitiesPct": "Điện nước, dịch vụ (%)",
    "pnl.toolsPct": "Công cụ dụng cụ (%)",
    "pnl.rdPct": "R&D và tiếp khách (%)",
    "pnl.maintenancePct": "Bảo trì bảo dưỡng (%)",
    "pnl.otherPct": "Chi phí khác (%)",
    "pnl.marketingPct": "Marketing (%)",
    "pnl.franchisePct": "Nhượng quyền (%)",
    "pnl.gaPct": "Chi phí chung phân bổ (%)",
    "pnl.interestPct": "Lãi vay (%)",
    "laborMode": "Cách tính nhân công (percent | bottomup)",
    "employerOnCostPct": "Chi phí doanh nghiệp đóng thêm trên lương (%)",
    "rent.pctSales": "Thuê theo % doanh thu",
    "rent.perM2": "Thuê theo m² (VND/m²/tháng)",
    "rent.servicePctSales": "Phí dịch vụ theo % doanh thu",
    "rent.servicePerM2": "Phí dịch vụ theo m² (VND/m²/tháng)",
    "capex.constructionPerM2": "Xây dựng (VND/m² sàn)",
    "capex.fixedAssets": "TSCĐ (VND)",
    "capex.tools": "Công cụ dụng cụ (VND)",
    "capex.preOpening": "Chi phí tiền hoạt động (VND)",
    "capex.franchiseFee": "Phí franchise trả trước (VND)",
    "capex.depositMonths": "Đặt cọc thuê (số tháng)",
    "capex.fixedAssetsLifeMonths": "Thời gian khấu hao TSCĐ (tháng)",
    "capex.toolsLifeMonths": "Thời gian khấu hao công cụ (tháng)",
    "finance.ebitdaGrowth": "Tăng trưởng hằng năm (%)",
    "finance.taxRate": "Thuế TNDN (%)",
    "finance.discountRate": "Tỷ lệ chiết khấu NPV (%)",
    "verdict.goodPaybackMonths": "Payback tốt (tháng)",
    "verdict.badPaybackMonths": "Payback xấu (tháng)",
    "verdict.goodIrr": "IRR tốt",
    "verdict.badIrr": "IRR xấu",
    "verdict.goodSafety": "Biên an toàn tốt",
}

STAFF_COLS = [("id", "Mã"), ("name", "Vị trí"), ("baseCount", "Số người cố định/ngày"),
              ("coversPerExtraHead", "Thêm 1 người mỗi N lượt khách"), ("salary", "Lương gộp/tháng (VND)")]

_SAFE = re.compile(r"[^a-zA-Z0-9_\-]+")


def safe_name(name: str) -> str:
    s = _SAFE.sub("-", name.strip()).strip("-")
    if not s:
        raise ValueError("Tên dự án không hợp lệ")
    return s[:60]


def _flatten(obj: Any, prefix: str = "") -> list[tuple[str, Any]]:
    rows: list[tuple[str, Any]] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "staff":
                continue
            rows += _flatten(v, f"{prefix}{k}." if isinstance(v, dict) else f"{prefix}{k}")
    elif isinstance(obj, list):
        for idx, v in enumerate(obj):
            rows.append((f"{prefix}[{idx}]", v))
    else:
        rows.append((prefix.rstrip("."), obj))
    return rows


def _flatten_top(inputs: dict) -> list[tuple[str, Any]]:
    rows: list[tuple[str, Any]] = []
    for k, v in inputs.items():
        if k == "staff":
            continue
        if isinstance(v, dict):
            rows += _flatten(v, f"{k}.")
        elif isinstance(v, list):
            rows += [(f"{k}[{i}]", x) for i, x in enumerate(v)]
        else:
            rows.append((k, v))
    return rows


def _label(key: str) -> str:
    if key in LABELS:
        return LABELS[key]
    m = re.match(r"rent\.escalation\[(\d+)\]", key)
    if m:
        return f"Tăng giá thuê năm {int(m.group(1)) + 1}"
    return key


def _style(ws, widths: dict[str, float]) -> None:
    ws.sheet_view.showGridLines = False
    for col, w in widths.items():
        ws.column_dimensions[col].width = w


def save_project(name: str, inputs: dict) -> Path:
    path = PROJECTS_DIR / f"{safe_name(name)}.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.title = "Giả định"
    head_font = Font(name=FONT, bold=True, color="FFFFFF")
    head_fill = PatternFill("solid", fgColor="1F2937")
    for c, t in enumerate(["Khóa", "Giả định", "Giá trị"], start=1):
        cell = ws.cell(row=1, column=c, value=t)
        cell.font, cell.fill = head_font, head_fill
    rows = _flatten_top(inputs)
    for r, (k, v) in enumerate(rows, start=2):
        ws.cell(row=r, column=1, value=k).font = Font(name=FONT, color="6B7280", size=9)
        ws.cell(row=r, column=2, value=_label(k)).font = Font(name=FONT)
        vc = ws.cell(row=r, column=3, value=v)
        vc.font = Font(name=FONT, color="1D4ED8")
        vc.alignment = Alignment(horizontal="right")
        if isinstance(v, float) and abs(v) < 1:
            vc.number_format = "0.0%" if "Pct" in k or "Rate" in k or "Growth" in k or "Share" in k else "0.00"
        elif isinstance(v, (int, float)):
            vc.number_format = "#,##0.##"
    longest = max((len(_label(k)) for k, _ in rows), default=20)
    _style(ws, {"A": max(len(k) for k, _ in rows) + 2 if rows else 20, "B": longest + 4, "C": 28})

    ws2 = wb.create_sheet("Nhân sự")
    for c, (_, t) in enumerate(STAFF_COLS, start=1):
        cell = ws2.cell(row=1, column=c, value=t)
        cell.font, cell.fill = head_font, head_fill
    for r, role in enumerate(inputs.get("staff", []), start=2):
        for c, (k, _) in enumerate(STAFF_COLS, start=1):
            cell = ws2.cell(row=r, column=c, value=role.get(k))
            cell.font = Font(name=FONT, color="1D4ED8" if c > 2 else "000000")
            if c == 5:
                cell.number_format = "#,##0"
    _style(ws2, {"A": 16, "B": 28, "C": 26, "D": 34, "E": 26})

    ws3 = wb.create_sheet("Thông tin")
    ws3["A1"], ws3["B1"] = "Cập nhật", datetime.now().strftime("%d/%m/%Y %H:%M")
    ws3["A2"], ws3["B2"] = "Ghi chú", "Dữ liệu giả lập phục vụ demo. Số xanh là giả định có thể chỉnh trực tiếp trong app."
    for row in ws3.iter_rows():
        for c in row:
            c.font = Font(name=FONT)
    _style(ws3, {"A": 14, "B": 90})
    wb.save(path)
    return path


def _coerce(raw: Any) -> Any:
    return raw


def _assign(root: dict, key: str, value: Any) -> None:
    m = re.match(r"^(.*)\[(\d+)\]$", key)
    if m:
        base, idx = m.group(1), int(m.group(2))
        parts = base.split(".")
        d = root
        for p in parts[:-1]:
            d = d.setdefault(p, {})
        arr = d.setdefault(parts[-1], [])
        while len(arr) <= idx:
            arr.append(0)
        arr[idx] = value
        return
    parts = key.split(".")
    d = root
    for p in parts[:-1]:
        d = d.setdefault(p, {})
    d[parts[-1]] = value


def load_project(name: str) -> dict:
    path = PROJECTS_DIR / f"{safe_name(name)}.xlsx"
    if not path.exists():
        raise FileNotFoundError(name)
    wb = load_workbook(path, data_only=True)
    ws = wb["Giả định"]
    out: dict = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        k, _, v = row[0], row[1], row[2]
        if k is None:
            continue
        _assign(out, str(k), _coerce(v))
    staff = []
    if "Nhân sự" in wb.sheetnames:
        for row in wb["Nhân sự"].iter_rows(min_row=2, values_only=True):
            if row[0] is None:
                continue
            staff.append({k: row[i] for i, (k, _) in enumerate(STAFF_COLS)})
    out["staff"] = staff
    return out


def list_projects() -> list[dict]:
    items = []
    for p in sorted(PROJECTS_DIR.glob("*.xlsx"), key=lambda x: x.stat().st_mtime, reverse=True):
        items.append({"name": p.stem, "updated": datetime.fromtimestamp(p.stat().st_mtime).isoformat(timespec="seconds")})
    return items


def delete_project(name: str) -> bool:
    path = PROJECTS_DIR / f"{safe_name(name)}.xlsx"
    if path.exists():
        path.unlink()
        return True
    return False
