"""Gọi Claude cho 3 việc: nhận xét kết quả, điền input từ câu mô tả, chat what-if.
Nguyên tắc: AI KHÔNG tự tính số. Với what-if, AI chỉ đề xuất thay đổi (patch); model tính của app mới ra kết quả.
Nếu không có key hoặc API lỗi thì rơi về phương án dự phòng chạy offline (rule-based) để demo không bị gãy.
"""
import json
import re
import subprocess
from typing import Any

from . import config

# ---- Các trường AI được phép điền / thay đổi (whitelist) và khoảng hợp lệ ----
ALLOWED: dict[str, tuple[float, float] | None] = {
    "meta.name": None, "meta.district": None, "meta.format": None,
    "site.totalArea": (10, 5000), "site.kitchenArea": (0, 2000), "site.areaPerSeat": (0.8, 6),
    "site.leaseYears": (1, 10), "site.avgStayMinutes": (10, 240), "demand.seatTurnover": (0.3, 15), "demand.aov": (5_000, 3_000_000),
    "ramp.months": (0, 12), "ramp.startPct": (0.1, 1),
    "pnl.cogsPct": (0.05, 0.8), "pnl.laborPct": (0.03, 0.6), "pnl.marketingPct": (0, 0.2),
    "pnl.utilitiesPct": (0, 0.2), "pnl.otherPct": (0, 0.2),
    "rent.perM2": (0, 3_000_000), "rent.pctSales": (0, 0.4),
    "capex.constructionPerM2": (0, 30_000_000), "capex.fixedAssets": (0, 20_000_000_000),
    "capex.tools": (0, 5_000_000_000), "capex.preOpening": (0, 5_000_000_000),
    "capex.depositMonths": (0, 12),
    "finance.taxRate": (0, 0.4),
}

FIELD_HELP = """meta.district (chuỗi), meta.format (chuỗi), site.totalArea (m² sàn), site.kitchenArea (m² bếp+bar),
site.areaPerSeat (m²/chỗ), site.leaseYears (năm), demand.seatTurnover (vòng quay ghế/ngày), demand.aov (VND/đơn),
pnl.cogsPct, pnl.laborPct, pnl.marketingPct (tỷ lệ 0-1 trên doanh thu), rent.perM2 (VND/m²/tháng), rent.pctSales (0-1),
capex.constructionPerM2 (VND/m²), capex.fixedAssets, capex.tools, capex.preOpening (VND), capex.depositMonths (tháng), finance.taxRate (0-1)"""

BASE_SYSTEM = """Bạn là cố vấn tài chính vận hành F&B tại TP.HCM, nói chuyện với người đi làm văn phòng không chuyên tài chính.
Quy tắc:
- Viết tiếng Việt, giọng đơn giản, giữ nguyên thuật ngữ tiếng Anh thông dụng (payback, IRR, EBITDA, AOV, COGS) và giải thích ngắn khi nhắc lần đầu.
- Chỉ dùng số trong dữ liệu được cung cấp. Không tự tính lại, không bịa số liệu hay nguồn. Mọi con số là ước tính từ dữ liệu giả lập.
- Thuật ngữ trong dữ liệu: CM = dòng tiền hoạt động hằng tháng (tương đương EBITDA), UC = lợi nhuận trước thuế sau khấu hao, payback = số tháng hoàn vốn, biên an toàn = (khách kế hoạch - khách hòa vốn) / khách kế hoạch.
- Không nhắc tên trường kỹ thuật (như site.kitchenArea) khi nói với người dùng; dùng tiếng Việt thường.
- Không dùng dấu gạch ngang dài, dấu chấm giữa, dấu chấm phẩy hay dấu đầu dòng; dùng dấu phẩy và xuống dòng thay thế.
- Với thuế, BHXH, luật lao động: nói rõ cần người có chuyên môn kiểm lại với văn bản gốc.
- Chỉ trả về JSON đúng schema được yêu cầu, không thêm chữ ngoài JSON."""


