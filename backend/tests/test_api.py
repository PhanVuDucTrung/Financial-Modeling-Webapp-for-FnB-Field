"""Kiểm tra API. Chạy từ thư mục backend: python -X utf8 -m pytest tests -q
Ép AI về chế độ dự phòng để test không gọi Claude thật."""
import os

os.environ["CFS_AI_PROVIDER"] = "none"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

c = TestClient(app)
SAMPLE = {
    "meta": {"name": "pytest-tmp", "district": "X", "format": "F&B"},
    "site": {"totalArea": 110, "leaseYears": 5},
    "pnl": {"cogsPct": 0.32},
    "laborMode": "bottomup",
    "rent": {"perM2": 450000, "escalation": [0, 0, 0.1]},
    "staff": [{"id": "a", "name": "Barista", "baseCount": 1, "coversPerExtraHead": 150, "salary": 8500000}],
}


def test_health_khong_lo_key():
    r = c.get("/api/health").json()
    assert r["ok"] is True and r["ai"] is False
    assert "key" not in str(r).lower()


def test_luu_doc_xoa_du_an():
    assert c.put("/api/projects/pytest-tmp", json=SAMPLE).status_code == 200
    assert c.get("/api/projects/pytest-tmp").json() == SAMPLE
    assert any(p["name"] == "pytest-tmp" for p in c.get("/api/projects").json())
    assert c.delete("/api/projects/pytest-tmp").status_code == 200
    assert c.get("/api/projects/pytest-tmp").status_code == 404


def test_ten_du_an_khong_hop_le():
    assert c.put("/api/projects/%20%20", json={}).status_code == 400


def test_ai_du_phong():
    p = c.post("/api/ai/parse", json={"text": "Cửa hàng 120 m2 ở Quận 10, vốn 2,5 tỷ"}).json()
    assert p["source"] == "fallback" and p["intent"] == "budget" and p["budget"] == 2.5e9
    assert p["patch"]["site.totalArea"] == 120
    a = c.post("/api/ai/advise", json={"summary": {"kpis": {"marginOfSafety": 0.1}, "verdict": {"label": "Cân nhắc kỹ"}}}).json()
    assert a["source"] == "fallback" and len(a["actions"]) == 3
    assert c.post("/api/ai/chat", json={"question": "nếu thuê tăng?", "context": {}}).json()["whatIf"] is None


def test_patch_chi_nhan_truong_cho_phep():
    from app.ai import clean_patch

    assert clean_patch({"demand.aov": 9e9, "os.system": 1, "meta.district": " Q1 "}) == {"demand.aov": 3_000_000, "meta.district": "Q1"}


def test_xuat_excel():
    body = {"inputs": SAMPLE, "results": {"verdict": {"label": "x", "reasons": []}, "monthly": {}, "pnl": [], "annual": [], "operation": {}}}
    r = c.post("/api/export", json=body)
    assert r.status_code == 200 and r.content[:2] == b"PK"
