from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import ai, config, storage
from .export import build_report

app = FastAPI(title="Financial Model for Enterprise API", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


class Summary(BaseModel):
    summary: dict[str, Any]


class ParseReq(BaseModel):
    text: str = Field(min_length=3, max_length=1500)


class ChatReq(BaseModel):
    question: str = Field(min_length=2, max_length=800)
    context: dict[str, Any]
    history: list[dict[str, Any]] = []


class ExportReq(BaseModel):
    inputs: dict[str, Any]
    results: dict[str, Any]
    advice: dict[str, Any] | None = None


@app.get("/api/health")
def health():
    # Chỉ báo có/không có key, không bao giờ trả giá trị key
    return {"ok": True, "ai": config.ai_enabled(), "provider": config.provider(), "model": config.MODEL if config.ai_enabled() else None}


@app.get("/api/projects")
def projects():
    return storage.list_projects()


@app.get("/api/projects/{name}")
def get_project(name: str):
    try:
        return storage.load_project(name)
    except FileNotFoundError:
        raise HTTPException(404, "Không tìm thấy dự án")
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.put("/api/projects/{name}")
def put_project(name: str, inputs: dict[str, Any]):
    try:
        path = storage.save_project(name, inputs)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"saved": path.name}


@app.delete("/api/projects/{name}")
def del_project(name: str):
    try:
        ok = storage.delete_project(name)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not ok:
        raise HTTPException(404, "Không tìm thấy dự án")
    return {"deleted": name}


@app.post("/api/ai/advise")
def ai_advise(req: Summary):
    return ai.advise(req.summary)


@app.post("/api/ai/parse")
def ai_parse(req: ParseReq):
    return ai.parse_brief(req.text)


@app.post("/api/ai/chat")
def ai_chat(req: ChatReq):
    return ai.chat(req.question, req.context, req.history)


@app.post("/api/export")
def export(req: ExportReq):
    data = build_report(req.inputs, req.results, req.advice)
    name = storage.safe_name(str(req.inputs.get("meta", {}).get("name", "bao-cao")))
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{name}-bao-cao.xlsx"'},
    )