def _ask_api(system: str, user: str, max_tokens: int) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=config.API_KEY, timeout=45.0, max_retries=1)
    resp = client.messages.create(
        model=config.MODEL, max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": user}], output_config={"effort": config.EFFORT},
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def _ask_cli(system: str, user: str) -> str:
    """Gọi `claude -p` đã đăng nhập sẵn trên máy: không công cụ, không lưu phiên, không đọc cấu hình/skill nào khác."""
    cmd = [
        config.CLAUDE_BIN, "-p", "--model", config.MODEL, "--effort", config.EFFORT,
        "--output-format", "json", "--tools", "", "--no-session-persistence",
        "--disable-slash-commands", "--setting-sources", "", "--system-prompt", system,
    ]
    proc = subprocess.run(
        cmd, input=user, capture_output=True, text=True, encoding="utf-8",
        cwd=str(config.AI_CWD), timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude thoát mã {proc.returncode}: {proc.stderr.strip()[:200]}")
    data = json.loads(proc.stdout)
    if data.get("is_error"):
        raise RuntimeError(str(data.get("result", "lỗi không rõ"))[:200])
    return str(data.get("result", ""))


def _ask(system: str, user: str, max_tokens: int = 1400) -> str:
    if config.provider() == "cli":
        return _ask_cli(system, user)
    return _ask_api(system, user, max_tokens)


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("Không có JSON trong phản hồi")
    return json.loads(text[start : end + 1])


def clean_patch(patch: dict[str, Any] | None) -> dict[str, Any]:
    """Chỉ giữ trường nằm trong whitelist, ép kiểu và kẹp về khoảng hợp lệ."""
    out: dict[str, Any] = {}
    for k, v in (patch or {}).items():
        if k not in ALLOWED:
            continue
        rng = ALLOWED[k]
        if rng is None:
            if isinstance(v, str) and v.strip():
                out[k] = v.strip()[:80]
            continue
        try:
            x = float(v)
        except (TypeError, ValueError):
            continue
        out[k] = min(max(x, rng[0]), rng[1])
    return out


# ================= 1. Nhận xét =================
ADVISE_SCHEMA = """{"headline": "kết luận thẳng, tối đa 18 từ",
 "strengths": ["tối đa 3 ý, mỗi ý kèm số lấy từ dữ liệu"],
 "risks": ["tối đa 3 rủi ro, kèm số"],
 "actions": ["đúng 3 việc nên làm, cụ thể (nên thử đổi gì, khoảng bao nhiêu)"],
 "caveat": "1 câu nhắc giới hạn của ước tính"}"""


def advise(summary: dict) -> dict:
    if config.ai_enabled():
        try:
            raw = _ask(
                BASE_SYSTEM,
                f"Dữ liệu mô phỏng (JSON):\n{json.dumps(summary, ensure_ascii=False)}\n\n"
                f"Hãy nhận xét kết quả cho người ra quyết định mở quán. Trả JSON theo schema:\n{ADVISE_SCHEMA}",
            )
            data = _extract_json(raw)
            return {"source": "ai", "model": config.MODEL, **_norm_advice(data)}
        except Exception as e:  # noqa: BLE001 - mọi lỗi API đều rơi về dự phòng
            res = advise_fallback(summary)
            res["note"] = f"Không gọi được Claude ({type(e).__name__}); đang dùng nhận xét dự phòng."
            return res
    res = advise_fallback(summary)
    res["note"] = "Không tìm thấy Claude trên máy này; đang dùng nhận xét dự phòng."
    return res


def _norm_advice(d: dict) -> dict:
    lst = lambda k, n: [str(x) for x in (d.get(k) or [])][:n]  # noqa: E731
    return {
        "headline": str(d.get("headline", ""))[:200],
        "strengths": lst("strengths", 3),
        "risks": lst("risks", 3),
        "actions": lst("actions", 3),
        "caveat": str(d.get("caveat", ""))[:300],
    }


def _m(x: float) -> str:
    return f"{x / 1e6:,.0f} triệu".replace(",", ".")


def advise_fallback(s: dict) -> dict:
    k = s.get("kpis", {})
    c = s.get("costPct", {})
    v = s.get("verdict", {})
    pb = k.get("paybackCumulative")
    strengths, risks, actions = [], [], []
    if pb is not None:
        strengths.append(f"Hoàn vốn (payback) khoảng {pb:.0f} tháng, trong thời hạn thuê {k.get('leaseMonths', 60)} tháng.")
    if k.get("irr") is not None:
        strengths.append(f"IRR khoảng {k['irr'] * 100:.0f}%/năm.")
    if k.get("marginOfSafety", 0) >= 0.25:
        strengths.append(f"Biên an toàn {k['marginOfSafety'] * 100:.0f}%: doanh thu giảm khá nhiều mới bắt đầu lỗ.")
    if k.get("marginOfSafety", 0) < 0.25:
        risks.append(
            f"Biên an toàn chỉ {k.get('marginOfSafety', 0) * 100:.0f}%: cần {k.get('breakEvenCovers', 0):.0f} khách/ngày để hòa vốn, kế hoạch {k.get('coversPerDay', 0):.0f}."
        )
    if c.get("rent", 0) > 0.15:
        risks.append(f"Tiền thuê chiếm {c['rent'] * 100:.0f}% doanh thu, cao hơn mức khuyến nghị 15–20%.")
    if c.get("labor", 0) > 0.28:
        risks.append(f"Nhân công chiếm {c['labor'] * 100:.0f}% doanh thu, nên rà lại số ca.")
    if k.get("cmPct", 0) < 0.12:
        risks.append(f"Biên dòng tiền hoạt động chỉ {k.get('cmPct', 0) * 100:.0f}%, rất mỏng nếu COGS hoặc giá thuê tăng.")
    if pb is None:
        risks.append("Chưa hoàn vốn trong thời hạn thuê.")
    aov = k.get("aov", 0)
    actions += [
        f"Thử nâng AOV thêm 5–10% (khoảng {aov * 1.05 / 1000:.0f}–{aov * 1.1 / 1000:.0f}k) bằng combo đồ uống kèm bánh.",
        "Đàm phán thuê: xin 2–3 tháng ưu đãi đầu hoặc bậc tăng giá thuê thấp hơn ở năm 3–5.",
        "Đếm khách thực tế ở 2–3 quán tương tự trong khu vực để kiểm tra lại vòng quay ghế trước khi chốt.",
    ]
    return {
        "source": "fallback",
        "model": None,
        "headline": v.get("label", "Kết quả mô phỏng") + f": dòng tiền hoạt động {_m(k.get('monthlyCM', 0))}/tháng.",
        "strengths": strengths[:3] or ["Chưa có điểm mạnh nổi bật theo các ngưỡng hiện tại."],
        "risks": risks[:3] or ["Chưa thấy rủi ro lớn theo các ngưỡng hiện tại, vẫn nên chạy kịch bản bi quan."],
        "actions": actions[:3],
        "caveat": "Đây là ước tính từ dữ liệu giả lập; số thuế, BHXH, hợp đồng cần người có chuyên môn kiểm lại với văn bản gốc.",
    }


# ================= 2. Điền input từ câu mô tả =================
PARSE_SCHEMA = f"""{{"intent": "estimate" | "budget" | "goal_profit" | "goal_payback",
 "budget": số VND hoặc null (khi người dùng nói họ có bao nhiêu vốn),
 "goalValue": số hoặc null (lợi nhuận mong muốn VND/tháng cho goal_profit; số tháng cho goal_payback),
 "patch": {{ "tên.trường": giá trị, ... }}  // chỉ các trường người dùng nêu rõ hoặc suy ra chắc chắn
 "summary": "1 câu tiếng Việt tóm tắt bạn hiểu gì",
 "assumed": ["các giá trị bạn KHÔNG đặt mà để model dùng mặc định"],
 "questions": ["tối đa 2 câu hỏi nếu thiếu thông tin quan trọng"]}}
Các trường được phép trong patch: {FIELD_HELP}"""


def parse_brief(text: str) -> dict:
    if config.ai_enabled():
        try:
            raw = _ask(
                BASE_SYSTEM + "\nĐổi số: '2,5 tỷ' = 2500000000; '800 triệu' = 800000000; '30k' = 30000.",
                f"Mô tả của người dùng:\n\"\"\"{text}\"\"\"\n\nTrích xuất thành JSON theo schema:\n{PARSE_SCHEMA}",
                max_tokens=900,
            )
            d = _extract_json(raw)
            return _norm_parse(d, "ai")
        except Exception as e:  # noqa: BLE001
            res = parse_fallback(text)
            res["note"] = f"Không gọi được Claude ({type(e).__name__}); đang dùng bộ đọc đơn giản."
            return res
    res = parse_fallback(text)
    res["note"] = "Không tìm thấy Claude trên máy này; đang dùng bộ đọc đơn giản."
    return res


def _norm_parse(d: dict, source: str) -> dict:
    intent = d.get("intent") if d.get("intent") in {"estimate", "budget", "goal_profit", "goal_payback"} else "estimate"

    def num(x):
        try:
            return float(x) if x is not None else None
        except (TypeError, ValueError):
            return None

    return {
        "source": source,
        "model": config.MODEL if source == "ai" else None,
        "intent": intent,
        "budget": num(d.get("budget")),
        "goalValue": num(d.get("goalValue")),
        "patch": clean_patch(d.get("patch")),
        "summary": str(d.get("summary", ""))[:300],
        "assumed": [str(x) for x in (d.get("assumed") or [])][:6],
        "questions": [str(x) for x in (d.get("questions") or [])][:2],
    }


_DISTRICTS = ["Bình Thạnh", "Quận 10", "Quận 1", "Quận 3", "Quận 7", "Phú Nhuận", "Gò Vấp", "Tân Bình", "Thủ Đức"]


def parse_fallback(text: str) -> dict:
    t = text.lower()
    patch: dict[str, Any] = {}
    intent, budget, goal = "estimate", None, None
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mét vuông|m vuông)", t)
    if m:
        patch["site.totalArea"] = float(m.group(1).replace(",", "."))
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*tỷ", t)
    if m:
        budget, intent = float(m.group(1).replace(",", ".")) * 1e9, "budget"
    else:
        m = re.search(r"vốn[^\d]{0,15}(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\b", t)
        if m:
            budget, intent = float(m.group(1).replace(",", ".")) * 1e6, "budget"
    m = re.search(r"(?:lãi|lợi nhuận)[^\d]{0,15}(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)", t)
    if m:
        intent, goal = "goal_profit", float(m.group(1).replace(",", ".")) * 1e6
    m = re.search(r"hoàn vốn[^\d]{0,15}(\d+)\s*tháng", t)
    if m:
        intent, goal = "goal_payback", float(m.group(1))
    for d in _DISTRICTS:
        if d.lower() in t:
            patch["meta.district"] = d
            break
    return {
        "source": "fallback",
        "model": None,
        "intent": intent,
        "budget": budget,
        "goalValue": goal,
        "patch": clean_patch(patch),
        "summary": "Đã đọc các số nhận ra được trong câu mô tả (bộ đọc đơn giản, không dùng AI).",
        "assumed": ["Các thông số còn lại giữ mặc định của mô hình."],
        "questions": [],
    }


# ================= 3. Chat what-if =================
CHAT_SCHEMA = """{"reply": "trả lời ngắn gọn, tối đa 4 câu",
 "whatIf": null hoặc {"label": "tên kịch bản ngắn", "patch": {"tên.trường": giá trị MỚI tuyệt đối}}}"""


def chat(question: str, context: dict, history: list[dict] | None = None) -> dict:
    hist = "\n".join(f"{h.get('role')}: {h.get('content')}" for h in (history or [])[-6:])
    if config.ai_enabled():
        try:
            raw = _ask(
                BASE_SYSTEM
                + "\nNếu câu hỏi dạng 'nếu... thì sao', hãy đặt whatIf.patch với giá trị MỚI tuyệt đối (tự đổi từ % sang số dựa trên giá trị hiện tại trong dữ liệu)."
                " Tuyệt đối KHÔNG tự đưa ra con số kết quả (payback, lãi...) trong reply: nói rằng model của ứng dụng sẽ tính ngay bên dưới.",
                f"Bối cảnh hiện tại:\n{json.dumps(context, ensure_ascii=False)}\n\nLịch sử:\n{hist}\n\nCâu hỏi: {question}\n\n"
                f"Trả JSON theo schema:\n{CHAT_SCHEMA}\nTrường được phép trong patch: {FIELD_HELP}",
                max_tokens=700,
            )
            d = _extract_json(raw)
            wi = d.get("whatIf")
            what_if = None
            if isinstance(wi, dict):
                p = clean_patch(wi.get("patch"))
                if p:
                    what_if = {"label": str(wi.get("label", "Kịch bản what-if"))[:60], "patch": p}
            return {"source": "ai", "reply": str(d.get("reply", ""))[:900], "whatIf": what_if}
        except Exception as e:  # noqa: BLE001
            return {"source": "fallback", "reply": f"Không gọi được Claude ({type(e).__name__}). Bạn thử lại sau, hoặc kéo thanh trượt để xem tác động trực tiếp.", "whatIf": None}
    return {
        "source": "fallback",
        "reply": "Không tìm thấy Claude trên máy này nên chưa bật được chat. Bạn vẫn có thể kéo thanh trượt ở trang chính để xem tác động ngay.",
        "whatIf": None,
    }
