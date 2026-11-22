import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

PROJECTS_DIR = BASE_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)

# Cách gọi Claude (mặc định "auto"):
#  - cli : dùng lệnh `claude` đã đăng nhập sẵn trên máy này (không cần API key)
#  - api : dùng ANTHROPIC_API_KEY trong .env (key chỉ backend đọc, không endpoint nào trả ra ngoài)
#  - auto: ưu tiên cli, không có thì dùng api nếu có key
API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")
EFFORT = os.getenv("CLAUDE_EFFORT", "medium")
_PREF = os.getenv("CFS_AI_PROVIDER", "auto").lower()
CLAUDE_BIN = shutil.which("claude")
# Chạy claude ở thư mục trống để nó không đọc nhầm CLAUDE.md của các dự án khác
AI_CWD = BASE_DIR / ".ai-cwd"
AI_CWD.mkdir(exist_ok=True)

# Chỉ cho phép trình duyệt chạy trên localhost gọi API
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


def provider() -> str | None:
    if _PREF in ("cli", "auto") and CLAUDE_BIN:
        return "cli"
    if _PREF in ("api", "auto") and API_KEY:
        return "api"
    return None


def ai_enabled() -> bool:
    return provider() is not None
